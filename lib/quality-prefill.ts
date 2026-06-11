import type { QualityReviewFormValues } from "@/lib/types"
import { emptyQualityReviewForm } from "@/lib/quality-reviews"

export function normalizeSourceRecordType(value: string | undefined | null): string {
  const trimmed = (value ?? "").trim()
  if (!trimmed) return ""
  const lower = trimmed.toLowerCase()
  if (lower === "youtubepackage" || lower === "youtube-package") return "youtube-package"
  if (lower === "youtubethumbnail" || lower === "youtube-thumbnail") return "youtube-thumbnail"
  if (lower === "socialrepurposing" || lower === "social-repurposing") return "social-repurposing"
  if (lower === "emailcampaign" || lower === "email-campaign") return "email-campaign"
  if (lower === "merchidea" || lower === "merch-idea") return "merch-idea"
  if (lower === "productlisting" || lower === "product-listing") return "product-listing"
  if (lower === "mockupprompt" || lower === "mockup-prompt") return "mockup-prompt"
  if (lower === "promptrun" || lower === "prompt-run") return "prompt-run"
  if (lower === "experiment") return "experiment"
  if (lower === "asset") return "asset"
  if (lower === "youtubevideo" || lower === "youtube-video") return "YouTubeVideo"
  return trimmed
}

export function buildQualityReviewUrl(params: {
  campaignId?: string
  campaignName?: string
  sourceRecordType?: string
  sourceRecordId?: string
  sourcePromptRunId?: string
  sourceExperimentId?: string
  reviewType?: string
  recordId?: string
  contextTitle?: string
}): string {
  const search = new URLSearchParams()
  if (params.recordId) search.set("recordId", params.recordId)
  if (params.campaignId) search.set("campaignId", params.campaignId)
  if (params.campaignName) search.set("campaignName", params.campaignName)
  const sourceType = normalizeSourceRecordType(params.sourceRecordType)
  if (sourceType) search.set("sourceRecordType", sourceType)
  if (params.sourceRecordId) search.set("sourceRecordId", params.sourceRecordId)
  if (params.sourcePromptRunId) search.set("sourcePromptRunId", params.sourcePromptRunId)
  if (params.sourceExperimentId) search.set("sourceExperimentId", params.sourceExperimentId)
  if (params.reviewType) search.set("reviewType", params.reviewType)
  if (params.contextTitle?.trim()) search.set("contextTitle", params.contextTitle.trim())
  const qs = search.toString()
  return qs ? `/quality?${qs}` : "/quality"
}

export function reviewTypeForSource(sourceRecordType: string, variant?: string): string {
  const type = normalizeSourceRecordType(sourceRecordType)
  if (type === "youtube-package") return "YouTube Package"
  if (type === "youtube-thumbnail") {
    return variant === "prompt" ? "Thumbnail Prompt" : "Thumbnail"
  }
  if (type === "social-repurposing") return "Social Caption"
  if (type === "email-campaign") return "Email Campaign"
  if (type === "merch-idea") return "Merch Concept"
  if (type === "product-listing") return "Product Listing"
  if (type === "mockup-prompt") return "Mockup Prompt"
  if (type === "prompt-run") return "Prompt Quality"
  if (type === "experiment") return "Experiment Variant"
  if (type === "asset") return "Thumbnail"
  if (type === "YouTubeVideo") return "YouTube Package"
  return "Other"
}

export function buildSuggestedReviewName(
  reviewType: string,
  params?: {
    contextTitle?: string | null
    campaignName?: string | null
  },
): string {
  const contextTitle = params?.contextTitle?.trim()
  if (contextTitle) return `${reviewType} — ${contextTitle}`
  const campaignName = params?.campaignName?.trim()
  if (campaignName) return `${reviewType} — ${campaignName}`
  return `${reviewType} Review`
}

export function applyCampaignPrefillToQualityForm(
  form: QualityReviewFormValues,
  campaign: {
    id: string
    campaignName?: string
    artistName?: string
    songTitle?: string
    productName?: string
  },
): QualityReviewFormValues {
  return {
    ...form,
    campaignId: campaign.id,
    campaignName: campaign.campaignName ?? form.campaignName,
    artistName: campaign.artistName ?? form.artistName,
    songTitle: campaign.songTitle ?? form.songTitle,
    productName: campaign.productName ?? form.productName,
  }
}

export function newQualityReviewFormFromParams(params: {
  reviewType?: string | null
  campaignId?: string | null
  campaignName?: string | null
  contextTitle?: string | null
  sourceRecordType?: string | null
  sourceRecordId?: string | null
  sourcePromptRunId?: string | null
  sourceExperimentId?: string | null
}): QualityReviewFormValues {
  const sourceRecordType = normalizeSourceRecordType(params.sourceRecordType)
  const reviewType =
    params.reviewType?.trim() ||
    (sourceRecordType
      ? reviewTypeForSource(sourceRecordType)
      : params.sourcePromptRunId
        ? "Prompt Quality"
        : params.sourceExperimentId
          ? "Experiment Variant"
          : params.campaignId
            ? "Campaign Readiness"
            : "Other")

  const form = emptyQualityReviewForm(reviewType)
  const reviewName = buildSuggestedReviewName(reviewType, {
    contextTitle: params.contextTitle,
    campaignName: params.campaignName,
  })

  return {
    ...form,
    reviewName,
    campaignId: params.campaignId?.trim() ?? "",
    campaignName: params.campaignName?.trim() ?? "",
    platform: sourceRecordType === "YouTubeVideo" ? "YouTube" : form.platform,
    sourceRecordType,
    sourceRecordId: params.sourceRecordId?.trim() ?? "",
    sourcePromptRunId: params.sourcePromptRunId?.trim() ?? "",
    sourceExperimentId: params.sourceExperimentId?.trim() ?? "",
  }
}
