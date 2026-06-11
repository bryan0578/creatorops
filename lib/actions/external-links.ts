"use server"

import { revalidatePath } from "next/cache"

import { upsertAnalyticsRecord } from "@/lib/actions/analytics-records"
import {
  externalLinkToPrismaCreate,
  externalLinkToPrismaUpdate,
  isValidExternalUrl,
  normalizeExternalLinkRecord,
  prismaExternalLinkToRecord,
  filterExternalLinksForCampaign,
  filterExternalLinksForRecord,
} from "@/lib/data/external-links"
import {
  isDuplicateAnalyticsImport,
  parseYouTubeAnalyticsCsv,
  youtubeCsvRowToAnalyticsRecord,
  youtubeCsvRowToExternalLink,
  type YouTubeCsvPreviewRow,
} from "@/lib/integrations/youtube-csv-parser"
import { prisma } from "@/lib/prisma"
import { createId } from "@/lib/storage"
import type { AnalyticsRecord, ExternalLinkRecord } from "@/lib/types"
import { getAnalyticsRecords } from "@/lib/actions/analytics-records"

const EXTERNAL_LINK_PATHS = [
  "/integrations",
  "/campaigns",
  "/analytics",
  "/assets",
  "/search",
  "/backups",
  "/activity",
  "/data-health",
  "/automation",
  "/",
]

function revalidateExternalLinkRoutes() {
  for (const path of EXTERNAL_LINK_PATHS) {
    revalidatePath(path)
  }
}

function wrapExternalLinkDbError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("no such table") || message.includes("does not exist")) {
    return new Error(
      `${context} ExternalLink table is missing. Run \`npm run db:migrate\`, then restart the dev server.`,
    )
  }
  return new Error(`${context} ${message}`)
}

export async function getExternalLinks(): Promise<ExternalLinkRecord[]> {
  try {
    const rows = await prisma.externalLink.findMany({ orderBy: { updatedAt: "desc" } })
    return rows.map(prismaExternalLinkToRecord)
  } catch (error) {
    throw wrapExternalLinkDbError(error, "Failed to load external links.")
  }
}

export async function getExternalLinkById(id: string): Promise<ExternalLinkRecord | null> {
  try {
    const row = await prisma.externalLink.findUnique({ where: { id: id.trim() } })
    return row ? prismaExternalLinkToRecord(row) : null
  } catch (error) {
    throw wrapExternalLinkDbError(error, "Failed to load external link.")
  }
}

export async function createExternalLink(
  input: Omit<ExternalLinkRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<ExternalLinkRecord> {
  const now = Date.now()
  const record = normalizeExternalLinkRecord({
    ...input,
    id: input.id ?? createId("extlink"),
    createdAt: now,
    updatedAt: now,
  })

  if (!record.name.trim()) throw new Error("Name is required.")
  if (!record.platform.trim()) throw new Error("Platform is required.")
  if (!record.url.trim()) throw new Error("URL is required.")
  if (!isValidExternalUrl(record.url)) {
    throw new Error("URL must start with http:// or https://")
  }

  try {
    const row = await prisma.externalLink.create({
      data: externalLinkToPrismaCreate(record),
    })
    revalidateExternalLinkRoutes()
    return prismaExternalLinkToRecord(row)
  } catch (error) {
    throw wrapExternalLinkDbError(error, "Could not create external link.")
  }
}

export async function updateExternalLink(record: ExternalLinkRecord): Promise<ExternalLinkRecord> {
  const normalized = normalizeExternalLinkRecord({ ...record, updatedAt: Date.now() })
  if (!normalized.name.trim()) throw new Error("Name is required.")
  if (!normalized.url.trim()) throw new Error("URL is required.")
  if (!isValidExternalUrl(normalized.url)) {
    throw new Error("URL must start with http:// or https://")
  }

  try {
    const row = await prisma.externalLink.update({
      where: { id: normalized.id },
      data: externalLinkToPrismaUpdate(normalized),
    })
    revalidateExternalLinkRoutes()
    return prismaExternalLinkToRecord(row)
  } catch (error) {
    throw wrapExternalLinkDbError(error, "Could not update external link.")
  }
}

export async function deleteExternalLink(id: string): Promise<void> {
  try {
    await prisma.externalLink.delete({ where: { id: id.trim() } })
    revalidateExternalLinkRoutes()
  } catch (error) {
    throw wrapExternalLinkDbError(error, "Could not delete external link.")
  }
}

export async function duplicateExternalLink(id: string): Promise<ExternalLinkRecord> {
  const existing = await getExternalLinkById(id)
  if (!existing) throw new Error("External link not found.")

  return createExternalLink({
    ...existing,
    name: `${existing.name} (Copy)`,
    status: "Draft",
  })
}

export async function getExternalLinksForCampaign(
  campaignId: string,
): Promise<ExternalLinkRecord[]> {
  const links = await getExternalLinks()
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId.trim() } })
  const campaignName = campaign?.campaignName ?? ""
  return filterExternalLinksForCampaign(links, campaignId, campaignName)
}

