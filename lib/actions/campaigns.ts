"use server"

import { revalidatePath } from "next/cache"

import {
  campaignToPrismaCreate,
  campaignToPrismaUpdate,
  normalizeCampaignRecord,
  prismaCampaignToCampaignRecord,
} from "@/lib/data/campaigns"
import { CampaignDatabaseError } from "@/lib/errors/campaign-database-error"
import { prisma } from "@/lib/prisma"
import type { CampaignRecord } from "@/lib/types"

const CAMPAIGN_PATHS = ["/campaigns", "/", "/search", "/backups"]

function assertCampaignPrismaReady(): void {
  const client = prisma as typeof prisma & { campaign?: unknown }

  if (client.campaign == null) {
    throw new CampaignDatabaseError(
      "Prisma Client is missing the Campaign delegate. Run `npx prisma generate` and `npm run db:migrate`, then restart the dev server.",
    )
  }
}

function wrapCampaignDbError(error: unknown, context: string): CampaignDatabaseError {
  if (error instanceof CampaignDatabaseError) return error

  const message = error instanceof Error ? error.message : String(error)

  if (message.includes("no such table") || message.includes("does not exist")) {
    return new CampaignDatabaseError(
      `${context} Campaign table is missing. Run \`npm run db:migrate\`, then restart the dev server.`,
      { cause: error },
    )
  }

  return new CampaignDatabaseError(`${context} ${message}`, { cause: error })
}

function revalidateCampaignRoutes() {
  for (const path of CAMPAIGN_PATHS) {
    revalidatePath(path)
  }
}

async function listCampaignsFromDb(): Promise<CampaignRecord[]> {
  assertCampaignPrismaReady()
  const rows = await prisma.campaign.findMany({
    orderBy: { updatedAt: "desc" },
  })
  return rows.map(prismaCampaignToCampaignRecord)
}

/** Load all campaigns from SQLite. */
export async function getCampaigns(): Promise<CampaignRecord[]> {
  try {
    return await listCampaignsFromDb()
  } catch (error) {
    throw wrapCampaignDbError(error, "Failed to load campaigns from database.")
  }
}

/** Create or replace a campaign record. */
export async function upsertCampaign(record: CampaignRecord): Promise<CampaignRecord> {
  assertCampaignPrismaReady()
  const normalized = normalizeCampaignRecord(record)

  try {
    const row = await prisma.campaign.upsert({
      where: { id: normalized.id },
      create: campaignToPrismaCreate(normalized),
      update: campaignToPrismaUpdate(normalized),
    })
    revalidateCampaignRoutes()
    return prismaCampaignToCampaignRecord(row)
  } catch (error) {
    throw wrapCampaignDbError(error, "Could not save campaign.")
  }
}

/** Delete a campaign by id. */
export async function deleteCampaignById(id: string): Promise<void> {
  assertCampaignPrismaReady()
  try {
    await prisma.campaign.delete({ where: { id } })
    revalidateCampaignRoutes()
  } catch (error) {
    throw wrapCampaignDbError(error, "Could not delete campaign.")
  }
}

/** Import campaigns (merge by id). */
export async function importCampaigns(items: CampaignRecord[]): Promise<CampaignRecord[]> {
  if (!Array.isArray(items)) {
    throw new CampaignDatabaseError("Import payload must be an array of campaigns.")
  }

  for (const item of items) {
    await upsertCampaign(normalizeCampaignRecord(item))
  }
  revalidateCampaignRoutes()
  return listCampaignsFromDb()
}

/** One-time migration from localStorage to SQLite. */
export async function migrateLocalCampaignsToDatabase(
  items: CampaignRecord[],
): Promise<{ migrated: number; total: number }> {
  assertCampaignPrismaReady()

  if (!Array.isArray(items)) {
    throw new CampaignDatabaseError("Migration payload must be an array of campaigns.")
  }

  if (items.length === 0) {
    const total = await prisma.campaign.count()
    return { migrated: 0, total }
  }

  for (const item of items) {
    await upsertCampaign(normalizeCampaignRecord(item))
  }

  revalidateCampaignRoutes()
  const total = await prisma.campaign.count()
  return { migrated: items.length, total }
}
