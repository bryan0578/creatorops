import { parseJsonStringArray } from "@/lib/safe-json"
import type { ProductResearchItemRecord } from "@/lib/commerce/types"
import type { ProductResearchItem as PrismaProductResearchItem } from "@/lib/generated/prisma/client"

export function parseTags(value: unknown): string[] {
  if (value == null || value === "") return []
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === "string") return parseJsonStringArray(value, [])
  return []
}

export function normalizeProductResearchItem(
  record: Partial<ProductResearchItemRecord> & { title: string },
): ProductResearchItemRecord {
  const now = Date.now()
  return {
    id: record.id?.trim() || "",
    title: record.title.trim() || "Untitled research",
    productType: record.productType?.trim() ?? "",
    category: record.category?.trim() ?? "",
    niche: record.niche?.trim() ?? "",
    audience: record.audience?.trim() ?? "",
    platform: record.platform?.trim() ?? "",
    inspirationUrl: record.inspirationUrl?.trim() ?? "",
    competitorName: record.competitorName?.trim() ?? "",
    priceRange: record.priceRange?.trim() ?? "",
    demandSignal: record.demandSignal?.trim() ?? "",
    difficulty: record.difficulty?.trim() ?? "",
    opportunityScore:
      record.opportunityScore == null || Number.isNaN(Number(record.opportunityScore))
        ? null
        : Number(record.opportunityScore),
    status: record.status?.trim() || "Idea",
    campaignId: record.campaignId?.trim() ?? "",
    campaignName: record.campaignName?.trim() ?? "",
    artistName: record.artistName?.trim() ?? "",
    productName: record.productName?.trim() ?? "",
    notes: record.notes?.trim() ?? "",
    tags: Array.isArray(record.tags) ? record.tags.map(String).filter(Boolean) : [],
    rawJson: record.rawJson?.trim() || "{}",
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? now,
  }
}

export function prismaProductResearchToRecord(
  row: PrismaProductResearchItem,
): ProductResearchItemRecord {
  return normalizeProductResearchItem({
    id: row.id,
    title: row.title,
    productType: row.productType,
    category: row.category,
    niche: row.niche,
    audience: row.audience,
    platform: row.platform,
    inspirationUrl: row.inspirationUrl,
    competitorName: row.competitorName,
    priceRange: row.priceRange,
    demandSignal: row.demandSignal,
    difficulty: row.difficulty,
    opportunityScore: row.opportunityScore,
    status: row.status,
    campaignId: row.campaignId,
    campaignName: row.campaignName,
    artistName: row.artistName,
    productName: row.productName,
    notes: row.notes,
    tags: parseTags(row.tags),
    rawJson: row.rawJson,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}

export function productResearchToPrismaCreate(record: ProductResearchItemRecord) {
  const n = normalizeProductResearchItem(record)
  return {
    id: n.id || undefined,
    title: n.title,
    productType: n.productType,
    category: n.category,
    niche: n.niche,
    audience: n.audience,
    platform: n.platform,
    inspirationUrl: n.inspirationUrl,
    competitorName: n.competitorName,
    priceRange: n.priceRange,
    demandSignal: n.demandSignal,
    difficulty: n.difficulty,
    opportunityScore: n.opportunityScore,
    status: n.status,
    campaignId: n.campaignId,
    campaignName: n.campaignName,
    artistName: n.artistName,
    productName: n.productName,
    notes: n.notes,
    tags: JSON.stringify(n.tags),
    rawJson: n.rawJson,
    createdAt: new Date(n.createdAt),
    updatedAt: new Date(n.updatedAt),
  }
}

export function productResearchToPrismaUpdate(record: ProductResearchItemRecord) {
  const n = normalizeProductResearchItem(record)
  return {
    title: n.title,
    productType: n.productType,
    category: n.category,
    niche: n.niche,
    audience: n.audience,
    platform: n.platform,
    inspirationUrl: n.inspirationUrl,
    competitorName: n.competitorName,
    priceRange: n.priceRange,
    demandSignal: n.demandSignal,
    difficulty: n.difficulty,
    opportunityScore: n.opportunityScore,
    status: n.status,
    campaignId: n.campaignId,
    campaignName: n.campaignName,
    artistName: n.artistName,
    productName: n.productName,
    notes: n.notes,
    tags: JSON.stringify(n.tags),
    rawJson: n.rawJson,
    updatedAt: new Date(n.updatedAt),
  }
}