export async function getExternalLinksForRecord(
  sourceRecordType: string,
  sourceRecordId: string,
): Promise<ExternalLinkRecord[]> {
  const links = await getExternalLinks()
  return filterExternalLinksForRecord(links, sourceRecordType, sourceRecordId)
}

export async function importExternalLinks(records: ExternalLinkRecord[]): Promise<number> {
  let count = 0
  for (const record of records) {
    const normalized = normalizeExternalLinkRecord(record)
    await prisma.externalLink.upsert({
      where: { id: normalized.id },
      create: externalLinkToPrismaCreate(normalized),
      update: externalLinkToPrismaUpdate(normalized),
    })
    count += 1
  }
  revalidateExternalLinkRoutes()
  return count
}

export interface ImportYouTubeAnalyticsCsvInput {
  csvText: string
  campaignId?: string
  campaignName?: string
  artistName?: string
  songTitle?: string
  fallbackTitle?: string
  createExternalLinks?: boolean
  skipDuplicates?: boolean
  rows?: YouTubeCsvPreviewRow[]
}

export interface ImportYouTubeAnalyticsCsvResult {
  success: boolean
  importedAnalytics: number
  skippedDuplicates: number
  createdLinks: number
  analyticsRecordIds: string[]
  externalLinkIds: string[]
  warnings: string[]
  error?: string
}

export async function importYouTubeAnalyticsCsv(
  input: ImportYouTubeAnalyticsCsvInput,
): Promise<ImportYouTubeAnalyticsCsvResult> {
  try {
    const parseResult =
      input.rows && input.rows.length > 0
        ? {
            success: true,
            rows: input.rows,
            unmatchedColumns: [] as string[],
            warnings: [] as string[],
          }
        : parseYouTubeAnalyticsCsv(input.csvText, input.fallbackTitle)

    if (!parseResult.success || parseResult.rows.length === 0) {
      return {
        success: false,
        importedAnalytics: 0,
        skippedDuplicates: 0,
        createdLinks: 0,
        analyticsRecordIds: [],
        externalLinkIds: [],
        warnings: parseResult.warnings,
        error: parseResult.error ?? "No rows to import.",
      }
    }

    const existing = await getAnalyticsRecords()
    const now = Date.now()
    let importedAnalytics = 0
    let skippedDuplicates = 0
    let createdLinks = 0
    const analyticsRecordIds: string[] = []
    const externalLinkIds: string[] = []
    const warnings = [...parseResult.warnings]

    for (const row of parseResult.rows) {
      const analyticsId = createId("analytics")
      const analytics = youtubeCsvRowToAnalyticsRecord(row, {
        id: analyticsId,
        relatedCampaign: input.campaignName ?? "",
        relatedArtist: input.artistName ?? "",
        relatedSong: input.songTitle ?? "",
        now,
      })

      if (
        input.skipDuplicates !== false &&
        isDuplicateAnalyticsImport(existing, analytics)
      ) {
        skippedDuplicates += 1
        continue
      }

      const saved = await upsertAnalyticsRecord(analytics)
      existing.push(saved)
      analyticsRecordIds.push(saved.id)
      importedAnalytics += 1

      if (input.createExternalLinks !== false) {
        const link = youtubeCsvRowToExternalLink(row, {
          id: createId("extlink"),
          campaignId: input.campaignId,
          campaignName: input.campaignName,
          artistName: input.artistName,
          songTitle: input.songTitle,
          now,
        })
        if (link) {
          link.analyticsRecordId = saved.id
          await createExternalLink(link)
          externalLinkIds.push(link.id)
          createdLinks += 1
        }
      }
    }

    revalidateExternalLinkRoutes()
    return {
      success: importedAnalytics > 0 || createdLinks > 0,
      importedAnalytics,
      skippedDuplicates,
      createdLinks,
      analyticsRecordIds,
      externalLinkIds,
      warnings,
      error:
        importedAnalytics === 0 && createdLinks === 0
          ? "All rows were skipped as duplicates or had no importable data."
          : undefined,
    }
  } catch (error) {
    return {
      success: false,
      importedAnalytics: 0,
      skippedDuplicates: 0,
      createdLinks: 0,
      analyticsRecordIds: [],
      externalLinkIds: [],
      warnings: [],
      error: error instanceof Error ? error.message : "Import failed.",
    }
  }
}

export async function previewYouTubeAnalyticsCsv(
  csvText: string,
  fallbackTitle?: string,
) {
  return parseYouTubeAnalyticsCsv(csvText, fallbackTitle)
}
