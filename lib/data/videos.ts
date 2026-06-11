/**
 * Video Intelligence — derived helpers for imported YouTubeVideo records.
 */

import { filterYouTubeVideosForCampaign } from "@/lib/youtube/mappers"
import type {
  CampaignRecord,
  ExperimentRecord,
  LearningRecord,
  QualityReviewRecord,
  YouTubePackage,
  YouTubeVideoRecord,
} from "@/lib/types"

export type VideoType = "short" | "long-form" | "unknown"

export const VIDEO_STATS_STALE_MS = 7 * 24 * 60 * 60 * 1000

export const VIDEO_INTELLIGENCE_TABS = [
  { value: "overview", label: "Overview" },
  { value: "all", label: "All Videos" },
  { value: "unlinked", label: "Unlinked" },
  { value: "campaign", label: "Campaign Videos" },
  { value: "shorts", label: "Shorts" },
  { value: "needs-attention", label: "Needs Attention" },
  { value: "performance", label: "Performance" },
  { value: "learnings", label: "Related Learnings" },
] as const

export type VideoIntelligenceTab = (typeof VIDEO_INTELLIGENCE_TABS)[number]["value"]

export interface VideoIntelligenceRelations {
  qualityReviews: QualityReviewRecord[]
  learnings: LearningRecord[]
  experiments: ExperimentRecord[]
  youtubePackages: YouTubePackage[]
}

export interface EnrichedVideoRecord extends YouTubeVideoRecord {
  videoType: VideoType
  durationSeconds: number | null
  durationLabel: string
  isStatsStale: boolean
  hasAnalytics: boolean
  hasExternalLink: boolean
  hasQualityReview: boolean
  hasLearning: boolean
  qualityScore: number | null
  qualityReadiness: string | null
  learningCount: number
  experimentCount: number
  latestQualityReviewId: string | null
  latestLearningId: string | null
  engagementRate: number | null
  suggestedCampaignId: string | null
  suggestedCampaignName: string | null
}

export interface VideoAttentionItem {
  videoId: string
  video: EnrichedVideoRecord
  issue: string
  whyItMatters: string
  suggestedAction: string
  actionHref: string
  actionLabel: string
  severity: "high" | "medium" | "low" | "info"
}

export interface VideoIntelligenceSummary {
  totalVideos: number
  linkedCount: number
  unlinkedCount: number
  totalViews: number
  totalLikes: number
  totalComments: number
  needsSyncCount: number
  missingAnalyticsCount: number
  missingQualityReviewCount: number
  missingLearningCount: number
  shortsCount: number
  attentionCount: number
}

export interface VideoIntelligenceFilterState {
  search: string
  campaignId: string
  videoType: "all" | VideoType
  syncStatus: "all" | "fresh" | "stale" | "never"
  hasAnalytics: "all" | "yes" | "no"
  hasQualityReview: "all" | "yes" | "no"
  hasLearning: "all" | "yes" | "no"
  dateFrom: string
  dateTo: string
  channelTitle: string
}

export function emptyVideoFilters(): VideoIntelligenceFilterState {
  return {
    search: "",
    campaignId: "",
    videoType: "all",
    syncStatus: "all",
    hasAnalytics: "all",
    hasQualityReview: "all",
    hasLearning: "all",
    dateFrom: "",
    dateTo: "",
    channelTitle: "",
  }
}

export function parseDurationSeconds(duration: string): number | null {
  const trimmed = duration?.trim()
  if (!trimmed) return null
  const match = trimmed.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i)
  if (!match) return null
  const hours = Number(match[1] ?? 0)
  const minutes = Number(match[2] ?? 0)
  const seconds = Number(match[3] ?? 0)
  const total = hours * 3600 + minutes * 60 + seconds
  return Number.isFinite(total) ? total : null
}

