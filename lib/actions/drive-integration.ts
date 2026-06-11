"use server"

import { revalidatePath } from "next/cache"

import { createAsset, getAssets, upsertAsset } from "@/lib/actions/assets"
import {
  createExternalLink,
  getExternalLinks,
  updateExternalLink,
} from "@/lib/actions/external-links"
import { buildDriveSummary } from "@/lib/data/drive"
import { normalizeExternalLinkRecord } from "@/lib/data/external-links"
import { requireDriveAccessToken, tryGetDriveAccessToken } from "@/lib/drive/access"
import {
  listDriveFolderFiles,
  fetchDriveFolderMetadata,
  parseDriveFolderIdInput,
  previewDriveFolder,
} from "@/lib/drive/client"
import {
  apiFileToDriveFileRecord,
  apiFolderToDriveFolderRecord,
  driveFileToAssetRecord,
  driveFileToPrismaCreate,
  driveFileToPrismaUpdate,
  driveFolderToPrismaCreate,
  driveFolderToPrismaUpdate,
  filterDriveFilesForCampaign,
  filterDriveFoldersForCampaign,
  prismaDriveFileToRecord,
  prismaDriveFolderToRecord,
} from "@/lib/drive/mappers"
import { isDriveOAuthConfigured } from "@/lib/drive/oauth"
import { buildDriveConnectionStatusSummary, driveConnectionToBackupMetadata } from "@/lib/drive/token-store"
import { DRIVE_CONNECTION_ID, DriveApiError } from "@/lib/drive/types"
import { prisma } from "@/lib/prisma"
import type {
  AssetRecord,
  DriveConnectionStatusSummary,
  DriveFileRecord,
  DriveFolderRecord,
  ExternalLinkRecord,
} from "@/lib/types"
import { isTokenEncryptionConfigured } from "@/lib/youtube/token-crypto"

const DRIVE_PATHS = [
  "/integrations",
  "/assets",
  "/campaigns",
  "/search",
  "/backups",
  "/data-health",
  "/automation",
  "/",
]

function revalidateDriveRoutes() {
  for (const path of DRIVE_PATHS) revalidatePath(path)
}

function friendlyDriveError(error: unknown): string {
  if (error instanceof DriveApiError) return error.message
  if (error instanceof Error) return error.message
  return "Google Drive request failed."
}

async function getConnectionRow() {
  return prisma.driveConnection.findUnique({ where: { id: DRIVE_CONNECTION_ID } })
}

export async function getDriveConnectionStatus(): Promise<DriveConnectionStatusSummary> {
  try {
    const row = await getConnectionRow()
    return buildDriveConnectionStatusSummary(row)
  } catch {
    return buildDriveConnectionStatusSummary(null)
  }
}

export async function getDriveAuthUrl(): Promise<{ success: boolean; message: string; url?: string }> {
  if (!isDriveOAuthConfigured()) {
    return {
      success: false,
      message:
        "Add GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET to .env.local (or reuse YouTube OAuth credentials).",
    }
  }
  if (!isTokenEncryptionConfigured()) {
    return {
      success: false,
      message: "Add CREATOROPS_TOKEN_ENCRYPTION_KEY to .env.local before connecting Google Drive.",
    }
  }
  return { success: true, message: "Auth URL ready.", url: "/api/drive/oauth/start" }
}

export async function disconnectDrive(): Promise<{ success: boolean; message: string }> {
  try {
    await prisma.driveConnection.deleteMany({ where: { id: DRIVE_CONNECTION_ID } })
    revalidateDriveRoutes()
    return { success: true, message: "Google Drive disconnected." }
  } catch (error) {
    return { success: false, message: friendlyDriveError(error) }
  }
}

export async function refreshDriveTokenIfNeeded(): Promise<{ success: boolean; message: string }> {
  const result = await tryGetDriveAccessToken()
  if (result.ok) return { success: true, message: "Google Drive token is valid." }
  return { success: false, message: result.message || "Could not refresh Google Drive token." }
}

