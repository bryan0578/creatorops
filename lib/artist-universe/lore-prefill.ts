import type {
  ArtistBibleRecord,
  LoreEntryRecord,
  SongConceptRecord,
  VisualIdentityProfileRecord,
} from "@/lib/artist-universe/types"
import type { LoreFormState } from "@/components/artist-universe/lore-form"
import {
  canonStatusContains,
  loreTypeContainsAny,
} from "@/lib/artist-universe/lore-types"
import { formatListForInput, formatTagsForInput } from "@/lib/artist-universe/utils"

export const PRETTYWISE_LORE_TAGS = [
  "prettywise",
  "dark-kpop",
  "horror-pop",
  "creepy-cute",
  "derry-inspired",
  "artist-universe",
]

export function isPrettyWiseArtist(artistName: string): boolean {
  return artistName.trim().toLowerCase() === "prettywise"
}

export function emptyLoreForm(artistName = ""): LoreFormState {
  return {
    title: "",
    artistName,
    loreType: "Theme",
    status: "Draft",
    canonStatus: "Flexible",
    summary: "",
    details: "",
    characters: "",
    locations: "",
    symbols: "",
    themes: "",
    relatedSongs: "",
    relatedCampaignIds: "",
    relatedAssetIds: "",
    tags: formatTagsForInput(isPrettyWiseArtist(artistName) ? PRETTYWISE_LORE_TAGS : []),
    notes: "",
  }
}

function isEmptyLoreField(value: string): boolean {
  return !value.trim()
}

/** Fill only empty form fields from a source prefill — never overwrite user input. */
export function mergeEmptyLoreFields(current: LoreFormState, source: LoreFormState): LoreFormState {
  const merged = { ...current }
  for (const key of Object.keys(source) as (keyof LoreFormState)[]) {
    if (isEmptyLoreField(merged[key])) {
      merged[key] = source[key]
    }
  }
  return merged
}

export function buildLoreContextFromArtistBible(bible: ArtistBibleRecord): Partial<LoreFormState> {
  const prettyWise = isPrettyWiseArtist(bible.artistName)
  const themes = bible.lyricalThemes
    ? bible.lyricalThemes.split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean)
    : []
  const symbols = bible.visualRules
    ? bible.visualRules.split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean).slice(0, 6)
    : []

  return {
    artistName: bible.artistName,
    details: [bible.aesthetic, bible.brandPromise].filter(Boolean).join("\n\n"),
    themes: formatListForInput(themes),
    symbols: formatListForInput(symbols),
    tags: formatTagsForInput([
      ...new Set([...bible.keywords, ...bible.tags, ...(prettyWise ? PRETTYWISE_LORE_TAGS : [])]),
    ]),
    notes: bible.dontList.length ? `Avoid: ${bible.dontList.join(", ")}` : "",
  }
}

export function buildLoreContextFromVisualIdentity(
  profile: VisualIdentityProfileRecord,
): Partial<LoreFormState> {
  const prettyWise = isPrettyWiseArtist(profile.artistName)
  const themeHints = [profile.merchDesignRules, profile.thumbnailRules]
    .filter(Boolean)
    .join(" ")
    .split(/[,;\n]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8)

  return {
    artistName: profile.artistName,
    details: profile.visualStyle,
    characters: profile.characterRules,
    locations: profile.environmentRules,
    symbols: formatListForInput([
      ...profile.colorPalette.map((c) => `color: ${c}`),
      ...profile.forbiddenElements.slice(0, 4),
    ]),
    themes: formatListForInput(themeHints),
    tags: formatTagsForInput([
      ...new Set([...profile.tags, ...(prettyWise ? PRETTYWISE_LORE_TAGS : [])]),
    ]),
    notes: profile.forbiddenElements.length
      ? `Forbidden: ${profile.forbiddenElements.join(", ")}`
      : "",
  }
}

export function prefillLoreFromArtistBible(bible: ArtistBibleRecord): LoreFormState {
  const prettyWise = isPrettyWiseArtist(bible.artistName)
  return mergeEmptyLoreFields(emptyLoreForm(bible.artistName), {
    ...emptyLoreForm(bible.artistName),
    loreType: prettyWise ? "Symbol" : "Theme",
    ...buildLoreContextFromArtistBible(bible),
    notes: [
      bible.dontList.length ? `Avoid: ${bible.dontList.join(", ")}` : "",
      "Prefilled from Artist Bible.",
    ]
      .filter(Boolean)
      .join("\n"),
  })
}

