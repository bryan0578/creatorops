"use server"

import { revalidatePath } from "next/cache"

import {
  artistBibleToPrismaCreate,
  artistBibleToPrismaUpdate,
  normalizeArtistBible,
  prismaArtistBibleToRecord,
} from "@/lib/data/artist-bible"
import { loreEntryToPrismaCreate, loreEntryToPrismaUpdate, normalizeLoreEntry, prismaLoreEntryToRecord } from "@/lib/data/lore"
import { normalizeSongConcept, prismaSongConceptToRecord, songConceptToPrismaCreate, songConceptToPrismaUpdate } from "@/lib/data/song-concepts"
import { normalizeStoryArc, prismaStoryArcToRecord, storyArcToPrismaCreate, storyArcToPrismaUpdate } from "@/lib/data/story-arcs"
import { normalizeVisualIdentity, prismaVisualIdentityToRecord, visualIdentityToPrismaCreate, visualIdentityToPrismaUpdate } from "@/lib/data/visual-identity"
import { prisma } from "@/lib/prisma"
import type {
  ArtistBibleRecord,
  LoreEntryRecord,
  ReleaseStoryArcRecord,
  SongConceptRecord,
  VisualIdentityProfileRecord,
} from "@/lib/artist-universe/types"
import {
  buildArtistUniverseContext,
  getCampaignArtistUniverseSnapshot,
} from "@/lib/artist-universe/context"

export async function loadCampaignArtistUniverseSnapshot(campaignId: string) {
  return getCampaignArtistUniverseSnapshot(campaignId)
}

export async function loadArtistUniverseContext(
  input: Parameters<typeof buildArtistUniverseContext>[0],
) {
  return buildArtistUniverseContext(input)
}

export async function importArtistBibles(items: ArtistBibleRecord[]): Promise<void> {
  for (const item of items) {
    const record = normalizeArtistBible(item)
    await prisma.artistBible.upsert({
      where: { id: record.id },
      create: artistBibleToPrismaCreate(record) as Parameters<typeof prisma.artistBible.create>[0]["data"],
      update: artistBibleToPrismaUpdate(record),
    })
  }
  revalidatePath("/backups")
}

export async function importLoreEntries(items: LoreEntryRecord[]): Promise<void> {
  for (const item of items) {
    const record = normalizeLoreEntry(item)
    await prisma.loreEntry.upsert({
      where: { id: record.id },
      create: loreEntryToPrismaCreate(record) as Parameters<typeof prisma.loreEntry.create>[0]["data"],
      update: loreEntryToPrismaUpdate(record),
    })
  }
  revalidatePath("/backups")
}

export async function importSongConcepts(items: SongConceptRecord[]): Promise<void> {
  for (const item of items) {
    const record = normalizeSongConcept(item)
    await prisma.songConcept.upsert({
      where: { id: record.id },
      create: songConceptToPrismaCreate(record) as Parameters<typeof prisma.songConcept.create>[0]["data"],
      update: songConceptToPrismaUpdate(record),
    })
  }
  revalidatePath("/backups")
}

export async function importStoryArcs(items: ReleaseStoryArcRecord[]): Promise<void> {
  for (const item of items) {
    const record = normalizeStoryArc(item)
    await prisma.releaseStoryArc.upsert({
      where: { id: record.id },
      create: storyArcToPrismaCreate(record) as Parameters<typeof prisma.releaseStoryArc.create>[0]["data"],
      update: storyArcToPrismaUpdate(record),
    })
  }
  revalidatePath("/backups")
}

export async function importVisualIdentities(items: VisualIdentityProfileRecord[]): Promise<void> {
  for (const item of items) {
    const record = normalizeVisualIdentity(item)
    await prisma.visualIdentityProfile.upsert({
      where: { id: record.id },
      create: visualIdentityToPrismaCreate(record) as Parameters<typeof prisma.visualIdentityProfile.create>[0]["data"],
      update: visualIdentityToPrismaUpdate(record),
    })
  }
  revalidatePath("/backups")
}

export async function exportArtistUniverseRecords() {
  const [bibles, lore, concepts, arcs, visual] = await Promise.all([
    prisma.artistBible.findMany().catch(() => []),
    prisma.loreEntry.findMany().catch(() => []),
    prisma.songConcept.findMany().catch(() => []),
    prisma.releaseStoryArc.findMany().catch(() => []),
    prisma.visualIdentityProfile.findMany().catch(() => []),
  ])
  return {
    artistBibles: bibles.map(prismaArtistBibleToRecord),
    loreEntries: lore.map(prismaLoreEntryToRecord),
    songConcepts: concepts.map(prismaSongConceptToRecord),
    storyArcs: arcs.map(prismaStoryArcToRecord),
    visualIdentities: visual.map(prismaVisualIdentityToRecord),
  }
}
