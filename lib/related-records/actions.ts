"use server"

import { revalidatePath } from "next/cache"

import {
  buildContextForRecord,
  getRelatedLinksBundle,
  loadRelatedRecordCatalog,
} from "@/lib/related-records/queries"
import {
  removeLegacyFieldsForLink,
  syncLegacyFieldsForLink,
} from "@/lib/related-records/legacy-sync"
import type {
  BulkAutoLinkSuggestion,
  CreatorOpsRecordType,
  RelatedLinksBundle,
  RelatedRecordOption,
  RelationshipType,
} from "@/lib/related-records/types"
import { buildBulkAutoLinkSuggestions } from "@/lib/related-records/suggestions"
import { getAssets } from "@/lib/actions/assets"
import { getDriveFiles } from "@/lib/actions/drive-integration"
import { drivePathMap } from "@/lib/related-records/queries"
import { prisma } from "@/lib/prisma"
import { createId } from "@/lib/storage"
import { catalogOptionsByType } from "@/lib/related-records/catalog"
import { CREATOR_OPS_RECORD_TYPES, RECORD_TYPE_LABELS } from "@/lib/related-records/types"

const PATHS = [
  "/",
  "/assets",
  "/artist-bible",
  "/lore",
  "/song-vault",
  "/visual-identity",
  "/story-arcs",
  "/campaigns",
  "/artist-universe",
  "/videos",
  "/integrations",
]

function revalidate() {
  for (const path of PATHS) revalidatePath(path)
}

export async function getRelatedRecordTypeOptions(): Promise<
  { value: CreatorOpsRecordType; label: string }[]
> {
  return CREATOR_OPS_RECORD_TYPES.filter((type) =>
    ["ArtistBible", "VisualIdentityProfile", "LoreEntry", "SongConcept", "ReleaseStoryArc", "Asset", "Campaign", "Product", "YouTubeVideo", "DriveFile"].includes(type),
  ).map((value) => ({ value, label: RECORD_TYPE_LABELS[value] }))
}

export async function searchRelatedRecordOptions(input: {
  type: CreatorOpsRecordType
  query?: string
  artistName?: string
  songTitle?: string
  limit?: number
}): Promise<RelatedRecordOption[]> {
  const catalog = await loadRelatedRecordCatalog()
  const q = (input.query ?? "").trim().toLowerCase()
  const artist = (input.artistName ?? "").trim().toLowerCase()
  const song = (input.songTitle ?? "").trim().toLowerCase()
  let items = catalogOptionsByType(catalog, input.type)
  if (artist) {
    items = items.filter(
      (item) =>
        item.artistName.toLowerCase().includes(artist) ||
        item.title.toLowerCase().includes(artist),
    )
  }
  if (song) {
    items = items.filter(
      (item) =>
        item.songTitle.toLowerCase().includes(song) || item.title.toLowerCase().includes(song),
    )
  }
  if (q) {
    items = items.filter((item) => {
      const haystack = `${item.title} ${item.subtitle} ${item.artistName} ${item.songTitle} ${item.tags.join(" ")}`.toLowerCase()
      return haystack.includes(q)
    })
  }
  return items.slice(0, input.limit ?? 40)
}

export async function fetchRelatedLinks(
  sourceType: CreatorOpsRecordType,
  sourceId: string,
): Promise<RelatedLinksBundle> {
  const context = await buildContextForRecord(sourceType, sourceId)
  if (!context) return { linked: [], inferred: [], suggested: [] }
  return getRelatedLinksBundle(context)
}

export async function createRelatedRecordLink(input: {
  sourceType: CreatorOpsRecordType
  sourceId: string
  targetType: CreatorOpsRecordType
  targetId: string
  relationshipType?: RelationshipType | string
  label?: string
}): Promise<{ success: boolean; message: string }> {
  try {
    const catalog = await loadRelatedRecordCatalog()
    const target = catalogOptionsByType(catalog, input.targetType).find((item) => item.id === input.targetId)
    const relationshipType = input.relationshipType?.trim() || "related"
    await prisma.creatorOpsLink.upsert({
      where: {
        sourceType_sourceId_targetType_targetId_relationshipType: {
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          targetType: input.targetType,
          targetId: input.targetId,
          relationshipType,
        },
      },
      create: {
        id: createId("link"),
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        targetType: input.targetType,
        targetId: input.targetId,
        relationshipType,
        label: input.label?.trim() || target?.title || "",
        notes: "",
      },
      update: {
        label: input.label?.trim() || target?.title || "",
        updatedAt: new Date(),
      },
    })
    await syncLegacyFieldsForLink(
      input.sourceType,
      input.sourceId,
      input.targetType,
      input.targetId,
      catalog,
      relationshipType,
    )
    revalidate()
    return { success: true, message: "Link created." }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not create link.",
    }
  }
}

