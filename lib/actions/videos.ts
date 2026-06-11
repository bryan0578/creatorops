"use server"

import { revalidatePath } from "next/cache"

import { getAnalyticsRecords } from "@/lib/actions/analytics-records"
import { getCampaigns } from "@/lib/actions/campaigns"
import { getExperiments } from "@/lib/actions/experiments"
import { getLearnings } from "@/lib/actions/learnings"
import { getQualityReviews } from "@/lib/actions/quality-reviews"
import { getYouTubePackages } from "@/lib/actions/youtube-packages"
import {
  createOrUpdateAnalyticsFromYouTubeVideo,
  createOrUpdateExternalLinkFromYouTubeVideo,
  getYouTubeConnectionStatus,
  getYouTubeVideos,
  getYouTubeVideosForCampaign,
  linkYouTubeVideoToCampaign,
  syncYouTubeVideoStats,
} from "@/lib/actions/youtube-integration"
import {
  buildVideoIntelligenceSummary,
  buildVideosNeedingAttention,
  enrichVideos,
  type EnrichedVideoRecord,
  type VideoIntelligenceRelations,
  type VideoIntelligenceSummary,
} from "@/lib/data/videos"
import { prisma } from "@/lib/prisma"
import type {
  YouTubeConnectionStatusSummary,
  YouTubeVideoRecord,
} from "@/lib/types"
import { prismaYouTubeVideoToRecord, youtubeVideoToPrismaUpdate } from "@/lib/youtube/mappers"

const VIDEO_PATHS = [
  "/videos",
  "/integrations",
  "/campaigns",
  "/analytics",
  "/search",
  "/backups",
  "/data-health",
  "/automation",
  "/",
]

function revalidateVideoRoutes() {
  for (const path of VIDEO_PATHS) {
    revalidatePath(path)
  }
}

async function findVideoRecord(idOrYoutubeId: string): Promise<YouTubeVideoRecord | null> {
  const trimmed = idOrYoutubeId.trim()
  const byId = await prisma.youTubeVideo.findUnique({ where: { id: trimmed } })
  if (byId) return prismaYouTubeVideoToRecord(byId)
  const byYoutubeId = await prisma.youTubeVideo.findUnique({
    where: { youtubeVideoId: trimmed },
  })
  return byYoutubeId ? prismaYouTubeVideoToRecord(byYoutubeId) : null
}

async function loadRelations(): Promise<VideoIntelligenceRelations> {
  const [qualityReviews, learnings, experiments, youtubePackages] = await Promise.all([
    getQualityReviews(),
    getLearnings(),
    getExperiments(),
    getYouTubePackages(),
  ])
  return { qualityReviews, learnings, experiments, youtubePackages }
}

export async function getVideos(): Promise<YouTubeVideoRecord[]> {
  return getYouTubeVideos()
}

export async function getVideoById(id: string): Promise<YouTubeVideoRecord | null> {
  if (!id?.trim()) return null
  return findVideoRecord(id)
}

export async function getVideosForCampaign(
  campaignId: string,
): Promise<YouTubeVideoRecord[]> {
  return getYouTubeVideosForCampaign(campaignId)
}

export async function getUnlinkedVideos(): Promise<EnrichedVideoRecord[]> {
  const [videos, relations, campaigns] = await Promise.all([
    getYouTubeVideos(),
    loadRelations(),
    getCampaigns(),
  ])
  return enrichVideos(videos, relations, campaigns).filter(
    (video) => !video.campaignId?.trim(),
  )
}

export async function getVideosNeedingAttention(): Promise<
  ReturnType<typeof buildVideosNeedingAttention>
> {
  const page = await getVideoIntelligencePageData()
  return page.attentionItems
}

export async function linkVideoToCampaign(
  videoId: string,
  campaignId: string,
): Promise<{ success: boolean; message: string; video?: YouTubeVideoRecord }> {
  const result = await linkYouTubeVideoToCampaign(videoId, campaignId)
  if (result.success) revalidateVideoRoutes()
  return result
}

