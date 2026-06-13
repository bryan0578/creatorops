import type {
  ArtistBibleRecord,
  LoreEntryRecord,
  ReleaseStoryArcRecord,
  SongConceptRecord,
  VisualIdentityProfileRecord,
} from "@/lib/artist-universe/types"
import type { SongConceptFormState } from "@/components/artist-universe/song-concept-form"
import { isPrettyWiseArtist, PRETTYWISE_LORE_TAGS } from "@/lib/artist-universe/lore-prefill"
import { filterPublishedSongs } from "@/lib/artist-universe/published-songs"
import { formatListForInput, formatTagsForInput } from "@/lib/artist-universe/utils"
import { DEMO_DATA_MARKER } from "@/lib/demo-data/constants"

export { isPrettyWiseArtist }

export const PRETTYWISE_SONG_TAGS = ["starter-prettywise", "artist-universe", ...PRETTYWISE_LORE_TAGS]

function isEmptyField(value: string): boolean {
  return !value.trim()
}

export function emptySongConceptForm(artistName = ""): SongConceptFormState {
  const prettyWise = isPrettyWiseArtist(artistName)
  return {
    title: "",
    artistName,
    status: "Idea",
    songTitle: "",
    conceptSummary: "",
    genre: prettyWise ? "Dark K-Pop, Horror Pop" : "",
    mood: "",
    lyricalTheme: "",
    storyRole: "",
    hookIdea: "",
    chorusIdea: "",
    sunoPrompt: "",
    lyricDraft: "",
    visualConcept: "",
    youtubeAngle: "",
    productTieIn: "",
    campaignId: "",
    campaignName: "",
    releasePlanId: "",
    relatedLoreIds: "",
    relatedAssetIds: "",
    relatedPromptRunIds: "",
    qualityReviewId: "",
    tags: formatTagsForInput(prettyWise ? PRETTYWISE_SONG_TAGS : []),
    notes: "",
    publishedUrl: "",
    publishedPlatform: "",
    publishedDate: "",
    releaseStatus: "",
    performanceNotes: "",
    futureMerchIdeas: "",
    futureCampaignIdeas: "",
    relatedYouTubeVideoId: "",
  }
}

export function mergeEmptySongConceptFields(
  current: SongConceptFormState,
  source: Partial<SongConceptFormState>,
): SongConceptFormState {
  const merged = { ...current }
  for (const key of Object.keys(source) as (keyof SongConceptFormState)[]) {
    if (isEmptyField(merged[key])) {
      merged[key] = source[key] ?? merged[key]
    }
  }
  return merged
}

function joinText(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join("\n\n").trim()
}

export function buildSongContextFromArtistBible(bible: ArtistBibleRecord): Partial<SongConceptFormState> {
  const prettyWise = isPrettyWiseArtist(bible.artistName)
  const genre = [bible.genre, bible.subgenre].filter(Boolean).join(", ")
  const visualConcept = joinText(bible.aesthetic, bible.visualRules)
  const notesParts: string[] = []
  if (bible.brandPromise.trim()) notesParts.push(`Brand promise: ${bible.brandPromise.trim()}`)
  if (bible.dontList.length) notesParts.push(`Creative boundaries — avoid: ${bible.dontList.join(", ")}`)

  return {
    artistName: bible.artistName,
    genre,
    mood: bible.mood,
    lyricalTheme: bible.lyricalThemes,
    visualConcept,
    tags: formatTagsForInput([
      ...new Set([...bible.keywords, ...bible.tags, ...(prettyWise ? PRETTYWISE_SONG_TAGS : [])]),
    ]),
    notes: notesParts.join("\n"),
  }
}

