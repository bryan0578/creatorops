import {
  average,
  normalizeMatchText,
  parseNumeric,
  safeEngagementRate,
  titleSimilarity,
} from "@/lib/quality-performance/scoring"
import type { MatchedQualityPerformanceRecord } from "@/lib/quality-performance/types"
import type {
  AnalyticsRecord,
  CampaignRecord,
  ExternalLinkRecord,
  MerchIdea,
  MockupPromptRecord,
  ProductListing,
  QualityReviewRecord,
  YouTubePackage,
  YouTubeThumbnailRecord,
  YouTubeVideoRecord,
} from "@/lib/types"

export interface QualityPerformanceDataset {
  campaigns: CampaignRecord[]
  analyticsRecords: AnalyticsRecord[]
  youtubeVideos: YouTubeVideoRecord[]
  youtubePackages: YouTubePackage[]
  youtubeThumbnails: YouTubeThumbnailRecord[]
  qualityReviews: QualityReviewRecord[]
  productListings: ProductListing[]
  merchIdeas: MerchIdea[]
  mockupPrompts: MockupPromptRecord[]
  externalLinks: ExternalLinkRecord[]
}

function norm(value: string | undefined | null): string {
  return normalizeMatchText(value)
}

function resolvePerformanceMetrics(input: {
  analytics?: AnalyticsRecord
  youtubeVideo?: YouTubeVideoRecord
  reviewType: string
}): {
  views: number
  likes: number
  comments: number
  engagement: number
  engagementRate: number
  ctr: number
  performanceMetric: string
  performanceValue: number
} {
  const analytics = input.analytics
  const video = input.youtubeVideo

  const views = Math.max(
    parseNumeric(analytics?.views),
    parseNumeric(video?.viewCount),
  )
  const likes = Math.max(
    parseNumeric(analytics?.likes),
    parseNumeric(video?.likeCount),
  )
  const comments = Math.max(
    parseNumeric(analytics?.comments),
    parseNumeric(video?.commentCount),
  )
  const engagement = likes + comments
  const engagementRate = safeEngagementRate(likes, comments, views)
  const ctr = parseNumeric(analytics?.clickThroughRate)

  const reviewType = input.reviewType.toLowerCase()
  let performanceMetric = "views"
  let performanceValue = views

  if (reviewType.includes("thumbnail") && ctr > 0) {
    performanceMetric = "CTR"
    performanceValue = ctr
  } else if (views > 0) {
    performanceMetric = reviewType.includes("thumbnail") ? "engagementRate" : "views"
    performanceValue = reviewType.includes("thumbnail") ? engagementRate : views
  } else if (engagement > 0) {
    performanceMetric = "engagement"
    performanceValue = engagement
  }

  return { views, likes, comments, engagement, engagementRate, ctr, performanceMetric, performanceValue }
}

function findAnalyticsById(
  records: AnalyticsRecord[],
  id: string | undefined,
): AnalyticsRecord | undefined {
  const trimmed = id?.trim()
  if (!trimmed) return undefined
  return records.find((record) => record.id === trimmed)
}

function findVideoById(
  videos: YouTubeVideoRecord[],
  id: string | undefined,
): YouTubeVideoRecord | undefined {
  const trimmed = id?.trim()
  if (!trimmed) return undefined
  return videos.find((video) => video.id === trimmed || video.youtubeVideoId === trimmed)
}

function findAnalyticsForCampaign(
  records: AnalyticsRecord[],
  campaign: CampaignRecord | undefined,
  review: QualityReviewRecord,
): AnalyticsRecord | undefined {
  if (!campaign) return undefined
  const campaignName = norm(campaign.campaignName)
  const candidates = records.filter((record) => {
    const related = norm(record.relatedCampaign)
    return related === campaignName || related.includes(campaignName) || campaignName.includes(related)
  })
  if (candidates.length === 0) return undefined
  if (candidates.length === 1) return candidates[0]

  let best: AnalyticsRecord | undefined
  let bestScore = 0
  for (const candidate of candidates) {
    const score = Math.max(
      titleSimilarity(review.reviewName, candidate.itemName),
      titleSimilarity(review.songTitle, candidate.relatedSong),
      titleSimilarity(review.artistName, candidate.relatedArtist),
    )
    if (score > bestScore) {
      bestScore = score
      best = candidate
    }
  }
  return bestScore >= 0.3 ? best : candidates[0]
}