export async function validateDriveFolderUrl(input: string): Promise<{
  success: boolean
  message: string
  folderId?: string
  preview?: { folder: DriveFolderRecord; fileCount: number }
}> {
  try {
    const folderId = parseDriveFolderIdInput(input)
    if (!folderId) {
      return {
        success: false,
        message: "Enter a valid Google Drive folder URL or folder ID.",
      }
    }

    const accessToken = await requireDriveAccessToken()
    const { folder, files } = await previewDriveFolder(accessToken, folderId)
    const record = apiFolderToDriveFolderRecord(folder)
    return {
      success: true,
      message: `Found folder "${folder.name}" with ${files.length} file(s).`,
      folderId,
      preview: { folder: record, fileCount: files.length },
    }
  } catch (error) {
    return { success: false, message: friendlyDriveError(error) }
  }
}

export interface SyncDriveFolderInput {
  folderUrlOrId: string
  campaignId?: string
  artistName?: string
  songTitle?: string
  productName?: string
}

async function resolveCampaignFields(campaignId?: string) {
  if (!campaignId?.trim()) {
    return {
      campaignId: "",
      campaignName: "",
      artistName: "",
      songTitle: "",
      productName: "",
    }
  }
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId.trim() } })
  if (!campaign) {
    return {
      campaignId: campaignId.trim(),
      campaignName: "",
      artistName: "",
      songTitle: "",
      productName: "",
    }
  }
  return {
    campaignId: campaign.id,
    campaignName: campaign.campaignName,
    artistName: campaign.artistName,
    songTitle: campaign.songTitle,
    productName: campaign.productName,
  }
}

async function upsertDriveFolderRecord(record: DriveFolderRecord): Promise<DriveFolderRecord> {
  const existing = await prisma.driveFolder.findUnique({
    where: { driveFolderId: record.driveFolderId },
  })
  if (existing) {
    const row = await prisma.driveFolder.update({
      where: { id: existing.id },
      data: driveFolderToPrismaUpdate({ ...record, id: existing.id }),
    })
    return prismaDriveFolderToRecord(row)
  }
  const row = await prisma.driveFolder.create({ data: driveFolderToPrismaCreate(record) })
  return prismaDriveFolderToRecord(row)
}

async function upsertDriveFileRecord(record: DriveFileRecord): Promise<DriveFileRecord> {
  const existing = await prisma.driveFile.findUnique({
    where: { driveFileId: record.driveFileId },
  })
  if (existing) {
    const row = await prisma.driveFile.update({
      where: { id: existing.id },
      data: driveFileToPrismaUpdate({
        ...record,
        id: existing.id,
        notes: record.notes || existing.notes,
        tags: record.tags.length ? record.tags : prismaDriveFileToRecord(existing).tags,
        assetId: record.assetId || existing.assetId,
      }),
    })
    return prismaDriveFileToRecord(row)
  }
  const row = await prisma.driveFile.create({ data: driveFileToPrismaCreate(record) })
  return prismaDriveFileToRecord(row)
}

async function findExternalLinkForUrl(url: string): Promise<ExternalLinkRecord | null> {
  const links = await getExternalLinks()
  const normalized = url.trim().toLowerCase()
  return links.find((link) => link.url.trim().toLowerCase() === normalized) ?? null
}

async function createOrUpdateFolderExternalLink(
  folder: DriveFolderRecord,
): Promise<string | undefined> {
  const existing = folder.externalLinkId
    ? (await getExternalLinks()).find((link) => link.id === folder.externalLinkId)
    : await findExternalLinkForUrl(folder.url)

  if (existing) {
    const updated = await updateExternalLink(
      normalizeExternalLinkRecord({
        ...existing,
        name: folder.name,
        url: folder.url,
        campaignId: folder.campaignId,
        campaignName: folder.campaignName,
        artistName: folder.artistName,
        songTitle: folder.songTitle,
        sourceRecordType: "DriveFolder",
        sourceRecordId: folder.id,
        updatedAt: Date.now(),
      }),
    )
    return updated.id
  }

  const created = await createExternalLink({
    name: folder.name,
    platform: "Google Drive",
    linkType: "Google Drive Folder",
    url: folder.url,
    status: "Active",
    campaignId: folder.campaignId,
    campaignName: folder.campaignName,
    artistName: folder.artistName,
    songTitle: folder.songTitle,
    sourceRecordType: "DriveFolder",
    sourceRecordId: folder.id,
    notes: "",
    tags: ["google-drive"],
  })
  return created.id
}

