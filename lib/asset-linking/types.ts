export type AssetLinkConfidence = "low" | "medium" | "high"

export type AssetLinkSuggestionType =
  | "drive-file-to-campaign"
  | "drive-file-to-asset"
  | "drive-file-to-youtube-video"
  | "drive-file-to-product-listing"
  | "drive-file-to-merch-idea"
  | "drive-file-to-mockup-prompt"
  | "create-asset-from-drive-file"
  | "asset-to-campaign"
  | "asset-to-youtube-video"
  | "asset-to-product-listing"
  | "youtube-video-to-campaign"
  | "folder-to-campaign"

export interface AssetLinkSuggestion {
  id: string
  suggestionType: AssetLinkSuggestionType
  confidence: AssetLinkConfidence
  score: number
  reason: string
  sourceType: string
  sourceId: string
  sourceName: string
  targetType: string
  targetId: string
  targetName: string
  suggestedAction: string
  href?: string
}

export interface AssetLinkSuggestionsInput {
  campaignId?: string
  assetId?: string
  driveFileId?: string
  youtubeVideoId?: string
  productId?: string
  limit?: number
}

export interface AssetLinkSuggestionsResponse {
  suggestions: AssetLinkSuggestion[]
  scannedAt: number
  totalCandidates: number
}

export interface AssetLinkMatchSignal {
  label: string
  score: number
}

export interface AssetLinkScoreResult {
  score: number
  confidence: AssetLinkConfidence
  reason: string
  signals: AssetLinkMatchSignal[]
}
