import {
  fetchYouTubeChannelById,
  fetchYouTubeChannelByIdWithApiKey,
  type YouTubeChannelLookupCode,
  type YouTubeChannelLookupResult,
} from "@/lib/youtube/client"
import { getYouTubeApiKey, isYouTubeApiKeyConfigured } from "@/lib/youtube/access"
import { YouTubeApiError } from "@/lib/youtube/types"

export type { YouTubeChannelLookupCode, YouTubeChannelLookupResult }

export function logManualChannelSaveDebug(details: {
  hasInput: boolean
  normalizedChannelId: string | null
  startsWithUC: boolean
  hasYouTubeApiKey: boolean
  hasOAuthConnection: boolean
  connectionStatus: string | null
  hasAccessTokenEncrypted: boolean
  hasRefreshTokenEncrypted: boolean
}): void {
  if (process.env.NODE_ENV !== "development") return
  console.info("[YouTube Manual Channel] input", details)
}

function mapOAuthError(error: unknown): YouTubeChannelLookupCode {
  if (!(error instanceof YouTubeApiError)) return "youtube_api_error"
  if (error.code === "channel_not_found") return "channel_not_found"
  if (error.code === "unauthorized") return "oauth_refresh_failed"
  if (error.code === "quota_exceeded") return "youtube_api_quota_exceeded"
  if (error.code === "accessNotConfigured" || error.code === "forbidden" || error.status === 403) {
    return "youtube_api_disabled_or_forbidden"
  }
  return "youtube_api_error"
}

/** Validate a channel ID using OAuth bearer token only. */
export async function lookupYouTubeChannelWithOAuth(
  channelId: string,
  accessToken: string,
): Promise<YouTubeChannelLookupResult> {
  try {
    const channel = await fetchYouTubeChannelById(channelId, { accessToken, apiKey: null })
    return { ok: true, channel, method: "oauth" }
  } catch (error) {
    return { ok: false, code: mapOAuthError(error), method: "oauth" }
  }
}

/** Validate a channel ID using YOUTUBE_API_KEY only (no OAuth). */
export async function lookupYouTubeChannelWithApiKey(
  channelId: string,
): Promise<YouTubeChannelLookupResult> {
  return fetchYouTubeChannelByIdWithApiKey(channelId)
}

export function isYouTubeApiKeyConfiguredForLookup(): boolean {
  return isYouTubeApiKeyConfigured()
}

export function getConfiguredYouTubeApiKey(): string | null {
  return getYouTubeApiKey()
}
