"use server"

import { revalidatePath } from "next/cache"

import { getAnalyticsRecords } from "@/lib/actions/analytics-records"
import { getAssets } from "@/lib/actions/assets"
import { getCampaigns } from "@/lib/actions/campaigns"
import { createExperiment, getExperiments } from "@/lib/actions/experiments"
import { createLearning, getLearnings } from "@/lib/actions/learnings"
import { getDriveFiles } from "@/lib/actions/drive-integration"
import { getMerchIdeas } from "@/lib/actions/merch-ideas"
import { getMockupPromptRecords } from "@/lib/actions/mockup-prompts"
import { getProductListings } from "@/lib/actions/product-listings"
import { getQualityReviews } from "@/lib/actions/quality-reviews"
import { getReleasePlans } from "@/lib/actions/release-plans"
import { getYouTubePackages } from "@/lib/actions/youtube-packages"
import { getYouTubeThumbnails } from "@/lib/actions/youtube-thumbnails"
import { getYouTubeVideos } from "@/lib/actions/youtube-integration"
import {
  buildDetectedPatterns,
  summarizePatterns,
  type PatternDetectionDataset,
} from "@/lib/patterns/detectors"
import type {
  DetectedPattern,
  PatternDetectInput,
  PatternDetectResponse,
} from "@/lib/patterns/types"
import { buildLearningUrl } from "@/lib/learning-prefill"
import { createId } from "@/lib/storage"
import type { ExperimentRecord, LearningRecord } from "@/lib/types"

const REVALIDATE_PATHS = [
  "/",
  "/patterns",
  "/learnings",
  "/experiments",
  "/analytics",
  "/quality",
  "/videos",
  "/campaigns",
  "/copilot",
  "/data-health",
  "/automation",
]

function revalidatePatternRoutes() {
  for (const path of REVALIDATE_PATHS) revalidatePath(path)
}

