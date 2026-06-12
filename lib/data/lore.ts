import { parseStringList, dedupeStringsCaseInsensitive } from "@/lib/artist-universe/utils"
import type { LoreEntryRecord } from "@/lib/artist-universe/types"
import type { LoreEntry as PrismaLoreEntry } from "@/lib/generated/prisma/client"

export function normalizeLoreEntry(
  record: Partial<LoreEntryRecord> & { title: string; artistName: string; summary: string },
): LoreEntryRecord {
  const now = Date.now()
  return {
    id: record.id?.trim() || "",
    title: record.title.trim() || "Untitled lore",
    artistName: record.artistName.trim() || "Unknown artist",
    loreType: record.loreType?.trim() || "Other",
    status: record.status?.trim() || "Draft",
    canonStatus: record.canonStatus?.trim() || "Flexible",
    summary: record.summary.trim() || "",
    details: record.details?.trim() ?? "",
    characters: dedupeStringsCaseInsensitive(parseStringList(record.characters)),
    locations: dedupeStringsCaseInsensitive(parseStringList(record.locations)),
    symbols: dedupeStringsCaseInsensitive(parseStringList(record.symbols)),
    themes: dedupeStringsCaseInsensitive(parseStringList(record.themes)),
    relatedSongs: dedupeStringsCaseInsensitive(parseStringList(record.relatedSongs)),
    relatedCampaignIds: dedupeStringsCaseInsensitive(parseStringList(record.relatedCampaignIds)),
    relatedAssetIds: dedupeStringsCaseInsensitive(parseStringList(record.relatedAssetIds)),
    tags: dedupeStringsCaseInsensitive(parseStringList(record.tags)),
    notes: record.notes?.trim() ?? "",
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? now,
  }
}

export function prismaLoreEntryToRecord(row: PrismaLoreEntry): LoreEntryRecord {
  return normalizeLoreEntry({
    id: row.id,
    title: row.title,
    artistName: row.artistName,
    loreType: row.loreType,
    status: row.status,
    canonStatus: row.canonStatus,
    summary: row.summary,
    details: row.details,
    characters: parseStringList(row.characters),
    locations: parseStringList(row.locations),
    symbols: parseStringList(row.symbols),
    themes: parseStringList(row.themes),
    relatedSongs: parseStringList(row.relatedSongs),
    relatedCampaignIds: parseStringList(row.relatedCampaignIds),
    relatedAssetIds: parseStringList(row.relatedAssetIds),
    tags: parseStringList(row.tags),
    notes: row.notes,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}

export function loreEntryToPrismaCreate(record: LoreEntryRecord) {
  const n = normalizeLoreEntry(record)
  return {
    id: n.id || undefined,
    title: n.title,
    artistName: n.artistName,
    loreType: n.loreType,
    status: n.status,
    canonStatus: n.canonStatus,
    summary: n.summary,
    details: n.details,
    characters: JSON.stringify(n.characters),
    locations: JSON.stringify(n.locations),
    symbols: JSON.stringify(n.symbols),
    themes: JSON.stringify(n.themes),
    relatedSongs: JSON.stringify(n.relatedSongs),
    relatedCampaignIds: JSON.stringify(n.relatedCampaignIds),
    relatedAssetIds: JSON.stringify(n.relatedAssetIds),
    tags: JSON.stringify(n.tags),
    notes: n.notes,
    createdAt: new Date(n.createdAt),
    updatedAt: new Date(n.updatedAt),
  }
}

export function loreEntryToPrismaUpdate(record: LoreEntryRecord) {
  const n = normalizeLoreEntry(record)
  return {
    title: n.title,
    artistName: n.artistName,
    loreType: n.loreType,
    status: n.status,
    canonStatus: n.canonStatus,
    summary: n.summary,
    details: n.details,
    characters: JSON.stringify(n.characters),
    locations: JSON.stringify(n.locations),
    symbols: JSON.stringify(n.symbols),
    themes: JSON.stringify(n.themes),
    relatedSongs: JSON.stringify(n.relatedSongs),
    relatedCampaignIds: JSON.stringify(n.relatedCampaignIds),
    relatedAssetIds: JSON.stringify(n.relatedAssetIds),
    tags: JSON.stringify(n.tags),
    notes: n.notes,
    updatedAt: new Date(n.updatedAt),
  }
}
