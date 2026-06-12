import { parseJsonStringArray } from "@/lib/safe-json"
import type { ProductCollectionRecord } from "@/lib/commerce/types"
import type { ProductCollection as PrismaProductCollection } from "@/lib/generated/prisma/client"
import { parseTags } from "@/lib/data/product-research"

export function parseIdArray(value: unknown): string[] {
  if (value == null || value === "") return []
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === "string") return parseJsonStringArray(value, [])
  return []
}

export function normalizeProductCollection(
  record: Partial<ProductCollectionRecord> & { name: string },
): ProductCollectionRecord {
  const now = Date.now()
  return {
    id: record.id?.trim() || "",
    name: record.name.trim() || "Untitled collection",
    description: record.description?.trim() ?? "",
    collectionType: record.collectionType?.trim() ?? "",
    status: record.status?.trim() || "Planning",
    campaignId: record.campaignId?.trim() ?? "",
    campaignName: record.campaignName?.trim() ?? "",
    artistName: record.artistName?.trim() ?? "",
    theme: record.theme?.trim() ?? "",
    targetAudience: record.targetAudience?.trim() ?? "",
    launchDate: record.launchDate ?? null,
    productIds: parseIdArray(record.productIds),
    merchIdeaIds: parseIdArray(record.merchIdeaIds),
    assetIds: parseIdArray(record.assetIds),
    externalLinkIds: parseIdArray(record.externalLinkIds),
    notes: record.notes?.trim() ?? "",
    tags: Array.isArray(record.tags) ? record.tags.map(String).filter(Boolean) : [],
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? now,
  }
}

export function prismaCollectionToRecord(row: PrismaProductCollection): ProductCollectionRecord {
  return normalizeProductCollection({
    id: row.id,
    name: row.name,
    description: row.description,
    collectionType: row.collectionType,
    status: row.status,
    campaignId: row.campaignId,
    campaignName: row.campaignName,
    artistName: row.artistName,
    theme: row.theme,
    targetAudience: row.targetAudience,
    launchDate: row.launchDate?.getTime() ?? null,
    productIds: parseIdArray(row.productIds),
    merchIdeaIds: parseIdArray(row.merchIdeaIds),
    assetIds: parseIdArray(row.assetIds),
    externalLinkIds: parseIdArray(row.externalLinkIds),
    notes: row.notes,
    tags: parseTags(row.tags),
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}

export function collectionToPrismaCreate(record: ProductCollectionRecord) {
  const n = normalizeProductCollection(record)
  return {
    id: n.id || undefined,
    name: n.name,
    description: n.description,
    collectionType: n.collectionType,
    status: n.status,
    campaignId: n.campaignId,
    campaignName: n.campaignName,
    artistName: n.artistName,
    theme: n.theme,
    targetAudience: n.targetAudience,
    launchDate: n.launchDate ? new Date(n.launchDate) : null,
    productIds: JSON.stringify(n.productIds),
    merchIdeaIds: JSON.stringify(n.merchIdeaIds),
    assetIds: JSON.stringify(n.assetIds),
    externalLinkIds: JSON.stringify(n.externalLinkIds),
    notes: n.notes,
    tags: JSON.stringify(n.tags),
    createdAt: new Date(n.createdAt),
    updatedAt: new Date(n.updatedAt),
  }
}

export function collectionToPrismaUpdate(record: ProductCollectionRecord) {
  const n = normalizeProductCollection(record)
  return {
    name: n.name,
    description: n.description,
    collectionType: n.collectionType,
    status: n.status,
    campaignId: n.campaignId,
    campaignName: n.campaignName,
    artistName: n.artistName,
    theme: n.theme,
    targetAudience: n.targetAudience,
    launchDate: n.launchDate ? new Date(n.launchDate) : null,
    productIds: JSON.stringify(n.productIds),
    merchIdeaIds: JSON.stringify(n.merchIdeaIds),
    assetIds: JSON.stringify(n.assetIds),
    externalLinkIds: JSON.stringify(n.externalLinkIds),
    notes: n.notes,
    tags: JSON.stringify(n.tags),
    updatedAt: new Date(n.updatedAt),
  }
}
