"use server"

import { revalidatePath } from "next/cache"

import { getAnalyticsRecords } from "@/lib/actions/analytics-records"
import { getAssets } from "@/lib/actions/assets"
import { getCampaigns } from "@/lib/actions/campaigns"
import { createExperiment, getExperiments } from "@/lib/actions/experiments"
import { getExternalLinks } from "@/lib/actions/external-links"
import { getCollections } from "@/lib/actions/collections"
import { getRevenueRecords } from "@/lib/actions/revenue"
import { createLearning, getLearnings } from "@/lib/actions/learnings"
import { getMerchIdeas } from "@/lib/actions/merch-ideas"
import { getMockupPromptRecords } from "@/lib/actions/mockup-prompts"
import { getProductListings } from "@/lib/actions/product-listings"
import { getQualityReviews } from "@/lib/actions/quality-reviews"
import { getReleasePlans } from "@/lib/actions/release-plans"
import { getYouTubePackages } from "@/lib/actions/youtube-packages"
import { getYouTubeThumbnails } from "@/lib/actions/youtube-thumbnails"
import { getYouTubeVideos } from "@/lib/actions/youtube-integration"
import { getDriveFiles } from "@/lib/actions/drive-integration"
import { buildLearningUrl } from "@/lib/learning-prefill"
import {
  buildFeedbackSuggestions,
  getCampaignFeedbackSummaryFromSuggestions,
  summarizeFeedbackLoop,
  type FeedbackLoopDataset,
} from "@/lib/feedback-loop/suggestions"
import { findExistingLearning } from "@/lib/feedback-loop/scoring"
import type {
  CampaignFeedbackSummary,
  FeedbackLoopInput,
  FeedbackLoopResponse,
  FeedbackLoopSummary,
  FeedbackSuggestion,
} from "@/lib/feedback-loop/types"
import { createId } from "@/lib/storage"
import type { ExperimentRecord, LearningRecord } from "@/lib/types"

const REVALIDATE_PATHS = [
  "/",
  "/feedback-loop",
  "/learnings",
  "/experiments",
  "/analytics",
  "/quality",
  "/patterns",
  "/quality-performance",
  "/videos",
  "/campaigns",
  "/copilot",
  "/data-health",
  "/automation",
  "/playbooks",
]

function revalidateFeedbackRoutes() {
  for (const path of REVALIDATE_PATHS) revalidatePath(path)
}

