"use server"

import { revalidatePath } from "next/cache"

import {
  appendUniqueId,
  normalizeStoryArc,
  prismaStoryArcToRecord,
  storyArcToPrismaCreate,
  storyArcToPrismaUpdate,
} from "@/lib/data/story-arcs"
import { prisma } from "@/lib/prisma"
import { createId } from "@/lib/storage"
import type { ReleaseStoryArcRecord } from "@/lib/artist-universe/types"

const PATHS = ["/", "/story-arcs", "/song-vault", "/lore", "/campaigns", "/search", "/backups"]

function revalidate() {
  for (const path of PATHS) revalidatePath(path)
}

function wrapDbError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("no such table") || message.includes("does not exist")) {
    return new Error(`${context} ReleaseStoryArc table is missing. Run npm run db:migrate.`)
  }
  return new Error(`${context} ${message}`)
}

export async function getStoryArcs(): Promise<ReleaseStoryArcRecord[]> {
  try {
    const rows = await prisma.releaseStoryArc.findMany({ orderBy: { updatedAt: "desc" } })
    return rows.map(prismaStoryArcToRecord)
  } catch (error) {
    throw wrapDbError(error, "Failed to load story arcs.")
  }
}

export async function getStoryArcById(id: string): Promise<ReleaseStoryArcRecord | null> {
  try {
    const row = await prisma.releaseStoryArc.findUnique({ where: { id: id.trim() } })
    return row ? prismaStoryArcToRecord(row) : null
  } catch {
    return null
  }
}

export async function getStoryArcsForArtist(artistName: string): Promise<ReleaseStoryArcRecord[]> {
  const name = artistName.trim()
  if (!name) return []
  try {
    const rows = await prisma.releaseStoryArc.findMany({
      where: { artistName: name },
      orderBy: { updatedAt: "desc" },
    })
    return rows.map(prismaStoryArcToRecord)
  } catch {
    return []
  }
}

export async function createStoryArc(
  data: Omit<ReleaseStoryArcRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<ReleaseStoryArcRecord> {
  const record = normalizeStoryArc({
    ...data,
    id: data.id?.trim() || createId("story-arc"),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  try {
    const row = await prisma.releaseStoryArc.create({
      data: storyArcToPrismaCreate(record) as Parameters<
        typeof prisma.releaseStoryArc.create
      >[0]["data"],
    })
    revalidate()
    return prismaStoryArcToRecord(row)
  } catch (error) {
    throw wrapDbError(error, "Could not create story arc.")
  }
}

export async function updateStoryArc(
  id: string,
  data: Partial<Omit<ReleaseStoryArcRecord, "id" | "createdAt">>,
): Promise<ReleaseStoryArcRecord> {
  const existing = await getStoryArcById(id)
  if (!existing) throw new Error("Story arc not found.")
  const record = normalizeStoryArc({ ...existing, ...data, id, updatedAt: Date.now() })
  try {
    const row = await prisma.releaseStoryArc.update({
      where: { id },
      data: storyArcToPrismaUpdate(record),
    })
    revalidate()
    return prismaStoryArcToRecord(row)
  } catch (error) {
    throw wrapDbError(error, "Could not update story arc.")
  }
}

export async function deleteStoryArc(id: string): Promise<void> {
  try {
    await prisma.releaseStoryArc.delete({ where: { id: id.trim() } })
    revalidate()
  } catch (error) {
    throw wrapDbError(error, "Could not delete story arc.")
  }
}

export async function addSongConceptToArc(
  arcId: string,
  songConceptId: string,
): Promise<ReleaseStoryArcRecord> {
  const arc = await getStoryArcById(arcId)
  if (!arc) throw new Error("Story arc not found.")
  return updateStoryArc(arcId, {
    songConceptIds: appendUniqueId(arc.songConceptIds, songConceptId),
  })
}

export async function addCampaignToArc(
  arcId: string,
  campaignId: string,
): Promise<ReleaseStoryArcRecord> {
  const arc = await getStoryArcById(arcId)
  if (!arc) throw new Error("Story arc not found.")
  return updateStoryArc(arcId, {
    campaignIds: appendUniqueId(arc.campaignIds, campaignId),
  })
}

export async function addLoreToArc(arcId: string, loreId: string): Promise<ReleaseStoryArcRecord> {
  const arc = await getStoryArcById(arcId)
  if (!arc) throw new Error("Story arc not found.")
  return updateStoryArc(arcId, {
    loreEntryIds: appendUniqueId(arc.loreEntryIds, loreId),
  })
}
