"use server"

import { revalidatePath } from "next/cache"

import {
  normalizeRevenueRecord,
  prismaRevenueToRecord,
  revenueToPrismaCreate,
  revenueToPrismaUpdate,
} from "@/lib/data/revenue"
import { parseRevenueCsvText } from "@/lib/commerce/csv"
import type {
  CommerceDashboardSummary,
  RevenueCsvImportResult,
  RevenueRecordItem,
} from "@/lib/commerce/types"
import { getCommerceDashboardSummary } from "@/lib/actions/commerce"
import { prisma } from "@/lib/prisma"
import { createId } from "@/lib/storage"

const PATHS = ["/", "/revenue", "/product-factory", "/collections", "/search", "/backups", "/feedback-loop"]

function revalidate() {
  for (const path of PATHS) revalidatePath(path)
}

function wrapDbError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("no such table") || message.includes("does not exist")) {
    return new Error(`${context} RevenueRecord table is missing. Run npm run db:migrate.`)
  }
  return new Error(`${context} ${message}`)
}

export async function getRevenueRecords(): Promise<RevenueRecordItem[]> {
  try {
    const rows = await prisma.revenueRecord.findMany({ orderBy: { saleDate: "desc" } })
    return rows.map(prismaRevenueToRecord)
  } catch (error) {
    throw wrapDbError(error, "Failed to load revenue records.")
  }
}

export async function getRevenueRecordById(id: string): Promise<RevenueRecordItem | null> {
  try {
    const row = await prisma.revenueRecord.findUnique({ where: { id: id.trim() } })
    return row ? prismaRevenueToRecord(row) : null
  } catch {
    return null
  }
}

export async function createRevenueRecord(
  data: Omit<RevenueRecordItem, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<RevenueRecordItem> {
  const record = normalizeRevenueRecord({
    ...data,
    id: data.id?.trim() || createId("revenue"),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  const row = await prisma.revenueRecord.create({
    data: revenueToPrismaCreate(record) as Parameters<typeof prisma.revenueRecord.create>[0]["data"],
  })
  revalidate()
  return prismaRevenueToRecord(row)
}

export async function updateRevenueRecord(
  id: string,
  data: Partial<RevenueRecordItem>,
): Promise<RevenueRecordItem> {
  const existing = await getRevenueRecordById(id)
  if (!existing) throw new Error("Revenue record not found.")
  const record = normalizeRevenueRecord({ ...existing, ...data, id: existing.id, updatedAt: Date.now() })
  const row = await prisma.revenueRecord.update({
    where: { id: existing.id },
    data: revenueToPrismaUpdate(record),
  })
  revalidate()
  return prismaRevenueToRecord(row)
}

export async function deleteRevenueRecord(id: string): Promise<void> {
  await prisma.revenueRecord.delete({ where: { id: id.trim() } })
  revalidate()
}

export async function importRevenueRecords(records: RevenueRecordItem[]): Promise<{ imported: number }> {
  let imported = 0
  for (const record of records) {
    await createRevenueRecord(record)
    imported++
  }
  return { imported }
}

export async function previewRevenueCsv(text: string): Promise<RevenueCsvImportResult> {
  return parseRevenueCsvText(text)
}

export async function importRevenueCsv(text: string): Promise<RevenueCsvImportResult> {
  const parsed = parseRevenueCsvText(text)
  if (!parsed.success || parsed.preview.length === 0) return parsed

  let imported = 0
  for (const row of parsed.preview) {
    try {
      await createRevenueRecord({
        source: "CSV Import",
        platform: row.platform,
        orderId: row.orderId,
        productName: row.productName,
        productType: "",
        quantity: row.quantity,
        grossRevenue: row.grossRevenue,
        netRevenue: row.netRevenue,
        fees: row.fees,
        currency: "USD",
        saleDate: row.saleDate ? Date.parse(row.saleDate) || Date.now() : Date.now(),
        campaignId: "",
        campaignName: row.campaignName,
        artistName: row.artistName,
        productListingId: "",
        collectionId: "",
        externalLinkId: "",
        customerCountry: "",
        notes: row.warnings.join("; "),
        tags: ["csv-import", "commerce"],
        rawJson: JSON.stringify(row),
      })
      imported++
    } catch {
      parsed.errors.push(`Row ${row.rowIndex}: import failed`)
    }
  }

  return {
    ...parsed,
    imported,
    skipped: parsed.preview.length - imported,
    message: `Imported ${imported} revenue record(s).`,
  }
}

export async function getRevenueSummary(): Promise<CommerceDashboardSummary> {
  return getCommerceDashboardSummary()
}

export async function getRevenueForCampaign(campaignId: string): Promise<RevenueRecordItem[]> {
  const records = await getRevenueRecords()
  return records.filter((r) => r.campaignId === campaignId)
}

export async function getRevenueForProduct(productListingId: string): Promise<RevenueRecordItem[]> {
  const records = await getRevenueRecords()
  return records.filter((r) => r.productListingId === productListingId)
}

export async function getRevenueForCollection(collectionId: string): Promise<RevenueRecordItem[]> {
  const records = await getRevenueRecords()
  return records.filter((r) => r.collectionId === collectionId)
}
