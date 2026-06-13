/** Unified related-record types for cross-module linking. */

export const CREATOR_OPS_RECORD_TYPES = [
  "ArtistBible",
  "VisualIdentityProfile",
  "LoreEntry",
  "SongConcept",
  "ReleaseStoryArc",
  "Asset",
  "Campaign",
  "Product",
  "ProductResearch",
  "YouTubeVideo",
  "YouTubePackage",
  "DriveFile",
  "DriveFolder",
  "ExternalLink",
] as const

export type CreatorOpsRecordType = (typeof CREATOR_OPS_RECORD_TYPES)[number]

export const RECORD_TYPE_LABELS: Record<CreatorOpsRecordType, string> = {
  ArtistBible: "Artist Bible",
  VisualIdentityProfile: "Visual Identity",
  LoreEntry: "Lore Entry",
  SongConcept: "Song Concept",
  ReleaseStoryArc: "Story Arc",
  Asset: "Asset",
  Campaign: "Campaign",
  Product: "Product / Merch",
  ProductResearch: "Product Research",
  YouTubeVideo: "YouTube Video",
  YouTubePackage: "YouTube Packaging",
  DriveFile: "Drive File",
  DriveFolder: "Drive Folder",
  ExternalLink: "External Link",
}

export const RELATIONSHIP_TYPES = [
  "supports",
  "source-file",
  "related-lore",
  "related-asset",
  "published-video",
  "campaign-asset",
  "visual-reference",
  "merch-source",
  "metadata-source",
  "related-song",
  "related-campaign",
  "related",
] as const

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number]

export type RelatedRecordOption = {
  id: string
  type: CreatorOpsRecordType
  title: string
  subtitle: string
  artistName: string
  songTitle: string
  status: string
  tags: string[]
  href: string
}

export type CreatorOpsLinkRecord = {
  id: string
  sourceType: CreatorOpsRecordType
  sourceId: string
  targetType: CreatorOpsRecordType
  targetId: string
  relationshipType: RelationshipType | string
  label: string
  notes: string
  createdAt: number
  updatedAt: number
}

export type RelatedLinkDisplay = {
  linkId: string
  recordType: CreatorOpsRecordType
  recordId: string
  title: string
  subtitle: string
  relationshipType: string
  href: string
  origin: "linked" | "inferred"
}

export type RelatedLinkSuggestion = RelatedLinkDisplay & {
  reason: string
  confidence: "high" | "medium" | "low"
  origin: "suggested"
}

export type RelatedLinksBundle = {
  linked: RelatedLinkDisplay[]
  inferred: RelatedLinkDisplay[]
  suggested: RelatedLinkSuggestion[]
}

export type RelatedRecordContext = {
  sourceType: CreatorOpsRecordType
  sourceId: string
  title?: string
  artistName?: string
  songTitle?: string
  tags?: string[]
  fileName?: string
  filePath?: string
}

export type BulkAutoLinkSuggestion = {
  id: string
  sourceType: CreatorOpsRecordType
  sourceId: string
  sourceTitle: string
  targetType: CreatorOpsRecordType
  targetId: string
  targetTitle: string
  reason: string
  confidence: "high" | "medium" | "low"
  relationshipType: string
}
