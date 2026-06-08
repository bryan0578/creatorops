"use server"

import { revalidatePath } from "next/cache"

import {
  analyticsRecordToPrismaCreate,
  analyticsRecordToPrismaUpdate,
  normalizeAnalyticsRecord,
  prismaAnalyticsRecordToAnalyticsRecord,
} from "@/lib/data/analytics-records"
import { AnalyticsRecordDatabaseError } from "@/lib/errors/analytics-record-database-error"
import { prisma } from "@/lib/prisma"
import type { AnalyticsRecord } from "@/lib/types"

const ANALYTICS_PATHS = ["/analytics", "/artist-crm", "/"]

function assertAnalyticsRecordPrismaReady(): void {
  const client = prisma as typeof prisma & { analyticsRecord?: unknown }

  if (client.analyticsRecord == null) {
    throw new AnalyticsRecordDatabaseError(
      "Prisma Client is missing the AnalyticsRecord delegate. Run `npx prisma generate` and `npm run db:migrate`, then restart the dev server.",
    )
  }
}

function wrapAnalyticsRecordDbError(
  error: unknown,
  context: string,
): AnalyticsRecordDatabaseError {
  if (error instanceof AnalyticsRecordDatabaseError) return error

  const message = error instanceof Error ? error.message : String(error)

  if (message.includes("no such table") || message.includes("does not exist")) {
    return new AnalyticsRecordDatabaseError(
      `${context} AnalyticsRecord table is missing. Run \`npm run db:migrate\`, then restart the dev server.`,
      { cause: error },
    )
  }

  return new AnalyticsRecordDatabaseError(`${context} ${message}`, {
    cause: error,
  })
}

function revalidateAnalyticsRoutes() {
  for (const path of ANALYTICS_PATHS) {
    revalidatePath(path)
  }
}

async function listAnalyticsRecordsFromDb(): Promise<AnalyticsRecord[]> {
  assertAnalyticsRecordPrismaReady()
  const rows = await prisma.analyticsRecord.findMany({
    orderBy: { updatedAt: "desc" },
  })
  return rows.map(prismaAnalyticsRecordToAnalyticsRecord)
}

/**
 * Load all analytics records from SQLite.
 * Throws AnalyticsRecordDatabaseError on failure — store falls back to localStorage.
 */
export async function getAnalyticsRecords(): Promise<AnalyticsRecord[]> {
  try {
    return await listAnalyticsRecordsFromDb()
  } catch (error) {
    throw wrapAnalyticsRecordDbError(
      error,
      "Failed to load analytics records from database.",
    )
  }
}

/** Create or replace an analytics record. */
export async function upsertAnalyticsRecord(
  record: AnalyticsRecord,
): Promise<AnalyticsRecord> {
  assertAnalyticsRecordPrismaReady()
  const normalized = normalizeAnalyticsRecord(record)

  try {
    const row = await prisma.analyticsRecord.upsert({
      where: { id: normalized.id },
      create: analyticsRecordToPrismaCreate(normalized),
      update: analyticsRecordToPrismaUpdate(normalized),
    })
    revalidateAnalyticsRoutes()
    return prismaAnalyticsRecordToAnalyticsRecord(row)
  } catch (error) {
    throw wrapAnalyticsRecordDbError(error, "Could not save analytics record.")
  }
}

/** Delete an analytics record by id. */
export async function deleteAnalyticsRecordById(id: string): Promise<void> {
  assertAnalyticsRecordPrismaReady()
  try {
    await prisma.analyticsRecord.delete({ where: { id } })
    revalidateAnalyticsRoutes()
  } catch (error) {
    throw wrapAnalyticsRecordDbError(error, "Could not delete analytics record.")
  }
}

/** Import analytics records (merge by id). */
export async function importAnalyticsRecords(
  items: AnalyticsRecord[],
): Promise<AnalyticsRecord[]> {
  if (!Array.isArray(items)) {
    throw new AnalyticsRecordDatabaseError(
      "Import payload must be an array of analytics records.",
    )
  }

  for (const item of items) {
    await upsertAnalyticsRecord(normalizeAnalyticsRecord(item))
  }
  revalidateAnalyticsRoutes()
  return listAnalyticsRecordsFromDb()
}

/**
 * One-time migration: copy analytics records from browser localStorage into SQLite.
 * Does not delete localStorage data — kept for rollback/export.
 */
export async function migrateLocalAnalyticsRecordsToDatabase(
  items: AnalyticsRecord[],
): Promise<{ migrated: number; total: number }> {
  assertAnalyticsRecordPrismaReady()

  if (!Array.isArray(items)) {
    throw new AnalyticsRecordDatabaseError(
      "Migration payload must be an array of analytics records.",
    )
  }

  if (items.length === 0) {
    const total = await prisma.analyticsRecord.count()
    return { migrated: 0, total }
  }

  for (const item of items) {
    await upsertAnalyticsRecord(normalizeAnalyticsRecord(item))
  }

  revalidateAnalyticsRoutes()
  const total = await prisma.analyticsRecord.count()
  return { migrated: items.length, total }
}
