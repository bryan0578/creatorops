import {
  DEMO_ARTIST_NAME,
  DEMO_DATA_MARKER,
  DEMO_ID_PREFIX,
  demoDates,
} from "@/lib/demo-data/constants"
import type {
  ArtistBibleRecord,
  LoreEntryRecord,
  ReleaseStoryArcRecord,
  SongConceptRecord,
  VisualIdentityProfileRecord,
} from "@/lib/artist-universe/types"

const { timestamp } = demoDates()

export const DEMO_ARTIST_UNIVERSE_IDS = {
  bible: `${DEMO_ID_PREFIX}prettywise-artist-bible`,
  loreCandyStatic: `${DEMO_ID_PREFIX}prettywise-lore-candy-static`,
  loreRedEye: `${DEMO_ID_PREFIX}prettywise-lore-red-eye`,
  loreNoExit: `${DEMO_ID_PREFIX}prettywise-lore-no-exit`,
  loreMask: `${DEMO_ID_PREFIX}prettywise-lore-mask`,
  conceptNoExit: `${DEMO_ID_PREFIX}prettywise-concept-no-exit`,
  conceptCottonCandy: `${DEMO_ID_PREFIX}prettywise-concept-cotton-candy`,
  conceptRedLight: `${DEMO_ID_PREFIX}prettywise-concept-red-light`,
  conceptSugarTrap: `${DEMO_ID_PREFIX}prettywise-concept-sugar-trap`,
  storyArc: `${DEMO_ID_PREFIX}prettywise-story-arc`,
  visualIdentity: `${DEMO_ID_PREFIX}prettywise-visual-identity`,
} as const

