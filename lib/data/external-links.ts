import { parseJsonStringArray } from "@/lib/safe-json"
import {
  EXTERNAL_LINK_PLATFORMS,
  EXTERNAL_LINK_STATUSES,
  EXTERNAL_LINK_TYPES,
  type ExternalLinkRecord,
} from "@/lib/types"
import type { ExternalLink as PrismaExternalLink } from "@/lib/generated/prisma/client"

export function isValidExternalUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

export function normalizeExternalLinkRecord(
  record: Partial<ExternalLinkRecord> & Pick<ExternalLinkRecord, "id">,
): ExternalLinkRecord {
  const now = Date.now()
  const platform = String(record.platform ?? "Other").trim() || "Other"
  const linkType = String(record.linkType ?? "Other").trim() || "Other"
  const status = String(record.status ?? "Active").trim() || "Active"

  return {
    id: record.id,
    name: record.name?.trim() ?? "",
    platform: EXTERNAL_LINK_PLATFORMS.includes(platform as (typeof EXTERNAL_LINK_PLATFORMS)[number])
      ? platform
      : platform,
    linkType: EXTERNAL_LINK_TYPES.includes(linkType as (typeof EXTERNAL_LINK_TYPES)[number])
      ? linkType
      : linkType,
    url: record.url?.trim() ?? "",
    status: EXTERNAL_LINK_STATUSES.includes(status as (typeof EXTERNAL_LINK_STATUSES)[number])
      ? status
      : status,
    campaignId: record.campaignId?.trim() ?? "",
    campaignName: record.campaignName?.trim() ?? "",
    artistName: record.artistName?.trim() ?? "",
    songTitle: record.songTitle?.trim() ?? "",
    productName: record.productName?.trim() ?? "",
    sourceRecordType: record.sourceRecordType?.trim() ?? "",
    sourceRecordId: record.sourceRecordId?.trim() ?? "",
    assetId: record.assetId?.trim() ?? "",
    analyticsRecordId: record.analyticsRecordId?.trim() ?? "",
    notes: record.notes?.trim() ?? "",
    tags: Array.isArray(record.tags) ? record.tags.filter(Boolean) : [],
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? now,
  }
}

export function externalLinkToPrismaCreate(record: ExternalLinkRecord) {
  const normalized = normalizeExternalLinkRecord(record)
  return {
    id: normalized.id,
    name: normalized.name,
    platform: normalized.platform,
    linkType: normalized.linkType,
    url: normalized.url,
    status: normalized.status,
    campaignId: normalized.campaignId,
    campaignName: normalized.campaignName,
    artistName: normalized.artistName,
    songTitle: normalized.songTitle,
    productName: normalized.productName,
    sourceRecordType: normalized.sourceRecordType,
    sourceRecordId: normalized.sourceRecordId,
    assetId: normalized.assetId,
    analyticsRecordId: normalized.analyticsRecordId,
    notes: normalized.notes,
    tags: JSON.stringify(normalized.tags),
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function externalLinkToPrismaUpdate(record: ExternalLinkRecord) {
  const normalized = normalizeExternalLinkRecord(record)
  return {
    name: normalized.name,
    platform: normalized.platform,
    linkType: normalized.linkType,
    url: normalized.url,
    status: normalized.status,
    campaignId: normalized.campaignId,
    campaignName: normalized.campaignName,
    artistName: normalized.artistName,
    songTitle: normalized.songTitle,
    productName: normalized.productName,
    sourceRecordType: normalized.sourceRecordType,
    sourceRecordId: normalized.sourceRecordId,
    assetId: normalized.assetId,
    analyticsRecordId: normalized.analyticsRecordId,
    notes: normalized.notes,
    tags: JSON.stringify(normalized.tags),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function prismaExternalLinkToRecord(row: PrismaExternalLink): ExternalLinkRecord {
  return normalizeExternalLinkRecord({
    id: row.id,
    name: row.name,
    platform: row.platform,
    linkType: row.linkType,
    url: row.url,
    status: row.status,
    campaignId: row.campaignId,
    campaignName: row.campaignName,
    artistName: row.artistName,
    songTitle: row.songTitle,
    productName: row.productName,
    sourceRecordType: row.sourceRecordType,
    sourceRecordId: row.sourceRecordId,
    assetId: row.assetId,
    analyticsRecordId: row.analyticsRecordId,
    notes: row.notes,
    tags: parseJsonStringArray(row.tags, []),
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}

export function filterExternalLinksForCampaign(
  links: ExternalLinkRecord[],
  campaignId: string,
  campaignName?: string,
): ExternalLinkRecord[] {
  const nameNorm = campaignName?.trim().toLowerCase() ?? ""
  return links.filter(
    (link) =>
      (campaignId && link.campaignId === campaignId) ||
      (nameNorm && link.campaignName.trim().toLowerCase() === nameNorm),
  )
}

export function filterExternalLinksForRecord(
  links: ExternalLinkRecord[],
  sourceRecordType: string,
  sourceRecordId: string,
): ExternalLinkRecord[] {
  if (!sourceRecordType.trim() || !sourceRecordId.trim()) return []
  return links.filter(
    (link) =>
      link.sourceRecordType === sourceRecordType && link.sourceRecordId === sourceRecordId,
  )
}

export function groupExternalLinksByPlatform(links: ExternalLinkRecord[]) {
  const groups = new Map<string, ExternalLinkRecord[]>()
  for (const link of links) {
    const key = link.platform || "Other"
    const list = groups.get(key) ?? []
    list.push(link)
    groups.set(key, list)
  }
  return groups
}
