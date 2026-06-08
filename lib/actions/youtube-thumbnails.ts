"use server"

import { revalidatePath } from "next/cache"

import {
  normalizeYouTubeThumbnailRecord,
  prismaYouTubeThumbnailToRecord,
  youtubeThumbnailToPrismaCreate,
  youtubeThumbnailToPrismaUpdate,
} from "@/lib/data/youtube-thumbnails"
import { YouTubeThumbnailDatabaseError } from "@/lib/errors/youtube-thumbnail-database-error"
import { prisma } from "@/lib/prisma"
import type { YouTubeThumbnailRecord } from "@/lib/types"

const YOUTUBE_THUMBNAIL_PATHS = ["/youtube-thumbnails", "/artist-crm", "/"]

function assertYouTubeThumbnailPrismaReady(): void {
  const client = prisma as typeof prisma & { youTubeThumbnail?: unknown }

  if (client.youTubeThumbnail == null) {
    throw new YouTubeThumbnailDatabaseError(
      "Prisma Client is missing the YouTubeThumbnail delegate. Run `npx prisma generate` and `npm run db:migrate`, then restart the dev server.",
    )
  }
}

function wrapYouTubeThumbnailDbError(
  error: unknown,
  context: string,
): YouTubeThumbnailDatabaseError {
  if (error instanceof YouTubeThumbnailDatabaseError) return error

  const message = error instanceof Error ? error.message : String(error)

  if (message.includes("no such table") || message.includes("does not exist")) {
    return new YouTubeThumbnailDatabaseError(
      `${context} YouTubeThumbnail table is missing. Run \`npm run db:migrate\`, then restart the dev server.`,
      { cause: error },
    )
  }

  return new YouTubeThumbnailDatabaseError(`${context} ${message}`, {
    cause: error,
  })
}

function revalidateYouTubeThumbnailRoutes() {
  for (const path of YOUTUBE_THUMBNAIL_PATHS) {
    revalidatePath(path)
  }
}

async function listYouTubeThumbnailsFromDb(): Promise<YouTubeThumbnailRecord[]> {
  assertYouTubeThumbnailPrismaReady()
  const rows = await prisma.youTubeThumbnail.findMany({
    orderBy: { updatedAt: "desc" },
  })
  return rows.map(prismaYouTubeThumbnailToRecord)
}

/**
 * Load all YouTube thumbnail records from SQLite.
 * Throws YouTubeThumbnailDatabaseError on failure — store falls back to localStorage.
 */
export async function getYouTubeThumbnails(): Promise<YouTubeThumbnailRecord[]> {
  try {
    return await listYouTubeThumbnailsFromDb()
  } catch (error) {
    throw wrapYouTubeThumbnailDbError(
      error,
      "Failed to load YouTube thumbnails from database.",
    )
  }
}

/** Create or replace a YouTube thumbnail record. */
export async function upsertYouTubeThumbnail(
  record: YouTubeThumbnailRecord,
): Promise<YouTubeThumbnailRecord> {
  assertYouTubeThumbnailPrismaReady()
  const normalized = normalizeYouTubeThumbnailRecord(record)

  try {
    const row = await prisma.youTubeThumbnail.upsert({
      where: { id: normalized.id },
      create: youtubeThumbnailToPrismaCreate(normalized),
      update: youtubeThumbnailToPrismaUpdate(normalized),
    })
    revalidateYouTubeThumbnailRoutes()
    return prismaYouTubeThumbnailToRecord(row)
  } catch (error) {
    throw wrapYouTubeThumbnailDbError(error, "Could not save YouTube thumbnail.")
  }
}

/** Delete a YouTube thumbnail record by id. */
export async function deleteYouTubeThumbnailById(id: string): Promise<void> {
  assertYouTubeThumbnailPrismaReady()
  try {
    await prisma.youTubeThumbnail.delete({ where: { id } })
    revalidateYouTubeThumbnailRoutes()
  } catch (error) {
    throw wrapYouTubeThumbnailDbError(
      error,
      "Could not delete YouTube thumbnail.",
    )
  }
}

/** Import YouTube thumbnail records (merge by id). */
export async function importYouTubeThumbnails(
  items: YouTubeThumbnailRecord[],
): Promise<YouTubeThumbnailRecord[]> {
  if (!Array.isArray(items)) {
    throw new YouTubeThumbnailDatabaseError(
      "Import payload must be an array of YouTube thumbnail records.",
    )
  }

  for (const item of items) {
    await upsertYouTubeThumbnail(normalizeYouTubeThumbnailRecord(item))
  }
  revalidateYouTubeThumbnailRoutes()
  return listYouTubeThumbnailsFromDb()
}

/**
 * One-time migration: copy YouTube thumbnails from browser localStorage into SQLite.
 * Does not delete localStorage data — kept for rollback/export.
 */
export async function migrateLocalYouTubeThumbnailsToDatabase(
  items: YouTubeThumbnailRecord[],
): Promise<{ migrated: number; total: number }> {
  assertYouTubeThumbnailPrismaReady()

  if (!Array.isArray(items)) {
    throw new YouTubeThumbnailDatabaseError(
      "Migration payload must be an array of YouTube thumbnail records.",
    )
  }

  if (items.length === 0) {
    const total = await prisma.youTubeThumbnail.count()
    return { migrated: 0, total }
  }

  for (const item of items) {
    await upsertYouTubeThumbnail(normalizeYouTubeThumbnailRecord(item))
  }

  revalidateYouTubeThumbnailRoutes()
  const total = await prisma.youTubeThumbnail.count()
  return { migrated: items.length, total }
}
