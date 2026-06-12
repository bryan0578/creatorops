import { parseStringList } from "@/lib/artist-universe/utils"
import type { VisualIdentityProfileRecord } from "@/lib/artist-universe/types"
import type { VisualIdentityProfile as PrismaVisualIdentityProfile } from "@/lib/generated/prisma/client"

export function normalizeVisualIdentity(
  record: Partial<VisualIdentityProfileRecord> & {
    artistName: string
    profileName: string
  },
): VisualIdentityProfileRecord {
  const now = Date.now()
  return {
    id: record.id?.trim() || "",
    artistName: record.artistName.trim() || "Unknown artist",
    profileName: record.profileName.trim() || "Default profile",
    status: record.status?.trim() || "Active",
    visualStyle: record.visualStyle?.trim() ?? "",
    colorPalette: parseStringList(record.colorPalette),
    typographyRules: record.typographyRules?.trim() ?? "",
    characterRules: record.characterRules?.trim() ?? "",
    environmentRules: record.environmentRules?.trim() ?? "",
    imagePromptRules: record.imagePromptRules?.trim() ?? "",
    thumbnailRules: record.thumbnailRules?.trim() ?? "",
    merchDesignRules: record.merchDesignRules?.trim() ?? "",
    forbiddenElements: parseStringList(record.forbiddenElements),
    referenceAssetIds: parseStringList(record.referenceAssetIds),
    referenceDriveFileIds: parseStringList(record.referenceDriveFileIds),
    tags: parseStringList(record.tags),
    notes: record.notes?.trim() ?? "",
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? now,
  }
}

export function prismaVisualIdentityToRecord(
  row: PrismaVisualIdentityProfile,
): VisualIdentityProfileRecord {
  return normalizeVisualIdentity({
    id: row.id,
    artistName: row.artistName,
    profileName: row.profileName,
    status: row.status,
    visualStyle: row.visualStyle,
    colorPalette: parseStringList(row.colorPalette),
    typographyRules: row.typographyRules,
    characterRules: row.characterRules,
    environmentRules: row.environmentRules,
    imagePromptRules: row.imagePromptRules,
    thumbnailRules: row.thumbnailRules,
    merchDesignRules: row.merchDesignRules,
    forbiddenElements: parseStringList(row.forbiddenElements),
    referenceAssetIds: parseStringList(row.referenceAssetIds),
    referenceDriveFileIds: parseStringList(row.referenceDriveFileIds),
    tags: parseStringList(row.tags),
    notes: row.notes,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}

export function visualIdentityToPrismaCreate(record: VisualIdentityProfileRecord) {
  const n = normalizeVisualIdentity(record)
  return {
    id: n.id || undefined,
    artistName: n.artistName,
    profileName: n.profileName,
    status: n.status,
    visualStyle: n.visualStyle,
    colorPalette: JSON.stringify(n.colorPalette),
    typographyRules: n.typographyRules,
    characterRules: n.characterRules,
    environmentRules: n.environmentRules,
    imagePromptRules: n.imagePromptRules,
    thumbnailRules: n.thumbnailRules,
    merchDesignRules: n.merchDesignRules,
    forbiddenElements: JSON.stringify(n.forbiddenElements),
    referenceAssetIds: JSON.stringify(n.referenceAssetIds),
    referenceDriveFileIds: JSON.stringify(n.referenceDriveFileIds),
    tags: JSON.stringify(n.tags),
    notes: n.notes,
    createdAt: new Date(n.createdAt),
    updatedAt: new Date(n.updatedAt),
  }
}

export function visualIdentityToPrismaUpdate(record: VisualIdentityProfileRecord) {
  const n = normalizeVisualIdentity(record)
  return {
    artistName: n.artistName,
    profileName: n.profileName,
    status: n.status,
    visualStyle: n.visualStyle,
    colorPalette: JSON.stringify(n.colorPalette),
    typographyRules: n.typographyRules,
    characterRules: n.characterRules,
    environmentRules: n.environmentRules,
    imagePromptRules: n.imagePromptRules,
    thumbnailRules: n.thumbnailRules,
    merchDesignRules: n.merchDesignRules,
    forbiddenElements: JSON.stringify(n.forbiddenElements),
    referenceAssetIds: JSON.stringify(n.referenceAssetIds),
    referenceDriveFileIds: JSON.stringify(n.referenceDriveFileIds),
    tags: JSON.stringify(n.tags),
    notes: n.notes,
    updatedAt: new Date(n.updatedAt),
  }
}