async function safeLoad<T>(label: string, loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader()
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[Patterns] Failed to load ${label}:`,
        error instanceof Error ? error.message : String(error),
      )
    }
    return fallback
  }
}

export async function loadPatternDetectionDataset(): Promise<PatternDetectionDataset> {
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
  }
}

/** Derive pattern insights from local records (no persistence). */
export async function detectPatterns(
  input: PatternDetectInput = {},
): Promise<PatternDetectResponse> {
  try {
    const dataset = await loadPatternDetectionDataset()
    const patterns = buildDetectedPatterns(dataset, input)
    return {
      patterns,
      scannedAt: Date.now(),
      summary: summarizePatterns(patterns),
    }
  } catch {
    return {
      patterns: [],
      scannedAt: Date.now(),
      summary: {
        total: 0,
        highConfidence: 0,
        mediumConfidence: 0,
        lowConfidence: 0,
        earlySignals: 0,
        learningOpportunities: 0,
        repeatedIssues: 0,
      },
    }
  }
}

function evidenceText(pattern: DetectedPattern): string {
  return pattern.evidence.map((item) => `${item.label}: ${item.value}`).join("\n")
}

function learningTypeFromPattern(pattern: DetectedPattern): string {
  switch (pattern.patternType) {
    case "youtube-title":
      return "YouTube Title"
    case "thumbnail":
      return "Visual Style"
    case "experiment":
      return "Experiment Result"
    case "product-merch":
      return "Product Listing"
    case "campaign-readiness":
      return "Campaign Process"
    default:
      return "Pattern"
  }
}

function experimentTypeFromPattern(pattern: DetectedPattern): string {
  switch (pattern.patternType) {
    case "youtube-title":
      return "YouTube Title"
    case "thumbnail":
      return "Thumbnail"
    case "product-merch":
      return "Product Listing"
    default:
      return "Other"
  }
}

export async function createLearningFromPattern(
  pattern: DetectedPattern,
): Promise<{ success: boolean; message: string; record?: LearningRecord; href?: string }> {
  try {
    const related = pattern.relatedRecords[0]
    const record = await createLearning({
      title: `Pattern: ${pattern.title}`,
      learningType: learningTypeFromPattern(pattern),
      category: pattern.patternType === "learning-gap" ? "Opportunity" : "Pattern",
      confidence:
        pattern.confidence === "high"
          ? "High"
          : pattern.confidence === "medium"
            ? "Medium"
            : "Low",
      impact: pattern.patternType === "repeated-issue" ? "Medium" : "High",
      status: "Active",
      campaignId: pattern.campaignId ?? "",
      campaignName: pattern.campaignName ?? "",
      artistName: pattern.artistName ?? "",
      songTitle: "",
      productName: "",
      platform: pattern.platform ?? "",
      sourceType: "pattern-engine",
      sourceId: pattern.id,
      analyticsRecordId:
        related?.sourceType === "analytics" ? related.sourceId : "",
      experimentId:
        related?.sourceType === "experiment" ? related.sourceId : "",
      qualityReviewId:
        related?.sourceType === "quality-review" ? related.sourceId : "",
      assetId: "",
      promptRunId: "",
      playbookId: "",
      insight: pattern.summary,
      evidence: evidenceText(pattern),
      recommendation: pattern.recommendation,
      repeatWhen: pattern.earlySignal ? "Validate with more records before scaling." : "",
      avoidWhen: "",
      tags: ["pattern-engine", pattern.patternType, pattern.category.toLowerCase()],
      notes: "Created from Pattern Detection Engine.",
    })

    revalidatePatternRoutes()
    return {
      success: true,
      message: "Learning created from pattern.",
      record,
      href: `/learnings?recordId=${encodeURIComponent(record.id)}`,
    }
  } catch (error) {
    const href = buildLearningUrl({
      title: `Pattern: ${pattern.title}`,
      learningType: learningTypeFromPattern(pattern),
      category: "Pattern",
      insight: pattern.summary,
      evidence: evidenceText(pattern),
      recommendation: pattern.recommendation,
      campaignId: pattern.campaignId,
      campaignName: pattern.campaignName,
      platform: pattern.platform,
      sourceType: "pattern-engine",
      sourceId: pattern.id,
    })
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not create learning.",
      href,
    }
  }
}

export async function createExperimentFromPattern(
  pattern: DetectedPattern,
): Promise<{ success: boolean; message: string; record?: ExperimentRecord; href?: string }> {
  try {
    const record = await createExperiment({
      id: createId("experiment"),
      campaignId: pattern.campaignId ?? "",
      campaignName: pattern.campaignName ?? "",
      experimentName: `Test: ${pattern.title}`,
      experimentType: experimentTypeFromPattern(pattern),
      status: "Idea",
      platform: pattern.platform ?? "",
      hypothesis: pattern.recommendation,
      variantA: "",
      variantB: "",
      variantC: "",
      winner: "",
      resultSummary: "",
      metricFocus:
        pattern.patternType === "youtube-title"
          ? "Views"
          : pattern.patternType === "thumbnail"
            ? "CTR"
            : "",
      startDate: "",
      endDate: "",
      notes: `Pattern evidence:\n${evidenceText(pattern)}`,
      whatWorked: "",
      whatDidNotWork: "",
      nextTestIdea: "",
      relatedAnalyticsNotes: pattern.summary,
      variantAMetric: "",
      variantBMetric: "",
      variantCMetric: "",
      analyticsRecordId:
        pattern.relatedRecords.find((item) => item.sourceType === "analytics")?.sourceId ?? "",
      analyticsRecordName: "",
      confidenceNotes: pattern.earlySignal ? "Early signal — validate before scaling." : "",
      learningSummary: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    revalidatePatternRoutes()
    return {
      success: true,
      message: "Experiment created from pattern.",
      record,
      href: `/experiments?recordId=${encodeURIComponent(record.id)}`,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not create experiment.",
      href: `/experiments?hypothesis=${encodeURIComponent(pattern.recommendation)}&campaignId=${encodeURIComponent(pattern.campaignId ?? "")}`,
    }
  }
}

export { loadPatternDetectionDataset as loadPatternDetectionDatasetForScans }