export function formatDurationLabel(duration: string, durationSeconds: number | null): string {
  if (durationSeconds != null && durationSeconds > 0) {
    if (durationSeconds < 60) return `${durationSeconds}s`
    const minutes = Math.floor(durationSeconds / 60)
    const seconds = durationSeconds % 60
    if (minutes < 60) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remMinutes = minutes % 60
    return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`
  }
  return duration?.trim() || "—"
}

export function deriveVideoType(video: YouTubeVideoRecord): VideoType {
  const seconds = parseDurationSeconds(video.duration)
  if (seconds != null) {
    if (seconds <= 60) return "short"
    if (seconds > 60) return "long-form"
  }

  const title = video.title.toLowerCase()
  const url = video.videoUrl.toLowerCase()
  if (
    title.includes("#shorts") ||
    title.includes(" short") ||
    url.includes("/shorts/") ||
    url.includes("youtube.com/shorts/")
  ) {
    return "short"
  }

  if (seconds == null) return "unknown"
  return "long-form"
}

export function isVideoStatsStale(video: YouTubeVideoRecord, now = Date.now()): boolean {
  if (!video.lastSyncedAt) return true
  return now - video.lastSyncedAt > VIDEO_STATS_STALE_MS
}

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase()
}

function titleContains(haystack: string, needle: string): boolean {
  const n = norm(needle)
  if (!n || n.length < 2) return false
  return norm(haystack).includes(n)
}

export function suggestCampaignForVideo(
  video: YouTubeVideoRecord,
  campaigns: CampaignRecord[],
  youtubePackages: YouTubePackage[] = [],
): { campaignId: string; campaignName: string; reason: string } | null {
  for (const campaign of campaigns) {
    if (campaign.songTitle && titleContains(video.title, campaign.songTitle)) {
      return {
        campaignId: campaign.id,
        campaignName: campaign.campaignName,
        reason: `Song title "${campaign.songTitle}" appears in the video title`,
      }
    }
  }

  for (const campaign of campaigns) {
    if (campaign.artistName && titleContains(video.title, campaign.artistName)) {
      return {
        campaignId: campaign.id,
        campaignName: campaign.campaignName,
        reason: `Artist "${campaign.artistName}" appears in the video title`,
      }
    }
    if (campaign.artistName && titleContains(video.channelTitle, campaign.artistName)) {
      return {
        campaignId: campaign.id,
        campaignName: campaign.campaignName,
        reason: `Artist "${campaign.artistName}" appears in the channel name`,
      }
    }
  }

  for (const campaign of campaigns) {
    const name = campaign.campaignName?.trim()
    if (!name || name.length < 4) continue
    const keywords = name.split(/[\s\-–—|]+/).filter((part) => part.length >= 4)
    if (keywords.some((keyword) => titleContains(video.title, keyword))) {
      return {
        campaignId: campaign.id,
        campaignName: campaign.campaignName,
        reason: `Campaign name keyword match for "${name}"`,
      }
    }
  }

  const pkg = youtubePackages.find(
    (item) =>
      titleContains(video.title, item.title) ||
      (item.campaignId &&
        campaigns.some(
          (campaign) =>
            campaign.id === item.campaignId && titleContains(video.title, campaign.songTitle),
        )),
  )
  if (pkg?.campaignId) {
    const campaign = campaigns.find((item) => item.id === pkg.campaignId)
    if (campaign) {
      return {
        campaignId: campaign.id,
        campaignName: campaign.campaignName,
        reason: `YouTube package "${pkg.title}" matches this video`,
      }
    }
  }

  return null
}

function qualityReviewsForVideo(
  video: YouTubeVideoRecord,
  reviews: QualityReviewRecord[],
): QualityReviewRecord[] {
  return reviews.filter(
    (review) =>
      (review.sourceRecordType === "YouTubeVideo" &&
        review.sourceRecordId === video.id) ||
      (review.campaignId && review.campaignId === video.campaignId) ||
      (video.campaignName &&
        norm(review.campaignName) === norm(video.campaignName)),
  )
}

function learningsForVideo(
  video: YouTubeVideoRecord,
  learnings: LearningRecord[],
): LearningRecord[] {
  return learnings.filter(
    (learning) =>
      (learning.sourceType === "YouTubeVideo" && learning.sourceId === video.id) ||
      (video.analyticsRecordId &&
        learning.analyticsRecordId === video.analyticsRecordId) ||
      (video.campaignId && learning.campaignId === video.campaignId),
  )
}

function experimentsForVideo(
  video: YouTubeVideoRecord,
  experiments: ExperimentRecord[],
): ExperimentRecord[] {
  return experiments.filter(
    (experiment) =>
      experiment.campaignId === video.campaignId ||
      (video.campaignName &&
        norm(experiment.campaignName) === norm(video.campaignName)) ||
      experiment.notes.toLowerCase().includes(video.youtubeVideoId.toLowerCase()) ||
      experiment.notes.toLowerCase().includes(video.title.toLowerCase()),
  )
}

export function enrichVideoRecord(
  video: YouTubeVideoRecord,
  relations: VideoIntelligenceRelations,
  campaigns: CampaignRecord[] = [],
): EnrichedVideoRecord {
  const durationSeconds = parseDurationSeconds(video.duration)
  const videoType = deriveVideoType(video)
  const reviews = qualityReviewsForVideo(video, relations.qualityReviews)
  const videoLearnings = learningsForVideo(video, relations.learnings)
  const videoExperiments = experimentsForVideo(video, relations.experiments)
  const latestReview = reviews.sort((a, b) => b.updatedAt - a.updatedAt)[0]
  const views = video.viewCount ?? 0
  const likes = video.likeCount ?? 0
  const comments = video.commentCount ?? 0
  const engagement =
    views > 0 ? ((likes + comments) / views) * 100 : null
  const suggestion = !video.campaignId
    ? suggestCampaignForVideo(video, campaigns, relations.youtubePackages)
    : null

  return {
    ...video,
    videoType,
    durationSeconds,
    durationLabel: formatDurationLabel(video.duration, durationSeconds),
    isStatsStale: isVideoStatsStale(video),
    hasAnalytics: Boolean(video.analyticsRecordId?.trim()),
    hasExternalLink: Boolean(video.externalLinkId?.trim()),
    hasQualityReview: reviews.length > 0,
    hasLearning: videoLearnings.length > 0,
    qualityScore: latestReview?.overallScore ?? null,
    qualityReadiness: latestReview?.readinessLabel ?? null,
    learningCount: videoLearnings.length,
    experimentCount: videoExperiments.length,
    latestQualityReviewId: latestReview?.id ?? null,
    latestLearningId:
      videoLearnings.sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id ?? null,
    engagementRate: engagement,
    suggestedCampaignId: suggestion?.campaignId ?? null,
    suggestedCampaignName: suggestion?.campaignName ?? null,
  }
}

export function enrichVideos(
  videos: YouTubeVideoRecord[],
  relations: VideoIntelligenceRelations,
  campaigns: CampaignRecord[] = [],
): EnrichedVideoRecord[] {
  return videos.map((video) => enrichVideoRecord(video, relations, campaigns))
}

export function getUnlinkedVideosFromList(
  videos: EnrichedVideoRecord[],
): EnrichedVideoRecord[] {
  return videos.filter((video) => !video.campaignId?.trim())
}

export function getShortVideosFromList(
  videos: EnrichedVideoRecord[],
): EnrichedVideoRecord[] {
  return videos.filter((video) => video.videoType === "short")
}

export function buildVideoIntelligenceSummary(
  videos: EnrichedVideoRecord[],
): VideoIntelligenceSummary {
  return {
    totalVideos: videos.length,
    linkedCount: videos.filter((video) => Boolean(video.campaignId?.trim())).length,
    unlinkedCount: videos.filter((video) => !video.campaignId?.trim()).length,
    totalViews: videos.reduce((sum, video) => sum + (video.viewCount ?? 0), 0),
    totalLikes: videos.reduce((sum, video) => sum + (video.likeCount ?? 0), 0),
    totalComments: videos.reduce((sum, video) => sum + (video.commentCount ?? 0), 0),
    needsSyncCount: videos.filter((video) => video.isStatsStale).length,
    missingAnalyticsCount: videos.filter((video) => !video.hasAnalytics).length,
    missingQualityReviewCount: videos.filter((video) => !video.hasQualityReview).length,
    missingLearningCount: videos.filter(
      (video) => video.hasAnalytics && !video.hasLearning,
    ).length,
    shortsCount: videos.filter((video) => video.videoType === "short").length,
    attentionCount: buildVideosNeedingAttention(videos).length,
  }
}

export function buildVideosNeedingAttention(
  videos: EnrichedVideoRecord[],
): VideoAttentionItem[] {
  const items: VideoAttentionItem[] = []

  for (const video of videos) {
    const baseHref = `/videos?recordId=${encodeURIComponent(video.id)}`

    if (!video.campaignId?.trim()) {
      items.push({
        videoId: video.id,
        video,
        issue: "Unlinked to campaign",
        whyItMatters: "Campaign reporting and launch dashboard cannot tie performance to a release.",
        suggestedAction: "Link this video to the matching campaign.",
        actionHref: baseHref,
        actionLabel: "Link to Campaign",
        severity: "medium",
      })
    }

    if (!video.hasAnalytics) {
      items.push({
        videoId: video.id,
        video,
        issue: "Missing analytics record",
        whyItMatters: "Performance is not tracked in Analytics Tracker alongside other channels.",
        suggestedAction: "Sync stats or create an analytics record.",
        actionHref: baseHref,
        actionLabel: "Create Analytics",
        severity: "info",
      })
    }

    if (video.isStatsStale) {
      items.push({
        videoId: video.id,
        video,
        issue: "Stale YouTube stats",
        whyItMatters: "Views, likes, and comments may be outdated for decisions and learnings.",
        suggestedAction: "Sync stats from YouTube.",
        actionHref: baseHref,
        actionLabel: "Sync Stats",
        severity: "low",
      })
    }

    if (!video.hasExternalLink) {
      items.push({
        videoId: video.id,
        video,
        issue: "Missing external link",
        whyItMatters: "Published video URL is not linked in Integrations for campaign bundles.",
        suggestedAction: "Create or update the external link.",
        actionHref: baseHref,
        actionLabel: "Add External Link",
        severity: "info",
      })
    }

    if (!video.hasQualityReview && video.campaignId) {
      items.push({
        videoId: video.id,
        video,
        issue: "No quality review",
        whyItMatters: "Title, thumbnail, and package quality are not scored for optimization.",
        suggestedAction: "Create a YouTube quality review.",
        actionHref: baseHref,
        actionLabel: "Create Review",
        severity: "info",
      })
    }

    if (video.hasAnalytics && !video.hasLearning) {
      items.push({
        videoId: video.id,
        video,
        issue: "Analytics without learning",
        whyItMatters: "Performance insights are not captured for future campaigns.",
        suggestedAction: "Create a learning from video performance.",
        actionHref: baseHref,
        actionLabel: "Create Learning",
        severity: "info",
      })
    }

    if (
      video.qualityScore != null &&
      video.qualityScore < 70 &&
      video.campaignId
    ) {
      items.push({
        videoId: video.id,
        video,
        issue: "Low quality score",
        whyItMatters: `Latest review scored ${video.qualityScore}/100 — packaging may need improvement.`,
        suggestedAction: "Review title, thumbnail, or package and run an experiment.",
        actionHref: baseHref,
        actionLabel: "Open Review",
        severity: "medium",
      })
    }

    if (!video.thumbnailUrl?.trim()) {
      items.push({
        videoId: video.id,
        video,
        issue: "Missing thumbnail",
        whyItMatters: "Video cards and dashboards cannot show a preview image.",
        suggestedAction: "Sync stats to refresh metadata from YouTube.",
        actionHref: baseHref,
        actionLabel: "Sync Stats",
        severity: "low",
      })
    }

    if (video.campaignId && video.lastSyncedAt == null) {
      items.push({
        videoId: video.id,
        video,
        issue: "No synced stats",
        whyItMatters: "Imported video has never synced performance data from YouTube.",
        suggestedAction: "Run a stats sync.",
        actionHref: baseHref,
        actionLabel: "Sync Stats",
        severity: "medium",
      })
    }
  }

  const severityOrder = { high: 0, medium: 1, low: 2, info: 3 }
  return items.sort(
    (a, b) =>
      severityOrder[a.severity] - severityOrder[b.severity] ||
      (b.video.viewCount ?? 0) - (a.video.viewCount ?? 0),
  )
}

export function filterEnrichedVideos(
  videos: EnrichedVideoRecord[],
  filters: VideoIntelligenceFilterState,
): EnrichedVideoRecord[] {
  const q = filters.search.trim().toLowerCase()
  const channel = filters.channelTitle.trim().toLowerCase()
  const fromTs = filters.dateFrom ? Date.parse(filters.dateFrom) : null
  const toTs = filters.dateTo ? Date.parse(filters.dateTo) + 86_400_000 - 1 : null

  return videos.filter((video) => {
    if (filters.campaignId && video.campaignId !== filters.campaignId) return false
    if (filters.videoType !== "all" && video.videoType !== filters.videoType) return false
    if (filters.syncStatus === "fresh" && video.isStatsStale) return false
    if (filters.syncStatus === "stale" && !video.isStatsStale) return false
    if (filters.syncStatus === "never" && video.lastSyncedAt != null) return false
    if (filters.hasAnalytics === "yes" && !video.hasAnalytics) return false
    if (filters.hasAnalytics === "no" && video.hasAnalytics) return false
    if (filters.hasQualityReview === "yes" && !video.hasQualityReview) return false
    if (filters.hasQualityReview === "no" && video.hasQualityReview) return false
    if (filters.hasLearning === "yes" && !video.hasLearning) return false
    if (filters.hasLearning === "no" && video.hasLearning) return false
    if (channel && !video.channelTitle.toLowerCase().includes(channel)) return false
    if (fromTs != null && (!video.publishedAt || video.publishedAt < fromTs)) return false
    if (toTs != null && (!video.publishedAt || video.publishedAt > toTs)) return false
    if (!q) return true
    const haystack = [
      video.title,
      video.description,
      video.channelTitle,
      video.campaignName,
      video.artistName,
      video.songTitle,
      video.youtubeVideoId,
      video.videoUrl,
    ]
      .join(" ")
      .toLowerCase()
    return haystack.includes(q)
  })
}

export function groupVideosByCampaign(
  videos: EnrichedVideoRecord[],
  campaigns: CampaignRecord[],
): Array<{
  campaignId: string
  campaignName: string
  videos: EnrichedVideoRecord[]
  totalViews: number
  latestSync: number | null
}> {
  const groups = new Map<
    string,
    {
      campaignId: string
      campaignName: string
      videos: EnrichedVideoRecord[]
      totalViews: number
      latestSync: number | null
    }
  >()

  for (const video of videos) {
    if (!video.campaignId?.trim()) continue
    const campaign =
      campaigns.find((item) => item.id === video.campaignId) ??
      ({ id: video.campaignId, campaignName: video.campaignName || "Campaign" } as CampaignRecord)
    const existing = groups.get(video.campaignId) ?? {
      campaignId: video.campaignId,
      campaignName: campaign.campaignName || video.campaignName || "Campaign",
      videos: [],
      totalViews: 0,
      latestSync: null,
    }
    existing.videos.push(video)
    existing.totalViews += video.viewCount ?? 0
    if (video.lastSyncedAt) {
      existing.latestSync = Math.max(existing.latestSync ?? 0, video.lastSyncedAt)
    }
    groups.set(video.campaignId, existing)
  }

  return [...groups.values()].sort(
    (a, b) => b.totalViews - a.totalViews || b.videos.length - a.videos.length,
  )
}

export function filterVideosForCampaign(
  videos: YouTubeVideoRecord[],
  campaignId: string,
  campaignName?: string,
): YouTubeVideoRecord[] {
  return filterYouTubeVideosForCampaign(videos, campaignId, campaignName)
}

export function buildVideoHref(
  videoId: string,
  params?: Record<string, string | undefined>,
): string {
  const search = new URLSearchParams({ recordId: videoId })
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value?.trim()) search.set(key, value.trim())
    }
  }
  return `/videos?${search.toString()}`
}

export function resolveVideoIntelligenceTab(
  tabParam: string | null,
  filterParam: string | null,
  hasVideos: boolean,
): VideoIntelligenceTab {
  if (filterParam === "unlinked") return "unlinked"
  if (filterParam === "needs-attention") return "needs-attention"
  if (tabParam === "performance") return "performance"

  const valid = VIDEO_INTELLIGENCE_TABS.map((tab) => tab.value)
  if (tabParam && valid.includes(tabParam as VideoIntelligenceTab)) {
    return tabParam as VideoIntelligenceTab
  }

  return hasVideos ? "overview" : "overview"
}
