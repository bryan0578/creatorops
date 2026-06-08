"use server"

import { revalidatePath } from "next/cache"

import {
  mockupPromptToPrismaCreate,
  mockupPromptToPrismaUpdate,
  normalizeMockupPromptRecord,
  prismaMockupPromptToMockupPromptRecord,
} from "@/lib/data/mockup-prompts"
import { MockupPromptDatabaseError } from "@/lib/errors/mockup-prompt-database-error"
import { prisma } from "@/lib/prisma"
import type { MockupPromptRecord } from "@/lib/types"

const MOCKUP_PROMPT_PATHS = ["/mockup-prompts", "/"]

function assertMockupPromptPrismaReady(): void {
  const client = prisma as typeof prisma & { mockupPrompt?: unknown }

  if (client.mockupPrompt == null) {
    throw new MockupPromptDatabaseError(
      "Prisma Client is missing the MockupPrompt delegate. Run `npx prisma generate` and `npm run db:migrate`, then restart the dev server.",
    )
  }
}

function wrapMockupPromptDbError(
  error: unknown,
  context: string,
): MockupPromptDatabaseError {
  if (error instanceof MockupPromptDatabaseError) return error

  const message = error instanceof Error ? error.message : String(error)

  if (message.includes("no such table") || message.includes("does not exist")) {
    return new MockupPromptDatabaseError(
      `${context} MockupPrompt table is missing. Run \`npm run db:migrate\`, then restart the dev server.`,
      { cause: error },
    )
  }

  return new MockupPromptDatabaseError(`${context} ${message}`, { cause: error })
}

function revalidateMockupPromptRoutes() {
  for (const path of MOCKUP_PROMPT_PATHS) {
    revalidatePath(path)
  }
}

async function listMockupPromptRecordsFromDb(): Promise<MockupPromptRecord[]> {
  assertMockupPromptPrismaReady()
  const rows = await prisma.mockupPrompt.findMany({
    orderBy: { updatedAt: "desc" },
  })
  return rows.map(prismaMockupPromptToMockupPromptRecord)
}

/**
 * Load all mockup prompt records from SQLite.
 * Throws MockupPromptDatabaseError on failure — store falls back to localStorage.
 */
export async function getMockupPromptRecords(): Promise<MockupPromptRecord[]> {
  try {
    return await listMockupPromptRecordsFromDb()
  } catch (error) {
    throw wrapMockupPromptDbError(
      error,
      "Failed to load mockup prompt records from database.",
    )
  }
}

/** Create or replace a mockup prompt record. */
export async function upsertMockupPromptRecord(
  record: MockupPromptRecord,
): Promise<MockupPromptRecord> {
  assertMockupPromptPrismaReady()
  const normalized = normalizeMockupPromptRecord(record)

  try {
    const row = await prisma.mockupPrompt.upsert({
      where: { id: normalized.id },
      create: mockupPromptToPrismaCreate(normalized),
      update: mockupPromptToPrismaUpdate(normalized),
    })
    revalidateMockupPromptRoutes()
    return prismaMockupPromptToMockupPromptRecord(row)
  } catch (error) {
    throw wrapMockupPromptDbError(error, "Could not save mockup prompt record.")
  }
}

/** Delete a mockup prompt record by id. */
export async function deleteMockupPromptRecordById(id: string): Promise<void> {
  assertMockupPromptPrismaReady()
  try {
    await prisma.mockupPrompt.delete({ where: { id } })
    revalidateMockupPromptRoutes()
  } catch (error) {
    throw wrapMockupPromptDbError(error, "Could not delete mockup prompt record.")
  }
}

/** Import mockup prompt records (merge by id). */
export async function importMockupPromptRecords(
  items: MockupPromptRecord[],
): Promise<MockupPromptRecord[]> {
  if (!Array.isArray(items)) {
    throw new MockupPromptDatabaseError(
      "Import payload must be an array of mockup prompt records.",
    )
  }

  for (const item of items) {
    await upsertMockupPromptRecord(normalizeMockupPromptRecord(item))
  }
  revalidateMockupPromptRoutes()
  return listMockupPromptRecordsFromDb()
}

/**
 * One-time migration: copy mockup prompt records from browser localStorage into SQLite.
 * Does not delete localStorage data — kept for rollback/export.
 */
export async function migrateLocalMockupPromptRecordsToDatabase(
  items: MockupPromptRecord[],
): Promise<{ migrated: number; total: number }> {
  assertMockupPromptPrismaReady()

  if (!Array.isArray(items)) {
    throw new MockupPromptDatabaseError(
      "Migration payload must be an array of mockup prompt records.",
    )
  }

  if (items.length === 0) {
    const total = await prisma.mockupPrompt.count()
    return { migrated: 0, total }
  }

  for (const item of items) {
    await upsertMockupPromptRecord(normalizeMockupPromptRecord(item))
  }

  revalidateMockupPromptRoutes()
  const total = await prisma.mockupPrompt.count()
  return { migrated: items.length, total }
}