export async function removeRelatedRecordLink(input: {
  sourceType: CreatorOpsRecordType
  sourceId: string
  linkId?: string
  targetType?: CreatorOpsRecordType
  targetId?: string
}): Promise<{ success: boolean; message: string }> {
  try {
    if (input.linkId) {
      const row = await prisma.creatorOpsLink.findUnique({ where: { id: input.linkId } })
      if (row) {
        await prisma.creatorOpsLink.delete({ where: { id: input.linkId } })
        await removeLegacyFieldsForLink(
          row.sourceType as CreatorOpsRecordType,
          row.sourceId,
          row.targetType as CreatorOpsRecordType,
          row.targetId,
        )
      }
    } else if (input.targetType && input.targetId) {
      await prisma.creatorOpsLink.deleteMany({
        where: {
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          targetType: input.targetType,
          targetId: input.targetId,
        },
      })
      await removeLegacyFieldsForLink(
        input.sourceType,
        input.sourceId,
        input.targetType,
        input.targetId,
      )
    }
    revalidate()
    return { success: true, message: "Link removed." }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not remove link.",
    }
  }
}

export async function applyRelatedRecordLinks(input: {
  sourceType: CreatorOpsRecordType
  sourceId: string
  targets: Array<{ targetType: CreatorOpsRecordType; targetId: string; relationshipType?: string }>
}): Promise<{ success: boolean; message: string; applied: number }> {
  let applied = 0
  for (const target of input.targets) {
    const result = await createRelatedRecordLink({
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      targetType: target.targetType,
      targetId: target.targetId,
      relationshipType: target.relationshipType,
    })
    if (result.success) applied += 1
  }
  return {
    success: applied > 0,
    message: applied ? `Applied ${applied} link${applied === 1 ? "" : "s"}.` : "No links applied.",
    applied,
  }
}

export async function reviewAutoLinkSuggestions(input?: {
  assetIds?: string[]
  artistName?: string
}): Promise<BulkAutoLinkSuggestion[]> {
  const [assets, catalog, driveFiles] = await Promise.all([
    getAssets(),
    loadRelatedRecordCatalog(),
    getDriveFiles(),
  ])
  let filtered = assets
  if (input?.assetIds?.length) {
    const ids = new Set(input.assetIds)
    filtered = assets.filter((asset) => ids.has(asset.id))
  } else if (input?.artistName?.trim()) {
    const artist = input.artistName.trim().toLowerCase()
    filtered = assets.filter((asset) => asset.artistName.toLowerCase().includes(artist))
  }
  const paths = drivePathMap(filtered, driveFiles)
  return buildBulkAutoLinkSuggestions(filtered, catalog, paths)
}

export async function applyBulkAutoLinkSuggestions(
  suggestions: BulkAutoLinkSuggestion[],
  onlyHighConfidence = false,
): Promise<{ success: boolean; message: string; applied: number }> {
  const toApply = onlyHighConfidence
    ? suggestions.filter((item) => item.confidence === "high")
    : suggestions
  let applied = 0
  for (const item of toApply) {
    const result = await createRelatedRecordLink({
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      targetType: item.targetType,
      targetId: item.targetId,
      relationshipType: item.relationshipType,
      label: item.targetTitle,
    })
    if (result.success) applied += 1
  }
  return {
    success: applied > 0,
    message: `${applied} link${applied === 1 ? "" : "s"} applied.`,
    applied,
  }
}

export async function promoteInferredLink(input: {
  sourceType: CreatorOpsRecordType
  sourceId: string
  targetType: CreatorOpsRecordType
  targetId: string
  relationshipType?: string
}): Promise<{ success: boolean; message: string }> {
  return createRelatedRecordLink({
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    targetType: input.targetType,
    targetId: input.targetId,
    relationshipType: input.relationshipType,
  })
}
