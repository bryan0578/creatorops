"use server"

import { revalidatePath } from "next/cache"

import {
  normalizeYouTubePackage,
  prismaYouTubePackageToYouTubePackage,
  youtubePackageToPrismaCreate,
  youtubePackageToPrismaUpdate,
} from "@/lib/data/youtube-packages"
import { YouTubePackageDatabaseError } from "@/lib/errors/youtube-package-database-error"
import { prisma } from "@/lib/prisma"
import type { YouTubePackage } from "@/lib/types"

const YOUTUBE_PACKAGE_PATHS = ["/youtube-packaging", "/"]

function assertYouTubePackagePrismaReady(): void {
  const client = prisma as typeof prisma & { youTubePackage?: unknown }

  if (client.youTubePackage == null) {
    throw new YouTubePackageDatabaseError(
      "Prisma Client is missing the YouTubePackage delegate. Run `npx prisma generate` and `npm run db:migrate`, then restart the dev server.",
    )
  }
}

function wrapYouTubePackageDbError(
  error: unknown,
  context: string,
): YouTubePackageDatabaseError {
  if (error instanceof YouTubePackageDatabaseError) return error

  const message = error instanceof Error ? error.message : String(error)

  if (message.includes("no such table") || message.includes("does not exist")) {
    return new YouTubePackageDatabaseError(
      `${context} YouTubePackage table is missing. Run \`npm run db:migrate\`, then restart the dev server.`,
      { cause: error },
    )
  }

  return new YouTubePackageDatabaseError(`${context} ${message}`, { cause: error })
}

function revalidateYouTubePackageRoutes() {
  for (const path of YOUTUBE_PACKAGE_PATHS) {
    revalidatePath(path)
  }
}

async function listYouTubePackagesFromDb(): Promise<YouTubePackage[]> {
  assertYouTubePackagePrismaReady()
  const rows = await prisma.youTubePackage.findMany({
    orderBy: { updatedAt: "desc" },
  })
  return rows.map(prismaYouTubePackageToYouTubePackage)
}

/**
 * Load all YouTube packages from SQLite.
 * Throws YouTubePackageDatabaseError on failure — store falls back to localStorage.
 */
export async function getYouTubePackages(): Promise<YouTubePackage[]> {
  try {
    return await listYouTubePackagesFromDb()
  } catch (error) {
    throw wrapYouTubePackageDbError(
      error,
      "Failed to load YouTube packages from database.",
    )
  }
}

/** Create or replace a YouTube package. */
export async function upsertYouTubePackage(
  pkg: YouTubePackage,
): Promise<YouTubePackage> {
  assertYouTubePackagePrismaReady()
  const normalized = normalizeYouTubePackage(pkg)

  try {
    const row = await prisma.youTubePackage.upsert({
      where: { id: normalized.id },
      create: youtubePackageToPrismaCreate(normalized),
      update: youtubePackageToPrismaUpdate(normalized),
    })
    revalidateYouTubePackageRoutes()
    return prismaYouTubePackageToYouTubePackage(row)
  } catch (error) {
    throw wrapYouTubePackageDbError(error, "Could not save YouTube package.")
  }
}

/** Delete a YouTube package by id. */
export async function deleteYouTubePackageById(id: string): Promise<void> {
  assertYouTubePackagePrismaReady()
  try {
    await prisma.youTubePackage.delete({ where: { id } })
    revalidateYouTubePackageRoutes()
  } catch (error) {
    throw wrapYouTubePackageDbError(error, "Could not delete YouTube package.")
  }
}

/** Import YouTube packages (merge by id). */
export async function importYouTubePackages(
  items: YouTubePackage[],
): Promise<YouTubePackage[]> {
  if (!Array.isArray(items)) {
    throw new YouTubePackageDatabaseError(
      "Import payload must be an array of YouTube packages.",
    )
  }

  for (const item of items) {
    await upsertYouTubePackage(normalizeYouTubePackage(item))
  }
  revalidateYouTubePackageRoutes()
  return listYouTubePackagesFromDb()
}

/**
 * One-time migration: copy YouTube packages from browser localStorage into SQLite.
 * Does not delete localStorage data — kept for rollback/export.
 */
export async function migrateLocalYouTubePackagesToDatabase(
  items: YouTubePackage[],
): Promise<{ migrated: number; total: number }> {
  assertYouTubePackagePrismaReady()

  if (!Array.isArray(items)) {
    throw new YouTubePackageDatabaseError(
      "Migration payload must be an array of YouTube packages.",
    )
  }

  if (items.length === 0) {
    const total = await prisma.youTubePackage.count()
    return { migrated: 0, total }
  }

  for (const item of items) {
    await upsertYouTubePackage(normalizeYouTubePackage(item))
  }

  revalidateYouTubePackageRoutes()
  const total = await prisma.youTubePackage.count()
  return { migrated: items.length, total }
}
