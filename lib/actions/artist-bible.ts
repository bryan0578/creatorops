"use server"

import { revalidatePath } from "next/cache"

import {
  artistBibleToPrismaCreate,
  artistBibleToPrismaUpdate,
  normalizeArtistBible,
  prismaArtistBibleToRecord,
} from "@/lib/data/artist-bible"
import { buildArtistUniverseContext } from "@/lib/artist-universe/context"
import { DEMO_DATA_MARKER } from "@/lib/demo-data/constants"
import { prisma } from "@/lib/prisma"
import { createId } from "@/lib/storage"
import type { ArtistBibleRecord } from "@/lib/artist-universe/types"

const PATHS = [
  "/",
  "/artist-bible",
  "/artist-crm",
  "/lore",
  "/song-vault",
  "/story-arcs",
  "/visual-identity",
  "/campaigns",
  "/search",
  "/backups",
]

function revalidate() {
  for (const path of PATHS) revalidatePath(path)
}

function wrapDbError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("no such table") || message.includes("does not exist")) {
    return new Error(
      `${context} ArtistBible table is missing. Run npm run db:migrate, then restart.`,
    )
  }
  return new Error(`${context} ${message}`)
}

export async function getArtistBibles(): Promise<ArtistBibleRecord[]> {
  try {
    const rows = await prisma.artistBible.findMany({ orderBy: { updatedAt: "desc" } })
    return rows.map(prismaArtistBibleToRecord)
  } catch (error) {
    throw wrapDbError(error, "Failed to load artist bibles.")
  }
}

export async function getArtistBibleById(id: string): Promise<ArtistBibleRecord | null> {
  try {
    const row = await prisma.artistBible.findUnique({ where: { id: id.trim() } })
    return row ? prismaArtistBibleToRecord(row) : null
  } catch {
    return null
  }
}

export async function getArtistBibleByArtistName(
  artistName: string,
): Promise<ArtistBibleRecord | null> {
  const name = artistName.trim()
  if (!name) return null
  try {
    const row = await prisma.artistBible.findFirst({
      where: { artistName: name },
      orderBy: { updatedAt: "desc" },
    })
    return row ? prismaArtistBibleToRecord(row) : null
  } catch {
    return null
  }
}

export async function createArtistBible(
  data: Omit<ArtistBibleRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<ArtistBibleRecord> {
  const record = normalizeArtistBible({
    ...data,
    id: data.id?.trim() || createId("artist-bible"),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  try {
    const row = await prisma.artistBible.create({
      data: artistBibleToPrismaCreate(record) as Parameters<
        typeof prisma.artistBible.create
      >[0]["data"],
    })
    revalidate()
    return prismaArtistBibleToRecord(row)
  } catch (error) {
    throw wrapDbError(error, "Could not create artist bible.")
  }
}

export async function updateArtistBible(
  id: string,
  data: Partial<Omit<ArtistBibleRecord, "id" | "createdAt">>,
): Promise<ArtistBibleRecord> {
  const existing = await getArtistBibleById(id)
  if (!existing) throw new Error("Artist bible not found.")
  const record = normalizeArtistBible({
    ...existing,
    ...data,
    id,
    updatedAt: Date.now(),
  })
  try {
    const row = await prisma.artistBible.update({
      where: { id },
      data: artistBibleToPrismaUpdate(record),
    })
    revalidate()
    return prismaArtistBibleToRecord(row)
  } catch (error) {
    throw wrapDbError(error, "Could not update artist bible.")
  }
}

export async function deleteArtistBible(id: string): Promise<void> {
  try {
    await prisma.artistBible.delete({ where: { id: id.trim() } })
    revalidate()
  } catch (error) {
    throw wrapDbError(error, "Could not delete artist bible.")
  }
}

export async function generateArtistContextSummary(artistName: string): Promise<string> {
  const bundle = await buildArtistUniverseContext({ artistName, includeLore: true, includeVisualIdentity: true })
  return bundle.compactText
}

const PRETTYWISE_STARTER_MARKER = `${DEMO_DATA_MARKER} — PrettyWise starter bible`

export async function createPrettyWiseStarterBible(): Promise<{
  created: boolean
  record: ArtistBibleRecord | null
  message: string
}> {
  const existing = await prisma.artistBible.findFirst({
    where: { artistName: "PrettyWise" },
  })
  if (existing) {
    return {
      created: false,
      record: prismaArtistBibleToRecord(existing),
      message: "PrettyWise artist bible already exists.",
    }
  }

  const record = await createArtistBible({
    artistName: "PrettyWise",
    projectName: "PrettyWise",
    labelName: "Dorsyth Records",
    status: "Active",
    genre: "Dark K-pop, Horror Pop, Dark Pop",
    subgenre: "",
    mood: "dark, cinematic, aggressive, mysterious, hypnotic, rebellious, dystopian, emotional, villainous",
    aesthetic: "creepy-cute candy horror, dark cyberpunk, anime-inspired, red/black contrast, corrupted digital textures",
    targetAudience:
      "fans of dark electronic music, cyberpunk visuals, anime edits, villain playlists, gaming montages, alternative AI music",
    brandPromise:
      "cinematic dark pop releases with mysterious female energy, horror-pop visuals, and story-driven worlds",
    shortBio: "",
    longBio: "",
    voiceRules: "",
    lyricalThemes:
      "trapped worlds, hidden truth, villain perspective, obsession, haunted beauty, rebellion, identity, escape",
    visualRules:
      "red/black cyberpunk, glowing eyes, anime-inspired character, corrupted textures, bold typography, cinematic contrast",
    sonicRules: "",
    doList: [
      "keep visuals dark and premium",
      "use mysterious female character energy",
      "connect releases to story/worldbuilding",
      "use strong hooks and memorable title phrases",
    ],
    dontList: [
      "avoid generic pop branding",
      "avoid bright cheerful visuals unless twisted/creepy-cute",
      "avoid cluttered thumbnail text",
      "avoid inconsistent character identity",
    ],
    referenceArtists: [],
    referenceMedia: [],
    colorPalette: ["#FF0033", "#0A0A0A", "#1A1A2E", "#E8E8E8"],
    keywords: ["horror pop", "dark k-pop", "creepy-cute", "cyberpunk", "AI artist"],
    tags: ["prettywise", "starter"],
    notes: PRETTYWISE_STARTER_MARKER,
    sourceArtistId: "",
  })

  return { created: true, record, message: "PrettyWise starter bible created." }
}
