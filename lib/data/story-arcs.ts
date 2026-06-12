import { parseStringList } from "@/lib/artist-universe/utils"
import type { ReleaseStoryArcRecord } from "@/lib/artist-universe/types"
import type { ReleaseStoryArc as PrismaReleaseStoryArc } from "@/lib/generated/prisma/client"

export function normalizeStoryArc(
  record: Partial<ReleaseStoryArcRecord> & {
    title: string
    artistName: string
    summary: string
  },
): ReleaseStoryArcRecord {
  const now = Date.now()
  return {
    id: record.id?.trim() || "",
    title: record.title.trim() || "Untitled arc",
    artistName: record.artistName.trim() || "Unknown artist",
    arcType: record.arcType?.trim() ?? "",
    status: record.status?.trim() || "Planning",
    summary: record.summary.trim() || "",
    theme: record.theme?.trim() ?? "",
    startDate: record.startDate ?? null,
    endDate: record.endDate ?? null,
    campaignIds: parseStringList(record.campaignIds),
    releasePlanIds: parseStringList(record.releasePlanIds),
    songConceptIds: parseStringList(record.songConceptIds),
    loreEntryIds: parseStringList(record.loreEntryIds),
    productCollectionIds: parseStringList(record.productCollectionIds),
    visualDirection: record.visualDirection?.trim() ?? "",
    narrativeBeats: parseStringList(record.narrativeBeats),
    launchNotes: record.launchNotes?.trim() ?? "",
    tags: parseStringList(record.tags),
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? now,
  }
}

export function prismaStoryArcToRecord(row: PrismaReleaseStoryArc): ReleaseStoryArcRecord {
  return normalizeStoryArc({
    id: row.id,
    title: row.title,
    artistName: row.artistName,
    arcType: row.arcType,
    status: row.status,
    summary: row.summary,
    theme: row.theme,
    startDate: row.startDate?.getTime() ?? null,
    endDate: row.endDate?.getTime() ?? null,
    campaignIds: parseStringList(row.campaignIds),
    releasePlanIds: parseStringList(row.releasePlanIds),
    songConceptIds: parseStringList(row.songConceptIds),
    loreEntryIds: parseStringList(row.loreEntryIds),
    productCollectionIds: parseStringList(row.productCollectionIds),
    visualDirection: row.visualDirection,
    narrativeBeats: parseStringList(row.narrativeBeats),
    launchNotes: row.launchNotes,
    tags: parseStringList(row.tags),
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}

export function storyArcToPrismaCreate(record: ReleaseStoryArcRecord) {
  const n = normalizeStoryArc(record)
  return {
    id: n.id || undefined,
    title: n.title,
    artistName: n.artistName,
    arcType: n.arcType,
    status: n.status,
    summary: n.summary,
    theme: n.theme,
    startDate: n.startDate ? new Date(n.startDate) : null,
    endDate: n.endDate ? new Date(n.endDate) : null,
    campaignIds: JSON.stringify(n.campaignIds),
    releasePlanIds: JSON.stringify(n.releasePlanIds),
    songConceptIds: JSON.stringify(n.songConceptIds),
    loreEntryIds: JSON.stringify(n.loreEntryIds),
    productCollectionIds: JSON.stringify(n.productCollectionIds),
    visualDirection: n.visualDirection,
    narrativeBeats: JSON.stringify(n.narrativeBeats),
    launchNotes: n.launchNotes,
    tags: JSON.stringify(n.tags),
    createdAt: new Date(n.createdAt),
    updatedAt: new Date(n.updatedAt),
  }
}

export function storyArcToPrismaUpdate(record: ReleaseStoryArcRecord) {
  const n = normalizeStoryArc(record)
  return {
    title: n.title,
    artistName: n.artistName,
    arcType: n.arcType,
    status: n.status,
    summary: n.summary,
    theme: n.theme,
    startDate: n.startDate ? new Date(n.startDate) : null,
    endDate: n.endDate ? new Date(n.endDate) : null,
    campaignIds: JSON.stringify(n.campaignIds),
    releasePlanIds: JSON.stringify(n.releasePlanIds),
    songConceptIds: JSON.stringify(n.songConceptIds),
    loreEntryIds: JSON.stringify(n.loreEntryIds),
    productCollectionIds: JSON.stringify(n.productCollectionIds),
    visualDirection: n.visualDirection,
    narrativeBeats: JSON.stringify(n.narrativeBeats),
    launchNotes: n.launchNotes,
    tags: JSON.stringify(n.tags),
    updatedAt: new Date(n.updatedAt),
  }
}

export function appendUniqueId(ids: string[], id: string): string[] {
  const trimmed = id.trim()
  if (!trimmed || ids.includes(trimmed)) return ids
  return [...ids, trimmed]
}
