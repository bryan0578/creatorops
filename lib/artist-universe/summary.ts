import type {
  ArtistBibleRecord,
  LoreEntryRecord,
  ReleaseStoryArcRecord,
  SongConceptRecord,
  VisualIdentityProfileRecord,
} from "@/lib/artist-universe/types"

export type ArtistUniverseSummary = {
  bibleCount: number
  loreCount: number
  conceptCount: number
  arcCount: number
  visualCount: number
  activeConcepts: number
  canonLore: number
}

export function summarizeArtistUniverse(input: {
  bibles: ArtistBibleRecord[]
  lore: LoreEntryRecord[]
  concepts: SongConceptRecord[]
  arcs: ReleaseStoryArcRecord[]
  visual: VisualIdentityProfileRecord[]
}): ArtistUniverseSummary {
  return {
    bibleCount: input.bibles.length,
    loreCount: input.lore.length,
    conceptCount: input.concepts.length,
    arcCount: input.arcs.length,
    visualCount: input.visual.length,
    activeConcepts: input.concepts.filter((c) => !["Archived", "Released"].includes(c.status))
      .length,
    canonLore: input.lore.filter((l) => l.canonStatus === "Canon").length,
  }
}

export function scoreSongConceptReadiness(concept: SongConceptRecord): number {
  let score = 0
  if (concept.conceptSummary.trim()) score += 20
  if (concept.hookIdea.trim()) score += 15
  if (concept.visualConcept.trim()) score += 15
  if (concept.youtubeAngle.trim()) score += 10
  if (concept.sunoPrompt.trim() || concept.lyricDraft.trim()) score += 15
  if (concept.campaignId || concept.releasePlanId) score += 15
  if (concept.relatedLoreIds.length) score += 10
  return Math.min(100, score)
}

const ARTIST_BIBLE_COMPLETENESS_CHECKS: {
  key: string
  label: string
  filled: (b: ArtistBibleRecord) => boolean
}[] = [
  { key: "artistName", label: "Artist name", filled: (b) => Boolean(b.artistName.trim()) },
  { key: "projectName", label: "Project name", filled: (b) => Boolean(b.projectName.trim()) },
  { key: "labelName", label: "Label name", filled: (b) => Boolean(b.labelName.trim()) },
  { key: "genre", label: "Genre", filled: (b) => Boolean(b.genre.trim()) },
  { key: "mood", label: "Mood", filled: (b) => Boolean(b.mood.trim()) },
  { key: "aesthetic", label: "Aesthetic", filled: (b) => Boolean(b.aesthetic.trim()) },
  { key: "targetAudience", label: "Target audience", filled: (b) => Boolean(b.targetAudience.trim()) },
  { key: "brandPromise", label: "Brand promise", filled: (b) => Boolean(b.brandPromise.trim()) },
  { key: "shortBio", label: "Short bio", filled: (b) => Boolean(b.shortBio.trim()) },
  { key: "longBio", label: "Long bio", filled: (b) => Boolean(b.longBio.trim()) },
  { key: "voiceRules", label: "Voice rules", filled: (b) => Boolean(b.voiceRules.trim()) },
  { key: "lyricalThemes", label: "Lyrical themes", filled: (b) => Boolean(b.lyricalThemes.trim()) },
  { key: "sonicRules", label: "Sonic rules", filled: (b) => Boolean(b.sonicRules.trim()) },
  { key: "visualRules", label: "Visual rules", filled: (b) => Boolean(b.visualRules.trim()) },
  { key: "doList", label: "Do list", filled: (b) => b.doList.length > 0 },
  { key: "dontList", label: "Don't list", filled: (b) => b.dontList.length > 0 },
  { key: "referenceArtists", label: "Reference artists", filled: (b) => b.referenceArtists.length > 0 },
  { key: "referenceMedia", label: "Reference media", filled: (b) => b.referenceMedia.length > 0 },
  { key: "colorPalette", label: "Color palette", filled: (b) => b.colorPalette.length > 0 },
  { key: "keywords", label: "Keywords", filled: (b) => b.keywords.length > 0 },
]

export function artistBibleCompletenessBreakdown(bible: ArtistBibleRecord): {
  score: number
  filled: string[]
  missing: string[]
} {
  const filled: string[] = []
  const missing: string[] = []
  for (const check of ARTIST_BIBLE_COMPLETENESS_CHECKS) {
    if (check.filled(bible)) filled.push(check.label)
    else missing.push(check.label)
  }
  const score =
    ARTIST_BIBLE_COMPLETENESS_CHECKS.length === 0
      ? 0
      : Math.round((filled.length / ARTIST_BIBLE_COMPLETENESS_CHECKS.length) * 100)
  return { score, filled, missing }
}

export function scoreArtistBibleCompleteness(bible: ArtistBibleRecord): number {
  return artistBibleCompletenessBreakdown(bible).score
}
