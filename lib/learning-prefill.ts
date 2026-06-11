import type { LearningFormValues } from "@/lib/types"
import { emptyLearningForm } from "@/lib/learnings"

export function buildLearningUrl(params: {
  recordId?: string
  campaignId?: string
  campaignName?: string
  learningType?: string
  category?: string
  analyticsRecordId?: string
  experimentId?: string
  qualityReviewId?: string
  assetId?: string
  promptRunId?: string
  playbookId?: string
  sourceType?: string
  sourceId?: string
  title?: string
  insight?: string
  evidence?: string
  recommendation?: string
  platform?: string
}): string {
  const search = new URLSearchParams()
  if (params.recordId) search.set("recordId", params.recordId)
  if (params.campaignId) search.set("campaignId", params.campaignId)
  if (params.campaignName) search.set("campaignName", params.campaignName)
  if (params.learningType) search.set("learningType", params.learningType)
  if (params.category) search.set("category", params.category)
  if (params.analyticsRecordId) search.set("analyticsRecordId", params.analyticsRecordId)
  if (params.experimentId) search.set("experimentId", params.experimentId)
  if (params.qualityReviewId) search.set("qualityReviewId", params.qualityReviewId)
  if (params.assetId) search.set("assetId", params.assetId)
  if (params.promptRunId) search.set("promptRunId", params.promptRunId)
  if (params.playbookId) search.set("playbookId", params.playbookId)
  if (params.sourceType) search.set("sourceType", params.sourceType)
  if (params.sourceId) search.set("sourceId", params.sourceId)
  if (params.title) search.set("title", params.title)
  if (params.insight) search.set("insight", params.insight)
  if (params.evidence) search.set("evidence", params.evidence)
  if (params.recommendation) search.set("recommendation", params.recommendation)
  if (params.platform) search.set("platform", params.platform)
  const qs = search.toString()
  return qs ? `/learnings?${qs}` : "/learnings"
}

export function applyCampaignPrefillToLearningForm(
  form: LearningFormValues,
  campaign: {
    id: string
    campaignName?: string
    artistName?: string
    songTitle?: string
    productName?: string
  },
): LearningFormValues {
  return {
    ...form,
    campaignId: campaign.id,
    campaignName: campaign.campaignName ?? form.campaignName,
    artistName: campaign.artistName ?? form.artistName,
    songTitle: campaign.songTitle ?? form.songTitle,
    productName: campaign.productName ?? form.productName,
  }
}

export function newLearningFormFromParams(params: {
  title?: string | null
  learningType?: string | null
  category?: string | null
  campaignId?: string | null
  campaignName?: string | null
  analyticsRecordId?: string | null
  experimentId?: string | null
  qualityReviewId?: string | null
  assetId?: string | null
  promptRunId?: string | null
  playbookId?: string | null
  sourceType?: string | null
  sourceId?: string | null
  insight?: string | null
  evidence?: string | null
  recommendation?: string | null
  platform?: string | null
}): LearningFormValues {
  const form = emptyLearningForm(params.learningType?.trim() || "Other")
  return {
    ...form,
    title: params.title?.trim() ?? "",
    platform: params.platform?.trim() ?? form.platform,
    insight: params.insight?.trim() ?? "",
    evidence: params.evidence?.trim() ?? "",
    recommendation: params.recommendation?.trim() ?? "",
    category: params.category?.trim() ?? form.category,
    campaignId: params.campaignId?.trim() ?? "",
    campaignName: params.campaignName?.trim() ?? "",
    analyticsRecordId: params.analyticsRecordId?.trim() ?? "",
    experimentId: params.experimentId?.trim() ?? "",
    qualityReviewId: params.qualityReviewId?.trim() ?? "",
    assetId: params.assetId?.trim() ?? "",
    promptRunId: params.promptRunId?.trim() ?? "",
    playbookId: params.playbookId?.trim() ?? "",
    sourceType: params.sourceType?.trim() ?? "",
    sourceId: params.sourceId?.trim() ?? "",
  }
}
