"use server"

import { revalidatePath } from "next/cache"

import {
  artistRelationsToNestedCreate,
  artistToPrismaCreate,
  artistToPrismaUpdate,
  campaignsToPrismaCreate,
  normalizeArtistRecord,
  prismaArtistToArtistRecord,
  productsToPrismaCreate,
  releasesToPrismaCreate,
} from "@/lib/data/artists"
import { ArtistDatabaseError } from "@/lib/errors/artist-database-error"
import { prisma } from "@/lib/prisma"
import type { ArtistRecord } from "@/lib/types"

const ARTIST_PATHS = ["/artist-crm", "/release-planner", "/"]

const artistInclude = {
  releases: {
    orderBy: { sortOrder: "asc" as const },
  },
  products: {
    orderBy: { sortOrder: "asc" as const },
  },
  campaigns: {
    orderBy: { sortOrder: "asc" as const },
  },
}

function assertArtistPrismaReady(): void {
  const client = prisma as typeof prisma & {
    artist?: unknown
    artistRelease?: unknown
    artistProduct?: unknown
    artistCampaign?: unknown
  }

  if (
    client.artist == null ||
    client.artistRelease == null ||
    client.artistProduct == null ||
    client.artistCampaign == null
  ) {
    throw new ArtistDatabaseError(
      "Prisma Client is missing Artist CRM delegates. Run `npx prisma generate` and `npm run db:migrate`, then restart the dev server.",
    )
  }
}

function wrapArtistDbError(error: unknown, context: string): ArtistDatabaseError {
  if (error instanceof ArtistDatabaseError) return error

  const message = error instanceof Error ? error.message : String(error)

  if (message.includes("no such table") || message.includes("does not exist")) {
    return new ArtistDatabaseError(
      `${context} Artist CRM tables are missing. Run \`npm run db:migrate\`, then restart the dev server.`,
      { cause: error },
    )
  }

  return new ArtistDatabaseError(`${context} ${message}`, { cause: error })
}

function revalidateArtistRoutes() {
  for (const path of ARTIST_PATHS) {
    revalidatePath(path)
  }
}

async function listArtistsFromDb(): Promise<ArtistRecord[]> {
  assertArtistPrismaReady()
  const rows = await prisma.artist.findMany({
    include: artistInclude,
    orderBy: { updatedAt: "desc" },
  })
  return rows.map(prismaArtistToArtistRecord)
}

async function replaceArtistRelations(record: ArtistRecord): Promise<void> {
  const normalized = normalizeArtistRecord(record)

  await prisma.artistRelease.deleteMany({ where: { artistId: normalized.id } })
  await prisma.artistProduct.deleteMany({ where: { artistId: normalized.id } })
  await prisma.artistCampaign.deleteMany({ where: { artistId: normalized.id } })

  const releaseData = releasesToPrismaCreate(normalized.id, normalized.releases)
  if (releaseData.length > 0) {
    await prisma.artistRelease.createMany({ data: releaseData })
  }

  const productData = productsToPrismaCreate(
    normalized.id,
    normalized.merchProducts,
  )
  if (productData.length > 0) {
    await prisma.artistProduct.createMany({ data: productData })
  }

  const campaignData = campaignsToPrismaCreate(normalized.id, normalized.campaigns)
  if (campaignData.length > 0) {
    await prisma.artistCampaign.createMany({ data: campaignData })
  }
}

/**
 * Load all artist CRM records from SQLite.
 * Throws ArtistDatabaseError on failure — store falls back to localStorage.
 */
export async function getArtists(): Promise<ArtistRecord[]> {
  try {
    return await listArtistsFromDb()
  } catch (error) {
    throw wrapArtistDbError(error, "Failed to load artists from database.")
  }
}

/** Create or replace an artist and nested relations. */
export async function upsertArtist(record: ArtistRecord): Promise<ArtistRecord> {
  assertArtistPrismaReady()
  const normalized = normalizeArtistRecord(record)

  try {
    await prisma.artist.upsert({
      where: { id: normalized.id },
      create: {
        ...artistToPrismaCreate(normalized),
        ...artistRelationsToNestedCreate(normalized),
      },
      update: artistToPrismaUpdate(normalized),
    })

    await replaceArtistRelations(normalized)

    const row = await prisma.artist.findUniqueOrThrow({
      where: { id: normalized.id },
      include: artistInclude,
    })

    revalidateArtistRoutes()
    return prismaArtistToArtistRecord(row)
  } catch (error) {
    throw wrapArtistDbError(error, "Could not save artist.")
  }
}

/** Delete an artist by id (nested relations cascade). */
export async function deleteArtistById(id: string): Promise<void> {
  assertArtistPrismaReady()
  try {
    await prisma.artist.delete({ where: { id } })
    revalidateArtistRoutes()
  } catch (error) {
    throw wrapArtistDbError(error, "Could not delete artist.")
  }
}

/** Import artist records (merge by id). */
export async function importArtists(items: ArtistRecord[]): Promise<ArtistRecord[]> {
  if (!Array.isArray(items)) {
    throw new ArtistDatabaseError("Import payload must be an array of artist records.")
  }

  for (const item of items) {
    await upsertArtist(normalizeArtistRecord(item))
  }
  revalidateArtistRoutes()
  return listArtistsFromDb()
}

/**
 * One-time migration: copy artist CRM records from browser localStorage into SQLite.
 * Does not delete localStorage data — kept for rollback/export.
 */
export async function migrateLocalArtistsToDatabase(
  items: ArtistRecord[],
): Promise<{ migrated: number; total: number }> {
  assertArtistPrismaReady()

  if (!Array.isArray(items)) {
    throw new ArtistDatabaseError(
      "Migration payload must be an array of artist records.",
    )
  }

  if (items.length === 0) {
    const total = await prisma.artist.count()
    return { migrated: 0, total }
  }

  for (const item of items) {
    await upsertArtist(normalizeArtistRecord(item))
  }

  revalidateArtistRoutes()
  const total = await prisma.artist.count()
  return { migrated: items.length, total }
}
