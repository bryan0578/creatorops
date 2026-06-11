import { buildLearningUrl } from "@/lib/learning-prefill"
import { buildQualityReviewUrl } from "@/lib/quality-prefill"
import type { YouTubeVideoRecord } from "@/lib/types"
import { formatDurationLabel, parseDurationSeconds } from "@/lib/data/videos"

export function buildExperimentUrlFromVideo(
  video: YouTubeVideoRecord,
  experimentType: "Title Test" | "Thumbnail Test" = "Title Test",
): string {
  const search = new URLSearchParams()
  if (video.campaignId) search.set("campaignId", video.campaignId)
  if (video.campaignName) search.set("campaignName", video.campaignName)
  search.set("platform", "YouTube")
  search.set("experimentType", experimentType)
  search.set(
    "hypothesis",
    "Changing title or thumbnail may improve click-through and engagement.",
  )
  search.set(
    "notes",
    `YouTube video: ${video.title}\n${video.videoUrl}`,
  )
  return `/experiments?${search.toString()}`
}

export function buildQualityReviewUrlFromVideo(
  video: YouTubeVideoRecord,
  reviewType: "YouTube Package" | "Thumbnail" = "YouTube Package",
): string {
  return buildQualityReviewUrl({
    reviewType,
    campaignId: video.campaignId,
    campaignName: video.campaignName,
    sourceRecordType: "YouTubeVideo",
    sourceRecordId: video.id,
    contextTitle: video.title,
  })
}

export function buildLearningUrlFromVideo(video: YouTubeVideoRecord): string {
  const views = (video.viewCount ?? 0).toLocaleString()
  const likes = (video.likeCount ?? 0).toLocaleString()
  const comments = (video.commentCount ?? 0).toLocaleString()
  const published = video.publishedAt
    ? new Date(video.publishedAt).toLocaleDateString()
    : "unknown date"
  const durationSeconds = parseDurationSeconds(video.duration)
  const durationLabel = formatDurationLabel(video.duration, durationSeconds)

  const search = new URLSearchParams()
  search.set("learningType", "Analytics Review")
  search.set("category", "Opportunity")
  if (video.campaignId) search.set("campaignId", video.campaignId)
  if (video.campaignName) search.set("campaignName", video.campaignName)
  if (video.analyticsRecordId) search.set("analyticsRecordId", video.analyticsRecordId)
  search.set("sourceType", "YouTubeVideo")
  search.set("sourceId", video.id)
  search.set("platform", "YouTube")
  search.set("title", `Learning — ${video.title}`)
  search.set(
    "insight",
    `This video reached ${views} views with ${likes} likes and ${comments} comments.`,
  )
  search.set(
    "evidence",
    [
      `Title: ${video.title}`,
      `Channel: ${video.channelTitle}`,
      `Published: ${published}`,
      `Duration: ${durationLabel}`,
      `Views: ${views}`,
      `Likes: ${likes}`,
      `Comments: ${comments}`,
      video.lastSyncedAt
        ? `Last synced: ${new Date(video.lastSyncedAt).toLocaleString()}`
        : "",
      video.videoUrl,
    ]
      .filter(Boolean)
      .join("\n"),
  )
  search.set(
    "recommendation",
    "Review title, thumbnail, and audience response to decide what to repeat or test next.",
  )

  return `/learnings?${search.toString()}`
}

export function buildAnalyticsHref(video: YouTubeVideoRecord): string {
  if (!video.analyticsRecordId?.trim()) return "/analytics"
  return `/analytics?recordId=${encodeURIComponent(video.analyticsRecordId)}`
}

export function buildExternalLinkHref(video: YouTubeVideoRecord): string {
  if (video.externalLinkId?.trim()) {
    return `/integrations?tab=details&recordId=${encodeURIComponent(video.externalLinkId)}`
  }
  return `/videos?recordId=${encodeURIComponent(video.id)}`
}
