"use server"

import { revalidatePath } from "next/cache"

import {
  loreEntryToPrismaCreate,
  loreEntryToPrismaUpdate,
  normalizeLoreEntry,
  prismaLoreEntryToRecord,
} from "@/lib/data/lore"
import { prisma } from "@/lib/prisma"
import { createId } from "@/lib/storage"
import type { LoreEntryRecord } from "@/lib/artist-universe/types"

const PATHS = ["/", "/lore", "/story-arcs", "/song-vault", "/artist-bible", "/search", "/backups"]

function revalidate() {
  for (const path of PATHS) revalidatePath(path)
}

function wrapDbError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("no such table") || message.includes("does not exist")) {
    return new Error(`${context} LoreEntry table is missing. Run npm run db:migrate.`)
  }
  return new Error(`${context} ${message}`)
}

export async function getLoreEntries(): Promise<LoreEntryRecord[]> {
  try {
    const rows = await prisma.loreEntry.findMany({ orderBy: { updatedAt: "desc" } })
    return rows.map(prismaLoreEntryToRecord)
  } catch (error) {
    throw wrapDbError(error, "Failed to load lore entries.")
  }
}

export async function getLoreEntryById(id: string): Promise<LoreEntryRecord | null> {
  try {
    const row = await prisma.loreEntry.findUnique({ where: { id: id.trim() } })
    return row ? prismaLoreEntryToRecord(row) : null
  } catch {
    return null
  }
}

export async function getLoreEntriesForArtist(artistName: string): Promise<LoreEntryRecord[]> {
  const name = artistName.trim()
  if (!name) return []
  try {
    const rows = await prisma.loreEntry.findMany({
      where: { artistName: name },
      orderBy: { updatedAt: "desc" },
    })
    return rows.map(prismaLoreEntryToRecord)
  } catch {
    return []
  }
}

export async function createLoreEntry(
  data: Omit<LoreEntryRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<LoreEntryRecord> {
  const record = normalizeLoreEntry({
    ...data,
    id: data.id?.trim() || createId("lore"),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  try {
    const row = await prisma.loreEntry.create({
      data: loreEntryToPrismaCreate(record) as Parameters<typeof prisma.loreEntry.create>[0]["data"],
    })
    revalidate()
    return prismaLoreEntryToRecord(row)
  } catch (error) {
    throw wrapDbError(error, "Could not create lore entry.")
  }
}

export async function updateLoreEntry(
  id: string,
  data: Partial<Omit<LoreEntryRecord, "id" | "createdAt">>,
): Promise<LoreEntryRecord> {
  const existing = await getLoreEntryById(id)
  if (!existing) throw new Error("Lore entry not found.")
  const record = normalizeLoreEntry({ ...existing, ...data, id, updatedAt: Date.now() })
  try {
    const row = await prisma.loreEntry.update({
      where: { id },
      data: loreEntryToPrismaUpdate(record),
    })
    revalidate()
    return prismaLoreEntryToRecord(row)
  } catch (error) {
    throw wrapDbError(error, "Could not update lore entry.")
  }
}

export async function deleteLoreEntry(id: string): Promise<void> {
  try {
    await prisma.loreEntry.delete({ where: { id: id.trim() } })
    revalidate()
  } catch (error) {
    throw wrapDbError(error, "Could not delete lore entry.")
  }
}

export async function markLoreCanon(id: string): Promise<LoreEntryRecord> {
  return updateLoreEntry(id, { canonStatus: "Canon", status: "Active" })
}

export async function markLoreFlexible(id: string): Promise<LoreEntryRecord> {
  return updateLoreEntry(id, { canonStatus: "Flexible" })
}

export async function archiveLoreEntry(id: string): Promise<LoreEntryRecord> {
  return updateLoreEntry(id, { status: "Archived", canonStatus: "Deprecated" })
}
