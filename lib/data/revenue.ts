import type { RevenueRecordItem } from "@/lib/commerce/types"
import type { RevenueRecord as PrismaRevenueRecord } from "@/lib/generated/prisma/client"
import { parseTags } from "@/lib/data/product-research"

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function safeOptionalNumber(value: unknown): number | null {
  if (value == null || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function normalizeRevenueRecord(
  record: Partial<RevenueRecordItem> & { source: string; productName: string },
): RevenueRecordItem {
  const now = Date.now()
  return {
    id: record.id?.trim() || "",
    source: record.source.trim() || "Manual",
    platform: record.platform?.trim() ?? "",
    orderId: record.orderId?.trim() ?? "",
    productName: record.productName.trim() || "Untitled product",
    productType: record.productType?.trim() ?? "",
    quantity: Math.max(1, Math.round(safeNumber(record.quantity, 1))),
    grossRevenue: safeNumber(record.grossRevenue, 0),
    netRevenue: safeOptionalNumber(record.netRevenue),
    fees: safeOptionalNumber(record.fees),
    currency: record.currency?.trim() || "USD",
    saleDate: record.saleDate ?? null,
    campaignId: record.campaignId?.trim() ?? "",
    campaignName: record.campaignName?.trim() ?? "",
    artistName: record.artistName?.trim() ?? "",
    productListingId: record.productListingId?.trim() ?? "",
    collectionId: record.collectionId?.trim() ?? "",
    externalLinkId: record.externalLinkId?.trim() ?? "",
    customerCountry: record.customerCountry?.trim() ?? "",
    notes: record.notes?.trim() ?? "",
    tags: Array.isArray(record.tags) ? record.tags.map(String).filter(Boolean) : [],
    rawJson: record.rawJson?.trim() || "{}",
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? now,
  }
}

export function prismaRevenueToRecord(row: PrismaRevenueRecord): RevenueRecordItem {
  return normalizeRevenueRecord({
    id: row.id,
    source: row.source,
    platform: row.platform,
    orderId: row.orderId,
    productName: row.productName,
    productType: row.productType,
    quantity: row.quantity,
    grossRevenue: row.grossRevenue,
    netRevenue: row.netRevenue,
    fees: row.fees,
    currency: row.currency,
    saleDate: row.saleDate?.getTime() ?? null,
    campaignId: row.campaignId,
    campaignName: row.campaignName,
    artistName: row.artistName,
    productListingId: row.productListingId,
    collectionId: row.collectionId,
    externalLinkId: row.externalLinkId,
    customerCountry: row.customerCountry,
    notes: row.notes,
    tags: parseTags(row.tags),
    rawJson: row.rawJson,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}

export function revenueToPrismaCreate(record: RevenueRecordItem) {
  const n = normalizeRevenueRecord(record)
  return {
    id: n.id || undefined,
    source: n.source,
    platform: n.platform,
    orderId: n.orderId,
    productName: n.productName,
    productType: n.productType,
    quantity: n.quantity,
    grossRevenue: n.grossRevenue,
    netRevenue: n.netRevenue,
    fees: n.fees,
    currency: n.currency,
    saleDate: n.saleDate ? new Date(n.saleDate) : null,
    campaignId: n.campaignId,
    campaignName: n.campaignName,
    artistName: n.artistName,
    productListingId: n.productListingId,
    collectionId: n.collectionId,
    externalLinkId: n.externalLinkId,
    customerCountry: n.customerCountry,
    notes: n.notes,
    tags: JSON.stringify(n.tags),
    rawJson: n.rawJson,
    createdAt: new Date(n.createdAt),
    updatedAt: new Date(n.updatedAt),
  }
}

export function revenueToPrismaUpdate(record: RevenueRecordItem) {
  const n = normalizeRevenueRecord(record)
  return {
    source: n.source,
    platform: n.platform,
    orderId: n.orderId,
    productName: n.productName,
    productType: n.productType,
    quantity: n.quantity,
    grossRevenue: n.grossRevenue,
    netRevenue: n.netRevenue,
    fees: n.fees,
    currency: n.currency,
    saleDate: n.saleDate ? new Date(n.saleDate) : null,
    campaignId: n.campaignId,
    campaignName: n.campaignName,
    artistName: n.artistName,
    productListingId: n.productListingId,
    collectionId: n.collectionId,
    externalLinkId: n.externalLinkId,
    customerCountry: n.customerCountry,
    notes: n.notes,
    tags: JSON.stringify(n.tags),
    rawJson: n.rawJson,
    updatedAt: new Date(n.updatedAt),
  }
}
