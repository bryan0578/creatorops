"use server"

import { revalidatePath } from "next/cache"

import {
  normalizeReleasePlan,
  prismaReleasePlanToReleasePlan,
  releasePlanToPrismaCreate,
  releasePlanToPrismaUpdate,
} from "@/lib/data/release-plans"
import { ReleasePlanDatabaseError } from "@/lib/errors/release-plan-database-error"
import { prisma } from "@/lib/prisma"
import type { ReleasePlan } from "@/lib/types"

const RELEASE_PLAN_PATHS = ["/release-planner", "/artist-crm", "/"]

function assertReleasePlanPrismaReady(): void {
  const client = prisma as typeof prisma & { releasePlan?: unknown }

  if (client.releasePlan == null) {
    throw new ReleasePlanDatabaseError(
      "Prisma Client is missing the ReleasePlan delegate. Run `npx prisma generate` and `npm run db:migrate`, then restart the dev server.",
    )
  }
}

function wrapReleasePlanDbError(
  error: unknown,
  context: string,
): ReleasePlanDatabaseError {
  if (error instanceof ReleasePlanDatabaseError) return error

  const message = error instanceof Error ? error.message : String(error)

  if (message.includes("no such table") || message.includes("does not exist")) {
    return new ReleasePlanDatabaseError(
      `${context} ReleasePlan table is missing. Run \`npm run db:migrate\`, then restart the dev server.`,
      { cause: error },
    )
  }

  return new ReleasePlanDatabaseError(`${context} ${message}`, { cause: error })
}

function revalidateReleasePlanRoutes() {
  for (const path of RELEASE_PLAN_PATHS) {
    revalidatePath(path)
  }
}

async function listReleasePlansFromDb(): Promise<ReleasePlan[]> {
  assertReleasePlanPrismaReady()
  const rows = await prisma.releasePlan.findMany({
    orderBy: { updatedAt: "desc" },
  })
  return rows.map(prismaReleasePlanToReleasePlan)
}

/**
 * Load all release plans from SQLite.
 * Throws ReleasePlanDatabaseError on failure — store falls back to localStorage.
 */
export async function getReleasePlans(): Promise<ReleasePlan[]> {
  try {
    return await listReleasePlansFromDb()
  } catch (error) {
    throw wrapReleasePlanDbError(
      error,
      "Failed to load release plans from database.",
    )
  }
}

/** Create or replace a release plan. */
export async function upsertReleasePlan(
  plan: ReleasePlan,
): Promise<ReleasePlan> {
  assertReleasePlanPrismaReady()
  const normalized = normalizeReleasePlan(plan)

  try {
    const row = await prisma.releasePlan.upsert({
      where: { id: normalized.id },
      create: releasePlanToPrismaCreate(normalized),
      update: releasePlanToPrismaUpdate(normalized),
    })
    revalidateReleasePlanRoutes()
    return prismaReleasePlanToReleasePlan(row)
  } catch (error) {
    throw wrapReleasePlanDbError(error, "Could not save release plan.")
  }
}

/** Delete a release plan by id. */
export async function deleteReleasePlanById(id: string): Promise<void> {
  assertReleasePlanPrismaReady()
  try {
    await prisma.releasePlan.delete({ where: { id } })
    revalidateReleasePlanRoutes()
  } catch (error) {
    throw wrapReleasePlanDbError(error, "Could not delete release plan.")
  }
}

/** Import release plans (merge by id). */
export async function importReleasePlans(
  items: ReleasePlan[],
): Promise<ReleasePlan[]> {
  if (!Array.isArray(items)) {
    throw new ReleasePlanDatabaseError(
      "Import payload must be an array of release plans.",
    )
  }

  for (const item of items) {
    await upsertReleasePlan(normalizeReleasePlan(item))
  }
  revalidateReleasePlanRoutes()
  return listReleasePlansFromDb()
}

/**
 * One-time migration: copy release plans from browser localStorage into SQLite.
 * Does not delete localStorage data — kept for rollback/export.
 */
export async function migrateLocalReleasePlansToDatabase(
  items: ReleasePlan[],
): Promise<{ migrated: number; total: number }> {
  assertReleasePlanPrismaReady()

  if (!Array.isArray(items)) {
    throw new ReleasePlanDatabaseError(
      "Migration payload must be an array of release plans.",
    )
  }

  if (items.length === 0) {
    const total = await prisma.releasePlan.count()
    return { migrated: 0, total }
  }

  for (const item of items) {
    await upsertReleasePlan(normalizeReleasePlan(item))
  }

  revalidateReleasePlanRoutes()
  const total = await prisma.releasePlan.count()
  return { migrated: items.length, total }
}
