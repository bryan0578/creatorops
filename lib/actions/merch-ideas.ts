"use server"

import { revalidatePath } from "next/cache"

import {
  merchIdeaToPrismaCreate,
  merchIdeaToPrismaUpdate,
  normalizeMerchIdea,
  prismaMerchIdeaToMerchIdea,
} from "@/lib/data/merch-ideas"
import { MerchIdeaDatabaseError } from "@/lib/errors/merch-idea-database-error"
import { prisma } from "@/lib/prisma"
import type { MerchIdea } from "@/lib/types"

const MERCH_IDEA_PATHS = ["/merch-ideas", "/artist-crm", "/"]

function assertMerchIdeaPrismaReady(): void {
  const client = prisma as typeof prisma & { merchIdea?: unknown }

  if (client.merchIdea == null) {
    throw new MerchIdeaDatabaseError(
      "Prisma Client is missing the MerchIdea delegate. Run `npx prisma generate` and `npm run db:migrate`, then restart the dev server.",
    )
  }
}

function wrapMerchIdeaDbError(
  error: unknown,
  context: string,
): MerchIdeaDatabaseError {
  if (error instanceof MerchIdeaDatabaseError) return error

  const message = error instanceof Error ? error.message : String(error)

  if (message.includes("no such table") || message.includes("does not exist")) {
    return new MerchIdeaDatabaseError(
      `${context} MerchIdea table is missing. Run \`npm run db:migrate\`, then restart the dev server.`,
      { cause: error },
    )
  }

  return new MerchIdeaDatabaseError(`${context} ${message}`, { cause: error })
}

function revalidateMerchIdeaRoutes() {
  for (const path of MERCH_IDEA_PATHS) {
    revalidatePath(path)
  }
}

async function listMerchIdeasFromDb(): Promise<MerchIdea[]> {
  assertMerchIdeaPrismaReady()
  const rows = await prisma.merchIdea.findMany({
    orderBy: { updatedAt: "desc" },
  })
  return rows.map(prismaMerchIdeaToMerchIdea)
}

/**
 * Load all merch ideas from SQLite.
 * Throws MerchIdeaDatabaseError on failure — store falls back to localStorage.
 */
export async function getMerchIdeas(): Promise<MerchIdea[]> {
  try {
    return await listMerchIdeasFromDb()
  } catch (error) {
    throw wrapMerchIdeaDbError(error, "Failed to load merch ideas from database.")
  }
}

/** Create or replace a merch idea. */
export async function upsertMerchIdea(idea: MerchIdea): Promise<MerchIdea> {
  assertMerchIdeaPrismaReady()
  const normalized = normalizeMerchIdea(idea)

  try {
    const row = await prisma.merchIdea.upsert({
      where: { id: normalized.id },
      create: merchIdeaToPrismaCreate(normalized),
      update: merchIdeaToPrismaUpdate(normalized),
    })
    revalidateMerchIdeaRoutes()
    return prismaMerchIdeaToMerchIdea(row)
  } catch (error) {
    throw wrapMerchIdeaDbError(error, "Could not save merch idea.")
  }
}

/** Delete a merch idea by id. */
export async function deleteMerchIdeaById(id: string): Promise<void> {
  assertMerchIdeaPrismaReady()
  try {
    await prisma.merchIdea.delete({ where: { id } })
    revalidateMerchIdeaRoutes()
  } catch (error) {
    throw wrapMerchIdeaDbError(error, "Could not delete merch idea.")
  }
}

/** Import merch ideas (merge by id). */
export async function importMerchIdeas(
  items: MerchIdea[],
): Promise<MerchIdea[]> {
  if (!Array.isArray(items)) {
    throw new MerchIdeaDatabaseError(
      "Import payload must be an array of merch ideas.",
    )
  }

  for (const item of items) {
    await upsertMerchIdea(normalizeMerchIdea(item))
  }
  revalidateMerchIdeaRoutes()
  return listMerchIdeasFromDb()
}

/**
 * One-time migration: copy merch ideas from browser localStorage into SQLite.
 * Does not delete localStorage data — kept for rollback/export.
 */
export async function migrateLocalMerchIdeasToDatabase(
  items: MerchIdea[],
): Promise<{ migrated: number; total: number }> {
  assertMerchIdeaPrismaReady()

  if (!Array.isArray(items)) {
    throw new MerchIdeaDatabaseError(
      "Migration payload must be an array of merch ideas.",
    )
  }

  if (items.length === 0) {
    const total = await prisma.merchIdea.count()
    return { migrated: 0, total }
  }

  for (const item of items) {
    await upsertMerchIdea(normalizeMerchIdea(item))
  }

  revalidateMerchIdeaRoutes()
  const total = await prisma.merchIdea.count()
  return { migrated: items.length, total }
}
