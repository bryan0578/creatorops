import { prismaArtistBibleToRecord } from "@/lib/data/artist-bible"
import { prismaLoreEntryToRecord } from "@/lib/data/lore"
import { prismaSongConceptToRecord } from "@/lib/data/song-concepts"
import { prismaStoryArcToRecord } from "@/lib/data/story-arcs"
import { prismaVisualIdentityToRecord } from "@/lib/data/visual-identity"
import { prismaCollectionToRecord } from "@/lib/data/collections"
import { prismaAssetToAssetRecord } from "@/lib/data/assets"
import { prismaLearningToRecord } from "@/lib/data/learnings"
import { prismaCampaignToCampaignRecord } from "@/lib/data/campaigns"
import { prisma } from "@/lib/prisma"
import type {
  ArtistUniverseContextBundle,
  ArtistUniverseContextInput,
} from "@/lib/artist-universe/types"

const MAX_CHARS = 4000

function clip(text: string, max = 600): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function joinSection(title: string, body: string): string {
  if (!body.trim()) return ""
  return `## ${title}\n${body.trim()}`
}

function formatList(items: string[], label: string): string {
  if (!items.length) return ""
  return `${label}:\n${items.map((i) => `- ${i}`).join("\n")}`
}

async function loadBibleForArtist(artistName: string) {
  try {
    const row = await prisma.artistBible.findFirst({
      where: { artistName },
      orderBy: { updatedAt: "desc" },
    })
    return row ? prismaArtistBibleToRecord(row) : null
  } catch {
    return null
  }
}