export function prefillLoreFromVisualIdentity(profile: VisualIdentityProfileRecord): LoreFormState {
  const prettyWise = isPrettyWiseArtist(profile.artistName)
  return mergeEmptyLoreFields(emptyLoreForm(profile.artistName), {
    ...emptyLoreForm(profile.artistName),
    loreType: prettyWise ? "Visual Motif" : "Symbol",
    ...buildLoreContextFromVisualIdentity(profile),
    notes: [
      profile.forbiddenElements.length
        ? `Forbidden: ${profile.forbiddenElements.join(", ")}`
        : "",
      "Prefilled from Visual Identity.",
    ]
      .filter(Boolean)
      .join("\n"),
  })
}

export type PrettyWiseStarterLoreInput = Omit<LoreEntryRecord, "id" | "createdAt" | "updatedAt">

export const PRETTYWISE_STARTER_LORE: PrettyWiseStarterLoreInput[] = [
  {
    title: "The Candy Static",
    artistName: "PrettyWise",
    loreType: "World",
    status: "Active",
    canonStatus: "Canon",
    summary:
      "A strange signal that leaks through PrettyWise's world like corrupted candy-colored noise. It bends memories, distorts songs, and makes the town feel alive.",
    details: "",
    characters: [],
    locations: [],
    symbols: ["candy static", "glitch sugar", "corrupted sound", "neon distortion"],
    themes: ["loss of control", "haunted pop", "distorted sweetness", "trapped signal"],
    relatedSongs: [],
    relatedCampaignIds: [],
    relatedAssetIds: [],
    tags: PRETTYWISE_LORE_TAGS,
    notes: "PrettyWise starter lore",
  },
  {
    title: "The Red Eye Signal",
    artistName: "PrettyWise",
    loreType: "Visual Motif",
    status: "Active",
    canonStatus: "Canon",
    summary:
      "A glowing red eye motif that appears when the truth is being revealed or when the nightmare world is watching.",
    details: "",
    characters: [],
    locations: [],
    symbols: ["red eye", "glowing stare", "surveillance", "hidden truth"],
    themes: ["being watched", "truth", "dangerous beauty", "revelation"],
    relatedSongs: [],
    relatedCampaignIds: [],
    relatedAssetIds: [],
    tags: PRETTYWISE_LORE_TAGS,
    notes: "PrettyWise starter lore",
  },
  {
    title: "No Exit Corridor",
    artistName: "PrettyWise",
    loreType: "Story Event",
    status: "Active",
    canonStatus: "Canon",
    summary:
      "A looping hallway or trapped space where every escape route leads deeper into the nightmare. It represents the feeling of being stuck inside Derry's haunted pull.",
    details: "",
    characters: [],
    locations: ["No Exit Corridor"],
    symbols: ["hallway", "exit sign", "locked doors", "red light", "floating shadow"],
    themes: ["trapped", "escape", "fear", "no way out"],
    relatedSongs: ["No Exit"],
    relatedCampaignIds: [],
    relatedAssetIds: [],
    tags: PRETTYWISE_LORE_TAGS,
    notes: "PrettyWise starter lore",
  },
  {
    title: "Creepy-Cute Mask",
    artistName: "PrettyWise",
    loreType: "Character",
    status: "Active",
    canonStatus: "Flexible",
    summary:
      "The polished idol surface PrettyWise wears over something darker. It represents beauty hiding fear, confidence hiding danger, and sweetness hiding a threat.",
    details: "",
    characters: ["PrettyWise mask persona"],
    locations: [],
    symbols: ["mask", "smile", "pink shadow", "broken mirror"],
    themes: ["identity", "performance", "hidden fear", "dangerous sweetness"],
    relatedSongs: [],
    relatedCampaignIds: [],
    relatedAssetIds: [],
    tags: PRETTYWISE_LORE_TAGS,
    notes: "PrettyWise starter lore",
  },
  {
    title: "Sugar Trap",
    artistName: "PrettyWise",
    loreType: "Theme",
    status: "Active",
    canonStatus: "Flexible",
    summary:
      "A recurring PrettyWise theme where beautiful, sweet, or playful things become traps. Candy, music, lights, and pop hooks pull listeners into the darker world.",
    details: "",
    characters: [],
    locations: [],
    symbols: ["candy", "sugar", "trap", "pink smoke", "carnival lights"],
    themes: ["temptation", "obsession", "false safety", "beautiful danger"],
    relatedSongs: ["Sugar Trap"],
    relatedCampaignIds: [],
    relatedAssetIds: [],
    tags: PRETTYWISE_LORE_TAGS,
    notes: "PrettyWise starter lore",
  },
]

