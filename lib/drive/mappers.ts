import { parseJsonStringArray } from "@/lib/safe-json"
import { createId } from "@/lib/storage"
import type { AssetRecord, DriveFileRecord, DriveFolderRecord } from "@/lib/types"
import type {
  DriveFile as PrismaDriveFile,
  DriveFolder as PrismaDriveFolder,
} from "@/lib/generated/prisma/client"
import {
  classifyDriveFileByPath,
  getDrivePathFromRawJson,
} from "@/lib/drive/classify"
import {
  driveFileUrl,
  driveFolderUrl,
  type DriveApiFile,
  type DriveApiFolder,
} from "@/lib/drive/types"

export function detectAssetTypeFromDriveFile(input: {
  name: string
  mimeType?: string
}): string {
  const name = input.name.toLowerCase()
  const mime = (input.mimeType ?? "").toLowerCase()

  if (mime.startsWith("image/") && name.includes("thumbnail")) return "YouTube Thumbnail"
  if (mime.startsWith("image/") && (name.includes("cover") || name.includes("art"))) {
    return "Cover Art"
  }
  if (mime.startsWith("video/")) return "Video File"
  if (mime.startsWith("audio/")) return "Audio File"
  if (mime.startsWith("image/") && name.includes("mockup")) return "Merch Mockup"
  if (mime.startsWith("image/") && name.includes("product")) return "Product Image"
  if (mime.startsWith("image/") && name.includes("social")) return "Social Graphic"
  if (mime === "application/pdf") return "Document"
  if (mime === "application/vnd.google-apps.document") return "Document"
  if (mime === "application/vnd.google-apps.spreadsheet") return "Spreadsheet"
  if (mime.startsWith("image/")) return "Reference Asset"
  return "Reference Asset"
}

export function normalizeDriveFolderRecord(
  record: Partial<DriveFolderRecord> & Pick<DriveFolderRecord, "id">,
): DriveFolderRecord {
  const now = Date.now()
  return {
    id: record.id,
    driveFolderId: record.driveFolderId?.trim() ?? "",
    name: record.name?.trim() ?? "",
    url: record.url?.trim() ?? "",
    campaignId: record.campaignId?.trim() ?? "",
    campaignName: record.campaignName?.trim() ?? "",
    artistName: record.artistName?.trim() ?? "",
    songTitle: record.songTitle?.trim() ?? "",
    productName: record.productName?.trim() ?? "",
    sourceRecordType: record.sourceRecordType?.trim() ?? "",
    sourceRecordId: record.sourceRecordId?.trim() ?? "",
    externalLinkId: record.externalLinkId?.trim() ?? "",
    status: record.status?.trim() || "Active",
    lastSyncedAt: record.lastSyncedAt ?? null,
    notes: record.notes?.trim() ?? "",
    tags: Array.isArray(record.tags)
      ? record.tags.map(String).filter(Boolean)
      : parseJsonStringArray(String(record.tags ?? "[]"), []),
    rawJson: record.rawJson?.trim() || "{}",
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? now,
  }
}

export function normalizeDriveFileRecord(
  record: Partial<DriveFileRecord> & Pick<DriveFileRecord, "id">,
): DriveFileRecord {
  const now = Date.now()
  const detected =
    record.detectedAssetType?.trim() ||
    detectAssetTypeFromDriveFile({
      name: record.name ?? "",
      mimeType: record.mimeType,
    })

  return {
    id: record.id,
    driveFileId: record.driveFileId?.trim() ?? "",
    name: record.name?.trim() ?? "",
    mimeType: record.mimeType?.trim() ?? "",
    url: record.url?.trim() ?? "",
    webViewLink: record.webViewLink?.trim() ?? "",
    thumbnailLink: record.thumbnailLink?.trim() ?? "",
    iconLink: record.iconLink?.trim() ?? "",
    sizeBytes: record.sizeBytes ?? null,
    modifiedTime: record.modifiedTime ?? null,
    folderId: record.folderId?.trim() ?? "",
    driveFolderId: record.driveFolderId?.trim() ?? "",
    campaignId: record.campaignId?.trim() ?? "",
    campaignName: record.campaignName?.trim() ?? "",
    artistName: record.artistName?.trim() ?? "",
    songTitle: record.songTitle?.trim() ?? "",
    productName: record.productName?.trim() ?? "",
    assetId: record.assetId?.trim() ?? "",
    sourceRecordType: record.sourceRecordType?.trim() ?? "",
    sourceRecordId: record.sourceRecordId?.trim() ?? "",
    detectedAssetType: detected,
    status: record.status?.trim() || "Active",
    lastSyncedAt: record.lastSyncedAt ?? null,
    notes: record.notes?.trim() ?? "",
    tags: Array.isArray(record.tags)
      ? record.tags.map(String).filter(Boolean)
      : parseJsonStringArray(String(record.tags ?? "[]"), []),
    rawJson: record.rawJson?.trim() || "{}",
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? now,
  }
}