/** Build compact Artist Universe context for AI prompts and agents. */
export async function buildArtistUniverseContext(
  input: ArtistUniverseContextInput,
): Promise<ArtistUniverseContextBundle> {
  let resolvedArtist = input.artistName?.trim()

  if (input.songConceptId) {
    try {
      const row = await prisma.songConcept.findUnique({ where: { id: input.songConceptId } })
      if (row) resolvedArtist = row.artistName || resolvedArtist
    } catch {
      /* ignore */
    }
  }
  if (input.storyArcId) {
    try {
      const row = await prisma.releaseStoryArc.findUnique({ where: { id: input.storyArcId } })
      if (row) resolvedArtist = row.artistName || resolvedArtist
    } catch {
      /* ignore */
    }
  }
  if (input.campaignId) {
    try {
      const row = await prisma.campaign.findUnique({ where: { id: input.campaignId } })
      if (row?.artistName) resolvedArtist = row.artistName
    } catch {
      /* ignore */
    }
  }

  const bible = resolvedArtist ? await loadBibleForArtist(resolvedArtist) : null

  const bibleText = bible
    ? [
        `Artist: ${bible.artistName}`,
        bible.projectName ? `Project: ${bible.projectName}` : "",
        bible.labelName ? `Label: ${bible.labelName}` : "",
        bible.genre ? `Genre: ${bible.genre}` : "",
        bible.mood ? `Mood: ${bible.mood}` : "",
        bible.aesthetic ? `Aesthetic: ${bible.aesthetic}` : "",
        bible.brandPromise ? `Brand promise: ${clip(bible.brandPromise)}` : "",
        bible.voiceRules ? `Voice: ${clip(bible.voiceRules)}` : "",
        bible.lyricalThemes ? `Lyrical themes: ${clip(bible.lyricalThemes)}` : "",
        bible.visualRules ? `Visual rules: ${clip(bible.visualRules)}` : "",
        bible.sonicRules ? `Sonic rules: ${clip(bible.sonicRules)}` : "",
        formatList(bible.doList, "Do"),
        formatList(bible.dontList, "Don't"),
      ]
        .filter(Boolean)
        .join("\n")
    : ""

  let loreText = ""
  if (input.includeLore !== false && resolvedArtist) {
    try {
      const rows = await prisma.loreEntry.findMany({
        where: { artistName: resolvedArtist },
        orderBy: { updatedAt: "desc" },
        take: 12,
      })
      const lore = rows.map(prismaLoreEntryToRecord)
      const canonFirst = [...lore].sort((a, b) => {
        const rank = (s: string) => (s === "Canon" ? 0 : s === "Flexible" ? 1 : 2)
        return rank(a.canonStatus) - rank(b.canonStatus)
      })
      loreText = canonFirst
        .slice(0, 8)
        .map((l) => `- [${l.canonStatus}] ${l.title} (${l.loreType}): ${clip(l.summary, 120)}`)
        .join("\n")
    } catch {
      /* ignore */
    }
  }

  let songText = ""
  if (input.songConceptId) {
    try {
      const row = await prisma.songConcept.findUnique({ where: { id: input.songConceptId } })
      if (row) {
        const concept = prismaSongConceptToRecord(row)
        songText = [
          `Concept: ${concept.title}`,
          concept.songTitle ? `Song: ${concept.songTitle}` : "",
          `Status: ${concept.status}`,
          clip(concept.conceptSummary),
          concept.hookIdea ? `Hook: ${concept.hookIdea}` : "",
          concept.visualConcept ? `Visual: ${clip(concept.visualConcept, 200)}` : "",
          concept.youtubeAngle ? `YouTube: ${clip(concept.youtubeAngle, 200)}` : "",
          concept.productTieIn ? `Product tie-in: ${concept.productTieIn}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      }
    } catch {
      /* ignore */
    }
  } else if (resolvedArtist) {
    try {
      const rows = await prisma.songConcept.findMany({
        where: { artistName: resolvedArtist },
        orderBy: { updatedAt: "desc" },
        take: 5,
      })
      songText = rows
        .map(prismaSongConceptToRecord)
        .map((c) => `- ${c.songTitle || c.title} (${c.status}): ${clip(c.conceptSummary, 80)}`)
        .join("\n")
    } catch {
      /* ignore */
    }
  }

  let visualText = ""
  if (input.includeVisualIdentity !== false && resolvedArtist) {
    try {
      const rows = await prisma.visualIdentityProfile.findMany({
        where: { artistName: resolvedArtist },
        orderBy: { updatedAt: "desc" },
      })
      const profiles = rows.map(prismaVisualIdentityToRecord)
      const active = profiles.find((p) => p.status === "Active") ?? profiles[0]
      if (active) {
        visualText = [
          `Profile: ${active.profileName}`,
          active.visualStyle ? `Style: ${active.visualStyle}` : "",
          active.colorPalette.length ? `Colors: ${active.colorPalette.join(", ")}` : "",
          active.thumbnailRules ? `Thumbnail: ${clip(active.thumbnailRules, 200)}` : "",
          active.merchDesignRules ? `Merch: ${clip(active.merchDesignRules, 200)}` : "",
          formatList(active.forbiddenElements, "Forbidden"),
        ]
          .filter(Boolean)
          .join("\n")
      }
    } catch {
      /* ignore */
    }
  }

  let arcText = ""
  if (input.storyArcId) {
    try {
      const row = await prisma.releaseStoryArc.findUnique({ where: { id: input.storyArcId } })
      if (row) {
        const arc = prismaStoryArcToRecord(row)
        arcText = [
          `Arc: ${arc.title}`,
          arc.arcType ? `Type: ${arc.arcType}` : "",
          arc.theme ? `Theme: ${arc.theme}` : "",
          clip(arc.summary),
          formatList(arc.narrativeBeats, "Beats"),
        ]
          .filter(Boolean)
          .join("\n")
      }
    } catch {
      /* ignore */
    }
  } else if (resolvedArtist) {
    try {
      const rows = await prisma.releaseStoryArc.findMany({
        where: { artistName: resolvedArtist },
        orderBy: { updatedAt: "desc" },
        take: 3,
      })
      arcText = rows
        .map(prismaStoryArcToRecord)
        .map((a) => `- ${a.title} (${a.status}): ${clip(a.summary, 80)}`)
        .join("\n")
    } catch {
      /* ignore */
    }
  }

  let relatedText = ""
  if (input.campaignId) {
    try {
      const row = await prisma.campaign.findUnique({ where: { id: input.campaignId } })
      if (row) {
        const c = prismaCampaignToCampaignRecord(row)
        relatedText = `Campaign: ${c.campaignName} (${c.status}) · ${c.songTitle || c.productName || ""}`
      }
    } catch {
      /* ignore */
    }
  }

  if (input.includeProducts) {
    try {
      const rows = await prisma.productCollection.findMany({ orderBy: { updatedAt: "desc" } })
      const matched = rows
        .map(prismaCollectionToRecord)
        .filter(
          (c) =>
            (resolvedArtist &&
              c.artistName.toLowerCase() === resolvedArtist.toLowerCase()) ||
            (input.campaignId && c.campaignId === input.campaignId),
        )
      if (matched.length) {
        relatedText += `\nCollections: ${matched.map((c) => c.name).join(", ")}`
      }
    } catch {
      /* ignore */
    }
  }

  let learningsText = ""
  if (input.includeLearnings && resolvedArtist) {
    try {
      const rows = await prisma.learning.findMany({ orderBy: { updatedAt: "desc" }, take: 30 })
      learningsText = rows
        .map(prismaLearningToRecord)
        .filter(
          (l) =>
            l.title.toLowerCase().includes(resolvedArtist!.toLowerCase()) ||
            l.notes?.toLowerCase().includes(resolvedArtist!.toLowerCase()) ||
            l.tags.some((t) => t.toLowerCase().includes("artist")),
        )
        .slice(0, 5)
        .map((l) => `- ${l.title}: ${clip(l.insight || l.notes, 100)}`)
        .join("\n")
    } catch {
      /* ignore */
    }
  }

  let assetsText = ""
  if (input.includeAssets && resolvedArtist) {
    try {
      const rows = await prisma.asset.findMany({
        where: { artistName: resolvedArtist },
        orderBy: { updatedAt: "desc" },
        take: 5,
      })
      assetsText = rows.map(prismaAssetToAssetRecord).map((a) => `- ${a.assetName} (${a.assetType})`).join("\n")
    } catch {
      /* ignore */
    }
  }

  const constraints = bible
    ? [formatList(bible.doList, "Do"), formatList(bible.dontList, "Don't")].filter(Boolean).join("\n")
    : ""

  const summary = bible
    ? `${bible.artistName} — ${bible.genre || "music IP"} · ${clip(bible.brandPromise || bible.shortBio, 120)}`
    : resolvedArtist
      ? `${resolvedArtist} (no artist bible on file)`
      : "No artist selected"

  const sections = [
    joinSection("Artist Bible", bibleText),
    joinSection("Canon Lore", loreText),
    joinSection("Song Concepts", songText),
    joinSection("Visual Identity", visualText),
    joinSection("Story Arc", arcText),
    joinSection("Related Records", relatedText),
    joinSection("Learnings", learningsText),
    joinSection("Assets", assetsText),
    joinSection("Constraints", constraints),
  ].filter(Boolean)

  let compactText = `# Artist Universe Context\n${summary}\n\n${sections.join("\n\n")}`
  if (compactText.length > MAX_CHARS) {
    compactText = `${compactText.slice(0, MAX_CHARS - 20)}\n\n[context truncated]`
  }

  return {
    summary,
    artistBible: bibleText,
    lore: loreText,
    songConcept: songText,
    visualIdentity: visualText,
    storyArc: arcText,
    relatedRecords: relatedText,
    constraints,
    compactText,
  }
}

export async function getCampaignArtistUniverseSnapshot(campaignId: string) {
  try {
    const campaignRow = await prisma.campaign.findUnique({ where: { id: campaignId } })
    const campaign = campaignRow ? prismaCampaignToCampaignRecord(campaignRow) : null
    if (!campaign?.artistName?.trim()) {
      return { campaign, bible: null, concepts: [], lore: [], arcs: [], visual: [] }
    }
    const artistName = campaign.artistName.trim()
    const [bible, conceptRows, loreRows, arcRows, visualRows] = await Promise.all([
      loadBibleForArtist(artistName),
      prisma.songConcept.findMany({ where: { artistName }, orderBy: { updatedAt: "desc" } }),
      prisma.loreEntry.findMany({ where: { artistName }, orderBy: { updatedAt: "desc" }, take: 5 }),
      prisma.releaseStoryArc.findMany({ where: { artistName }, orderBy: { updatedAt: "desc" }, take: 3 }),
      prisma.visualIdentityProfile.findMany({ where: { artistName }, orderBy: { updatedAt: "desc" } }),
    ])
    const concepts = conceptRows.map(prismaSongConceptToRecord)
    const linkedConcepts = concepts.filter(
      (c) => c.campaignId === campaignId || c.songTitle === campaign.songTitle,
    )
    return {
      campaign,
      bible,
      concepts: linkedConcepts.length ? linkedConcepts : concepts.slice(0, 5),
      lore: loreRows.map(prismaLoreEntryToRecord),
      arcs: arcRows.map(prismaStoryArcToRecord),
      visual: visualRows.map(prismaVisualIdentityToRecord).filter((v) => v.status === "Active").slice(0, 2),
    }
  } catch {
    return { campaign: null, bible: null, concepts: [], lore: [], arcs: [], visual: [] }
  }
}
