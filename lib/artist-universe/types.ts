/** Artist Universe / Music IP System — shared record types. */

export type ArtistBibleRecord = {
  id: string
  artistName: string
  projectName: string
  labelName: string
  status: string
  genre: string
  subgenre: string
  mood: string
  aesthetic: string
  targetAudience: string
  brandPromise: string
  shortBio: string
  longBio: string
  voiceRules: string
  lyricalThemes: string
  visualRules: string
  sonicRules: string
  doList: string[]
  dontList: string[]
  referenceArtists: string[]
  referenceMedia: string[]
  colorPalette: string[]
  keywords: string[]
  tags: string[]
  notes: string
  sourceArtistId: string
  createdAt: number
  updatedAt: number
}

export type LoreEntryRecord = {
  id: string
  title: string
  artistName: string
  loreType: string
  status: string
  canonStatus: string
  summary: string
  details: string
  characters: string[]
  locations: string[]
  symbols: string[]
  themes: string[]
  relatedSongs: string[]
  relatedCampaignIds: string[]
  relatedAssetIds: string[]
  tags: string[]
  notes: string
  createdAt: number
  updatedAt: number
}

export type SongConceptRecord = {
  id: string
  title: string
  artistName: string
  status: string
  songTitle: string
  conceptSummary: string
  genre: string
  mood: string
  lyricalTheme: string
  storyRole: string
  hookIdea: string
  chorusIdea: string
  sunoPrompt: string
  lyricDraft: string
  visualConcept: string
  youtubeAngle: string
  productTieIn: string
  campaignId: string
  campaignName: string
  releasePlanId: string
  relatedLoreIds: string[]
  relatedAssetIds: string[]
  relatedPromptRunIds: string[]
  qualityReviewId: string
  tags: string[]
  notes: string
  createdAt: number
  updatedAt: number
}

export type ReleaseStoryArcRecord = {
  id: string
  title: string
  artistName: string
  arcType: string
  status: string
  summary: string
  theme: string
  startDate: number | null
  endDate: number | null
  campaignIds: string[]
  releasePlanIds: string[]
  songConceptIds: string[]
  loreEntryIds: string[]
  productCollectionIds: string[]
  visualDirection: string
  narrativeBeats: string[]
  launchNotes: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export type VisualIdentityProfileRecord = {
  id: string
  artistName: string
  profileName: string
  status: string
  visualStyle: string
  colorPalette: string[]
  typographyRules: string
  characterRules: string
  environmentRules: string
  imagePromptRules: string
  thumbnailRules: string
  merchDesignRules: string
  forbiddenElements: string[]
  referenceAssetIds: string[]
  referenceDriveFileIds: string[]
  tags: string[]
  notes: string
  createdAt: number
  updatedAt: number
}

export type ArtistUniverseContextInput = {
  artistName?: string
  campaignId?: string
  songConceptId?: string
  storyArcId?: string
  includeLore?: boolean
  includeVisualIdentity?: boolean
  includeLearnings?: boolean
  includePatterns?: boolean
  includeProducts?: boolean
  includeAssets?: boolean
}

export type ArtistUniverseContextBundle = {
  summary: string
  artistBible: string
  lore: string
  songConcept: string
  visualIdentity: string
  storyArc: string
  relatedRecords: string
  constraints: string
  compactText: string
}

export const LORE_TYPES = [
  "Character",
  "World",
  "Location",
  "Symbol",
  "Visual Motif",
  "Timeline",
  "Theme",
  "Story Event",
  "Brand Rule",
  "Object",
  "Song Lore",
  "Album Lore",
  "Product Lore",
  "Other",
] as const

export const LORE_STATUSES = ["Draft", "Active", "Archived", "Deprecated"] as const

export const CANON_STATUSES = ["Canon", "Flexible", "Idea", "Deprecated"] as const

export const SONG_CONCEPT_STATUSES = [
  "Idea",
  "Writing",
  "Prompting",
  "Generated",
  "Selected",
  "Planned",
  "Released",
  "Archived",
] as const

export const STORY_ARC_TYPES = [
  "Single Release Arc",
  "EP Arc",
  "Album Era",
  "Character Arc",
  "Seasonal Drop",
  "Product/Story Collection",
  "YouTube Campaign Arc",
] as const