export function buildPrettyWiseArtistBible(): ArtistBibleRecord {
  return {
    id: DEMO_ARTIST_UNIVERSE_IDS.bible,
    artistName: DEMO_ARTIST_NAME,
    projectName: DEMO_ARTIST_NAME,
    labelName: "Dorsyth Records",
    status: "Active",
    genre: "Dark K-pop, Horror Pop, Dark Pop",
    subgenre: "",
    mood: "dark, cinematic, aggressive, mysterious, hypnotic, rebellious",
    aesthetic: "creepy-cute candy horror, dark cyberpunk, anime-inspired, red/black contrast",
    targetAudience: "dark electronic, cyberpunk visuals, anime edits, villain playlists",
    brandPromise: "cinematic dark pop with mysterious female energy and story-driven worlds",
    shortBio: "AI horror-pop artist under Dorsyth Records.",
    longBio: "",
    voiceRules: "",
    lyricalThemes: "trapped worlds, hidden truth, villain perspective, obsession, rebellion",
    visualRules: "red/black cyberpunk, glowing eyes, corrupted textures, cinematic contrast",
    sonicRules: "",
    doList: ["keep visuals dark and premium", "connect releases to story/worldbuilding"],
    dontList: ["avoid generic pop branding", "avoid inconsistent character identity"],
    referenceArtists: [],
    referenceMedia: [],
    colorPalette: ["#FF0033", "#0A0A0A"],
    keywords: ["horror pop", "dark k-pop"],
    tags: ["prettywise", "demo"],
    notes: DEMO_DATA_MARKER,
    sourceArtistId: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function buildPrettyWiseLoreEntries(): LoreEntryRecord[] {
  const base = {
    artistName: DEMO_ARTIST_NAME,
    status: "Active",
    canonStatus: "Canon" as const,
    details: "",
    characters: [],
    locations: [],
    symbols: [],
    themes: [],
    relatedSongs: [],
    relatedCampaignIds: [],
    relatedAssetIds: [],
    tags: ["prettywise", "demo"],
    notes: DEMO_DATA_MARKER,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  return [
    { ...base, id: DEMO_ARTIST_UNIVERSE_IDS.loreCandyStatic, title: "The Candy Static", loreType: "World", summary: "A corrupted candy dimension broadcasting through broken TV static." },
    { ...base, id: DEMO_ARTIST_UNIVERSE_IDS.loreRedEye, title: "The Red Eye Signal", loreType: "Symbol", summary: "Recurring red eye motif signaling surveillance and rebellion." },
    { ...base, id: DEMO_ARTIST_UNIVERSE_IDS.loreNoExit, title: "No Exit Corridor", loreType: "Story Event", summary: "Endless corridor motif for escape/trap themes." },
    { ...base, id: DEMO_ARTIST_UNIVERSE_IDS.loreMask, title: "Creepy-Cute Mask", loreType: "Character", summary: "PrettyWise's creepy-cute mask persona — sweet surface, horror underneath." },
  ]
}

export function buildPrettyWiseSongConcepts(): SongConceptRecord[] {
  const base = {
    artistName: DEMO_ARTIST_NAME,
    status: "Idea",
    genre: "Dark Pop",
    mood: "dark, hypnotic",
    lyricalTheme: "",
    storyRole: "",
    hookIdea: "",
    chorusIdea: "",
    sunoPrompt: "",
    lyricDraft: "",
    visualConcept: "red/black cyber candy horror",
    youtubeAngle: "",
    productTieIn: "",
    campaignId: "",
    campaignName: "",
    releasePlanId: "",
    relatedLoreIds: [],
    relatedAssetIds: [],
    relatedPromptRunIds: [],
    qualityReviewId: "",
    tags: ["prettywise", "demo"],
    notes: DEMO_DATA_MARKER,
    publishedUrl: "",
    publishedPlatform: "",
    publishedDate: "",
    releaseStatus: "",
    performanceNotes: "",
    futureMerchIdeas: "",
    futureCampaignIdeas: "",
    relatedYouTubeVideoId: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  return [
    { ...base, id: DEMO_ARTIST_UNIVERSE_IDS.conceptNoExit, title: "No Exit", songTitle: "No Exit", conceptSummary: "Trap/escape anthem in the candy horror corridor." },
    { ...base, id: DEMO_ARTIST_UNIVERSE_IDS.conceptCottonCandy, title: "Cotton Candy Skies", songTitle: "Cotton Candy Skies", conceptSummary: "Bittersweet sky motif — cute surface, dystopian undertone." },
    { ...base, id: DEMO_ARTIST_UNIVERSE_IDS.conceptRedLight, title: "Red Light Lullaby", songTitle: "Red Light Lullaby", conceptSummary: "Hypnotic lullaby with surveillance/red eye symbolism." },
    { ...base, id: DEMO_ARTIST_UNIVERSE_IDS.conceptSugarTrap, title: "Sugar Trap", songTitle: "Sugar Trap", conceptSummary: "Creepy-cute bait-and-switch pop banger." },
  ]
}

export function buildPrettyWiseStoryArc(): ReleaseStoryArcRecord {
  return {
    id: DEMO_ARTIST_UNIVERSE_IDS.storyArc,
    title: "PrettyWise: The Candy Horror Era",
    artistName: DEMO_ARTIST_NAME,
    arcType: "Album Era",
    status: "Planning",
    summary: "Connected releases exploring candy static worlds, red eye signals, and escape motifs.",
    theme: "candy horror / cyber escape",
    startDate: null,
    endDate: null,
    campaignIds: [],
    releasePlanIds: [],
    songConceptIds: Object.values(DEMO_ARTIST_UNIVERSE_IDS).filter((id) => id.includes("concept")),
    loreEntryIds: Object.values(DEMO_ARTIST_UNIVERSE_IDS).filter((id) => id.includes("lore")),
    productCollectionIds: [],
    visualDirection: "red/black cyber candy horror",
    narrativeBeats: ["Signal detected", "Mask revealed", "Corridor chase", "No exit"],
    launchNotes: "",
    tags: ["prettywise", "demo"],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function buildPrettyWiseVisualIdentity(): VisualIdentityProfileRecord {
  return {
    id: DEMO_ARTIST_UNIVERSE_IDS.visualIdentity,
    artistName: DEMO_ARTIST_NAME,
    profileName: "PrettyWise Red/Black Cyber Candy Horror",
    status: "Active",
    visualStyle: "creepy-cute candy horror cyberpunk",
    colorPalette: ["#FF0033", "#0A0A0A", "#1A1A2E"],
    typographyRules: "bold condensed sans, high contrast",
    characterRules: "mysterious female energy, glowing eyes, creepy-cute mask",
    environmentRules: "corrupted digital textures, neon candy glitch",
    imagePromptRules: "cinematic contrast, anime-inspired, horror-pop",
    thumbnailRules: "minimal text, red/black, strong focal character",
    merchDesignRules: "premium dark merch, symbol-led designs",
    forbiddenElements: ["bright cheerful pop", "cluttered thumbnail text"],
    referenceAssetIds: [],
    referenceDriveFileIds: [],
    tags: ["prettywise", "demo"],
    notes: DEMO_DATA_MARKER,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}
