"use server"

import { revalidatePath } from "next/cache"

import {
  normalizePromptRun,
  prismaPromptRunToPromptRun,
  promptRunToPrismaCreate,
  promptRunToPrismaUpdate,
} from "@/lib/data/prompt-runs"
import { PromptRunDatabaseError } from "@/lib/errors/prompt-run-database-error"
import { prisma } from "@/lib/prisma"
import type { PromptRun } from "@/lib/types"

const PROMPT_RUN_PATHS = ["/runner", "/"]

function assertPromptRunPrismaReady(): void {
  const client = prisma as typeof prisma & { promptRun?: unknown }

  if (client.promptRun == null) {
    throw new PromptRunDatabaseError(
      "Prisma Client is missing the PromptRun delegate. Run `npx prisma generate` and `npm run db:migrate`, then restart the dev server.",
    )
  }
}

function wrapPromptRunDbError(error: unknown, context: string): PromptRunDatabaseError {
  if (error instanceof PromptRunDatabaseError) return error

  const message = error instanceof Error ? error.message : String(error)

  if (message.includes("no such table") || message.includes("does not exist")) {
    return new PromptRunDatabaseError(
      `${context} PromptRun table is missing. Run \`npm run db:migrate\`, then restart the dev server.`,
      { cause: error },
    )
  }

  return new PromptRunDatabaseError(`${context} ${message}`, { cause: error })
}

function revalidatePromptRunRoutes() {
  for (const path of PROMPT_RUN_PATHS) {
    revalidatePath(path)
  }
}

async function listPromptRunsFromDb(): Promise<PromptRun[]> {
  assertPromptRunPrismaReady()
  const rows = await prisma.promptRun.findMany({
    orderBy: { updatedAt: "desc" },
  })
  return rows.map(prismaPromptRunToPromptRun)
}

/**
 * Load all prompt runs from SQLite.
 * Throws PromptRunDatabaseError on failure — store falls back to localStorage.
 */
export async function getPromptRuns(): Promise<PromptRun[]> {
  try {
    return await listPromptRunsFromDb()
  } catch (error) {
    throw wrapPromptRunDbError(
      error,
      "Failed to load prompt runs from database.",
    )
  }
}

/** Create or replace a prompt run. */
export async function upsertPromptRun(run: PromptRun): Promise<PromptRun> {
  assertPromptRunPrismaReady()
  const normalized = normalizePromptRun(run)

  try {
    const row = await prisma.promptRun.upsert({
      where: { id: normalized.id },
      create: promptRunToPrismaCreate(normalized),
      update: promptRunToPrismaUpdate(normalized),
    })
    revalidatePromptRunRoutes()
    return prismaPromptRunToPromptRun(row)
  } catch (error) {
    throw wrapPromptRunDbError(error, "Could not save prompt run.")
  }
}

/** Delete a prompt run by id. */
export async function deletePromptRunById(id: string): Promise<void> {
  assertPromptRunPrismaReady()
  try {
    await prisma.promptRun.delete({ where: { id } })
    revalidatePromptRunRoutes()
  } catch (error) {
    throw wrapPromptRunDbError(error, "Could not delete prompt run.")
  }
}

/** Import prompt runs (merge by id). */
export async function importPromptRuns(items: PromptRun[]): Promise<PromptRun[]> {
  if (!Array.isArray(items)) {
    throw new PromptRunDatabaseError(
      "Import payload must be an array of prompt runs.",
    )
  }

  for (const item of items) {
    await upsertPromptRun(item)
  }
  revalidatePromptRunRoutes()
  return listPromptRunsFromDb()
}

/**
 * One-time migration: copy prompt runs from browser localStorage into SQLite.
 * Does not delete localStorage data — kept for rollback/export.
 */
export async function migrateLocalPromptRunsToDatabase(
  items: PromptRun[],
): Promise<{ migrated: number; total: number }> {
  assertPromptRunPrismaReady()

  if (!Array.isArray(items)) {
    throw new PromptRunDatabaseError(
      "Migration payload must be an array of prompt runs.",
    )
  }

  if (items.length === 0) {
    const total = await prisma.promptRun.count()
    return { migrated: 0, total }
  }

  for (const item of items) {
    await upsertPromptRun(item)
  }

  revalidatePromptRunRoutes()
  const total = await prisma.promptRun.count()
  return { migrated: items.length, total }
}