export function buildSongContextFromVisualIdentity(
  profile: VisualIdentityProfileRecord,
): Partial<SongConceptFormState> {
  const prettyWise = isPrettyWiseArtist(profile.artistName)
  const visualConcept = joinText(
    profile.visualStyle,
    profile.characterRules ? `Character: ${profile.characterRules}` : "",
    profile.environmentRules ? `Environment: ${profile.environmentRules}` : "",
  )
  const tagHints = [
    ...profile.colorPalette.map((c) => `color:${c}`),
    ...profile.tags,
    ...(prettyWise ? PRETTYWISE_SONG_TAGS : []),
  ]
  const notesParts: string[] = []
  if (profile.forbiddenElements.length) {
    notesParts.push(`Forbidden elements: ${profile.forbiddenElements.join(", ")}`)
  }

  return {
    artistName: profile.artistName,
    visualConcept,
    youtubeAngle: profile.thumbnailRules,
    productTieIn: profile.merchDesignRules,
    tags: formatTagsForInput([...new Set(tagHints)]),
    notes: notesParts.join("\n"),
  }
}

export function buildSongContextFromLore(entry: LoreEntryRecord): Partial<SongConceptFormState> {
  const prettyWise = isPrettyWiseArtist(entry.artistName)
  const themes = entry.themes.length ? entry.themes.join(", ") : ""
  const symbols = entry.symbols.length ? entry.symbols.join(", ") : ""
  const locations = entry.locations.length ? entry.locations.join(", ") : ""
  const characters = entry.characters.length ? entry.characters.join(", ") : ""
  const visualParts = [symbols, locations, characters].filter(Boolean)
  const genreHint = prettyWise ? "dark K-pop / horror pop" : "the artist's sound"

  const conceptSummary =
    entry.summary.trim() ||
    `A song built around ${entry.title}, exploring ${themes || "this lore theme"} through ${entry.artistName}'s ${genreHint}.`

  const storyRole =
    `Connects the artist universe lore entry "${entry.title}" to a release concept.` +
    (characters ? ` Features: ${characters}.` : "")

  const productHint =
    symbols && prettyWise
      ? `Merch/poster/lyric phrase inspired by ${symbols.split(",")[0]?.trim() || entry.title}.`
      : symbols
        ? `Product tie-in inspired by ${symbols.split(",")[0]?.trim() || entry.title}.`
        : ""

  const notesParts: string[] = []
  if (entry.details.trim()) notesParts.push(entry.details.trim())
  if (entry.relatedSongs.length) {
    notesParts.push(`Related songs context: ${entry.relatedSongs.join(", ")}`)
  }

  return {
    artistName: entry.artistName,
    title: entry.title.trim() ? `Song Concept: ${entry.title}` : "",
    songTitle: "",
    conceptSummary,
    lyricalTheme: themes || entry.details.trim(),
    storyRole,
    visualConcept: visualParts.join(". "),
    productTieIn: productHint,
    relatedLoreIds: formatListForInput([entry.id]),
    tags: formatTagsForInput([...new Set([...entry.tags, ...entry.symbols.slice(0, 4)])]),
    notes: notesParts.join("\n\n"),
  }
}

export function buildSongContextFromStoryArc(arc: ReleaseStoryArcRecord): Partial<SongConceptFormState> {
  const beats = arc.narrativeBeats.length ? arc.narrativeBeats.join("; ") : ""
  return {
    artistName: arc.artistName,
    title: arc.title.trim() ? `Song Concept: ${arc.title}` : "",
    conceptSummary: arc.summary,
    lyricalTheme: arc.theme,
    storyRole: beats || `Part of release arc "${arc.title}" (${arc.arcType}).`,
    visualConcept: arc.visualDirection,
    relatedLoreIds: formatListForInput(arc.loreEntryIds),
    tags: formatTagsForInput(arc.tags),
    notes: arc.launchNotes,
  }
}

export function prefillSongFromArtistBible(bible: ArtistBibleRecord): SongConceptFormState {
  return mergeEmptySongConceptFields(emptySongConceptForm(bible.artistName), {
    ...buildSongContextFromArtistBible(bible),
    notes: joinText(
      buildSongContextFromArtistBible(bible).notes,
      "Prefilled from Artist Bible.",
    ),
  })
}

