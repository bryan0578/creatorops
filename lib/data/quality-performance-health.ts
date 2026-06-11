import { buildQualityPerformanceInsights } from "@/lib/quality-performance/detectors"
import type { QualityPerformanceDataset } from "@/lib/quality-performance/correlation"
import type { DataHealthIssue, DataHealthScanInput } from "@/lib/data/data-health"

function issueId(parts: string[]): string {
  return parts.filter(Boolean).join(":")
}

function pushIssue(issues: DataHealthIssue[], issue: DataHealthIssue) {
  if (issues.some((item) => item.id === issue.id)) return
  issues.push(issue)
}

function datasetFromInput(input: DataHealthScanInput): QualityPerformanceDataset & {
  learnings: DataHealthScanInput["learnings"]
} {
  return {
    campaigns: input.campaigns,
    analyticsRecords: input.analyticsRecords,
    youtubeVideos: input.youtubeVideos ?? [],
    youtubePackages: input.youtubePackages,
    youtubeThumbnails: input.youtubeThumbnails,
    qualityReviews: input.qualityReviews,
    productListings: input.productListings,
    merchIdeas: input.merchIdeas,
    mockupPrompts: input.mockupPrompts,
    externalLinks: input.externalLinks,
    learnings: input.learnings,
  }
}

/** Low/medium severity quality/performance gap hints (read-only). */
export function scanQualityPerformanceWarnings(
  input: DataHealthScanInput,
  issues: DataHealthIssue[],
): void {
  try {
    const dataset = datasetFromInput(input)
    const insights = buildQualityPerformanceInsights(dataset, { limit: 30 })
    const seen = new Set<string>()

    for (const insight of insights) {
      if (seen.size >= 8) break

      const isGap =
        insight.insightType === "review-coverage-gap" ||
        insight.insightType === "learning-gap"
      const isOutlier =
        insight.insightType === "high-quality-low-performance" ||
        insight.insightType === "low-quality-high-performance"
      if (!isGap && !isOutlier) continue
      if (insight.confidence === "low" && insight.earlySignal && !isOutlier) continue
      if (seen.has(insight.id)) continue
      seen.add(insight.id)

      pushIssue(issues, {
        id: issueId(["quality-performance", insight.id]),
        severity: insight.confidence === "high" ? "warning" : "info",
        category: "incomplete-records",
        title: insight.title,
        description: `${insight.summary} ${insight.recommendation}`,
        sourceType: "quality-performance",
        sourceId: insight.id,
        campaignId: insight.campaignId,
        campaignName: insight.campaignName,
        href: insight.campaignId
          ? `/quality-performance?campaignId=${encodeURIComponent(insight.campaignId)}&tab=gaps`
          : "/quality-performance?tab=gaps",
        suggestedAction: isGap
          ? "Review quality/performance gap"
          : "Review quality/performance outlier",
      })
    }
  } catch {
    // must never break data health scan
  }
}
