"use server"

import { revalidatePath } from "next/cache"

import { getAnalyticsRecords } from "@/lib/actions/analytics-records"
import { getCampaigns } from "@/lib/actions/campaigns"
import { createExperiment, getExperiments } from "@/lib/actions/experiments"
import { createLearning, getLearnings } from "@/lib/actions/learnings"
import { getExternalLinks } from "@/lib/actions/external-links"
import { getMerchIdeas } from "@/lib/actions/merch-ideas"
import { getMockupPromptRecords } from "@/lib/actions/mockup-prompts"
import { getProductListings } from "@/lib/actions/product-listings"
import { getQualityReviews } from "@/lib/actions/quality-reviews"
import { getYouTubePackages } from "@/lib/actions/youtube-packages"
import { getYouTubeThumbnails } from "@/lib/actions/youtube-thumbnails"
import { getYouTubeVideos } from "@/lib/actions/youtube-integration"
import { buildLearningUrl } from "@/lib/learning-prefill"
import {
  buildMatchedQualityPerformanceRecords,
  filterMatches,
} from "@/lib/quality-performance/correlation"
import {
  buildQualityPerformanceInsights,
  summarizeQualityPerformance,
  type QualityPerformanceDataset,
} from "@/lib/quality-performance/detectors"
import type {
  QualityPerformanceAnalyzeInput,
  QualityPerformanceAnalyzeResponse,
  QualityPerformanceInsight,
} from "@/lib/quality-performance/types"
import { createId } from "@/lib/storage"
import type { ExperimentRecord, LearningRecord } from "@/lib/types"

const REVALIDATE_PATHS = [
  "/",
  "/quality-performance",
  "/quality",
  "/analytics",
  "/patterns",
  "/learnings",
  "/experiments",
  "/videos",
  "/campaigns",
  "/copilot",
  "/data-health",
  "/automation",
  "/product-listings",
]

function revalidateQualityPerformanceRoutes() {
  for (const path of REVALIDATE_PATHS) revalidatePath(path)
}