function findAnalyticsByFuzzyTitle(
  records: AnalyticsRecord[],
  review: QualityReviewRecord,
): AnalyticsRecord | undefined {
  let best: AnalyticsRecord | undefined
  let bestScore = 0
  for (const record of records) {
    const score = Math.max(
      titleSimilarity(review.reviewName, record.itemName),
      titleSimilarity(review.songTitle, record.relatedSong),
      titleSimilarity(review.artistName, record.relatedArtist),
      titleSimilarity(review.campaignName, record.relatedCampaign),
    )
    if (score > bestScore) {
      bestScore = score
      best = record
    }
  }
  return bestScore >= 0.45 ? best : undefined
}

function findAnalyticsByUrl(
  records: AnalyticsRecord[],
  externalLinks: ExternalLinkRecord[],
  review: QualityReviewRecord,
): AnalyticsRecord | undefined {
  const link = externalLinks.find(
    (item) =>
      item.sourceRecordId === review.sourceRecordId ||
      (item.campaignId && item.campaignId === review.campaignId),
  )
  if (link?.analyticsRecordId) {
    return findAnalyticsById(records, link.analyticsRecordId)
  }
  if (!link?.url) return undefined
  const urlNorm = norm(link.url)
  return records.find((record) => norm(record.url) === urlNorm)
}

function findVideoForReview(
  videos: YouTubeVideoRecord[],
  review: QualityReviewRecord,
  analytics?: AnalyticsRecord,
): YouTubeVideoRecord | undefined {
  if (review.sourceRecordType === "youtube-video") {
    const exact = findVideoById(videos, review.sourceRecordId)
    if (exact) return exact
  }
  if (analytics?.id) {
    const linked = videos.find((video) => video.analyticsRecordId === analytics.id)
    if (linked) return linked
  }
  const campaignVideos = videos.filter(
    (video) =>
      (review.campaignId && video.campaignId === review.campaignId) ||
      norm(video.campaignName) === norm(review.campaignName),
  )
  if (campaignVideos.length === 1) return campaignVideos[0]

  let best: YouTubeVideoRecord | undefined
  let bestScore = 0
  for (const video of campaignVideos) {
    const score = Math.max(
      titleSimilarity(review.reviewName, video.title),
      titleSimilarity(review.songTitle, video.songTitle),
    )
    if (score > bestScore) {
      bestScore = score
      best = video
    }
  }
  return bestScore >= 0.35 ? best : undefined
}

