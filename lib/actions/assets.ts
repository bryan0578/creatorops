"use server"

import { revalidatePath } from "next/cache"

import {
  assetToPrismaCreate,
  assetToPrismaUpdate,
  normalizeAssetRecord,
  prismaAssetToAssetRecord,
} from "@/lib/data/assets"
import { filterAssetsForArtist, filterAssetsForCampaign } from "@/lib/assets"
import { prisma } from "@/lib/prisma"
import { createId } from "@/lib/storage"
import type { AssetRecord } from "@/lib/types"

const ASSET_PATHS = [
  "/",
  "/assets",
  "/campaigns",
  "/search",
  "/backups",
  "/artist-crm",
  "/experiments",
]

function revalidateAssetRoutes() {
  for (const path of ASSET_PATHS) {
    revalidatePath(path)
  }
}

function wrapAssetDbError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("no such table") || message.includes("does not exist")) {
    return new Error(
      `${context} Asset table is missing. Run \`npm run db:migrate\`, then restart the dev server.`,
    )
  }
  return new Error(`${context} ${message}`)
}

/** Load all assets from SQLite. */
export async function getAssets(): Promise<AssetRecord[]> {
  try {
    const rows = await prisma.asset.findMany({ orderBy: { updatedAt: "desc" } })
    return rows.map(prismaAssetToAssetRecord)
  } catch (error) {
    throw wrapAssetDbError(error, "Failed to load assets.")
  }
}

/** Load a single asset by id. */
export async function getAssetById(id: string): Promise<AssetRecord | null> {
  try {
    const row = await prisma.asset.findUnique({ where: { id } })
    return row ? prismaAssetToAssetRecord(row) : null
  } catch (error) {
    throw wrapAssetDbError(error, "Failed to load asset.")
  }
}

/** Create or update an asset record. */
export async function upsertAsset(record: AssetRecord): Promise<AssetRecord> {
  const normalized = normalizeAssetRecord(record)
  try {
    const row = await prisma.asset.upsert({
      where: { id: normalized.id },
      create: assetToPrismaCreate(normalized),
      update: assetToPrismaUpdate(normalized),
    })
    revalidateAssetRoutes()
    return prismaAssetToAssetRecord(row)
  } catch (error) {
    throw wrapAssetDbError(error, "Could not save asset.")
  }
}

/** Create a new asset record. */
export async function createAsset(
  record: Omit<AssetRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<AssetRecord> {
  const now = Date.now()
  return upsertAsset(
    normalizeAssetRecord({
      ...record,
      id: record.id ?? createId("asset"),
      createdAt: now,
      updatedAt: now,
    }),
  )
}

/** Update an existing asset. */
export async function updateAsset(record: AssetRecord): Promise<AssetRecord> {
  return upsertAsset({ ...record, updatedAt: Date.now() })
}

/** Delete an asset by id. */
export async function deleteAsset(id: string): Promise<{ ok: boolean; message?: string }> {
  try {
    await prisma.asset.delete({ where: { id } })
    revalidateAssetRoutes()
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not delete asset.",
    }
  }
}

/** Duplicate an asset with a new id. */
export async function duplicateAsset(id: string): Promise<AssetRecord | null> {
  const existing = await getAssetById(id)
  if (!existing) return null
  const copy = normalizeAssetRecord({
    ...existing,
    id: createId("asset"),
    assetName: `${existing.assetName || "Asset"} (copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  return upsertAsset(copy)
}

/** Assets linked to a campaign. */
export async function getAssetsForCampaign(campaignId: string): Promise<AssetRecord[]> {
  const assets = await getAssets()
  const campaign = assets.find((a) => a.campaignId === campaignId)
  return filterAssetsForCampaign(assets, campaignId, campaign?.campaignName)
}

/** Assets matching an artist name. */
export async function getAssetsForArtist(artistName: string): Promise<AssetRecord[]> {
  const assets = await getAssets()
  return filterAssetsForArtist(assets, artistName)
}

/** Import assets from JSON (merge by id). */
export async function importAssets(records: AssetRecord[]): Promise<number> {
  let count = 0
  for (const record of records) {
    await upsertAsset(normalizeAssetRecord(record))
    count += 1
  }
  return count
}
