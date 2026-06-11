import { buildAssetLinkSuggestions, type AssetLinkingDataset } from "@/lib/asset-linking/matchers"
import type { AssetLinkSuggestion } from "@/lib/asset-linking/types"
import type { DataHealthIssue, DataHealthScanInput } from "@/lib/data/data-health"

function issueId(parts: string[]): string {
  return parts.filter(Boolean).join(":")
}

function pushIssue(issues: DataHealthIssue[], issue: DataHealthIssue) {
  if (issues.some((item) => item.id === issue.id)) return
  issues.push(issue)
}

function datasetFromInput(input: DataHealthScanInput): AssetLinkingDataset {
  return {
    campaigns: input.campaigns,
    assets: input.assets,
    driveFiles: input.driveFiles ?? [],
    driveFolders: input.driveFolders ?? [],
    youtubeVideos: input.youtubeVideos ?? [],
    productListings: [],
    merchIdeas: [],
    mockupPrompts: [],
    releasePlans: input.releasePlans ?? [],
  }
}

function suggestionHref(suggestion: AssetLinkSuggestion): string {
  if (suggestion.href) return suggestion.href
  switch (suggestion.sourceType) {
    case "drive-file":
      return `/integrations?tab=google-drive&fileId=${encodeURIComponent(suggestion.sourceId)}`
    case "asset":
      return `/assets?recordId=${encodeURIComponent(suggestion.sourceId)}`
    case "youtube-video":
      return `/videos?recordId=${encodeURIComponent(suggestion.sourceId)}`
    default:
      return "/assets"
  }
}

function severityForSuggestion(suggestion: AssetLinkSuggestion): DataHealthIssue["severity"] {
  if (suggestion.confidence === "high") return "info"
  if (suggestion.confidence === "medium") return "info"
  return "info"
}

/** Read-only asset linking hints derived from local matching (no network). */
export function scanAssetLinkingWarnings(
  input: DataHealthScanInput,
  issues: DataHealthIssue[],
): void {
  const dataset = datasetFromInput(input)
  const suggestions = buildAssetLinkSuggestions(dataset, { limit: 40 })
  const seen = new Set<string>()

  for (const suggestion of suggestions) {
    if (suggestion.confidence === "low" && suggestion.score < 40) continue
    if (seen.has(suggestion.id)) continue
    seen.add(suggestion.id)

    const title =
      suggestion.suggestionType === "create-asset-from-drive-file"
        ? "Create asset from matching Drive file"
        : suggestion.suggestionType === "drive-file-to-youtube-video"
          ? "Drive file may match YouTube video"
          : suggestion.suggestionType === "drive-file-to-campaign"
            ? "Drive file likely matches campaign"
            : suggestion.suggestionType === "drive-file-to-asset"
              ? "Drive file likely matches asset"
              : "Asset linking suggestion"

    pushIssue(issues, {
      id: issueId(["asset-linking", suggestion.id]),
      severity: severityForSuggestion(suggestion),
      category: "incomplete-records",
      title,
      description: `${suggestion.sourceName} → ${suggestion.targetName}. ${suggestion.reason}`,
      sourceType: suggestion.sourceType,
      sourceId: suggestion.sourceId,
      sourceTitle: suggestion.sourceName,
      href: suggestionHref(suggestion),
      suggestedAction: suggestion.suggestedAction,
    })

    if (seen.size >= 20) break
  }
}

export function topAssetLinkSuggestionsForCampaign(
  input: DataHealthScanInput,
  campaignId: string,
  limit = 8,
): AssetLinkSuggestion[] {
  return buildAssetLinkSuggestions(datasetFromInput(input), { campaignId, limit })
}
