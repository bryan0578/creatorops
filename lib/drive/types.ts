/**
 * Google Drive API — shared types and constants.
 */

export const DRIVE_CONNECTION_ID = "creatorops-drive-connection"

export const DRIVE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/drive.metadata.readonly",
] as const

export const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3"
export const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
export const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"
export const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

export const DRIVE_OAUTH_STATE_COOKIE = "creatorops_drive_oauth_state"

export interface DriveOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  credentialSource: "drive" | "youtube-fallback"
}

export interface DriveTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope?: string
  token_type?: string
}

export interface DriveApiFile {
  id: string
  name: string
  mimeType: string
  webViewLink?: string
  thumbnailLink?: string
  iconLink?: string
  size?: string
  modifiedTime?: string
  parents?: string[]
}

export interface DriveApiFolder {
  id: string
  name: string
  webViewLink?: string
  mimeType: string
}

export class DriveApiError extends Error {
  readonly code: string
  readonly status?: number

  constructor(message: string, code: string, status?: number) {
    super(message)
    this.name = "DriveApiError"
    this.code = code
    this.status = status
  }
}

export function driveFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`
}

export function driveFileUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`
}
