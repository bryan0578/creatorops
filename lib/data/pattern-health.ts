import { buildDetectedPatterns } from "@/lib/patterns/detectors"
import type { PatternDetectionDataset } from "@/lib/patterns/detectors"
import type { DataHealthIssue, DataHealthScanInput } from "@/lib/data/data-health"

function issueId(parts: string[]): string {
  return parts.filter(Boolean).join(":")
}

function pushIssue(issues: DataHealthIssue[], issue: DataHealthIssue) {
  if (issues.some((item) => item.id === issue.id)) return
  issues.push(issue)
}

function datasetFromInput(input: DataHealthScanInput): PatternDetectionDataset {
  return {
    campaigns: input.campaigns,
    analyticsRecords: input.analyticsRecords,
    youtubeVideos: input.youtubeVideos ?? [],
    youtubePackages: input.youtubePackages,
    youtubeThumbnails: input.youtubeThumbnails,
    qualityReviews: input.qualityReviews,
    learnings: input.learnings,
    experiments: input.experiments,
    assets: input.assets,
    productListings: input.productListings,
    merchIdeas: input.merchIdeas,
    mockupPrompts: input.mockupPrompts,
    releasePlans: input.releasePlans,
    driveFiles: input.driveFiles ?? [],
  }
}

/** Low/medium severity pattern-related data health hints (read-only). */
export function scanPatternDetectionWarnings(
  input: DataHealthScanInput,
  issues: DataHealthIssue[],
): void {
  try {
    const dataset = datasetFromInput(input)
    const patterns = buildDetectedPatterns(dataset, { limit: 40 })
    const seen = new Set<string>()

    for (const pattern of patterns) {
      if (seen.size >= 8) break

      const isLearningGap = pattern.patternType === "learning-gap"
      const isRepeatedIssue = pattern.patternType === "repeated-issue"
      if (!isLearningGap && !isRepeatedIssue) continue
      if (pattern.confidence === "low" && pattern.earlySignal) continue
      if (seen.has(pattern.id)) continue
      seen.add(pattern.id)

      const severity: DataHealthIssue["severity"] =
        pattern.confidence === "high" ? "warning" : "info"

      pushIssue(issues, {
        id: issueId(["pattern-detection", pattern.id]),
        severity,
        category: isLearningGap ? "incomplete-records" : "data-issues",
        title: pattern.title,
        description: `${pattern.summary} ${pattern.recommendation}`,
        sourceType: "pattern-engine",
        sourceId: pattern.id,
        campaignId: pattern.campaignId,
        campaignName: pattern.campaignName,
        href: pattern.campaignId
          ? `/patterns?campaignId=${encodeURIComponent(pattern.campaignId)}&tab=gaps`
          : "/patterns?tab=gaps",
        suggestedAction: isLearningGap
          ? "Create a learning from this pattern"
          : "Review repeated issue in Pattern Detection",
      })
    }
  } catch {
    // Pattern health must never break the scan
  }
}