export function prismaDriveFolderToRecord(row: PrismaDriveFolder): DriveFolderRecord {
  return normalizeDriveFolderRecord({
    id: row.id,
    driveFolderId: row.driveFolderId,
    name: row.name,
    url: row.url,
    campaignId: row.campaignId,
    campaignName: row.campaignName,
    artistName: row.artistName,
    songTitle: row.songTitle,
    productName: row.productName,
    sourceRecordType: row.sourceRecordType,
    sourceRecordId: row.sourceRecordId,
    externalLinkId: row.externalLinkId,
    status: row.status,
    lastSyncedAt: row.lastSyncedAt?.getTime() ?? null,
    notes: row.notes,
    tags: parseJsonStringArray(row.tags, []),
    rawJson: row.rawJson,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}

export function prismaDriveFileToRecord(row: PrismaDriveFile): DriveFileRecord {
  return normalizeDriveFileRecord({
    id: row.id,
    driveFileId: row.driveFileId,
    name: row.name,
    mimeType: row.mimeType,
    url: row.url,
    webViewLink: row.webViewLink,
    thumbnailLink: row.thumbnailLink,
    iconLink: row.iconLink,
    sizeBytes: row.sizeBytes,
    modifiedTime: row.modifiedTime?.getTime() ?? null,
    folderId: row.folderId,
    driveFolderId: row.driveFolderId,
    campaignId: row.campaignId,
    campaignName: row.campaignName,
    artistName: row.artistName,
    songTitle: row.songTitle,
    productName: row.productName,
    assetId: row.assetId,
    sourceRecordType: row.sourceRecordType,
    sourceRecordId: row.sourceRecordId,
    detectedAssetType: row.detectedAssetType,
    status: row.status,
    lastSyncedAt: row.lastSyncedAt?.getTime() ?? null,
    notes: row.notes,
    tags: parseJsonStringArray(row.tags, []),
    rawJson: row.rawJson,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}

export function driveFolderToPrismaCreate(record: DriveFolderRecord) {
  const normalized = normalizeDriveFolderRecord(record)
  return {
    id: normalized.id,
    driveFolderId: normalized.driveFolderId,
    name: normalized.name,
    url: normalized.url,
    campaignId: normalized.campaignId,
    campaignName: normalized.campaignName,
    artistName: normalized.artistName,
    songTitle: normalized.songTitle,
    productName: normalized.productName,
    sourceRecordType: normalized.sourceRecordType,
    sourceRecordId: normalized.sourceRecordId,
    externalLinkId: normalized.externalLinkId,
    status: normalized.status,
    lastSyncedAt: normalized.lastSyncedAt ? new Date(normalized.lastSyncedAt) : null,
    notes: normalized.notes,
    tags: JSON.stringify(normalized.tags),
    rawJson: normalized.rawJson,
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function driveFolderToPrismaUpdate(record: DriveFolderRecord) {
  const normalized = normalizeDriveFolderRecord(record)
  return {
    driveFolderId: normalized.driveFolderId,
    name: normalized.name,
    url: normalized.url,
    campaignId: normalized.campaignId,
    campaignName: normalized.campaignName,
    artistName: normalized.artistName,
    songTitle: normalized.songTitle,
    productName: normalized.productName,
    sourceRecordType: normalized.sourceRecordType,
    sourceRecordId: normalized.sourceRecordId,
    externalLinkId: normalized.externalLinkId,
    status: normalized.status,
    lastSyncedAt: normalized.lastSyncedAt ? new Date(normalized.lastSyncedAt) : null,
    notes: normalized.notes,
    tags: JSON.stringify(normalized.tags),
    rawJson: normalized.rawJson,
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function driveFileToPrismaCreate(record: DriveFileRecord) {
  const normalized = normalizeDriveFileRecord(record)
  return {
    id: normalized.id,
    driveFileId: normalized.driveFileId,
    name: normalized.name,
    mimeType: normalized.mimeType,
    url: normalized.url,
    webViewLink: normalized.webViewLink,
    thumbnailLink: normalized.thumbnailLink,
    iconLink: normalized.iconLink,
    sizeBytes: normalized.sizeBytes,
    modifiedTime: normalized.modifiedTime ? new Date(normalized.modifiedTime) : null,
    folderId: normalized.folderId,
    driveFolderId: normalized.driveFolderId,
    campaignId: normalized.campaignId,
    campaignName: normalized.campaignName,
    artistName: normalized.artistName,
    songTitle: normalized.songTitle,
    productName: normalized.productName,
    assetId: normalized.assetId,
    sourceRecordType: normalized.sourceRecordType,
    sourceRecordId: normalized.sourceRecordId,
    detectedAssetType: normalized.detectedAssetType,
    status: normalized.status,
    lastSyncedAt: normalized.lastSyncedAt ? new Date(normalized.lastSyncedAt) : null,
    notes: normalized.notes,
    tags: JSON.stringify(normalized.tags),
    rawJson: normalized.rawJson,
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function driveFileToPrismaUpdate(record: DriveFileRecord) {
  const normalized = normalizeDriveFileRecord(record)
  return {
    driveFileId: normalized.driveFileId,
    name: normalized.name,
    mimeType: normalized.mimeType,
    url: normalized.url,
    webViewLink: normalized.webViewLink,
    thumbnailLink: normalized.thumbnailLink,
    iconLink: normalized.iconLink,
    sizeBytes: normalized.sizeBytes,
    modifiedTime: normalized.modifiedTime ? new Date(normalized.modifiedTime) : null,
    folderId: normalized.folderId,
    driveFolderId: normalized.driveFolderId,
    campaignId: normalized.campaignId,
    campaignName: normalized.campaignName,
    artistName: normalized.artistName,
    songTitle: normalized.songTitle,
    productName: normalized.productName,
    assetId: normalized.assetId,
    sourceRecordType: normalized.sourceRecordType,
    sourceRecordId: normalized.sourceRecordId,
    detectedAssetType: normalized.detectedAssetType,
    status: normalized.status,
    lastSyncedAt: normalized.lastSyncedAt ? new Date(normalized.lastSyncedAt) : null,
    notes: normalized.notes,
    tags: JSON.stringify(normalized.tags),
    rawJson: normalized.rawJson,
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function apiFolderToDriveFolderRecord(
  folder: DriveApiFolder,
  existing?: Partial<DriveFolderRecord>,
  context?: Partial<DriveFolderRecord>,
): DriveFolderRecord {
  const now = Date.now()
  return normalizeDriveFolderRecord({
    id: existing?.id ?? createId(),
    driveFolderId: folder.id,
    name: folder.name,
    url: folder.webViewLink ?? driveFolderUrl(folder.id),
    ...context,
    rawJson: JSON.stringify(folder),
    lastSyncedAt: now,
    updatedAt: now,
    createdAt: existing?.createdAt ?? now,
    notes: existing?.notes ?? "",
    tags: existing?.tags ?? ["google-drive"],
  })
}

export function apiFileToDriveFileRecord(
  file: DriveApiFile,
  folderRecord: DriveFolderRecord,
  existing?: Partial<DriveFileRecord>,
  drivePath?: string,
): DriveFileRecord {
  const now = Date.now()
  const webViewLink = file.webViewLink ?? driveFileUrl(file.id)
  const path = drivePath ?? getDrivePathFromRawJson(existing?.rawJson ?? "")
  const classification = classifyDriveFileByPath(file.name, path)
  const mergedTags = [
    ...new Set([...(existing?.tags ?? ["google-drive"]), ...classification.tags]),
  ]

  return normalizeDriveFileRecord({
    id: existing?.id ?? createId(),
    driveFileId: file.id,
    name: file.name,
    mimeType: file.mimeType,
    url: webViewLink,
    webViewLink,
    thumbnailLink: file.thumbnailLink ?? "",
    iconLink: file.iconLink ?? "",
    sizeBytes: file.size ? Number.parseInt(file.size, 10) || null : null,
    modifiedTime: file.modifiedTime ? Date.parse(file.modifiedTime) : null,
    folderId: folderRecord.id,
    driveFolderId: folderRecord.driveFolderId,
    campaignId: folderRecord.campaignId || existing?.campaignId || "",
    campaignName:
      classification.campaignName ||
      folderRecord.campaignName ||
      existing?.campaignName ||
      "",
    artistName:
      classification.artistName || folderRecord.artistName || existing?.artistName || "",
    songTitle:
      classification.songTitle || folderRecord.songTitle || existing?.songTitle || "",
    productName: folderRecord.productName || existing?.productName || "",
    assetId: existing?.assetId ?? "",
    detectedAssetType: classification.assetType,
    notes: path ? `Drive path: ${path}` : existing?.notes ?? "",
    tags: mergedTags,
    status: existing?.status ?? "Active",
    rawJson: JSON.stringify({ ...file, drivePath: path }),
    lastSyncedAt: now,
    updatedAt: now,
    createdAt: existing?.createdAt ?? now,
  })
}

export function driveFileToAssetRecord(
  file: DriveFileRecord,
  existing?: AssetRecord | null,
): AssetRecord {
  const now = Date.now()
  const url = file.webViewLink || file.url
  const drivePath = getDrivePathFromRawJson(file.rawJson)
  const classification = classifyDriveFileByPath(file.name, drivePath)
  const pathLine = drivePath ? `Drive path: ${drivePath}` : ""
  const description =
    existing?.description ||
    [pathLine, "Synced from Google Drive."].filter(Boolean).join("\n\n")

  return {
    id: existing?.id ?? createId(),
    assetName: file.name,
    assetType:
      file.detectedAssetType ||
      classification.assetType ||
      detectAssetTypeFromDriveFile(file),
    status: "Active",
    campaignId: file.campaignId,
    campaignName: file.campaignName || classification.campaignName,
    artistName: file.artistName || classification.artistName,
    songTitle: file.songTitle || classification.songTitle,
    productName: file.productName,
    platform: "Google Drive",
    filePath: drivePath,
    fileUrl: url,
    externalUrl: url,
    sourceTool: "Google Drive",
    sourcePromptRunId: "",
    sourcePromptName: "",
    sourceRecordType: "DriveFile",
    sourceRecordId: file.id,
    experimentId: existing?.experimentId ?? "",
    analyticsRecordId: existing?.analyticsRecordId ?? "",
    versionLabel: existing?.versionLabel ?? "",
    tags: [...new Set([...(existing?.tags ?? []), ...file.tags, ...classification.tags])],
    description,
    usageNotes: existing?.usageNotes ?? "",
    rightsNotes: existing?.rightsNotes ?? "",
    notes: existing?.notes || "Synced from Google Drive API.",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

export function filterDriveFilesForCampaign(
  files: DriveFileRecord[],
  campaignId: string,
  campaignName?: string,
): DriveFileRecord[] {
  const nameNorm = (campaignName ?? "").trim().toLowerCase()
  return files.filter(
    (file) =>
      file.campaignId === campaignId ||
      (nameNorm && file.campaignName.trim().toLowerCase() === nameNorm),
  )
}

export function filterDriveFoldersForCampaign(
  folders: DriveFolderRecord[],
  campaignId: string,
  campaignName?: string,
): DriveFolderRecord[] {
  const nameNorm = (campaignName ?? "").trim().toLowerCase()
  return folders.filter(
    (folder) =>
      folder.campaignId === campaignId ||
      (nameNorm && folder.campaignName.trim().toLowerCase() === nameNorm),
  )
}

export function countDriveFilesForFolder(
  files: DriveFileRecord[],
  folder: DriveFolderRecord,
): number {
  return files.filter(
    (file) =>
      file.folderId === folder.id || file.driveFolderId === folder.driveFolderId,
  ).length
}