function matchReviewToPerformance(
  review: QualityReviewRecord,
  dataset: QualityPerformanceDataset,
): MatchedQualityPerformanceRecord | null {
  const { analyticsRecords, youtubeVideos, campaigns, externalLinks } = dataset
  let analytics: AnalyticsRecord | undefined
  let youtubeVideo: YouTubeVideoRecord | undefined
  let matchMethod = "unmatched"

  const sourceType = review.sourceRecordType?.trim()
  const sourceId = review.sourceRecordId?.trim()

  if (sourceType === "analytics" && sourceId) {
    analytics = findAnalyticsById(analyticsRecords, sourceId)
    if (analytics) matchMethod = "source-analytics"
  }

  if (!analytics && sourceType === "youtube-video" && sourceId) {
    youtubeVideo = findVideoById(youtubeVideos, sourceId)
    if (youtubeVideo?.analyticsRecordId) {
      analytics = findAnalyticsById(analyticsRecords, youtubeVideo.analyticsRecordId)
      matchMethod = "youtube-video-analytics"
    } else if (youtubeVideo) {
      matchMethod = "youtube-video-stats"
    }
  }

  if (!analytics && sourceId) {
    const videoWithAnalytics = youtubeVideos.find(
      (video) =>
        video.analyticsRecordId &&
        (video.id === sourceId ||
          video.youtubeVideoId === sourceId ||
          video.campaignId === review.campaignId),
    )
    if (videoWithAnalytics?.analyticsRecordId) {
      analytics = findAnalyticsById(analyticsRecords, videoWithAnalytics.analyticsRecordId)
      youtubeVideo = videoWithAnalytics
      matchMethod = "linked-youtube-analytics"
    }
  }

  const campaign = campaigns.find(
    (item) =>
      (review.campaignId && item.id === review.campaignId) ||
      norm(item.campaignName) === norm(review.campaignName),
  )

  if (!analytics && campaign) {
    analytics = findAnalyticsForCampaign(analyticsRecords, campaign, review)
    if (analytics) matchMethod = "campaign-analytics"
  }

  if (!analytics) {
    analytics = findAnalyticsByUrl(analyticsRecords, externalLinks, review)
    if (analytics) matchMethod = "url-analytics"
  }

  if (!analytics) {
    analytics = findAnalyticsByFuzzyTitle(analyticsRecords, review)
    if (analytics) matchMethod = "fuzzy-title-analytics"
  }

  if (!youtubeVideo) {
    youtubeVideo = findVideoForReview(youtubeVideos, review, analytics)
  }

  if (!analytics && !youtubeVideo && !campaign) {
    return null
  }

  const metrics = resolvePerformanceMetrics({
    analytics,
    youtubeVideo,
    reviewType: review.reviewType,
  })

  return {
    id: `match:${review.id}:${analytics?.id ?? youtubeVideo?.id ?? campaign?.id ?? "none"}`,
    qualityReview: review,
    analytics,
    youtubeVideo,
    campaign,
    matchMethod,
    ...metrics,
  }
}

/** Match quality reviews to performance records without duplicating reviews. */
export function buildMatchedQualityPerformanceRecords(
  dataset: QualityPerformanceDataset,
): MatchedQualityPerformanceRecord[] {
  const seenReviewIds = new Set<string>()
  const matches: MatchedQualityPerformanceRecord[] = []

  for (const review of dataset.qualityReviews) {
    if (!review?.id || seenReviewIds.has(review.id)) continue
    try {
      const match = matchReviewToPerformance(review, dataset)
      if (!match) continue
      seenReviewIds.add(review.id)
      matches.push(match)
    } catch {
      // skip malformed review
    }
  }

  return matches
}

export function filterMatches(
  matches: MatchedQualityPerformanceRecord[],
  input: {
    campaignId?: string
    artistName?: string
    platform?: string
    reviewType?: string
    qualityReviewId?: string
    analyticsRecordId?: string
    youtubeVideoId?: string
  },
): MatchedQualityPerformanceRecord[] {
  let filtered = matches

  if (input.campaignId) {
    filtered = filtered.filter(
      (match) =>
        match.qualityReview.campaignId === input.campaignId ||
        match.campaign?.id === input.campaignId,
    )
  }
  if (input.artistName) {
    const artist = norm(input.artistName)
    filtered = filtered.filter((match) => norm(match.qualityReview.artistName) === artist)
  }
  if (input.platform) {
    const platform = norm(input.platform)
    filtered = filtered.filter((match) => norm(match.qualityReview.platform) === platform)
  }
  if (input.reviewType) {
    filtered = filtered.filter((match) => match.qualityReview.reviewType === input.reviewType)
  }
  if (input.qualityReviewId) {
    filtered = filtered.filter((match) => match.qualityReview.id === input.qualityReviewId)
  }
  if (input.analyticsRecordId) {
    filtered = filtered.filter((match) => match.analytics?.id === input.analyticsRecordId)
  }
  if (input.youtubeVideoId) {
    filtered = filtered.filter(
      (match) =>
        match.youtubeVideo?.id === input.youtubeVideoId ||
        match.youtubeVideo?.youtubeVideoId === input.youtubeVideoId,
    )
  }

  return filtered
}

export function computeDatasetPerformanceBaseline(
  matches: MatchedQualityPerformanceRecord[],
): { avgViews: number; avgEngagement: number; avgQuality: number } {
  return {
    avgViews: average(matches.map((match) => match.views)),
    avgEngagement: average(matches.map((match) => match.engagement)),
    avgQuality: average(matches.map((match) => match.qualityReview.overallScore)),
  }
}
