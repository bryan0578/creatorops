import type { QualityReviewFormValues } from "@/lib/types"
import { emptyQualityReviewForm } from "@/lib/quality-reviews"

export function buildQualityReviewUrl(params: {
  campaignId?: string
  sourceRecordType?: string
  sourceRecordId?: string
  sourcePromptRunId?: string
  sourceExperimentId?: string
  reviewType?: string
  recordId?: string
}): string {
  const search = new URLSearchParams()
  if (params.recordId) search.set("recordId", params.recordId)
  if (params.campaignId) search.set("campaignId", params.campaignId)
  if (params.sourceRecordType) search.set("sourceRecordType", params.sourceRecordType)
  if (params.sourceRecordId) search.set("sourceRecordId", params.sourceRecordId)
  if (params.sourcePromptRunId) search.set("sourcePromptRunId", params.sourcePromptRunId)
  if (params.sourceExperimentId) search.set("sourceExperimentId", params.sourceExperimentId)
  if (params.reviewType) search.set("reviewType", params.reviewType)
  const qs = search.toString()
  return qs ? `/quality?${qs}` : "/quality"
}

export function reviewTypeForSource(sourceRecordType: string, variant?: string): string {
  const type = sourceRecordType.trim().toLowerCase()
  if (type === "youtube-package" || type === "youtubepackage") return "YouTube Package"
  if (type === "youtube-thumbnail" || type === "youtubethumbnail") {
    return variant === "prompt" ? "Thumbnail Prompt" : "Thumbnail"
  }
  if (type === "social-repurposing") return "Social Caption"
  if (type === "email-campaign") return "Email Campaign"
  if (type === "merch-idea") return "Merch Concept"
  if (type === "product-listing") return "Product Listing"
  if (type === "mockup-prompt") return "Mockup Prompt"
  if (type === "asset") return "Thumbnail"
  return "Other"
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
  sourceRecordType?: string | null
  sourceRecordId?: string | null
  sourcePromptRunId?: string | null
  sourceExperimentId?: string | null
}): QualityReviewFormValues {
  const reviewType =
    params.reviewType?.trim() ||
    (params.sourceRecordType
      ? reviewTypeForSource(params.sourceRecordType)
      : params.sourcePromptRunId
        ? "Prompt Quality"
        : params.sourceExperimentId
          ? "Experiment Variant"
          : params.campaignId
            ? "Campaign Readiness"
            : "Other")

  const form = emptyQualityReviewForm(reviewType)
  return {
    ...form,
    campaignId: params.campaignId?.trim() ?? "",
    sourceRecordType: params.sourceRecordType?.trim() ?? "",
    sourceRecordId: params.sourceRecordId?.trim() ?? "",
    sourcePromptRunId: params.sourcePromptRunId?.trim() ?? "",
    sourceExperimentId: params.sourceExperimentId?.trim() ?? "",
  }
}