export type LoreSongLink = {
  name: string
  conceptId: string | null
}

function normArtist(value: string): string {
  return value.trim().toLowerCase()
}

function songConceptMatchesName(concept: SongConceptRecord, name: string): boolean {
  const needle = name.trim().toLowerCase()
  if (!needle) return false
  return (
    concept.title.trim().toLowerCase() === needle ||
    concept.songTitle.trim().toLowerCase() === needle
  )
}

/** Resolve related song names and optional Song Concept ids for a lore entry. */
export function resolveLoreSongLinks(
  entry: LoreEntryRecord,
  songConcepts: SongConceptRecord[],
): LoreSongLink[] {
  const artist = normArtist(entry.artistName)
  const artistConcepts = songConcepts.filter((c) => normArtist(c.artistName) === artist)
  const links: LoreSongLink[] = []
  const seen = new Set<string>()

  for (const name of entry.relatedSongs) {
    const trimmed = name.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const concept = artistConcepts.find((c) => songConceptMatchesName(c, trimmed)) ?? null
    links.push({ name: trimmed, conceptId: concept?.id ?? null })
  }

  for (const concept of artistConcepts) {
    if (!concept.relatedLoreIds.includes(entry.id)) continue
    const name = concept.songTitle.trim() || concept.title.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    links.push({ name, conceptId: concept.id })
  }

  return links
}

export function loreEntryHasRelatedSongs(
  entry: LoreEntryRecord,
  songConcepts: SongConceptRecord[] = [],
): boolean {
  return resolveLoreSongLinks(entry, songConcepts).length > 0
}

export function filterLoreForTab(
  entries: LoreEntryRecord[],
  tabKey: string,
  songConcepts: SongConceptRecord[] = [],
): LoreEntryRecord[] {
  switch (tabKey) {
    case "canon":
      return entries.filter((e) => canonStatusContains(e.canonStatus, "Canon"))
    case "characters":
      return entries.filter(
        (e) =>
          loreTypeContainsAny(e.loreType, ["Character"]) || e.characters.length > 0,
      )
    case "symbols":
      return entries.filter((e) =>
        loreTypeContainsAny(e.loreType, ["Symbol", "Visual Motif", "World"]),
      )
    case "timeline":
      return entries.filter((e) =>
        loreTypeContainsAny(e.loreType, ["Timeline", "Story Event"]),
      )
    case "ideas":
      return entries.filter(
        (e) =>
          canonStatusContains(e.canonStatus, "Idea") ||
          (canonStatusContains(e.canonStatus, "Flexible") &&
            !canonStatusContains(e.canonStatus, "Canon")),
      )
    case "songs":
      return entries.filter((e) => loreEntryHasRelatedSongs(e, songConcepts))
    case "board":
    default:
      return entries
  }
}

const TAB_EMPTY: Record<string, { title: string; description: string }> = {
  board: {
    title: "No lore entries yet",
    description:
      "Lore entries will appear here after you add worldbuilding, characters, symbols, or story ideas.",
  },
  canon: {
    title: "No canon lore yet",
    description:
      "Mark important lore entries as Canon to define the official PrettyWise universe.",
  },
  characters: {
    title: "No character lore yet",
    description:
      "Character lore will appear here when entries are marked as Character or include character names.",
  },
  symbols: {
    title: "No symbols or motifs yet",
    description:
      "Recurring symbols like red eyes, masks, candy static, balloons, and corridors will appear here.",
  },
  timeline: {
    title: "No timeline entries yet",
    description: "Story events and release-era timeline notes will appear here.",
  },
  ideas: {
    title: "No flexible story ideas yet",
    description:
      "Draft ideas and flexible lore concepts will appear here before becoming canon.",
  },
  songs: {
    title: "No related songs yet",
    description:
      "Add song names on a lore entry or link a Song Concept from the Related tab to see lore-to-song connections here.",
  },
}

export function tabEmptyState(tabKey: string) {
  return TAB_EMPTY[tabKey] ?? TAB_EMPTY.board
}
