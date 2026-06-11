import { parseJsonStringArray } from "@/lib/safe-json"
import {
  decryptToken,
  encryptToken,
  isTokenEncryptionConfigured,
} from "@/lib/youtube/token-crypto"
import {
  YOUTUBE_CONNECTION_ID,
  YOUTUBE_OAUTH_SCOPES,
} from "@/lib/youtube/types"
import { isYouTubeOAuthConfigured } from "@/lib/youtube/oauth"
import { isYouTubeApiKeyConfigured } from "@/lib/youtube/access"
import type {
  YouTubeConnectionRecord,
  YouTubeConnectionStatusSummary,
} from "@/lib/types"
import type { YouTubeConnection as PrismaYouTubeConnection } from "@/lib/generated/prisma/client"

export function prismaYouTubeConnectionToPublicRecord(
  row: PrismaYouTubeConnection | null,
): YouTubeConnectionRecord | null {
  if (!row) return null
  const configured = isYouTubeOAuthConfigured()
  const encryptionConfigured = isTokenEncryptionConfigured()
  return {
    id: row.id,
    accountEmail: row.accountEmail,
    channelId: row.channelId,
    channelTitle: row.channelTitle,
    channelHandle: row.channelHandle,
    channelUrl: row.channelUrl,
    thumbnailUrl: row.thumbnailUrl,
    scopes: parseJsonStringArray(row.scopes, []),
    status: row.status,
    lastSyncedAt: row.lastSyncedAt?.getTime() ?? null,
    notes: row.notes,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    hasRefreshToken: Boolean(row.refreshTokenEncrypted),
    tokenExpiry: row.expiryDate?.getTime() ?? null,
    envConfigured: configured,
    encryptionConfigured,
  }
}

export function buildYouTubeConnectionStatusSummary(
  row: PrismaYouTubeConnection | null,
): YouTubeConnectionStatusSummary {
  const clientIdConfigured = Boolean(process.env.YOUTUBE_CLIENT_ID?.trim())
  const clientSecretConfigured = Boolean(process.env.YOUTUBE_CLIENT_SECRET?.trim())
  const redirectUri =
    process.env.YOUTUBE_REDIRECT_URI?.trim() ||
    "http://localhost:3000/api/youtube/oauth/callback"
  const configured = clientIdConfigured && clientSecretConfigured
  const encryptionConfigured = isTokenEncryptionConfigured()
  const connection = prismaYouTubeConnectionToPublicRecord(row)
  const connectionStatus = connection?.status ?? "Disconnected"
  const oauthConnected = new Set([
    "Connected",
    "ConnectedNeedsChannel",
    "ConnectedNeedsReconnect",
    "ChannelIdSaved",
  ]).has(connectionStatus)
  const needsChannelSelection = connectionStatus === "ConnectedNeedsChannel"
  const needsOAuthReconnect =
    connectionStatus === "ConnectedNeedsReconnect" ||
    connectionStatus === "ChannelIdSaved"
  const apiKeyConfigured = isYouTubeApiKeyConfigured()

  let message: string | undefined
  if (!configured) {
    message =
      "Add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET to .env.local, then restart the dev server."
  } else if (!encryptionConfigured) {
    message =
      "Add CREATOROPS_TOKEN_ENCRYPTION_KEY to .env.local to persist YouTube OAuth tokens securely."
  } else if (connectionStatus === "Expired") {
    message = "YouTube connection expired. Reconnect your channel."
  } else if (needsChannelSelection) {
    message =
      "Google OAuth succeeded, but no YouTube channel was returned. Enter your channel ID manually or reconnect and select the correct Brand Account."
  } else if (connectionStatus === "ChannelIdSaved") {
    message =
      "Channel ID saved without validation. Add YOUTUBE_API_KEY or reconnect YouTube to validate."
  } else if (connectionStatus === "ConnectedNeedsReconnect") {
    message =
      "Channel metadata saved. Reconnect YouTube for account-specific sync operations."
  }

  return {
    configured,
    encryptionConfigured,
    connected:
      connectionStatus === "Connected" ||
      (Boolean(connection?.channelId?.trim()) && Boolean(connection?.channelTitle?.trim())),
    oauthConnected,
    needsChannelSelection,
    needsOAuthReconnect,
    apiKeyConfigured,
    connection,
    clientIdConfigured,
    clientSecretConfigured,
    redirectUri,
    message,
  }
}

export function storeTokens(
  input: {
    accessToken: string
    refreshToken?: string
    expiresIn?: number
    tokenType?: string
    scopes?: string[]
  },
  options?: { connectionStatus?: string },
) {
  if (!isTokenEncryptionConfigured()) {
    throw new Error(
      "CREATOROPS_TOKEN_ENCRYPTION_KEY is required to store YouTube OAuth tokens.",
    )
  }

  const expiryDate =
    input.expiresIn && input.expiresIn > 0
      ? new Date(Date.now() + input.expiresIn * 1000)
      : null

  return {
    accessTokenEncrypted: encryptToken(input.accessToken),
    refreshTokenEncrypted: input.refreshToken
      ? encryptToken(input.refreshToken)
      : null,
    tokenType: input.tokenType ?? "Bearer",
    expiryDate,
    scopes: JSON.stringify(input.scopes ?? [...YOUTUBE_OAUTH_SCOPES]),
    status: options?.connectionStatus ?? "Connected",
  }
}

export function readAccessToken(row: PrismaYouTubeConnection): string | null {
  if (!row.accessTokenEncrypted) return null
  try {
    return decryptToken(row.accessTokenEncrypted)
  } catch {
    return null
  }
}

export function readRefreshToken(row: PrismaYouTubeConnection): string | null {
  if (!row.refreshTokenEncrypted) return null
  try {
    return decryptToken(row.refreshTokenEncrypted)
  } catch {
    return null
  }
}

export function emptyYouTubeConnectionCreate(now = new Date()) {
  return {
    id: YOUTUBE_CONNECTION_ID,
    accountEmail: "",
    channelId: "",
    channelTitle: "",
    channelHandle: "",
    channelUrl: "",
    thumbnailUrl: "",
    scopes: JSON.stringify([...YOUTUBE_OAUTH_SCOPES]),
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

/** Safe metadata for backup export — no encrypted tokens. */
export function youtubeConnectionToBackupMetadata(row: PrismaYouTubeConnection) {
  return {
    id: row.id,
    accountEmail: row.accountEmail,
    channelId: row.channelId,
    channelTitle: row.channelTitle,
    channelHandle: row.channelHandle,
    channelUrl: row.channelUrl,
    thumbnailUrl: row.thumbnailUrl,
    scopes: parseJsonStringArray(row.scopes, []),
    status: row.status === "Connected" ? "Connected previously" : row.status,
    lastSyncedAt: row.lastSyncedAt?.getTime() ?? null,
    notes: row.notes,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    tokensExported: false,
  }
}
