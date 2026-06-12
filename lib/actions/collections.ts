"use server"

import { revalidatePath } from "next/cache"

import {
  collectionToPrismaCreate,
  collectionToPrismaUpdate,
  normalizeProductCollection,
  prismaCollectionToRecord,
} from "@/lib/data/collections"
import { upsertCampaign } from "@/lib/actions/campaigns"
import { prisma } from "@/lib/prisma"
import { createId } from "@/lib/storage"
import { normalizeCampaignRecord } from "@/lib/campaigns"
import type { ProductCollectionRecord } from "@/lib/commerce/types"
import type { CampaignRecord } from "@/lib/types"

const PATHS = ["/", "/collections", "/product-factory", "/revenue", "/campaigns", "/search", "/backups"]

function revalidate() {
  for (const path of PATHS) revalidatePath(path)
}

function wrapDbError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("no such table") || message.includes("does not exist")) {
    return new Error(`${context} ProductCollection table is missing. Run npm run db:migrate.`)
  }
  return new Error(`${context} ${message}`)
}

export async function getCollections(): Promise<ProductCollectionRecord[]> {
  try {
    const rows = await prisma.productCollection.findMany({ orderBy: { updatedAt: "desc" } })
    return rows.map(prismaCollectionToRecord)
  } catch (error) {
    throw wrapDbError(error, "Failed to load collections.")
  }
}

export async function getCollectionById(id: string): Promise<ProductCollectionRecord | null> {
  try {
    const row = await prisma.productCollection.findUnique({ where: { id: id.trim() } })
    return row ? prismaCollectionToRecord(row) : null
  } catch {
    return null
  }
}

export async function createCollection(
  data: Omit<ProductCollectionRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<ProductCollectionRecord> {
  const record = normalizeProductCollection({
    ...data,
    id: data.id?.trim() || createId("collection"),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  const row = await prisma.productCollection.create({
    data: collectionToPrismaCreate(record) as Parameters<typeof prisma.productCollection.create>[0]["data"],
  })
  revalidate()
  return prismaCollectionToRecord(row)
}

export async function updateCollection(
  id: string,
  data: Partial<ProductCollectionRecord>,
): Promise<ProductCollectionRecord> {
  const existing = await getCollectionById(id)
  if (!existing) throw new Error("Collection not found.")
  const record = normalizeProductCollection({ ...existing, ...data, id: existing.id, updatedAt: Date.now() })
  const row = await prisma.productCollection.update({
    where: { id: existing.id },
    data: collectionToPrismaUpdate(record),
  })
  revalidate()
  return prismaCollectionToRecord(row)
}

export async function deleteCollection(id: string): Promise<void> {
  await prisma.productCollection.delete({ where: { id: id.trim() } })
  revalidate()
}

export async function importCollections(records: ProductCollectionRecord[]): Promise<{ imported: number }> {
  let imported = 0
  for (const record of records) {
    await createCollection(record)
    imported++
  }
  return { imported }
}

async function mutateIds(
  collectionId: string,
  field: "productIds" | "merchIdeaIds" | "assetIds" | "externalLinkIds",
  id: string,
  add: boolean,
) {
  const collection = await getCollectionById(collectionId)
  if (!collection) throw new Error("Collection not found.")
  const set = new Set(collection[field])
  if (add) set.add(id)
  else set.delete(id)
  return updateCollection(collectionId, { [field]: [...set] } as Partial<ProductCollectionRecord>)
}

export async function addProductToCollection(collectionId: string, productId: string) {
  return mutateIds(collectionId, "productIds", productId, true)
}

export async function removeProductFromCollection(collectionId: string, productId: string) {
  return mutateIds(collectionId, "productIds", productId, false)
}

export async function addAssetToCollection(collectionId: string, assetId: string) {
  return mutateIds(collectionId, "assetIds", assetId, true)
}

export async function linkCollectionToCampaign(collectionId: string, campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId.trim() } })
  return updateCollection(collectionId, {
    campaignId: campaign?.id ?? campaignId,
    campaignName: campaign?.campaignName ?? "",
    artistName: campaign?.artistName ?? "",
  })
}

export async function createCampaignFromCollection(collectionId: string, campaignName?: string) {
  const collection = await getCollectionById(collectionId)
  if (!collection) return { success: false, message: "Collection not found." }

  const campaign: CampaignRecord = normalizeCampaignRecord({
    id: createId("campaign"),
    campaignName: campaignName?.trim() || `${collection.name} Launch`,
    campaignType: "Product Launch",
    status: "Planning",
    priority: "Medium",
    artistName: collection.artistName,
    songTitle: "",
    productName: collection.name,
    niche: collection.theme,
    primaryGoal: "Launch product collection",
    targetAudience: collection.targetAudience,
    startDate: "",
    launchDate: collection.launchDate ? new Date(collection.launchDate).toISOString().slice(0, 10) : "",
    endDate: "",
    description: collection.description,
    notes: `Created from collection ${collection.id}`,
    lessonsLearned: "",
    whatWorked: "",
    whatToImprove: "",
    linkedRecords: [],
    tasks: [],
    publishingChecklist: { version: 1, items: [] },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })

  const saved = await upsertCampaign(campaign)
  await linkCollectionToCampaign(collection.id, saved.id)
  return {
    success: true,
    message: "Campaign created from collection.",
    href: `/campaigns?campaignId=${encodeURIComponent(saved.id)}`,
    record: saved,
  }
}
