"use server"

import { revalidatePath } from "next/cache"

import {
  emailCampaignToPrismaCreate,
  emailCampaignToPrismaUpdate,
  normalizeEmailCampaignRecord,
  prismaEmailCampaignToEmailCampaignRecord,
} from "@/lib/data/email-campaigns"
import { EmailCampaignDatabaseError } from "@/lib/errors/email-campaign-database-error"
import { prisma } from "@/lib/prisma"
import type { EmailCampaignRecord } from "@/lib/types"

const EMAIL_CAMPAIGN_PATHS = ["/email-campaigns", "/"]

function assertEmailCampaignPrismaReady(): void {
  const client = prisma as typeof prisma & { emailCampaign?: unknown }

  if (client.emailCampaign == null) {
    throw new EmailCampaignDatabaseError(
      "Prisma Client is missing the EmailCampaign delegate. Run `npx prisma generate` and `npm run db:migrate`, then restart the dev server.",
    )
  }
}

function wrapEmailCampaignDbError(
  error: unknown,
  context: string,
): EmailCampaignDatabaseError {
  if (error instanceof EmailCampaignDatabaseError) return error

  const message = error instanceof Error ? error.message : String(error)

  if (message.includes("no such table") || message.includes("does not exist")) {
    return new EmailCampaignDatabaseError(
      `${context} EmailCampaign table is missing. Run \`npm run db:migrate\`, then restart the dev server.`,
      { cause: error },
    )
  }

  return new EmailCampaignDatabaseError(`${context} ${message}`, { cause: error })
}

function revalidateEmailCampaignRoutes() {
  for (const path of EMAIL_CAMPAIGN_PATHS) {
    revalidatePath(path)
  }
}

async function listEmailCampaignRecordsFromDb(): Promise<EmailCampaignRecord[]> {
  assertEmailCampaignPrismaReady()
  const rows = await prisma.emailCampaign.findMany({
    orderBy: { updatedAt: "desc" },
  })
  return rows.map(prismaEmailCampaignToEmailCampaignRecord)
}

/**
 * Load all email campaign records from SQLite.
 * Throws EmailCampaignDatabaseError on failure — store falls back to localStorage.
 */
export async function getEmailCampaignRecords(): Promise<EmailCampaignRecord[]> {
  try {
    return await listEmailCampaignRecordsFromDb()
  } catch (error) {
    throw wrapEmailCampaignDbError(
      error,
      "Failed to load email campaign records from database.",
    )
  }
}

/** Create or replace an email campaign record. */
export async function upsertEmailCampaignRecord(
  record: EmailCampaignRecord,
): Promise<EmailCampaignRecord> {
  assertEmailCampaignPrismaReady()
  const normalized = normalizeEmailCampaignRecord(record)

  try {
    const row = await prisma.emailCampaign.upsert({
      where: { id: normalized.id },
      create: emailCampaignToPrismaCreate(normalized),
      update: emailCampaignToPrismaUpdate(normalized),
    })
    revalidateEmailCampaignRoutes()
    return prismaEmailCampaignToEmailCampaignRecord(row)
  } catch (error) {
    throw wrapEmailCampaignDbError(error, "Could not save email campaign record.")
  }
}

/** Delete an email campaign record by id. */
export async function deleteEmailCampaignRecordById(id: string): Promise<void> {
  assertEmailCampaignPrismaReady()
  try {
    await prisma.emailCampaign.delete({ where: { id } })
    revalidateEmailCampaignRoutes()
  } catch (error) {
    throw wrapEmailCampaignDbError(error, "Could not delete email campaign record.")
  }
}

/** Import email campaign records (merge by id). */
export async function importEmailCampaignRecords(
  items: EmailCampaignRecord[],
): Promise<EmailCampaignRecord[]> {
  if (!Array.isArray(items)) {
    throw new EmailCampaignDatabaseError(
      "Import payload must be an array of email campaign records.",
    )
  }

  for (const item of items) {
    await upsertEmailCampaignRecord(normalizeEmailCampaignRecord(item))
  }
  revalidateEmailCampaignRoutes()
  return listEmailCampaignRecordsFromDb()
}

/**
 * One-time migration: copy email campaign records from browser localStorage into SQLite.
 * Does not delete localStorage data — kept for rollback/export.
 */
export async function migrateLocalEmailCampaignRecordsToDatabase(
  items: EmailCampaignRecord[],
): Promise<{ migrated: number; total: number }> {
  assertEmailCampaignPrismaReady()

  if (!Array.isArray(items)) {
    throw new EmailCampaignDatabaseError(
      "Migration payload must be an array of email campaign records.",
    )
  }

  if (items.length === 0) {
    const total = await prisma.emailCampaign.count()
    return { migrated: 0, total }
  }

  for (const item of items) {
    await upsertEmailCampaignRecord(normalizeEmailCampaignRecord(item))
  }

  revalidateEmailCampaignRoutes()
  const total = await prisma.emailCampaign.count()
  return { migrated: items.length, total }
}
