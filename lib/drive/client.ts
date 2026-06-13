import {
  DRIVE_API_BASE,
  DriveApiError,
  GOOGLE_USERINFO_URL,
  type DriveApiFile,
  type DriveApiFolder,
} from "@/lib/drive/types"

import { isDriveJunkFile } from "@/lib/drive/junk-files"

const FOLDER_MIME = "application/vnd.google-apps.folder"

export function parseDriveFolderIdInput(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (folderMatch?.[1]) return folderMatch[1]

  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed

  return null
}

async function driveFetch<T>(
  accessToken: string,
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${DRIVE_API_BASE}${path}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })

  const data = (await response.json()) as T & { error?: { message?: string; code?: number } }

  if (!response.ok) {
    const message = data.error?.message || `Drive API error (${response.status})`
    if (response.status === 404) {
      throw new DriveApiError(message, "folder_not_found", response.status)
    }
    if (response.status === 403) {
      throw new DriveApiError(message, "permission_denied", response.status)
    }
    if (response.status === 429) {
      throw new DriveApiError(message, "rate_limit", response.status)
    }
    throw new DriveApiError(message, "drive_api_error", response.status)
  }

  return data
}

export async function fetchDriveUserProfile(accessToken: string): Promise<{
  email: string
  name: string
}> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  if (!response.ok) {
    return { email: "", name: "" }
  }
  const profile = (await response.json()) as { email?: string; name?: string }
  return { email: profile.email ?? "", name: profile.name ?? "" }
}

export async function fetchDriveFolderMetadata(
  accessToken: string,
  folderId: string,
): Promise<DriveApiFolder> {
  const data = await driveFetch<DriveApiFile>(accessToken, `/files/${encodeURIComponent(folderId)}`, {
    fields: "id,name,mimeType,webViewLink",
    supportsAllDrives: "true",
  })

  if (data.mimeType !== FOLDER_MIME) {
    throw new DriveApiError("The provided ID is not a Google Drive folder.", "not_a_folder")
  }

  return {
    id: data.id,
    name: data.name,
    webViewLink: data.webViewLink,
    mimeType: data.mimeType,
  }
}

export async function listDriveFolderFiles(
  accessToken: string,
  folderId: string,
): Promise<DriveApiFile[]> {
  const files: DriveApiFile[] = []
  let pageToken: string | undefined

  do {
    const data = await driveFetch<{
      files?: DriveApiFile[]
      nextPageToken?: string
    }>(accessToken, "/files", {
      q: `'${folderId}' in parents and trashed=false`,
      fields:
        "nextPageToken,files(id,name,mimeType,webViewLink,thumbnailLink,iconLink,size,modifiedTime,parents)",
      pageSize: "100",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      pageToken: pageToken ?? "",
    })

    if (data.files?.length) {
      files.push(...data.files)
    }
    pageToken = data.nextPageToken
  } while (pageToken)

  return files
}

export type DriveTreeFolder = {
  folder: DriveApiFolder
  drivePath: string
  parentDriveFolderId: string
}

export type DriveTreeFile = DriveApiFile & {
  drivePath: string
  immediateParentDriveFolderId: string
}

export { FOLDER_MIME }

export async function listDriveFolderTreeRecursive(
  accessToken: string,
  rootFolderId: string,
): Promise<{ rootFolder: DriveApiFolder; folders: DriveTreeFolder[]; files: DriveTreeFile[] }> {
  const rootFolder = await fetchDriveFolderMetadata(accessToken, rootFolderId)
  const folders: DriveTreeFolder[] = []
  const files: DriveTreeFile[] = []

  async function walk(folderId: string, pathPrefix: string) {
    const items = await listDriveFolderFiles(accessToken, folderId)
    for (const item of items) {
      if (item.mimeType === FOLDER_MIME) {
        const childPath = pathPrefix ? `${pathPrefix}/${item.name}` : item.name
        folders.push({
          folder: {
            id: item.id,
            name: item.name,
            webViewLink: item.webViewLink,
            mimeType: item.mimeType,
          },
          drivePath: childPath,
          parentDriveFolderId: folderId,
        })
        await walk(item.id, childPath)
      } else {
        if (isDriveJunkFile(item.name)) continue
        const filePath = pathPrefix ? `${pathPrefix}/${item.name}` : item.name
        files.push({
          ...item,
          drivePath: filePath,
          immediateParentDriveFolderId: folderId,
        })
      }
    }
  }

  await walk(rootFolderId, rootFolder.name)
  return { rootFolder, folders, files }
}

export async function previewDriveFolder(
  accessToken: string,
  folderId: string,
): Promise<{ folder: DriveApiFolder; files: DriveApiFile[]; fileCount: number }> {
  const { rootFolder, files } = await listDriveFolderTreeRecursive(accessToken, folderId)
  return { folder: rootFolder, files, fileCount: files.length }
}