export async function syncDriveFolder(input: SyncDriveFolderInput): Promise<{
  success: boolean
  message: string
  folder?: DriveFolderRecord
  syncedFiles?: number
}> {
  try {
    const folderId = parseDriveFolderIdInput(input.folderUrlOrId)
    if (!folderId) {
      return { success: false, message: "Invalid Google Drive folder URL or ID." }
    }

    const accessToken = await requireDriveAccessToken()
    const campaignFields = await resolveCampaignFields(input.campaignId)
    const metadata = await fetchDriveFolderMetadata(accessToken, folderId)
    const apiFiles = await listDriveFolderFiles(accessToken, folderId)

    const existingFolder = await prisma.driveFolder.findUnique({
      where: { driveFolderId: folderId },
    })

    let folderRecord = apiFolderToDriveFolderRecord(
      metadata,
      existingFolder ? prismaDriveFolderToRecord(existingFolder) : undefined,
      {
        ...campaignFields,
        artistName: input.artistName?.trim() || campaignFields.artistName,
        songTitle: input.songTitle?.trim() || campaignFields.songTitle,
        productName: input.productName?.trim() || campaignFields.productName,
      },
    )

    const savedFolder = await upsertDriveFolderRecord(folderRecord)
    const externalLinkId = await createOrUpdateFolderExternalLink(savedFolder)
    if (externalLinkId && externalLinkId !== savedFolder.externalLinkId) {
      folderRecord = await upsertDriveFolderRecord({
        ...savedFolder,
        externalLinkId,
        updatedAt: Date.now(),
      })
    } else {
      folderRecord = savedFolder
    }

    let synced = 0
    for (const apiFile of apiFiles) {
      const existingFile = await prisma.driveFile.findUnique({
        where: { driveFileId: apiFile.id },
      })
      const fileRecord = apiFileToDriveFileRecord(
        apiFile,
        folderRecord,
        existingFile ? prismaDriveFileToRecord(existingFile) : undefined,
      )
      await upsertDriveFileRecord(fileRecord)
      synced += 1
    }

    const connection = await getConnectionRow()
    if (connection) {
      await prisma.driveConnection.update({
        where: { id: connection.id },
        data: { lastSyncedAt: new Date(), updatedAt: new Date() },
      })
    }

    await prisma.driveFolder.update({
      where: { id: folderRecord.id },
      data: { lastSyncedAt: new Date(), updatedAt: new Date() },
    })

    revalidateDriveRoutes()
    return {
      success: true,
      message: `Synced ${synced} file(s) from "${folderRecord.name}".`,
      folder: folderRecord,
      syncedFiles: synced,
    }
  } catch (error) {
    return { success: false, message: friendlyDriveError(error) }
  }
}

export async function getDriveFolders(): Promise<DriveFolderRecord[]> {
  const rows = await prisma.driveFolder.findMany({ orderBy: { updatedAt: "desc" } })
  return rows.map(prismaDriveFolderToRecord)
}

export async function getDriveFolderById(id: string): Promise<DriveFolderRecord | null> {
  const trimmed = id.trim()
  const byId = await prisma.driveFolder.findUnique({ where: { id: trimmed } })
  if (byId) return prismaDriveFolderToRecord(byId)
  const byDriveId = await prisma.driveFolder.findUnique({ where: { driveFolderId: trimmed } })
  return byDriveId ? prismaDriveFolderToRecord(byDriveId) : null
}

export async function getDriveFiles(): Promise<DriveFileRecord[]> {
  const rows = await prisma.driveFile.findMany({ orderBy: { updatedAt: "desc" } })
  return rows.map(prismaDriveFileToRecord)
}

export async function getDriveFoldersForCampaign(
  campaignId: string,
): Promise<DriveFolderRecord[]> {
  const folders = await getDriveFolders()
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
  return filterDriveFoldersForCampaign(folders, campaignId, campaign?.campaignName)
}

export async function getDriveFilesForCampaign(campaignId: string): Promise<DriveFileRecord[]> {
  const files = await getDriveFiles()
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
  return filterDriveFilesForCampaign(files, campaignId, campaign?.campaignName)
}

export async function getDriveFilesForAsset(assetId: string): Promise<DriveFileRecord[]> {
  const files = await getDriveFiles()
  return files.filter((file) => file.assetId === assetId)
}

async function findAssetForDriveFile(file: DriveFileRecord, assets: AssetRecord[]): Promise<AssetRecord | null> {
  if (file.assetId) {
    return assets.find((asset) => asset.id === file.assetId) ?? null
  }
  const url = (file.webViewLink || file.url).trim().toLowerCase()
  if (!url) return null
  return (
    assets.find(
      (asset) =>
        asset.externalUrl.trim().toLowerCase() === url ||
        asset.fileUrl.trim().toLowerCase() === url,
    ) ?? null
  )
}

