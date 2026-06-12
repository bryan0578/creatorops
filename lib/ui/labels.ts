/** Display-only label formatting — never use for data keys or Prisma fields. */

const FIELD_LABEL_OVERRIDES: Record<string, string> = {
  aiContext: "AI Context",
  arcType: "Arc Type",
  campaignId: "Campaign ID",
  campaignName: "Campaign Name",
  canonStatus: "Canon Status",
  cta: "CTA",
  doList: "Do List",
  dontList: "Don't List",
  driveFileId: "Drive File ID",
  externalLinkId: "External Link ID",
  fromArtistBible: "Prefilled from Artist Bible",
  fromVisualIdentity: "Prefilled from Visual Identity",
  chorusIdea: "Chorus Idea",
  conceptSummary: "Concept Summary",
  hookIdea: "Hook Idea",
  lyricalTheme: "Lyrical Theme",
  loreType: "Lore Type",
  lyricDraft: "Lyric Draft",
  merchDesignRules: "Merch Design Rules",
  merchTieIn: "Merch Tie-In",
  productListingId: "Product Listing ID",
  productName: "Product Name",
  productTieIn: "Product Tie-In",
  profileName: "Profile Name",
  projectName: "Project Name",
  rawJson: "Raw Metadata",
  relatedAssetIds: "Related Assets",
  relatedCampaignIds: "Related Campaign IDs",
  relatedLoreIds: "Related Lore",
  relatedPromptRunIds: "Related Prompt Runs",
  relatedSongs: "Related Songs",
  releasePlanId: "Release Plan ID",
  qualityReviewId: "Quality Review",
  sourceRecordId: "Source Record ID",
  sourceRecordType: "Source Type",
  storyRole: "Story Role",
  sunoPrompt: "Suno Prompt",
  trackTitle: "Track Title",
  url: "URL",
  youtubeApiUrl: "YouTube API URL",
  visualConcept: "Visual Concept",
  youtubeAngle: "YouTube Angle",
  youtubeVideoId: "YouTube Video ID",
}

const ACRONYMS = new Set(["AI", "API", "URL", "ID", "SEO", "CSV", "JSON", "CTR", "CTA"])

const SPECIAL_WORDS: Record<string, string> = {
  youtube: "YouTube",
  kpop: "K-Pop",
  csv: "CSV",
  json: "JSON",
  seo: "SEO",
  ctr: "CTR",
  cta: "CTA",
  suno: "Suno",
}

function titleCaseWord(word: string): string {
  const lower = word.toLowerCase()
  if (SPECIAL_WORDS[lower]) return SPECIAL_WORDS[lower]
  if (ACRONYMS.has(word.toUpperCase())) return word.toUpperCase()
  if (word.length <= 3 && word === word.toUpperCase()) return word
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/** Convert camelCase, snake_case, or kebab-case field names to readable Title Case labels. */
export function formatFieldLabel(fieldName: string): string {
  const trimmed = fieldName.trim()
  if (!trimmed) return ""

  if (FIELD_LABEL_OVERRIDES[trimmed]) return FIELD_LABEL_OVERRIDES[trimmed]

  const normalized = trimmed
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()

  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map(titleCaseWord)
    .join(" ")
}

/** Use for form labels and read-only field row headers. */
export function formatDisplayLabel(labelOrKey: string): string {
  const trimmed = labelOrKey.trim()
  if (!trimmed) return ""

  if (FIELD_LABEL_OVERRIDES[trimmed]) return FIELD_LABEL_OVERRIDES[trimmed]

  // Raw field keys: camelCase, snake_case, kebab-case
  if (/[a-z][A-Z]|[A-Z][a-z]/.test(trimmed) || /[_-]/.test(trimmed)) {
    return formatFieldLabel(trimmed)
  }

  // Human phrases — title-case each word
  return trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map(titleCaseWord)
    .join(" ")
}

/** Build a label map for a fixed set of form field keys. */
export function fieldLabelsFor<T extends string>(keys: readonly T[]): Record<T, string> {
  return Object.fromEntries(keys.map((key) => [key, formatFieldLabel(key)])) as Record<T, string>
}

export const FORM_HINTS = {
  arrayPerLine: "Enter one item per line.",
  tags: "Enter one item per line or comma-separated.",
  commaSeparated: "Comma-separated.",
  assetIds: "Enter one ID per line.",
  colors: "One color per line (hex code or name).",
} as const
