import type { DriveFileRecord, DriveFolderRecord } from "@/lib/types"

export const DRIVE_STATS_STALE_MS = 7 * 24 * 60 * 60 * 1000

export interface DriveSummary {
  folderCount: number
  fileCount: number
  linkedAssets: number
  unlinkedFiles: number
  staleFolders: number
  campaignsWithFolders: number
}

export function buildDriveSummary(
  folders: DriveFolderRecord[],
  files: DriveFileRecord[],
): DriveSummary {
  const now = Date.now()
  const campaignIds = new Set(folders.map((f) => f.campaignId).filter(Boolean))
  return {
    folderCount: folders.length,
    fileCount: files.length,
    linkedAssets: files.filter((file) => Boolean(file.assetId?.trim())).length,
    unlinkedFiles: files.filter((file) => !file.assetId?.trim() && file.status !== "Ignored").length,
    staleFolders: folders.filter(
      (folder) => !folder.lastSyncedAt || now - folder.lastSyncedAt > DRIVE_STATS_STALE_MS,
    ).length,
    campaignsWithFolders: campaignIds.size,
  }
}

export function isDriveFolderStale(folder: DriveFolderRecord, now = Date.now()): boolean {
  if (!folder.lastSyncedAt) return true
  return now - folder.lastSyncedAt > DRIVE_STATS_STALE_MS
}
