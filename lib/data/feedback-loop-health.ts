import { buildFeedbackSuggestions, type FeedbackLoopDataset } from "@/lib/feedback-loop/suggestions"
import type { DataHealthIssue, DataHealthScanInput } from "@/lib/data/data-health"

function issueId(parts: string[]): string {
  return parts.filter(Boolean).join(":")
}

function pushIssue(issues: DataHealthIssue[], issue: DataHealthIssue) {
  if (issues.some((item) => item.id === issue.id)) return
  issues.push(issue)
}

function datasetFromInput(input: DataHealthScanInput): FeedbackLoopDataset {
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
    externalLinks: input.externalLinks,
  }
}

/** Low/medium severity learning feedback gap hints (read-only). */
export function scanFeedbackLoopWarnings(
  input: DataHealthScanInput,
  issues: DataHealthIssue[],
): void {
  try {
    const suggestions = buildFeedbackSuggestions(datasetFromInput(input), { limit: 30 })
    const seen = new Set<string>()

    for (const suggestion of suggestions) {
      if (seen.size >= 8) break
      if (suggestion.confidence === "low" && suggestion.suggestionType === "ai-context") continue
      if (seen.has(suggestion.id)) continue
      seen.add(suggestion.id)

      pushIssue(issues, {
        id: issueId(["feedback-loop", suggestion.id]),
        severity: suggestion.confidence === "high" ? "warning" : "info",
        category: "incomplete-records",
        title: suggestion.title,
        description: `${suggestion.summary} ${suggestion.recommendedLearning.recommendation}`,
        sourceType: "feedback-loop",
        sourceId: suggestion.id,
        campaignId: suggestion.campaignId,
        campaignName: suggestion.campaignName,
        href: suggestion.campaignId
          ? `/feedback-loop?campaignId=${encodeURIComponent(suggestion.campaignId)}`
          : "/feedback-loop",
        suggestedAction: "Review learning feedback suggestion",
      })
    }
  } catch {
    // must never break scan
  }
}