export function prefillSongFromVisualIdentity(profile: VisualIdentityProfileRecord): SongConceptFormState {
  return mergeEmptySongConceptFields(emptySongConceptForm(profile.artistName), {
    ...buildSongContextFromVisualIdentity(profile),
    notes: joinText(
      buildSongContextFromVisualIdentity(profile).notes,
      "Prefilled from Visual Identity.",
    ),
  })
}

export function prefillSongFromLore(entry: LoreEntryRecord): SongConceptFormState {
  return mergeEmptySongConceptFields(emptySongConceptForm(entry.artistName), {
    ...buildSongContextFromLore(entry),
    notes: joinText(buildSongContextFromLore(entry).notes, "Prefilled from Lore Entry."),
  })
}

export function prefillSongFromStoryArc(arc: ReleaseStoryArcRecord): SongConceptFormState {
  return mergeEmptySongConceptFields(emptySongConceptForm(arc.artistName), {
    ...buildSongContextFromStoryArc(arc),
    notes: joinText(buildSongContextFromStoryArc(arc).notes, "Prefilled from Story Arc."),
  })
}

export function normalizeConceptTitleKey(title: string, songTitle: string): string {
  const key = (songTitle.trim() || title.trim()).toLowerCase().replace(/\s+/g, " ")
  return key
}

export function filterSongConceptForTab(concepts: SongConceptRecord[], tabKey: string): SongConceptRecord[] {
  switch (tabKey) {
    case "writing":
      return concepts.filter(
        (c) =>
          c.status === "Writing" ||
          c.lyricDraft.trim() ||
          c.hookIdea.trim() ||
          c.chorusIdea.trim(),
      )
    case "prompting":
      return concepts.filter(
        (c) => c.status === "Prompting" || c.status === "Generated" || c.sunoPrompt.trim(),
      )
    case "planned":
      return concepts.filter(
        (c) =>
          c.status === "Planned" ||
          c.status === "Released" ||
          c.campaignId.trim() ||
          c.releasePlanId.trim(),
      )
    case "visual":
      return concepts.filter((c) => c.visualConcept.trim() || c.youtubeAngle.trim())
    case "products":
      return concepts.filter((c) => c.productTieIn.trim() || c.futureMerchIdeas.trim())
    case "published":
      return filterPublishedSongs(concepts)
    case "ai":
      return concepts
    case "concepts":
    default:
      return concepts
  }
}

const TAB_EMPTY: Record<string, { title: string; description: string }> = {
  concepts: {
    title: "No song concepts yet",
    description:
      "Capture hooks, Suno prompts, lyric drafts, visuals, and release ideas for your artist projects.",
  },
  writing: {
    title: "No writing-stage concepts",
    description:
      "Concepts with Writing status or hook, chorus, and lyric draft content will appear here.",
  },
  prompting: {
    title: "No prompting-stage concepts",
    description:
      "Concepts with Prompting or Generated status, or a Suno prompt, will appear here.",
  },
  planned: {
    title: "No planned releases",
    description:
      "Concepts linked to campaigns or release plans, or marked Planned or Released, appear here.",
  },
  visual: {
    title: "No visual ideas",
    description: "Concepts with a visual concept or YouTube angle will appear here.",
  },
  products: {
    title: "No product tie-ins",
    description: "Concepts with merch, poster, or product tie-in notes will appear here.",
  },
  published: {
    title: "No published songs yet",
    description:
      "Songs marked Published or Released, or with a published URL, appear here — no campaign required.",
  },
  ai: {
    title: "No concept selected for AI context",
    description:
      "Select a song concept above or create one to build copyable AI prompt context from artist bible, lore, and visuals.",
  },
}

export function tabEmptyState(tabKey: string) {
  return TAB_EMPTY[tabKey] ?? TAB_EMPTY.concepts
}

export type PrettyWiseStarterSongInput = Omit<SongConceptRecord, "id" | "createdAt" | "updatedAt">

