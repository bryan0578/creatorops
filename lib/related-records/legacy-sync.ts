import {
  dedupeRelatedLinks,
  encodeRelatedLinksInNotes,
  parseRelatedLinksFromNotes,
  stripRelatedLinksFromNotes,
  type AssetRelatedLink,
} from "@/lib/asset-linking/asset-related-links"
import type { CreatorOpsRecordType, CreatorOpsLinkRecord, RelationshipType } from "@/lib/related-records/types"
import { findCatalogOption, type RelatedRecordCatalog } from "@/lib/related-records/catalog"
import { prisma } from "@/lib/prisma"
import { createId } from "@/lib/storage"
import { prismaSongConceptToRecord, songConceptToPrismaUpdate } from "@/lib/data/song-concepts"
import { prismaLoreEntryToRecord, loreEntryToPrismaUpdate } from "@/lib/data/lore"
import { prismaAssetToAssetRecord, assetToPrismaUpdate } from "@/lib/data/assets"

const LEGACY_ASSET_TYPE_MAP: Partial<Record<CreatorOpsRecordType, AssetRelatedLink["recordType"]>> = {
  ArtistBible: "ArtistBible",
  VisualIdentityProfile: "VisualIdentityProfile",
  LoreEntry: "LoreEntry",
  SongConcept: "SongConcept",
  Campaign: "Campaign",
  Product: "Product",
  YouTubePackage: "YouTubePackage",
  Asset: "Asset",
  DriveFile: "DriveFile",
  DriveFolder: "DriveFolder",
}

export function prismaLinkToRecord(row: {
  id: string
  sourceType: string
  sourceId: string
  targetType: string
  targetId: string
  relationshipType: string
  label: string
  notes: string
  createdAt: Date
  updatedAt: Date
}): CreatorOpsLinkRecord {
  return {
    id: row.id,
    sourceType: row.sourceType as CreatorOpsRecordType,
    sourceId: row.sourceId,
    targetType: row.targetType as CreatorOpsRecordType,
    targetId: row.targetId,
    relationshipType: row.relationshipType,
    label: row.label,
    notes: row.notes,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }
}

