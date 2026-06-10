import { normalizeAssetRecord, parseAssetTags } from "@/lib/assets"
import type { AssetRecord } from "@/lib/types"
import type { Asset as PrismaAsset } from "@/lib/generated/prisma/client"

export { normalizeAssetRecord } from "@/lib/assets"

export function assetToPrismaCreate(record: AssetRecord) {
  const normalized = normalizeAssetRecord(record)
  return {
    id: normalized.id,
    assetName: normalized.assetName,
    assetType: normalized.assetType,
    status: normalized.status,
    campaignId: normalized.campaignId,
    campaignName: normalized.campaignName,
    artistName: normalized.artistName,
    songTitle: normalized.songTitle,
    productName: normalized.productName,
    platform: normalized.platform,
    filePath: normalized.filePath,
    fileUrl: normalized.fileUrl,
    externalUrl: normalized.externalUrl,
    sourceTool: normalized.sourceTool,
    sourcePromptRunId: normalized.sourcePromptRunId,
    sourcePromptName: normalized.sourcePromptName,
    sourceRecordType: normalized.sourceRecordType,
    sourceRecordId: normalized.sourceRecordId,
    experimentId: normalized.experimentId,
    analyticsRecordId: normalized.analyticsRecordId,
    versionLabel: normalized.versionLabel,
    tags: JSON.stringify(normalized.tags),
    description: normalized.description,
    usageNotes: normalized.usageNotes,
    rightsNotes: normalized.rightsNotes,
    notes: normalized.notes,
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function assetToPrismaUpdate(record: AssetRecord) {
  const normalized = normalizeAssetRecord(record)
  return {
    assetName: normalized.assetName,
    assetType: normalized.assetType,
    status: normalized.status,
    campaignId: normalized.campaignId,
    campaignName: normalized.campaignName,
    artistName: normalized.artistName,
    songTitle: normalized.songTitle,
    productName: normalized.productName,
    platform: normalized.platform,
    filePath: normalized.filePath,
    fileUrl: normalized.fileUrl,
    externalUrl: normalized.externalUrl,
    sourceTool: normalized.sourceTool,
    sourcePromptRunId: normalized.sourcePromptRunId,
    sourcePromptName: normalized.sourcePromptName,
    sourceRecordType: normalized.sourceRecordType,
    sourceRecordId: normalized.sourceRecordId,
    experimentId: normalized.experimentId,
    analyticsRecordId: normalized.analyticsRecordId,
    versionLabel: normalized.versionLabel,
    tags: JSON.stringify(normalized.tags),
    description: normalized.description,
    usageNotes: normalized.usageNotes,
    rightsNotes: normalized.rightsNotes,
    notes: normalized.notes,
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function prismaAssetToAssetRecord(row: PrismaAsset): AssetRecord {
  return normalizeAssetRecord({
    id: row.id,
    assetName: row.assetName,
    assetType: row.assetType,
    status: row.status,
    campaignId: row.campaignId,
    campaignName: row.campaignName,
    artistName: row.artistName,
    songTitle: row.songTitle,
    productName: row.productName,
    platform: row.platform,
    filePath: row.filePath,
    fileUrl: row.fileUrl,
    externalUrl: row.externalUrl,
    sourceTool: row.sourceTool,
    sourcePromptRunId: row.sourcePromptRunId,
    sourcePromptName: row.sourcePromptName,
    sourceRecordType: row.sourceRecordType,
    sourceRecordId: row.sourceRecordId,
    experimentId: row.experimentId,
    analyticsRecordId: row.analyticsRecordId,
    versionLabel: row.versionLabel,
    tags: parseAssetTags(row.tags),
    description: row.description,
    usageNotes: row.usageNotes,
    rightsNotes: row.rightsNotes,
    notes: row.notes,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}
