import { parseJsonStringArray } from "@/lib/safe-json"
import {
  parseYouTubeVideoStats,
  youtubeWatchUrl,
  type YouTubeApiVideoSummary,
} from "@/lib/youtube/types"
import type { AnalyticsRecord, YouTubeVideoRecord } from "@/lib/types"
import type { YouTubeVideo as PrismaYouTubeVideo } from "@/lib/generated/prisma/client"
import { createId } from "@/lib/storage"

export function normalizeYouTubeVideoRecord(
  record: Partial<YouTubeVideoRecord> & Pick<YouTubeVideoRecord, "id">,
): YouTubeVideoRecord {
  const now = Date.now()
  const stats = parseYouTubeVideoStats(record.rawJson ?? "{}")
  return {
    id: record.id,
    youtubeVideoId: record.youtubeVideoId?.trim() ?? "",
    title: record.title?.trim() ?? "",
    description: record.description?.trim() ?? "",
    channelId: record.channelId?.trim() ?? "",
    channelTitle: record.channelTitle?.trim() ?? "",
    publishedAt: record.publishedAt ?? null,
    thumbnailUrl: record.thumbnailUrl?.trim() ?? "",
    videoUrl: record.videoUrl?.trim() ?? "",
    duration: record.duration?.trim() ?? "",
    privacyStatus: record.privacyStatus?.trim() ?? "",
    campaignId: record.campaignId?.trim() ?? "",
    campaignName: record.campaignName?.trim() ?? "",
    artistName: record.artistName?.trim() ?? "",
    songTitle: record.songTitle?.trim() ?? "",
    externalLinkId: record.externalLinkId?.trim() ?? "",
    analyticsRecordId: record.analyticsRecordId?.trim() ?? "",
    rawJson: record.rawJson?.trim() || "{}",
    lastSyncedAt: record.lastSyncedAt ?? null,
    notes: record.notes?.trim() ?? "",
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? now,
    viewCount: stats.viewCount,
    likeCount: stats.likeCount,
    commentCount: stats.commentCount,
  }
}

