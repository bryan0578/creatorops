import { parseJsonStringArray } from "@/lib/safe-json"
import {
  decryptToken,
  encryptToken,
  isTokenEncryptionConfigured,
} from "@/lib/youtube/token-crypto"
import { isDriveOAuthConfigured, getDriveOAuthConfig } from "@/lib/drive/oauth"
import {
  DRIVE_CONNECTION_ID,
  DRIVE_OAUTH_SCOPES,
} from "@/lib/drive/types"
import type {
  DriveConnectionRecord,
  DriveConnectionStatusSummary,
} from "@/lib/types"
import type { DriveConnection as PrismaDriveConnection } from "@/lib/generated/prisma/client"

export function prismaDriveConnectionToPublicRecord(
  row: PrismaDriveConnection | null,
): DriveConnectionRecord | null {
  if (!row) return null
  const config = getDriveOAuthConfig()
  return {
    id: row.id,
    accountEmail: row.accountEmail,
    displayName: row.displayName,
    scopes: parseJsonStringArray(row.scopes, []),
    status: row.status,
    lastSyncedAt: row.lastSyncedAt?.getTime() ?? null,
    notes: row.notes,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    hasRefreshToken: Boolean(row.refreshTokenEncrypted),
    tokenExpiry: row.expiryDate?.getTime() ?? null,
    envConfigured: isDriveOAuthConfigured(),
    encryptionConfigured: isTokenEncryptionConfigured(),
    credentialSource: config?.credentialSource ?? "drive",
  }
}

export function buildDriveConnectionStatusSummary(
  row: PrismaDriveConnection | null,
): DriveConnectionStatusSummary {
  const driveClientId = Boolean(process.env.GOOGLE_DRIVE_CLIENT_ID?.trim())
  const driveClientSecret = Boolean(process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim())
  const youtubeClientId = Boolean(process.env.YOUTUBE_CLIENT_ID?.trim())
  const youtubeClientSecret = Boolean(process.env.YOUTUBE_CLIENT_SECRET?.trim())
  const config = getDriveOAuthConfig()
  const configured = isDriveOAuthConfigured()
  const encryptionConfigured = isTokenEncryptionConfigured()
  const connection = prismaDriveConnectionToPublicRecord(row)
  const connectionStatus = connection?.status ?? "Disconnected"
  const oauthConnected = connectionStatus === "Connected" || connectionStatus === "Expired"

  const redirectUri =
    process.env.GOOGLE_DRIVE_REDIRECT_URI?.trim() ||
    "http://localhost:3000/api/drive/oauth/callback"

  let message: string | undefined
  if (!configured) {
    message =
      "Add GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET to .env.local (or reuse YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET), then restart the dev server."
  } else if (!encryptionConfigured) {
    message =
      "Add CREATOROPS_TOKEN_ENCRYPTION_KEY to .env.local to persist Google Drive OAuth tokens securely."
  } else if (connectionStatus === "Expired") {
    message = "Google Drive connection expired. Reconnect your account."
  } else if (connectionStatus === "ReconnectRequired") {
    message = "Google Drive was restored from backup. Reconnect to resume sync."
  } else if (config?.credentialSource === "youtube-fallback") {
    message =
      "Using YouTube OAuth credentials for Google Drive. Add dedicated GOOGLE_DRIVE_CLIENT_ID / GOOGLE_DRIVE_CLIENT_SECRET for clearer separation."
  }

  return {
    configured,
    encryptionConfigured,
    connected: connectionStatus === "Connected",
    oauthConnected,
    connection,
    clientIdConfigured: driveClientId || youtubeClientId,
    clientSecretConfigured: driveClientSecret || youtubeClientSecret,
    redirectUri,
    credentialSource: config?.credentialSource ?? null,
    usingYoutubeFallback: config?.credentialSource === "youtube-fallback",
    message,
  }
}

export function storeDriveTokens(input: {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  tokenType?: string
  scopes?: string[]
}) {
  if (!isTokenEncryptionConfigured()) {
    throw new Error(
      "CREATOROPS_TOKEN_ENCRYPTION_KEY is required to store Google Drive OAuth tokens.",
    )
  }

  const expiryDate =
    input.expiresIn && input.expiresIn > 0
      ? new Date(Date.now() + input.expiresIn * 1000)
      : null

  return {
    accessTokenEncrypted: encryptToken(input.accessToken),
    refreshTokenEncrypted: input.refreshToken ? encryptToken(input.refreshToken) : null,
    tokenType: input.tokenType ?? "Bearer",
    expiryDate,
    scopes: JSON.stringify(input.scopes ?? [...DRIVE_OAUTH_SCOPES]),
    status: "Connected",
  }
}

export function readDriveAccessToken(encrypted: string | null | undefined): string | null {
  if (!encrypted?.trim()) return null
  try {
    return decryptToken(encrypted)
  } catch {
    return null
  }
}

export function readDriveRefreshToken(encrypted: string | null | undefined): string | null {
  if (!encrypted?.trim()) return null
  try {
    return decryptToken(encrypted)
  } catch {
    return null
  }
}

export function emptyDriveConnectionCreate(now = new Date()) {
  return {
    id: DRIVE_CONNECTION_ID,
    accountEmail: "",
    displayName: "",
    scopes: JSON.stringify([...DRIVE_OAUTH_SCOPES]),
    accessTokenEncrypted: null,
    refreshTokenEncrypted: null,
    tokenType: "",
    expiryDate: null,
    status: "Disconnected",
    lastSyncedAt: null,
    notes: "",
    createdAt: now,
    updatedAt: now,
  }
}

export function driveConnectionToBackupMetadata(row: PrismaDriveConnection) {
  return {
    id: row.id,
    accountEmail: row.accountEmail,
    displayName: row.displayName,
    scopes: parseJsonStringArray(row.scopes, []),
    status: row.status === "Connected" ? "Connected previously" : row.status,
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
    notes: row.notes,
    tokensExported: false,
  }
}
