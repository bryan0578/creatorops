"use server"

import { revalidatePath } from "next/cache"

import {
  normalizeSocialRepurposingRecord,
  prismaSocialRepurposingToSocialRepurposingRecord,
  socialRepurposingToPrismaCreate,
  socialRepurposingToPrismaUpdate,
} from "@/lib/data/social-repurposing"
import { SocialRepurposingDatabaseError } from "@/lib/errors/social-repurposing-database-error"
import { prisma } from "@/lib/prisma"
import type { SocialRepurposingRecord } from "@/lib/types"

const SOCIAL_REPURPOSING_PATHS = ["/social-repurposing", "/artist-crm", "/"]

function assertSocialRepurposingPrismaReady(): void {
  const client = prisma as typeof prisma & { socialRepurposing?: unknown }

  if (client.socialRepurposing == null) {
    throw new SocialRepurposingDatabaseError(
      "Prisma Client is missing the SocialRepurposing delegate. Run `npx prisma generate` and `npm run db:migrate`, then restart the dev server.",
    )
  }
}

function wrapSocialRepurposingDbError(
  error: unknown,
  context: string,
): SocialRepurposingDatabaseError {
  if (error instanceof SocialRepurposingDatabaseError) return error

  const message = error instanceof Error ? error.message : String(error)

  if (message.includes("no such table") || message.includes("does not exist")) {
    return new SocialRepurposingDatabaseError(
      `${context} SocialRepurposing table is missing. Run \`npm run db:migrate\`, then restart the dev server.`,
      { cause: error },
    )
  }

  return new SocialRepurposingDatabaseError(`${context} ${message}`, {
    cause: error,
  })
}

function revalidateSocialRepurposingRoutes() {
  for (const path of SOCIAL_REPURPOSING_PATHS) {
    revalidatePath(path)
  }
}

async function listSocialRepurposingRecordsFromDb(): Promise<
  SocialRepurposingRecord[]
> {
  assertSocialRepurposingPrismaReady()
  const rows = await prisma.socialRepurposing.findMany({
    orderBy: { updatedAt: "desc" },
  })
  return rows.map(prismaSocialRepurposingToSocialRepurposingRecord)
}

/**
 * Load all social repurposing records from SQLite.
 * Throws SocialRepurposingDatabaseError on failure — store falls back to localStorage.
 */
export async function getSocialRepurposingRecords(): Promise<
  SocialRepurposingRecord[]
> {
  try {
    return await listSocialRepurposingRecordsFromDb()
  } catch (error) {
    throw wrapSocialRepurposingDbError(
      error,
      "Failed to load social repurposing records from database.",
    )
  }
}

/** Create or replace a social repurposing record. */
export async function upsertSocialRepurposingRecord(
  record: SocialRepurposingRecord,
): Promise<SocialRepurposingRecord> {
  assertSocialRepurposingPrismaReady()
  const normalized = normalizeSocialRepurposingRecord(record)

  try {
    const row = await prisma.socialRepurposing.upsert({
      where: { id: normalized.id },
      create: socialRepurposingToPrismaCreate(normalized),
      update: socialRepurposingToPrismaUpdate(normalized),
    })
    revalidateSocialRepurposingRoutes()
    return prismaSocialRepurposingToSocialRepurposingRecord(row)
  } catch (error) {
    throw wrapSocialRepurposingDbError(
      error,
      "Could not save social repurposing record.",
    )
  }
}

/** Delete a social repurposing record by id. */
export async function deleteSocialRepurposingRecordById(
  id: string,
): Promise<void> {
  assertSocialRepurposingPrismaReady()
  try {
    await prisma.socialRepurposing.delete({ where: { id } })
    revalidateSocialRepurposingRoutes()
  } catch (error) {
    throw wrapSocialRepurposingDbError(
      error,
      "Could not delete social repurposing record.",
    )
  }
}

/** Import social repurposing records (merge by id). */
export async function importSocialRepurposingRecords(
  items: SocialRepurposingRecord[],
): Promise<SocialRepurposingRecord[]> {
  if (!Array.isArray(items)) {
    throw new SocialRepurposingDatabaseError(
      "Import payload must be an array of social repurposing records.",
    )
  }

  for (const item of items) {
    await upsertSocialRepurposingRecord(normalizeSocialRepurposingRecord(item))
  }
  revalidateSocialRepurposingRoutes()
  return listSocialRepurposingRecordsFromDb()
}

/**
 * One-time migration: copy social repurposing records from browser localStorage into SQLite.
 * Does not delete localStorage data — kept for rollback/export.
 */
export async function migrateLocalSocialRepurposingRecordsToDatabase(
  items: SocialRepurposingRecord[],
): Promise<{ migrated: number; total: number }> {
  assertSocialRepurposingPrismaReady()

  if (!Array.isArray(items)) {
    throw new SocialRepurposingDatabaseError(
      "Migration payload must be an array of social repurposing records.",
    )
  }

  if (items.length === 0) {
    const total = await prisma.socialRepurposing.count()
    return { migrated: 0, total }
  }

  for (const item of items) {
    await upsertSocialRepurposingRecord(normalizeSocialRepurposingRecord(item))
  }

  revalidateSocialRepurposingRoutes()
  const total = await prisma.socialRepurposing.count()
  return { migrated: items.length, total }
}
