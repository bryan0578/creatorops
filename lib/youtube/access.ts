import { prisma } from "@/lib/prisma"
import { encryptToken } from "@/lib/youtube/token-crypto"
import { refreshYouTubeAccessToken } from "@/lib/youtube/oauth"
import { readAccessToken, readRefreshToken } from "@/lib/youtube/token-store"
import { YOUTUBE_CONNECTION_ID, YouTubeApiError } from "@/lib/youtube/types"

export interface YouTubeClientAuth {
  accessToken?: string | null
  apiKey?: string | null
}

export type YouTubeAccessTokenResult =
  | { ok: true; accessToken: string }
  | {
      ok: false
      code: "not_connected" | "expired" | "oauth_refresh_failed"
    }

const OAUTH_ACTIVE_STATUSES = new Set([
  "Connected",
  "ConnectedNeedsChannel",
  "ConnectedNeedsReconnect",
  "ChannelIdSaved",
])

export function isYouTubeApiKeyConfigured(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY?.trim())
}

export function getYouTubeApiKey(): string | null {
  return process.env.YOUTUBE_API_KEY?.trim() || null
}

/** Non-throwing OAuth access token resolution (refresh if needed). */
export async function tryGetYouTubeAccessToken(): Promise<YouTubeAccessTokenResult> {
  const row = await prisma.youTubeConnection.findUnique({
    where: { id: YOUTUBE_CONNECTION_ID },
  })

  if (!row || !OAUTH_ACTIVE_STATUSES.has(row.status)) {
    return { ok: false, code: "not_connected" }
  }

  const expiry = row.expiryDate?.getTime() ?? 0
  const accessToken = readAccessToken(row)
  if (accessToken && expiry > Date.now() + 60_000) {
    return { ok: true, accessToken }
  }

  const refreshToken = readRefreshToken(row)
  if (!refreshToken) {
    return { ok: false, code: "expired" }
  }

  try {
    const tokenResponse = await refreshYouTubeAccessToken(refreshToken)
    if (!tokenResponse.access_token) {
      return { ok: false, code: "oauth_refresh_failed" }
    }

    const expiryDate =
      tokenResponse.expires_in && tokenResponse.expires_in > 0
        ? new Date(Date.now() + tokenResponse.expires_in * 1000)
        : row.expiryDate

    await prisma.youTubeConnection.update({
      where: { id: row.id },
      data: {
        accessTokenEncrypted: encryptToken(tokenResponse.access_token),
        refreshTokenEncrypted: tokenResponse.refresh_token
          ? encryptToken(tokenResponse.refresh_token)
          : row.refreshTokenEncrypted,
        tokenType: tokenResponse.token_type ?? row.tokenType,
        expiryDate,
        updatedAt: new Date(),
      },
    })

    return { ok: true, accessToken: tokenResponse.access_token }
  } catch {
    return { ok: false, code: "oauth_refresh_failed" }
  }
}

export type YouTubePublicAuthResult = {
  auth: YouTubeClientAuth
  oauthAvailable: boolean
  usingApiKeyFallback: boolean
}

export function logYouTubeFetchVideosDebug(details: {
  hasChannelId: boolean
  status: string | null
  hasYouTubeApiKey: boolean
  oauthAvailable: boolean
  usingApiKeyFallback: boolean
}): void {
  if (process.env.NODE_ENV !== "development") return
  console.info("[YouTube Fetch Videos]", details)
}

/**
 * Auth for public channel/video reads: OAuth when valid, else API key only.
 * Never mixes Bearer token + API key on the same request.
 */
export async function resolveYouTubePublicAuth(): Promise<YouTubePublicAuthResult> {
  const apiKey = getYouTubeApiKey()
  const tokenResult = await tryGetYouTubeAccessToken()

  if (tokenResult.ok) {
    return {
      auth: { accessToken: tokenResult.accessToken, apiKey: null },
      oauthAvailable: true,
      usingApiKeyFallback: false,
    }
  }

  if (apiKey) {
    return {
      auth: { accessToken: null, apiKey },
      oauthAvailable: false,
      usingApiKeyFallback: true,
    }
  }

  throw new YouTubeApiError(
    "YouTube OAuth is expired and no YOUTUBE_API_KEY is configured. Reconnect YouTube or add YOUTUBE_API_KEY.",
    "oauth_and_api_key_missing",
  )
}

/**
 * Resolve auth for YouTube API calls: OAuth first, optional API-key-only mode.
 */
export async function resolveYouTubeClientAuth(options?: {
  allowApiKeyOnly?: boolean
}): Promise<YouTubeClientAuth> {
  if (options?.allowApiKeyOnly) {
    return (await resolveYouTubePublicAuth()).auth
  }

  const tokenResult = await tryGetYouTubeAccessToken()
  if (tokenResult.ok) {
    return { accessToken: tokenResult.accessToken, apiKey: null }
  }

  if (tokenResult.code === "expired") {
    throw new YouTubeApiError(
      "YouTube connection expired. Reconnect your channel.",
      "expired",
    )
  }
  if (tokenResult.code === "oauth_refresh_failed") {
    throw new YouTubeApiError(
      "YouTube OAuth refresh failed. Reconnect your channel.",
      "oauth_refresh_failed",
    )
  }
  throw new YouTubeApiError("YouTube is not connected.", "not_connected")
}