export async function unlinkVideoFromCampaign(
  videoId: string,
): Promise<{ success: boolean; message: string; video?: YouTubeVideoRecord }> {
  try {
    const video = await findVideoRecord(videoId)
    if (!video) return { success: false, message: "YouTube video not found locally." }

    const row = await prisma.youTubeVideo.update({
      where: { id: video.id },
      data: youtubeVideoToPrismaUpdate({
        ...video,
        campaignId: "",
        campaignName: "",
        updatedAt: Date.now(),
      }),
    })
    revalidateVideoRoutes()
    return {
      success: true,
      message: `Unlinked "${video.title}" from its campaign.`,
      video: prismaYouTubeVideoToRecord(row),
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not unlink video.",
    }
  }
}

export async function syncVideoStats(
  videoId: string,
): Promise<{
  success: boolean
  message: string
  video?: YouTubeVideoRecord
  analyticsUpdated?: boolean
}> {
  const result = await syncYouTubeVideoStats(videoId)
  if (result.success) revalidateVideoRoutes()
  return result
}

export async function syncAllImportedVideos(): Promise<{
  success: boolean
  message: string
  synced: number
  total: number
}> {
  const videos = await getYouTubeVideos()
  let synced = 0
  for (const video of videos) {
    const result = await syncYouTubeVideoStats(video.id)
    if (result.success) synced += 1
  }
  revalidateVideoRoutes()
  return {
    success: synced > 0 || videos.length === 0,
    message:
      videos.length === 0
        ? "No imported videos to sync."
        : `Synced ${synced} of ${videos.length} imported video(s).`,
    synced,
    total: videos.length,
  }
}

export async function createOrUpdateAnalyticsForVideo(
  videoId: string,
): Promise<{ success: boolean; message: string; analyticsRecordId?: string }> {
  const result = await createOrUpdateAnalyticsFromYouTubeVideo(videoId)
  if (result.success) revalidateVideoRoutes()
  return result
}

export async function createExternalLinkForVideo(
  videoId: string,
): Promise<{ success: boolean; message: string; externalLinkId?: string }> {
  const result = await createOrUpdateExternalLinkFromYouTubeVideo(videoId)
  if (result.success) revalidateVideoRoutes()
  return result
}

export async function getVideoIntelligenceSummary(): Promise<VideoIntelligenceSummary> {
  const page = await getVideoIntelligencePageData()
  return page.summary
}

export async function getVideoByAnalyticsRecordId(
  analyticsRecordId: string,
): Promise<YouTubeVideoRecord | null> {
  if (!analyticsRecordId?.trim()) return null
  const row = await prisma.youTubeVideo.findFirst({
    where: { analyticsRecordId: analyticsRecordId.trim() },
  })
  return row ? prismaYouTubeVideoToRecord(row) : null
}

export interface VideoIntelligencePageData {
  videos: EnrichedVideoRecord[]
  summary: VideoIntelligenceSummary
  attentionItems: ReturnType<typeof buildVideosNeedingAttention>
  connectionStatus: YouTubeConnectionStatusSummary
  campaigns: Awaited<ReturnType<typeof getCampaigns>>
  analyticsRecords: Awaited<ReturnType<typeof getAnalyticsRecords>>
}

export async function getVideoIntelligencePageData(): Promise<VideoIntelligencePageData> {
  const [videos, relations, campaigns, connectionStatus, analyticsRecords] =
    await Promise.all([
      getYouTubeVideos(),
      loadRelations(),
      getCampaigns(),
      getYouTubeConnectionStatus(),
      getAnalyticsRecords(),
    ])

  const enriched = enrichVideos(videos, relations, campaigns)
  const summary = buildVideoIntelligenceSummary(enriched)
  const attentionItems = buildVideosNeedingAttention(enriched)

  return {
    videos: enriched,
    summary,
    attentionItems,
    connectionStatus,
    campaigns,
    analyticsRecords,
  }
}
