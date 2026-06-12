import type {
  ArtistBibleRecord,
  LoreEntryRecord,
  SongConceptRecord,
} from "@/lib/artist-universe/types"
import { scoreArtistBibleCompleteness, scoreSongConceptReadiness } from "@/lib/artist-universe/summary"

export function rankLoreByCanon(entries: LoreEntryRecord[]): LoreEntryRecord[] {
  const rank = (s: string) => (s === "Canon" ? 0 : s === "Flexible" ? 1 : s === "Idea" ? 2 : 3)
  return [...entries].sort((a, b) => rank(a.canonStatus) - rank(b.canonStatus))
}

export function filterConceptsByStatus(
  concepts: SongConceptRecord[],
  status: string | string[],
): SongConceptRecord[] {
  const statuses = Array.isArray(status) ? status : [status]
  return concepts.filter((c) => statuses.includes(c.status))
}

export function pickPrimaryBible(bibles: ArtistBibleRecord[], artistName?: string): ArtistBibleRecord | null {
  if (!bibles.length) return null
  if (artistName) {
    const match = bibles.find((b) => b.artistName.toLowerCase() === artistName.toLowerCase())
    if (match) return match
  }
  return [...bibles].sort((a, b) => scoreArtistBibleCompleteness(b) - scoreArtistBibleCompleteness(a))[0]
}

export function topReadyConcepts(concepts: SongConceptRecord[], limit = 5): SongConceptRecord[] {
  return [...concepts]
    .sort((a, b) => scoreSongConceptReadiness(b) - scoreSongConceptReadiness(a))
    .slice(0, limit)
}
