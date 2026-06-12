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

export function scoreArtistBibleCompleteness(bible: ArtistBibleRecord): number {
  let score = 0
  const fields = [
    bible.genre,
    bible.mood,
    bible.visualRules,
    bible.lyricalThemes,
    bible.brandPromise,
    bible.shortBio || bible.longBio,
  ]
  for (const f of fields) {
    if (f.trim()) score += Math.floor(100 / fields.length)
  }
  if (bible.doList.length && bible.dontList.length) score = Math.min(100, score + 10)
  return Math.min(100, score)
}