export async function createAssetFromDriveFile(fileId: string): Promise<{
  success: boolean
  message: string
  asset?: AssetRecord
  file?: DriveFileRecord
}> {
  try {
    const row = await prisma.driveFile.findFirst({
      where: { OR: [{ id: fileId }, { driveFileId: fileId }] },
    })
    if (!row) return { success: false, message: "Drive file not found locally." }

    const file = prismaDriveFileToRecord(row)
    if (file.assetId) {
      const existing = await getAssets()
      const asset = existing.find((item) => item.id === file.assetId)
      if (asset) {
        return {
          success: true,
          message: "Asset already linked to this Drive file.",
          asset,
          file,
        }
      }
    }

    const assets = await getAssets()
    const matched = await findAssetForDriveFile(file, assets)
    const assetRecord = driveFileToAssetRecord(file, matched)
    const saved = matched ? await upsertAsset(assetRecord) : await createAsset(assetRecord)

    const updatedFile = await upsertDriveFileRecord({
      ...file,
      assetId: saved.id,
      updatedAt: Date.now(),
    })

    revalidateDriveRoutes()
    return {
      success: true,
      message: matched ? "Linked existing asset to Drive file." : "Asset created from Drive file.",
      asset: saved,
      file: updatedFile,
    }
  } catch (error) {
    return { success: false, message: friendlyDriveError(error) }
  }
}

export async function linkDriveFileToAsset(
  fileId: string,
  assetId: string,
): Promise<{ success: boolean; message: string; file?: DriveFileRecord }> {
  try {
    const row = await prisma.driveFile.findFirst({
      where: { OR: [{ id: fileId }, { driveFileId: fileId }] },
    })
    if (!row) return { success: false, message: "Drive file not found locally." }

    const asset = await prisma.asset.findUnique({ where: { id: assetId.trim() } })
    if (!asset) return { success: false, message: "Asset not found." }

    const file = prismaDriveFileToRecord(row)
    const saved = await upsertDriveFileRecord({
      ...file,
      assetId: asset.id,
      updatedAt: Date.now(),
    })

    revalidateDriveRoutes()
    return { success: true, message: `Linked "${file.name}" to asset.`, file: saved }
  } catch (error) {
    return { success: false, message: friendlyDriveError(error) }
  }
}

export async function linkDriveFolderToCampaign(
  folderId: string,
  campaignId: string,
): Promise<{ success: boolean; message: string; folder?: DriveFolderRecord }> {
  try {
    const folder = await getDriveFolderById(folderId)
    if (!folder) return { success: false, message: "Drive folder not found locally." }

    const campaignFields = await resolveCampaignFields(campaignId)
    const saved = await upsertDriveFolderRecord({
      ...folder,
      ...campaignFields,
      updatedAt: Date.now(),
    })

    const files = await prisma.driveFile.findMany({
      where: { OR: [{ folderId: saved.id }, { driveFolderId: saved.driveFolderId }] },
    })
    for (const fileRow of files) {
      const file = prismaDriveFileToRecord(fileRow)
      await upsertDriveFileRecord({
        ...file,
        ...campaignFields,
        updatedAt: Date.now(),
      })
    }

    revalidateDriveRoutes()
    return {
      success: true,
      message: `Linked folder "${saved.name}" to ${campaignFields.campaignName || "campaign"}.`,
      folder: saved,
    }
  } catch (error) {
    return { success: false, message: friendlyDriveError(error) }
  }
}

export async function getDriveSummary() {
  const [folders, files] = await Promise.all([getDriveFolders(), getDriveFiles()])
  return buildDriveSummary(folders, files)
}

export async function importDriveFolderRecords(records: DriveFolderRecord[]): Promise<number> {
  let count = 0
  for (const record of records) {
    await upsertDriveFolderRecord(record)
    count += 1
  }
  revalidateDriveRoutes()
  return count
}

export async function importDriveFileRecords(records: DriveFileRecord[]): Promise<number> {
  let count = 0
  for (const record of records) {
    await upsertDriveFileRecord(record)
    count += 1
  }
  revalidateDriveRoutes()
  return count
}

export { driveConnectionToBackupMetadata }
