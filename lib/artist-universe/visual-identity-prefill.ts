import type { ArtistBibleRecord } from "@/lib/artist-universe/types"
import type { VisualIdentityFormState } from "@/components/artist-universe/visual-identity-form"
import { formatListForInput, formatTagsForInput } from "@/lib/artist-universe/utils"

export const DEFAULT_THUMBNAIL_RULES =
  "Use one strong focal subject, high contrast, readable 1–4 word title text, and visual motifs consistent with the artist identity."

export const DEFAULT_MERCH_RULES =
  "Use wearable graphics, strong symbols, lyric phrases, and artist-consistent colors. Avoid clutter and generic designs."

const PRETTYWISE_PROFILE_NAME = "PrettyWise Red/Black Cyber Candy Horror"

const PRETTYWISE_VISUAL_STYLE =
  "Glossy dark K-pop idol visuals mixed with creepy-cute horror, cyberpunk shadows, haunted carnival lighting, red balloons, corrupted digital textures, demon-hunter attitude, and anime-inspired cinematic framing."

const PRETTYWISE_THUMBNAIL_RULES =
  "Use one strong focal character, high contrast red/black lighting, one clear emotion, and minimal 1–4 word title text. Avoid clutter, tiny text, muddy colors, or overly busy backgrounds."

const PRETTYWISE_MERCH_RULES =
  "Use wearable dark pop / horror-pop fashion with bold phrases, red/black/pink contrast, clean graphic layouts, red balloons, glitch hearts, cracked candy, haunted eyes, storm drains, floating silhouettes, and lyric-based slogans."

const PRETTYWISE_FORBIDDEN = [
  "generic clown face",
  "direct Pennywise copy",
  "cheap Halloween clipart",
  "overly childish cartoon horror",
  "messy unreadable typography",
  "too much text",
  "random gore",
  "low-quality AI artifacts",
  "copying BLACKPINK styling too directly",
  "copying K-pop Demon Hunters directly",
  "copying It or Welcome to Derry directly",
]

export function isPrettyWiseArtist(artistName: string): boolean {
  return artistName.trim().toLowerCase() === "prettywise"
}

export function defaultProfileNameFromBible(bible: ArtistBibleRecord): string {
  if (isPrettyWiseArtist(bible.artistName)) return PRETTYWISE_PROFILE_NAME
  return `${bible.artistName.trim()} Visual Identity`
}

export function buildNotesFromArtistBible(bible: ArtistBibleRecord): string {
  const lines: string[] = []
  if (bible.brandPromise.trim()) lines.push(`Brand promise: ${bible.brandPromise.trim()}`)
  if (bible.mood.trim()) lines.push(`Mood: ${bible.mood.trim()}`)
  if (bible.genre.trim()) lines.push(`Genre: ${bible.genre.trim()}`)
  if (bible.referenceMedia.length) {
    lines.push(`Reference media: ${bible.referenceMedia.join(", ")}`)
  }
  if (bible.referenceArtists.length) {
    lines.push(`Reference artists: ${bible.referenceArtists.join(", ")}`)
  }
  lines.push("Prefilled from Artist Bible.")
  return lines.join("\n")
}

export function prefillVisualIdentityFromArtistBible(
  bible: ArtistBibleRecord,
): VisualIdentityFormState {
  const prettyWise = isPrettyWiseArtist(bible.artistName)
  const tags = [...new Set([...bible.keywords, ...bible.tags])]

  const visualStyle =
    bible.aesthetic.trim() ||
    bible.visualRules.trim() ||
    (prettyWise ? PRETTYWISE_VISUAL_STYLE : "")

  const imagePromptRules = bible.visualRules.trim() || bible.aesthetic.trim()

  const thumbnailRules =
    bible.visualRules.trim() ||
    (prettyWise ? PRETTYWISE_THUMBNAIL_RULES : DEFAULT_THUMBNAIL_RULES)

  const merchDesignRules = prettyWise ? PRETTYWISE_MERCH_RULES : DEFAULT_MERCH_RULES

  const forbiddenElements =
    bible.dontList.length > 0
      ? bible.dontList
      : prettyWise
        ? PRETTYWISE_FORBIDDEN
        : []

  return {
    artistName: bible.artistName,
    profileName: defaultProfileNameFromBible(bible),
    status: "Active",
    visualStyle: prettyWise && !bible.aesthetic.trim() && !bible.visualRules.trim()
      ? PRETTYWISE_VISUAL_STYLE
      : visualStyle,
    colorPalette: formatListForInput(bible.colorPalette),
    typographyRules: "",
    characterRules: "",
    environmentRules: bible.aesthetic.trim(),
    imagePromptRules,
    thumbnailRules: prettyWise && !bible.visualRules.trim()
      ? PRETTYWISE_THUMBNAIL_RULES
      : thumbnailRules,
    merchDesignRules: prettyWise ? PRETTYWISE_MERCH_RULES : merchDesignRules,
    forbiddenElements: formatListForInput(forbiddenElements),
    referenceAssetIds: "",
    referenceDriveFileIds: "",
    tags: formatTagsForInput(tags),
    notes: buildNotesFromArtistBible(bible),
  }
}

export function buildVisualIdentityPrompt(profile: {
  artistName: string
  profileName: string
  visualStyle: string
  colorPalette: string[]
  typographyRules: string
  characterRules: string
  environmentRules: string
  imagePromptRules: string
  thumbnailRules: string
  merchDesignRules: string
  forbiddenElements: string[]
}): string {
  const sections: string[] = [
    `# Visual Identity — ${profile.artistName}`,
    profile.profileName ? `Profile: ${profile.profileName}` : "",
    profile.visualStyle ? `Visual style:\n${profile.visualStyle}` : "",
    profile.colorPalette.length ? `Color palette: ${profile.colorPalette.join(", ")}` : "",
    profile.typographyRules ? `Typography:\n${profile.typographyRules}` : "",
    profile.characterRules ? `Character rules:\n${profile.characterRules}` : "",
    profile.environmentRules ? `Environment:\n${profile.environmentRules}` : "",
    profile.imagePromptRules ? `Image prompt rules:\n${profile.imagePromptRules}` : "",
    profile.thumbnailRules ? `Thumbnail rules:\n${profile.thumbnailRules}` : "",
    profile.merchDesignRules ? `Merch design rules:\n${profile.merchDesignRules}` : "",
    profile.forbiddenElements.length
      ? `Forbidden elements: ${profile.forbiddenElements.join(", ")}`
      : "",
  ]
  return sections.filter(Boolean).join("\n\n")
}