export const PRETTYWISE_STARTER_SONG_CONCEPTS: PrettyWiseStarterSongInput[] = [
  {
    title: "No Exit",
    artistName: "PrettyWise",
    status: "Planned",
    songTitle: "No Exit",
    conceptSummary:
      "Dark K-pop horror anthem about realizing there is no way out of the nightmare town.",
    genre: "Dark K-Pop, Horror Pop",
    mood: "trapped, intense, cinematic, rebellious, hunted",
    lyricalTheme:
      "Being trapped in a nightmare town where every escape route leads deeper inside.",
    storyRole: "The entry point into the PrettyWise/Derry-inspired album arc.",
    hookIdea: "",
    chorusIdea: "",
    sunoPrompt: "",
    lyricDraft: "",
    visualConcept:
      "Red and black corridor, glowing exit sign, red eye signal, storm drain shadows, cinematic horror-pop idol close-up.",
    youtubeAngle: "Dark K-pop horror anthem about realizing there is no way out.",
    productTieIn:
      "No Exit black/red shirt, poster, lyric merch using “There's No Way Out.”",
    campaignId: "",
    campaignName: "",
    releasePlanId: "",
    relatedLoreIds: [],
    relatedAssetIds: [],
    relatedPromptRunIds: [],
    qualityReviewId: "",
    tags: PRETTYWISE_SONG_TAGS,
    notes: `${DEMO_DATA_MARKER} — STARTER_PRETTYWISE`,
    publishedUrl: "",
    publishedPlatform: "",
    publishedDate: "",
    releaseStatus: "",
    performanceNotes: "",
    futureMerchIdeas: "",
    futureCampaignIdeas: "",
    relatedYouTubeVideoId: "",
  },
  {
    title: "Cotton Candy Skies",
    artistName: "PrettyWise",
    status: "Idea",
    songTitle: "Cotton Candy Skies",
    conceptSummary:
      "Creepy-cute horror pop song where sugar, beauty, and fear collide under a candy-colored sky.",
    genre: "Creepy-Cute K-Pop, Horror Pop",
    mood: "sweet, eerie, dreamy, dangerous, hypnotic",
    lyricalTheme: "A beautiful candy-colored world slowly revealing itself as a trap.",
    storyRole: "Shows the creepy-cute side of PrettyWise where sweetness becomes dangerous.",
    hookIdea: "",
    chorusIdea: "",
    sunoPrompt: "",
    lyricDraft: "",
    visualConcept:
      "Pink clouds, red balloon, candy static, haunted carnival lights, PrettyWise under a surreal cotton candy sky.",
    youtubeAngle: "Creepy-cute horror pop song where sugar, beauty, and fear collide.",
    productTieIn:
      "Cotton Candy Skies shirt, pastel horror poster, candy-heart lyric merch.",
    campaignId: "",
    campaignName: "",
    releasePlanId: "",
    relatedLoreIds: [],
    relatedAssetIds: [],
    relatedPromptRunIds: [],
    qualityReviewId: "",
    tags: PRETTYWISE_SONG_TAGS,
    notes: `${DEMO_DATA_MARKER} — STARTER_PRETTYWISE`,
    publishedUrl: "",
    publishedPlatform: "",
    publishedDate: "",
    releaseStatus: "",
    performanceNotes: "",
    futureMerchIdeas: "",
    futureCampaignIdeas: "",
    relatedYouTubeVideoId: "",
  },
  {
    title: "Red Light Lullaby",
    artistName: "PrettyWise",
    status: "Idea",
    songTitle: "Red Light Lullaby",
    conceptSummary:
      "A hypnotic dark pop lullaby that feels beautiful and threatening under red lights.",
    genre: "Dark Pop, Horror K-Pop",
    mood: "hypnotic, eerie, intimate, dangerous",
    lyricalTheme: "A soft warning song sung under red lights as the nightmare watches.",
    storyRole: "Connects to The Red Eye Signal and the idea of being watched.",
    hookIdea: "",
    chorusIdea: "",
    sunoPrompt: "",
    lyricDraft: "",
    visualConcept:
      "Glowing red eye, dark bedroom, rain on window, red neon light, whispered cinematic close-ups.",
    youtubeAngle: "A hypnotic dark pop lullaby that feels beautiful and threatening.",
    productTieIn: "Red eye poster, lyric shirt, dark lullaby visual pack.",
    campaignId: "",
    campaignName: "",
    releasePlanId: "",
    relatedLoreIds: [],
    relatedAssetIds: [],
    relatedPromptRunIds: [],
    qualityReviewId: "",
    tags: PRETTYWISE_SONG_TAGS,
    notes: `${DEMO_DATA_MARKER} — STARTER_PRETTYWISE`,
    publishedUrl: "",
    publishedPlatform: "",
    publishedDate: "",
    releaseStatus: "",
    performanceNotes: "",
    futureMerchIdeas: "",
    futureCampaignIdeas: "",
    relatedYouTubeVideoId: "",
  },
  {
    title: "Sugar Trap",
    artistName: "PrettyWise",
    status: "Idea",
    songTitle: "Sugar Trap",
    conceptSummary: "A creepy-cute K-pop villain anthem about sweet temptation.",
    genre: "Creepy-Cute K-Pop, Villain Pop",
    mood: "playful, dangerous, catchy, seductive, sinister",
    lyricalTheme:
      "Sweet things becoming traps; candy, hooks, and lights pulling the listener deeper.",
    storyRole: "Turns the Sugar Trap lore theme into a catchy villain-pop song.",
    hookIdea: "",
    chorusIdea: "",
    sunoPrompt: "",
    lyricDraft: "",
    visualConcept:
      "Candy shop with corrupted neon, pink smoke, glitch hearts, sharp idol styling.",
    youtubeAngle: "A creepy-cute K-pop villain anthem about sweet temptation.",
    productTieIn: "Sugar Trap shirt, candy horror sticker/poster, lyric merch.",
    campaignId: "",
    campaignName: "",
    releasePlanId: "",
    relatedLoreIds: [],
    relatedAssetIds: [],
    relatedPromptRunIds: [],
    qualityReviewId: "",
    tags: PRETTYWISE_SONG_TAGS,
    notes: `${DEMO_DATA_MARKER} — STARTER_PRETTYWISE`,
    publishedUrl: "",
    publishedPlatform: "",
    publishedDate: "",
    releaseStatus: "",
    performanceNotes: "",
    futureMerchIdeas: "",
    futureCampaignIdeas: "",
    relatedYouTubeVideoId: "",
  },
  {
    title: "Static Dollhouse",
    artistName: "PrettyWise",
    status: "Idea",
    songTitle: "Static Dollhouse",
    conceptSummary:
      "Dark K-pop horror-pop song about beauty, control, and the mask breaking.",
    genre: "Horror Pop, Dark K-Pop",
    mood: "doll-like, haunted, glitchy, emotional, eerie",
    lyricalTheme:
      "A perfect dollhouse world breaking apart through static, mirrors, and hidden fear.",
    storyRole: "Explores the Creepy-Cute Mask and identity/performance themes.",
    hookIdea: "",
    chorusIdea: "",
    sunoPrompt: "",
    lyricDraft: "",
    visualConcept:
      "Dollhouse room, cracked mirror, pink static, PrettyWise as haunted idol/doll figure.",
    youtubeAngle: "Dark K-pop horror-pop song about beauty, control, and the mask breaking.",
    productTieIn: "Static Dollhouse poster, dollhouse lyric shirt, creepy-cute wall art.",
    campaignId: "",
    campaignName: "",
    releasePlanId: "",
    relatedLoreIds: [],
    relatedAssetIds: [],
    relatedPromptRunIds: [],
    qualityReviewId: "",
    tags: PRETTYWISE_SONG_TAGS,
    notes: `${DEMO_DATA_MARKER} — STARTER_PRETTYWISE`,
  },
]