async function safeLoad<T>(label: string, loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader()
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[FeedbackLoop] Failed to load ${label}:`,
        error instanceof Error ? error.message : String(error),
      )
    }
    return fallback
  }
}

export async function loadFeedbackLoopDataset(): Promise<FeedbackLoopDataset> {
  const [
    campaigns,
    analyticsRecords,
    youtubeVideos,
    youtubePackages,
    youtubeThumbnails,
    qualityReviews,
    learnings,
    experiments,
    assets,
    productListings,
    merchIdeas,
    mockupPrompts,
    releasePlans,
    driveFiles,
    externalLinks,
    revenueRecords,
    productCollections,
  ] = await Promise.all([
    safeLoad("campaigns", () => getCampaigns(), []),
    safeLoad("analytics", () => getAnalyticsRecords(), []),
    safeLoad("youtubeVideos", () => getYouTubeVideos(), []),
    safeLoad("youtubePackages", () => getYouTubePackages(), []),
    safeLoad("youtubeThumbnails", () => getYouTubeThumbnails(), []),
    safeLoad("qualityReviews", () => getQualityReviews(), []),
    safeLoad("learnings", () => getLearnings(), []),
    safeLoad("experiments", () => getExperiments(), []),
    safeLoad("assets", () => getAssets(), []),
    safeLoad("productListings", () => getProductListings(), []),
    safeLoad("merchIdeas", () => getMerchIdeas(), []),
    safeLoad("mockupPrompts", () => getMockupPromptRecords(), []),
    safeLoad("releasePlans", () => getReleasePlans(), []),
    safeLoad("driveFiles", () => getDriveFiles(), []),
    safeLoad("externalLinks", () => getExternalLinks(), []),
    safeLoad("revenueRecords", () => getRevenueRecords(), []),
    safeLoad("productCollections", () => getCollections(), []),
  ])

  return {
    campaigns,
    analyticsRecords,
    youtubeVideos,
    youtubePackages,
    youtubeThumbnails,
    qualityReviews,
    learnings,
    experiments,
    assets,
    productListings,
    merchIdeas,
    mockupPrompts,
    releasePlans,
    driveFiles,
    externalLinks,
    revenueRecords,
    productCollections,
  }
}

export async function getLearningFeedbackSuggestions(
  input: FeedbackLoopInput = {},
): Promise<FeedbackLoopResponse> {
  try {
    const dataset = await loadFeedbackLoopDataset()
    const suggestions = buildFeedbackSuggestions(dataset, input)
    return {
      suggestions,
      scannedAt: Date.now(),
      summary: summarizeFeedbackLoop(suggestions),
    }
  } catch {
    return {
      suggestions: [],
      scannedAt: Date.now(),
      summary: {
        totalSuggestions: 0,
        highConfidence: 0,
        campaignsNeedingRetrospective: 0,
        experimentsNeedingLearning: 0,
        patternsNeedingLearning: 0,
        qualityInsightsNeedingLearning: 0,
        playbookOpportunities: 0,
        aiContextOpportunities: 0,
        topSuggestions: [],
      },
    }
  }
}

export async function getFeedbackLoopSummary(): Promise<FeedbackLoopSummary> {
  const result = await getLearningFeedbackSuggestions({ limit: 100 })
  return result.summary
}

export async function getCampaignFeedbackSummary(
  campaignId: string,
): Promise<CampaignFeedbackSummary | null> {
  try {
    const campaigns = await getCampaigns()
    const campaign = campaigns.find((item) => item.id === campaignId)
    if (!campaign) return null
    const result = await getLearningFeedbackSuggestions({ campaignId, limit: 40 })
    return getCampaignFeedbackSummaryFromSuggestions(
      campaign.id,
      campaign.campaignName,
      result.suggestions,
    )
  } catch {
    return null
  }
}

function learningLinksFromSuggestion(suggestion: FeedbackSuggestion) {
  return {
    analyticsRecordId: suggestion.sourceType === "analytics" ? suggestion.sourceId : "",
    experimentId: suggestion.sourceType === "experiment" ? suggestion.sourceId : "",
    qualityReviewId: suggestion.sourceType === "quality-review" ? suggestion.sourceId : "",
  }
}

export async function createLearningFromFeedbackSuggestion(
  suggestion: FeedbackSuggestion,
): Promise<{ success: boolean; message: string; record?: LearningRecord; href?: string; duplicate?: boolean }> {
  try {
    const learnings = await getLearnings()
    const links = learningLinksFromSuggestion(suggestion)
    const existing = findExistingLearning(learnings, {
      sourceType: "feedback-loop",
      sourceId: suggestion.id,
      ...links,
      title: suggestion.recommendedLearning.title,
      campaignId: suggestion.campaignId,
      learningType: suggestion.recommendedLearning.learningType,
    })
    if (existing) {
      return {
        success: true,
        message: "A learning already exists for this suggestion.",
        record: existing,
        href: `/learnings?recordId=${encodeURIComponent(existing.id)}`,
        duplicate: true,
      }
    }

    const recommended = suggestion.recommendedLearning
    const record = await createLearning({
      title: recommended.title,
      learningType: recommended.learningType,
      category: recommended.category,
      confidence:
        suggestion.confidence === "high"
          ? "High"
          : suggestion.confidence === "medium"
            ? "Medium"
            : "Low",
      impact: suggestion.suggestionType.includes("retrospective") ? "High" : "Medium",
      status: "Active",
      campaignId: suggestion.campaignId ?? "",
      campaignName: suggestion.campaignName ?? "",
      artistName: suggestion.artistName ?? "",
      songTitle: "",
      productName: "",
      platform: suggestion.platform ?? "",
      sourceType: "feedback-loop",
      sourceId: suggestion.id,
      ...links,
      assetId: "",
      promptRunId: "",
      playbookId: "",
      insight: recommended.insight,
      evidence: recommended.evidence,
      recommendation: recommended.recommendation,
      repeatWhen: "",
      avoidWhen: "",
      tags: [...recommended.tags, "feedback-loop"],
      notes: `Created from Learning Feedback Loop (${suggestion.suggestionType}).`,
    })

    revalidateFeedbackRoutes()
    return {
      success: true,
      message: "Learning created from feedback suggestion.",
      record,
      href: `/learnings?recordId=${encodeURIComponent(record.id)}`,
    }
  } catch (error) {
    const recommended = suggestion.recommendedLearning
    const href = buildLearningUrl({
      title: recommended.title,
      learningType: recommended.learningType,
      category: recommended.category,
      insight: recommended.insight,
      evidence: recommended.evidence,
      recommendation: recommended.recommendation,
      campaignId: suggestion.campaignId,
      campaignName: suggestion.campaignName,
      platform: suggestion.platform,
      sourceType: "feedback-loop",
      sourceId: suggestion.id,
    })
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not create learning.",
      href,
    }
  }
}

function experimentTypeFromSuggestion(suggestion: FeedbackSuggestion): string {
  if (suggestion.sourceType === "quality-review") {
    const type = suggestion.recommendedLearning.learningType.toLowerCase()
    if (type.includes("thumbnail")) return "Thumbnail"
    if (type.includes("youtube")) return "YouTube Title"
    return "Other"
  }
  if (suggestion.suggestionType === "pattern-to-learning") return "Thumbnail"
  return "YouTube Title"
}

export async function createExperimentFromFeedbackSuggestion(
  suggestion: FeedbackSuggestion,
): Promise<{ success: boolean; message: string; record?: ExperimentRecord; href?: string }> {
  if (!suggestion.supportsExperiment) {
    return { success: false, message: "This suggestion does not include a testable experiment." }
  }

  try {
    const record = await createExperiment({
      id: createId("experiment"),
      campaignId: suggestion.campaignId ?? "",
      campaignName: suggestion.campaignName ?? "",
      experimentName: `Test: ${suggestion.title}`,
      experimentType: experimentTypeFromSuggestion(suggestion),
      status: "Idea",
      platform: suggestion.platform ?? "",
      hypothesis: suggestion.experimentHypothesis ?? suggestion.recommendedLearning.recommendation,
      variantA: "",
      variantB: "",
      variantC: "",
      winner: "",
      resultSummary: "",
      metricFocus: suggestion.sourceType === "analytics" ? "Views" : "CTR",
      startDate: "",
      endDate: "",
      notes: `Feedback loop evidence:\n${suggestion.recommendedLearning.evidence}`,
      whatWorked: "",
      whatDidNotWork: "",
      nextTestIdea: "",
      relatedAnalyticsNotes: suggestion.summary,
      variantAMetric: "",
      variantBMetric: "",
      variantCMetric: "",
      analyticsRecordId: suggestion.sourceType === "analytics" ? suggestion.sourceId : "",
      analyticsRecordName: suggestion.sourceType === "analytics" ? suggestion.sourceName : "",
      confidenceNotes: suggestion.confidence === "low" ? "Early signal — validate before scaling." : "",
      learningSummary: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    revalidateFeedbackRoutes()
    return {
      success: true,
      message: "Experiment created from feedback suggestion.",
      record,
      href: `/experiments?recordId=${encodeURIComponent(record.id)}`,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not create experiment.",
      href: `/experiments?hypothesis=${encodeURIComponent(suggestion.experimentHypothesis ?? suggestion.recommendedLearning.recommendation)}`,
    }
  }
}

export async function createPlaybookUpdateRecommendation(
  suggestion: FeedbackSuggestion,
): Promise<{ success: boolean; message: string; href: string; copyText: string }> {
  const copyText = [
    `Playbook update recommendation: ${suggestion.title}`,
    "",
    suggestion.summary,
    "",
    "Suggested step:",
    suggestion.recommendedLearning.recommendation,
    "",
    "Evidence:",
    suggestion.recommendedLearning.evidence,
  ].join("\n")

  return {
    success: true,
    message: "Playbook update recommendation ready. Open Playbooks to apply manually.",
    href: "/playbooks",
    copyText,
  }
}

export { loadFeedbackLoopDataset as loadFeedbackLoopDatasetForScans }