export async function syncLegacyFieldsForLink(
  sourceType: CreatorOpsRecordType,
  sourceId: string,
  targetType: CreatorOpsRecordType,
  targetId: string,
  catalog: RelatedRecordCatalog,
  relationshipType: RelationshipType | string = "related",
): Promise<void> {
  const target = findCatalogOption(catalog, targetType, targetId)
  const source = findCatalogOption(catalog, sourceType, sourceId)

  if (sourceType === "Asset" && LEGACY_ASSET_TYPE_MAP[targetType]) {
    const row = await prisma.asset.findUnique({ where: { id: sourceId } })
    if (row) {
      const asset = prismaAssetToAssetRecord(row)
      const existing = parseRelatedLinksFromNotes(asset.notes)
      const next = dedupeRelatedLinks([
        ...existing,
        {
          recordType: LEGACY_ASSET_TYPE_MAP[targetType]!,
          recordId: targetId,
          title: target?.title ?? "",
        },
      ])
      await prisma.asset.update({
        where: { id: sourceId },
        data: assetToPrismaUpdate({
          ...asset,
          notes: encodeRelatedLinksInNotes(stripRelatedLinksFromNotes(asset.notes), next),
          updatedAt: Date.now(),
        }),
      })
    }
  }

  if (targetType === "Asset" && sourceType !== "Asset") {
    const row = await prisma.asset.findUnique({ where: { id: targetId } })
    if (row) {
      const asset = prismaAssetToAssetRecord(row)
      const legacyType =
        sourceType === "SongConcept"
          ? "SongConcept"
          : sourceType === "LoreEntry"
            ? "LoreEntry"
            : sourceType === "Campaign"
              ? "Campaign"
              : null
      if (legacyType) {
        const existing = parseRelatedLinksFromNotes(asset.notes)
        const next = dedupeRelatedLinks([
          ...existing,
          { recordType: legacyType, recordId: sourceId, title: source?.title ?? "" },
        ])
        await prisma.asset.update({
          where: { id: targetId },
          data: assetToPrismaUpdate({
            ...asset,
            notes: encodeRelatedLinksInNotes(stripRelatedLinksFromNotes(asset.notes), next),
            updatedAt: Date.now(),
          }),
        })
      }
    }
  }

  if (sourceType === "SongConcept" && targetType === "LoreEntry") {
    const row = await prisma.songConcept.findUnique({ where: { id: sourceId } })
    if (row) {
      const concept = prismaSongConceptToRecord(row)
      const ids = [...new Set([...concept.relatedLoreIds, targetId])]
      await prisma.songConcept.update({
        where: { id: sourceId },
        data: songConceptToPrismaUpdate({ ...concept, relatedLoreIds: ids, updatedAt: Date.now() }),
      })
    }
  }

  if (sourceType === "SongConcept" && targetType === "Asset") {
    const row = await prisma.songConcept.findUnique({ where: { id: sourceId } })
    if (row) {
      const concept = prismaSongConceptToRecord(row)
      const ids = [...new Set([...concept.relatedAssetIds, targetId])]
      await prisma.songConcept.update({
        where: { id: sourceId },
        data: songConceptToPrismaUpdate({ ...concept, relatedAssetIds: ids, updatedAt: Date.now() }),
      })
    }
  }

  if (sourceType === "LoreEntry" && targetType === "SongConcept") {
    const row = await prisma.loreEntry.findUnique({ where: { id: sourceId } })
    if (row) {
      const lore = prismaLoreEntryToRecord(row)
      const songTitle = target?.songTitle || target?.title || ""
      const songs = songTitle
        ? [...new Set([...lore.relatedSongs, songTitle])]
        : lore.relatedSongs
      const assetIds =
        relationshipType === "related-asset" ? lore.relatedAssetIds : lore.relatedAssetIds
      await prisma.loreEntry.update({
        where: { id: sourceId },
        data: loreEntryToPrismaUpdate({
          ...lore,
          relatedSongs: songs,
          relatedAssetIds: assetIds,
          updatedAt: Date.now(),
        }),
      })
    }
  }

  if (sourceType === "LoreEntry" && targetType === "Asset") {
    const row = await prisma.loreEntry.findUnique({ where: { id: sourceId } })
    if (row) {
      const lore = prismaLoreEntryToRecord(row)
      const ids = [...new Set([...lore.relatedAssetIds, targetId])]
      await prisma.loreEntry.update({
        where: { id: sourceId },
        data: loreEntryToPrismaUpdate({ ...lore, relatedAssetIds: ids, updatedAt: Date.now() }),
      })
    }
  }

  if (sourceType === "SongConcept" && targetType === "YouTubeVideo") {
    const row = await prisma.songConcept.findUnique({ where: { id: sourceId } })
    if (row) {
      const concept = prismaSongConceptToRecord(row)
      await prisma.songConcept.update({
        where: { id: sourceId },
        data: songConceptToPrismaUpdate({
          ...concept,
          relatedYouTubeVideoId: targetId,
          updatedAt: Date.now(),
        }),
      })
    }
  }
}