async function safeLoad<T>(label: string, loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader()
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[QualityPerformance] Failed to load ${label}:`,
        error instanceof Error ? error.message : String(error),
      )
    }
    return fallback
  }
}

export async function loadQualityPerformanceDataset(): Promise<
  QualityPerformanceDataset & { learnings: import("@/lib/types").LearningRecord[]; experiments: import("@/lib/types").ExperimentRecord[] }
> {
  const [
    campaigns,
    analyticsRecords,
    youtubeVideos,
    youtubePackages,
    youtubeThumbnails,
    qualityReviews,
    learnings,
    experiments,
    productListings,
    merchIdeas,
    mockupPrompts,
    externalLinks,
  ] = await Promise.all([
    safeLoad("campaigns", () => getCampaigns(), []),
    safeLoad("analytics", () => getAnalyticsRecords(), []),
    safeLoad("youtubeVideos", () => getYouTubeVideos(), []),
    safeLoad("youtubePackages", () => getYouTubePackages(), []),
    safeLoad("youtubeThumbnails", () => getYouTubeThumbnails(), []),
    safeLoad("qualityReviews", () => getQualityReviews(), []),
    safeLoad("learnings", () => getLearnings(), []),
    safeLoad("experiments", () => getExperiments(), []),
    safeLoad("productListings", () => getProductListings(), []),
    safeLoad("merchIdeas", () => getMerchIdeas(), []),
    safeLoad("mockupPrompts", () => getMockupPromptRecords(), []),
    safeLoad("externalLinks", () => getExternalLinks(), []),
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
    productListings,
    merchIdeas,
    mockupPrompts,
    externalLinks,
  }
}

/** Derive quality vs performance insights from local records (no persistence). */
export async function analyzeQualityPerformance(
  input: QualityPerformanceAnalyzeInput = {},
): Promise<QualityPerformanceAnalyzeResponse> {
  try {
    const dataset = await loadQualityPerformanceDataset()
    const allMatches = buildMatchedQualityPerformanceRecords(dataset)
    const matchedPairs = filterMatches(allMatches, input)
    const insights = buildQualityPerformanceInsights(dataset, input)
    return {
      insights,
      matchedPairs,
      scannedAt: Date.now(),
      summary: summarizeQualityPerformance(insights, matchedPairs),
    }
  } catch {
    return {
      insights: [],
      matchedPairs: [],
      scannedAt: Date.now(),
      summary: {
        matchedRecords: 0,
        averageQualityScore: 0,
        averagePerformance: 0,
        highConfidence: 0,
        earlySignals: 0,
        outliers: 0,
        learningGaps: 0,
        experimentOpportunities: 0,
      },
    }
  }
}

function evidenceText(insight: QualityPerformanceInsight): string {
  const lines = insight.evidence.map((item) => `${item.label}: ${item.value}`)
  if (insight.sampleSize) lines.push(`Sample size: ${insight.sampleSize}`)
  if (insight.qualityScore) lines.push(`Quality score: ${insight.qualityScore}`)
  if (insight.performanceMetric && insight.performanceValue !== undefined) {
    lines.push(`${insight.performanceMetric}: ${insight.performanceValue}`)
  }
  return lines.join("\n")
}

function experimentTypeFromInsight(insight: QualityPerformanceInsight): string {
  const type = (insight.reviewType ?? insight.category).toLowerCase()
  if (type.includes("thumbnail")) return "Thumbnail"
  if (type.includes("youtube") || type.includes("title")) return "YouTube Title"
  if (type.includes("product") || type.includes("merch")) return "Product Listing"
  if (type.includes("campaign")) return "Other"
  return "Other"
}

export async function createLearningFromQualityPerformanceInsight(
  insight: QualityPerformanceInsight,
): Promise<{ success: boolean; message: string; record?: LearningRecord; href?: string }> {
  try {
    const related = insight.relatedRecords[0]
    const record = await createLearning({
      title: `Quality/Performance: ${insight.title}`,
      learningType: "Quality Performance",
      category:
        insight.insightType === "learning-gap" || insight.insightType === "experiment-opportunity"
          ? "Opportunity"
          : "Insight",
      confidence:
        insight.confidence === "high"
          ? "High"
          : insight.confidence === "medium"
            ? "Medium"
            : "Low",
      impact: insight.insightType.includes("outlier") ? "Medium" : "High",
      status: "Active",
      campaignId: insight.campaignId ?? "",
      campaignName: insight.campaignName ?? "",
      artistName: insight.artistName ?? "",
      songTitle: "",
      productName: "",
      platform: insight.platform ?? "",
      sourceType: "quality-performance",
      sourceId: insight.id,
      analyticsRecordId:
        related?.sourceType === "analytics" ? related.sourceId : "",
      experimentId: "",
      qualityReviewId:
        related?.sourceType === "quality-review" ? related.sourceId : "",
      assetId: "",
      promptRunId: "",
      playbookId: "",
      insight: insight.summary,
      evidence: evidenceText(insight),
      recommendation: insight.recommendation,
      repeatWhen: insight.earlySignal ? "Validate with more matched records before scaling." : "",
      avoidWhen: "",
      tags: [
        "quality-performance",
        insight.insightType,
        insight.reviewType?.toLowerCase() ?? insight.category.toLowerCase(),
        insight.performanceMetric ?? "performance",
      ].filter(Boolean),
      notes: "Created from Quality vs Performance Engine.",
    })

    revalidateQualityPerformanceRoutes()
    return {
      success: true,
      message: "Learning created from quality/performance insight.",
      record,
      href: `/learnings?recordId=${encodeURIComponent(record.id)}`,
    }
  } catch (error) {
    const href = buildLearningUrl({
      title: `Quality/Performance: ${insight.title}`,
      learningType: "Quality Performance",
      category: "Insight",
      insight: insight.summary,
      evidence: evidenceText(insight),
      recommendation: insight.recommendation,
      campaignId: insight.campaignId,
      campaignName: insight.campaignName,
      platform: insight.platform,
      sourceType: "quality-performance",
      sourceId: insight.id,
    })
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not create learning.",
      href,
    }
  }
}

export async function createExperimentFromQualityPerformanceInsight(
  insight: QualityPerformanceInsight,
): Promise<{ success: boolean; message: string; record?: ExperimentRecord; href?: string }> {
  try {
    const record = await createExperiment({
      id: createId("experiment"),
      campaignId: insight.campaignId ?? "",
      campaignName: insight.campaignName ?? "",
      experimentName: `Test: ${insight.title}`,
      experimentType: experimentTypeFromInsight(insight),
      status: "Idea",
      platform: insight.platform ?? "",
      hypothesis: insight.recommendation,
      variantA: "",
      variantB: "",
      variantC: "",
      winner: "",
      resultSummary: "",
      metricFocus:
        insight.performanceMetric === "CTR"
          ? "CTR"
          : insight.category === "Thumbnail"
            ? "CTR"
            : "Views",
      startDate: "",
      endDate: "",
      notes: `Quality/performance evidence (n=${insight.sampleSize}):\n${evidenceText(insight)}`,
      whatWorked: "",
      whatDidNotWork: "",
      nextTestIdea: "",
      relatedAnalyticsNotes: insight.summary,
      variantAMetric: "",
      variantBMetric: "",
      variantCMetric: "",
      analyticsRecordId:
        insight.relatedRecords.find((item) => item.sourceType === "analytics")?.sourceId ?? "",
      analyticsRecordName: "",
      confidenceNotes: insight.earlySignal ? "Early signal — validate before scaling." : "",
      learningSummary: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    revalidateQualityPerformanceRoutes()
    return {
      success: true,
      message: "Experiment created from quality/performance insight.",
      record,
      href: `/experiments?recordId=${encodeURIComponent(record.id)}`,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not create experiment.",
      href: `/experiments?hypothesis=${encodeURIComponent(insight.recommendation)}&campaignId=${encodeURIComponent(insight.campaignId ?? "")}`,
    }
  }
}

export { loadQualityPerformanceDataset as loadQualityPerformanceDatasetForScans }