export function prismaYouTubeVideoToRecord(row: PrismaYouTubeVideo): YouTubeVideoRecord {
  return normalizeYouTubeVideoRecord({
    id: row.id,
    youtubeVideoId: row.youtubeVideoId,
    title: row.title,
    description: row.description,
    channelId: row.channelId,
    channelTitle: row.channelTitle,
    publishedAt: row.publishedAt?.getTime() ?? null,
    thumbnailUrl: row.thumbnailUrl,
    videoUrl: row.videoUrl,
    duration: row.duration,
    privacyStatus: row.privacyStatus,
    campaignId: row.campaignId,
    campaignName: row.campaignName,
    artistName: row.artistName,
    songTitle: row.songTitle,
    externalLinkId: row.externalLinkId,
    analyticsRecordId: row.analyticsRecordId,
    rawJson: row.rawJson,
    lastSyncedAt: row.lastSyncedAt?.getTime() ?? null,
    notes: row.notes,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}

export function youtubeVideoToPrismaCreate(record: YouTubeVideoRecord) {
  const normalized = normalizeYouTubeVideoRecord(record)
  return {
    id: normalized.id,
    youtubeVideoId: normalized.youtubeVideoId,
    title: normalized.title,
    description: normalized.description,
    channelId: normalized.channelId,
    channelTitle: normalized.channelTitle,
    publishedAt: normalized.publishedAt ? new Date(normalized.publishedAt) : null,
    thumbnailUrl: normalized.thumbnailUrl,
    videoUrl: normalized.videoUrl,
    duration: normalized.duration,
    privacyStatus: normalized.privacyStatus,
    campaignId: normalized.campaignId,
    campaignName: normalized.campaignName,
    artistName: normalized.artistName,
    songTitle: normalized.songTitle,
    externalLinkId: normalized.externalLinkId,
    analyticsRecordId: normalized.analyticsRecordId,
    rawJson: normalized.rawJson,
    lastSyncedAt: normalized.lastSyncedAt ? new Date(normalized.lastSyncedAt) : null,
    notes: normalized.notes,
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function youtubeVideoToPrismaUpdate(record: YouTubeVideoRecord) {
  const normalized = normalizeYouTubeVideoRecord(record)
  return {
    youtubeVideoId: normalized.youtubeVideoId,
    title: normalized.title,
    description: normalized.description,
    channelId: normalized.channelId,
    channelTitle: normalized.channelTitle,
    publishedAt: normalized.publishedAt ? new Date(normalized.publishedAt) : null,
    thumbnailUrl: normalized.thumbnailUrl,
    videoUrl: normalized.videoUrl,
    duration: normalized.duration,
    privacyStatus: normalized.privacyStatus,
    campaignId: normalized.campaignId,
    campaignName: normalized.campaignName,
    artistName: normalized.artistName,
    songTitle: normalized.songTitle,
    externalLinkId: normalized.externalLinkId,
    analyticsRecordId: normalized.analyticsRecordId,
    rawJson: normalized.rawJson,
    lastSyncedAt: normalized.lastSyncedAt ? new Date(normalized.lastSyncedAt) : null,
    notes: normalized.notes,
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function apiVideoToYouTubeVideoRecord(
  api: YouTubeApiVideoSummary,
  existing?: Partial<YouTubeVideoRecord>,
): YouTubeVideoRecord {
  const now = Date.now()
  return normalizeYouTubeVideoRecord({
    id: existing?.id ?? createId("ytvideo"),
    youtubeVideoId: api.youtubeVideoId,
    title: api.title,
    description: api.description,
    channelId: api.channelId,
    channelTitle: api.channelTitle,
    publishedAt: api.publishedAt ? Date.parse(api.publishedAt) : null,
    thumbnailUrl: api.thumbnailUrl,
    videoUrl: api.videoUrl || youtubeWatchUrl(api.youtubeVideoId),
    duration: api.duration,
    privacyStatus: api.privacyStatus,
    campaignId: existing?.campaignId ?? "",
    campaignName: existing?.campaignName ?? "",
    artistName: existing?.artistName ?? "",
    songTitle: existing?.songTitle ?? "",
    externalLinkId: existing?.externalLinkId ?? "",
    analyticsRecordId: existing?.analyticsRecordId ?? "",
    rawJson: JSON.stringify(api.raw),
    lastSyncedAt: now,
    notes: existing?.notes ?? "",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  })
}

const YOUTUBE_SYNC_MARKER = "Synced from YouTube Data API"
const YOUTUBE_VIDEO_ID_PREFIX = "YouTube Video ID:"
const YOUTUBE_LAST_SYNCED_PREFIX = "Last synced:"

export function mergeYouTubeAnalyticsNotes(
  existingNotes: string,
  youtubeVideoId: string,
  syncedAtMs: number,
): string {
  const preserved = existingNotes
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim()
      if (trimmed === YOUTUBE_SYNC_MARKER) return false
      if (trimmed.startsWith(YOUTUBE_VIDEO_ID_PREFIX)) return false
      if (trimmed.startsWith(YOUTUBE_LAST_SYNCED_PREFIX)) return false
      return true
    })
    .join("\n")
    .trim()

  const syncBlock = [
    YOUTUBE_SYNC_MARKER,
    `${YOUTUBE_VIDEO_ID_PREFIX} ${youtubeVideoId}`,
    `${YOUTUBE_LAST_SYNCED_PREFIX} ${new Date(syncedAtMs).toISOString()}`,
  ].join("\n")

  return preserved ? `${preserved}\n\n${syncBlock}` : syncBlock
}

function normalizeUrlForMatch(url: string): string {
  return url.trim().toLowerCase().replace(/\/$/, "")
}

function analyticsRecordContainsYouTubeVideoId(
  record: AnalyticsRecord,
  youtubeVideoId: string,
): boolean {
  const id = youtubeVideoId.trim()
  if (!id) return false
  const haystack = [
    record.notes,
    record.itemName,
    record.titleUsed,
    record.descriptionNotes,
    record.url,
  ]
    .join("\n")
    .toLowerCase()
  return haystack.includes(id.toLowerCase())
}

/** Match an existing analytics row for a synced YouTube video (priority A→D). */
export function findExistingAnalyticsRecordForYouTubeVideo(
  video: YouTubeVideoRecord,
  allAnalytics: AnalyticsRecord[],
): AnalyticsRecord | null {
  if (video.analyticsRecordId) {
    const byLinkedId = allAnalytics.find((record) => record.id === video.analyticsRecordId)
    if (byLinkedId) return byLinkedId
  }

  const videoUrl = normalizeUrlForMatch(video.videoUrl)
  if (videoUrl) {
    const byUrl = allAnalytics.find(
      (record) =>
        record.platform === "YouTube" &&
        normalizeUrlForMatch(record.url) === videoUrl,
    )
    if (byUrl) return byUrl
  }

  if (video.youtubeVideoId) {
    const byVideoId = allAnalytics.find((record) =>
      analyticsRecordContainsYouTubeVideoId(record, video.youtubeVideoId),
    )
    if (byVideoId) return byVideoId
  }

  const publishDate = video.publishedAt
    ? new Date(video.publishedAt).toISOString().slice(0, 10)
    : ""
  const titleNorm = video.title.trim().toLowerCase()
  if (titleNorm && publishDate) {
    const byTitleDate = allAnalytics.find(
      (record) =>
        record.platform === "YouTube" &&
        record.itemName.trim().toLowerCase() === titleNorm &&
        record.publishDate === publishDate,
    )
    if (byTitleDate) return byTitleDate
  }

  return null
}

export function youtubeVideoToAnalyticsRecord(
  video: YouTubeVideoRecord,
  existing?: AnalyticsRecord | null,
): AnalyticsRecord {
  const stats = parseYouTubeVideoStats(video.rawJson)
  const now = Date.now()
  const syncedAt = video.lastSyncedAt ?? now
  const notes = mergeYouTubeAnalyticsNotes(
    existing?.notes?.trim() ?? "",
    video.youtubeVideoId,
    syncedAt,
  )
  const shortDescription = video.description.trim().slice(0, 500)
  const descriptionNotes =
    shortDescription ||
    existing?.descriptionNotes?.trim() ||
    YOUTUBE_SYNC_MARKER

  return {
    id: existing?.id ?? (video.analyticsRecordId || createId("analytics")),
    itemName: video.title,
    itemType: "YouTube Video",
    relatedArtist: existing?.relatedArtist?.trim()
      ? existing.relatedArtist
      : video.artistName || "",
    relatedSong: existing?.relatedSong?.trim()
      ? existing.relatedSong
      : video.songTitle || "",
    relatedCampaign: existing?.relatedCampaign?.trim()
      ? existing.relatedCampaign
      : video.campaignName || "",
    platform: "YouTube",
    publishDate: video.publishedAt
      ? new Date(video.publishedAt).toISOString().slice(0, 10)
      : existing?.publishDate || "",
    url: video.videoUrl,
    niche: existing?.niche ?? "",
    genre: existing?.genre ?? "",
    mood: existing?.mood ?? "",
    titleUsed: video.title,
    thumbnailText: existing?.thumbnailText ?? "",
    descriptionNotes,
    tagsUsed: existing?.tagsUsed ?? "",
    callToAction: existing?.callToAction ?? "",
    views: stats.viewCount,
    impressions: existing?.impressions ?? 0,
    clicks: existing?.clicks ?? 0,
    clickThroughRate: existing?.clickThroughRate ?? 0,
    likes: stats.likeCount,
    comments: stats.commentCount,
    shares: existing?.shares ?? 0,
    saves: existing?.saves ?? 0,
    subscribersGained: existing?.subscribersGained ?? 0,
    watchTimeHours: existing?.watchTimeHours ?? 0,
    averageViewDuration: existing?.averageViewDuration ?? 0,
    retentionNotes: existing?.retentionNotes ?? "",
    revenue: existing?.revenue ?? 0,
    sales: existing?.sales ?? 0,
    conversionRate: existing?.conversionRate ?? 0,
    whatWorked: existing?.whatWorked ?? "",
    whatDidNotWork: existing?.whatDidNotWork ?? "",
    improvementIdeas: existing?.improvementIdeas ?? "",
    nextActions: existing?.nextActions ?? "",
    rating: existing?.rating ?? 0,
    notes,
    experimentId: existing?.experimentId ?? "",
    experimentName: existing?.experimentName ?? "",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

export function filterYouTubeVideosForCampaign(
  videos: YouTubeVideoRecord[],
  campaignId: string,
  campaignName?: string,
): YouTubeVideoRecord[] {
  const nameNorm = campaignName?.trim().toLowerCase() ?? ""
  return videos.filter(
    (video) =>
      (campaignId && video.campaignId === campaignId) ||
      (nameNorm && video.campaignName.trim().toLowerCase() === nameNorm),
  )
}