export async function removeLegacyFieldsForLink(
  sourceType: CreatorOpsRecordType,
  sourceId: string,
  targetType: CreatorOpsRecordType,
  targetId: string,
): Promise<void> {
  if (sourceType === "Asset") {
    const row = await prisma.asset.findUnique({ where: { id: sourceId } })
    if (row) {
      const asset = prismaAssetToAssetRecord(row)
      const legacyType = LEGACY_ASSET_TYPE_MAP[targetType]
      const existing = parseRelatedLinksFromNotes(asset.notes)
      const next = legacyType
        ? existing.filter((l) => !(l.recordType === legacyType && l.recordId === targetId))
        : existing
      await prisma.asset.update({
        where: { id: sourceId },
        data: assetToPrismaUpdate({
          ...asset,
          notes: encodeRelatedLinksInNotes(stripRelatedLinksFromNotes(asset.notes), next),
          updatedAt: Date.now(),
        }),
      })
    }
  }

  if (sourceType === "SongConcept" && targetType === "LoreEntry") {
    const row = await prisma.songConcept.findUnique({ where: { id: sourceId } })
    if (row) {
      const concept = prismaSongConceptToRecord(row)
      await prisma.songConcept.update({
        where: { id: sourceId },
        data: songConceptToPrismaUpdate({
          ...concept,
          relatedLoreIds: concept.relatedLoreIds.filter((id) => id !== targetId),
          updatedAt: Date.now(),
        }),
      })
    }
  }

  if (sourceType === "SongConcept" && targetType === "Asset") {
    const row = await prisma.songConcept.findUnique({ where: { id: sourceId } })
    if (row) {
      const concept = prismaSongConceptToRecord(row)
      await prisma.songConcept.update({
        where: { id: sourceId },
        data: songConceptToPrismaUpdate({
          ...concept,
          relatedAssetIds: concept.relatedAssetIds.filter((id) => id !== targetId),
          updatedAt: Date.now(),
        }),
      })
    }
  }

  if (sourceType === "LoreEntry" && targetType === "Asset") {
    const row = await prisma.loreEntry.findUnique({ where: { id: sourceId } })
    if (row) {
      const lore = prismaLoreEntryToRecord(row)
      await prisma.loreEntry.update({
        where: { id: sourceId },
        data: loreEntryToPrismaUpdate({
          ...lore,
          relatedAssetIds: lore.relatedAssetIds.filter((id) => id !== targetId),
          updatedAt: Date.now(),
        }),
      })
    }
  }
}

export async function importLegacyLinksToCreatorOpsLink(sourceType: CreatorOpsRecordType, sourceId: string): Promise<number> {
  let imported = 0
  if (sourceType !== "Asset") return 0
  const row = await prisma.asset.findUnique({ where: { id: sourceId } })
  if (!row) return 0
  const asset = prismaAssetToAssetRecord(row)
  const legacy = parseRelatedLinksFromNotes(asset.notes)
  for (const link of legacy) {
    const targetType = link.recordType as CreatorOpsRecordType
    try {
      await prisma.creatorOpsLink.upsert({
        where: {
          sourceType_sourceId_targetType_targetId_relationshipType: {
            sourceType,
            sourceId,
            targetType,
            targetId: link.recordId,
            relationshipType: "related",
          },
        },
        create: {
          id: createId("link"),
          sourceType,
          sourceId,
          targetType,
          targetId: link.recordId,
          relationshipType: "related",
          label: link.title,
          notes: "",
        },
        update: { label: link.title, updatedAt: new Date() },
      })
      imported += 1
    } catch {
      // skip duplicates
    }
  }
  if (asset.sourceRecordType && asset.sourceRecordId) {
    try {
      await prisma.creatorOpsLink.upsert({
        where: {
          sourceType_sourceId_targetType_targetId_relationshipType: {
            sourceType,
            sourceId,
            targetType: asset.sourceRecordType as CreatorOpsRecordType,
            targetId: asset.sourceRecordId,
            relationshipType: "source-file",
          },
        },
        create: {
          id: createId("link"),
          sourceType,
          sourceId,
          targetType: asset.sourceRecordType,
          targetId: asset.sourceRecordId,
          relationshipType: "source-file",
          label: "",
          notes: "",
        },
        update: { updatedAt: new Date() },
      })
      imported += 1
    } catch {
      // skip
    }
  }
  return imported
}

import { legacyLoreLinks, legacySongConceptLinks } from "@/lib/related-records/legacy-links"