import type { YouTubeClientAuth } from "@/lib/youtube/access"
import {
  YOUTUBE_API_BASE,
  YouTubeApiError,
  youtubeWatchUrl,
  type YouTubeApiChannel,
  type YouTubeApiVideoSummary,
} from "@/lib/youtube/types"

function normalizeClientAuth(auth: YouTubeClientAuth = {}): {
  accessToken: string | null
  apiKey: string | null
} {
  const accessToken = auth.accessToken?.trim() || null
  const apiKey = auth.apiKey?.trim() || process.env.YOUTUBE_API_KEY?.trim() || null
  if (accessToken) {
    return { accessToken, apiKey: null }
  }
  return { accessToken: null, apiKey }
}

function requireClientAuth(auth: YouTubeClientAuth): {
  accessToken: string | null
  apiKey: string | null
} {
  const normalized = normalizeClientAuth(auth)
  if (!normalized.accessToken && !normalized.apiKey) {
    throw new YouTubeApiError(
      "YouTube OAuth token or YOUTUBE_API_KEY is required.",
      "missing_auth",
    )
  }
  return normalized
}

async function youtubeFetch<T>(
  accessToken: string | null,
  path: string,
  params: Record<string, string>,
  apiKey?: string | null,
  options?: { allowApiKeyRetry?: boolean },
): Promise<T> {
  const search = new URLSearchParams(params)
  const resolvedApiKey = apiKey?.trim() || null
  if (resolvedApiKey && !accessToken) {
    search.set("key", resolvedApiKey)
  }
  const url = `${YOUTUBE_API_BASE}/${path}?${search.toString()}`
  const headers: Record<string, string> = {}
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const response = await fetch(url, {
    headers,
    cache: "no-store",
  })

  const data = (await response.json()) as T & {
    error?: { message?: string; errors?: Array<{ reason?: string }> }
  }

  if (!response.ok || data.error) {
    const reason = data.error?.errors?.[0]?.reason
    const message = data.error?.message || "YouTube API request failed."
    if (process.env.NODE_ENV === "development") {
      console.info("[YouTube API] request failed:", {
        path,
        status: response.status,
        reason: reason ?? null,
        message,
        auth: accessToken ? "oauth" : resolvedApiKey ? "api_key" : "none",
      })
    }
    if (
      response.status === 401 &&
      accessToken &&
      options?.allowApiKeyRetry !== false
    ) {
      const fallbackKey = resolvedApiKey || process.env.YOUTUBE_API_KEY?.trim() || null
      if (fallbackKey) {
        if (process.env.NODE_ENV === "development") {
          console.info("[YouTube API] OAuth unauthorized — retrying with API key", { path })
        }
        return youtubeFetch(null, path, params, fallbackKey, { allowApiKeyRetry: false })
      }
    }
    if (response.status === 403 && reason === "quotaExceeded") {
      throw new YouTubeApiError(
        "YouTube API quota exceeded. Try again later or check Google Cloud quota.",
        "quota_exceeded",
        response.status,
      )
    }
    if (response.status === 403) {
      throw new YouTubeApiError(
        "YouTube Data API v3 is disabled or forbidden for this API key. Enable it in Google Cloud.",
        reason === "accessNotConfigured" ? "accessNotConfigured" : "forbidden",
        response.status,
      )
    }
    if (response.status === 401) {
      throw new YouTubeApiError(
        resolvedApiKey || process.env.YOUTUBE_API_KEY?.trim()
          ? "YouTube OAuth is expired. Public data will use API key when configured."
          : "YouTube OAuth is expired and no YOUTUBE_API_KEY is configured. Reconnect YouTube or add YOUTUBE_API_KEY.",
        "unauthorized",
        response.status,
      )
    }
    if (response.status === 400 && reason === "keyInvalid") {
      throw new YouTubeApiError(
        "YOUTUBE_API_KEY is invalid. Check the key in .env.local.",
        "api_key_invalid",
        response.status,
      )
    }
    throw new YouTubeApiError(message, reason || "api_error", response.status)
  }

  return data
}

type ChannelItem = {
  id?: string
  snippet?: {
    title?: string
    customUrl?: string
    thumbnails?: { high?: { url?: string }; default?: { url?: string } }
  }
  contentDetails?: { relatedPlaylists?: { uploads?: string } }
}

type VideoItem = {
  id?: string
  snippet?: {
    title?: string
    description?: string
    channelId?: string
    channelTitle?: string
    publishedAt?: string
    thumbnails?: { high?: { url?: string }; default?: { url?: string } }
  }
  contentDetails?: { duration?: string }
  statistics?: {
    viewCount?: string
    likeCount?: string
    commentCount?: string
  }
  status?: { privacyStatus?: string }
}

type PlaylistItem = {
  snippet?: {
    resourceId?: { videoId?: string }
    publishedAt?: string
  }
}

function mapChannelItem(item: ChannelItem): YouTubeApiChannel | null {
  if (!item.id) return null
  const snippet = item.snippet ?? {}
  const handle = snippet.customUrl?.replace(/^\//, "") ?? ""
  return {
    id: item.id,
    title: snippet.title ?? "",
    handle,
    url: handle ? `https://www.youtube.com/${handle}` : `https://www.youtube.com/channel/${item.id}`,
    thumbnailUrl:
      snippet.thumbnails?.high?.url ?? snippet.thumbnails?.default?.url ?? "",
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads,
  }
}

function mapVideoItem(item: VideoItem): YouTubeApiVideoSummary | null {
  const id = item.id
  if (!id) return null
  const snippet = item.snippet ?? {}
  const stats = item.statistics ?? {}
  return {
    youtubeVideoId: id,
    title: snippet.title ?? "Untitled video",
    description: snippet.description ?? "",
    channelId: snippet.channelId ?? "",
    channelTitle: snippet.channelTitle ?? "",
    publishedAt: snippet.publishedAt ?? null,
    thumbnailUrl:
      snippet.thumbnails?.high?.url ?? snippet.thumbnails?.default?.url ?? "",
    videoUrl: youtubeWatchUrl(id),
    duration: item.contentDetails?.duration ?? "",
    privacyStatus: item.status?.privacyStatus ?? "",
    viewCount: Number.parseInt(stats.viewCount ?? "0", 10) || 0,
    likeCount: Number.parseInt(stats.likeCount ?? "0", 10) || 0,
    commentCount: Number.parseInt(stats.commentCount ?? "0", 10) || 0,
    raw: item as Record<string, unknown>,
  }
}

export interface MyYouTubeChannelFetchResult {
  channel: YouTubeApiChannel | null
  itemCount: number
  error?: YouTubeApiError
}

export const YOUTUBE_BRAND_ACCOUNT_CHANNEL_NOTE =
  "OAuth connected, but no YouTube channel was returned by channels.list mine=true. This may happen with Brand Accounts."

function logChannelFetchDiagnostic(
  label: string,
  details: Record<string, string | number | boolean | null | undefined>,
): void {
  if (process.env.NODE_ENV !== "development") return
  console.info(`[YouTube OAuth] ${label}`, details)
}

/** channels.list mine=true — returns null channel when empty (Brand Accounts). */
export async function tryFetchMyYouTubeChannel(
  accessToken: string,
): Promise<MyYouTubeChannelFetchResult> {
  try {
    const data = await youtubeFetch<{ items?: ChannelItem[] }>(accessToken, "channels", {
      part: "snippet,contentDetails,statistics",
      mine: "true",
    })
    const itemCount = data.items?.length ?? 0
    logChannelFetchDiagnostic("channel fetch mine=true", { itemCount })
    const channel = mapChannelItem(data.items?.[0] ?? {})
    return { channel, itemCount }
  } catch (error) {
    if (error instanceof YouTubeApiError) {
      logChannelFetchDiagnostic("channel fetch mine=true failed", {
        itemCount: 0,
        errorCode: error.code,
        message: error.message,
        status: error.status ?? null,
      })
      return { channel: null, itemCount: 0, error }
    }
    throw error
  }
}

export async function fetchMyYouTubeChannel(
  accessToken: string,
): Promise<YouTubeApiChannel> {
  const result = await tryFetchMyYouTubeChannel(accessToken)
  if (result.channel) return result.channel
  if (result.error) throw result.error
  throw new YouTubeApiError("No YouTube channel found for this account.", "no_channel")
}

export type YouTubeChannelLookupCode =
  | "api_key_missing"
  | "api_key_invalid"
  | "channel_not_found"
  | "youtube_api_disabled_or_forbidden"
  | "youtube_api_quota_exceeded"
  | "youtube_api_error"
  | "oauth_refresh_failed"
  | "api_key_invalid"

export type YouTubeChannelLookupResult =
  | { ok: true; channel: YouTubeApiChannel; method: "oauth" | "api_key" }
  | { ok: false; code: YouTubeChannelLookupCode; method: "oauth" | "api_key" }

export async function fetchYouTubeChannelById(
  channelId: string,
  auth: YouTubeClientAuth = {},
): Promise<YouTubeApiChannel> {
  const accessToken = auth.accessToken?.trim() || null
  const apiKey = auth.apiKey?.trim() || null

  if (!accessToken && !apiKey) {
    throw new YouTubeApiError(
      "YouTube OAuth token or YOUTUBE_API_KEY is required.",
      "api_key_missing",
    )
  }

  const data = await youtubeFetch<{ items?: ChannelItem[] }>(
    accessToken,
    "channels",
    {
      part: "snippet,contentDetails,statistics",
      id: channelId,
    },
    apiKey,
  )

  const itemCount = data.items?.length ?? 0
  logChannelFetchDiagnostic("channel fetch by id", {
    channelId,
    itemCount,
    auth: accessToken ? "oauth" : "api_key",
  })

  const channel = mapChannelItem(data.items?.[0] ?? {})
  if (!channel) {
    throw new YouTubeApiError(
      "No YouTube channel found for that channel ID.",
      "channel_not_found",
    )
  }
  return channel
}

/** API-key-only channel lookup (no OAuth). */
export async function fetchYouTubeChannelByIdWithApiKey(
  channelId: string,
): Promise<YouTubeChannelLookupResult> {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim() || null
  if (!apiKey) {
    return { ok: false, code: "api_key_missing", method: "api_key" }
  }

  try {
    const channel = await fetchYouTubeChannelById(channelId, { accessToken: null, apiKey })
    return { ok: true, channel, method: "api_key" }
  } catch (error) {
    if (error instanceof YouTubeApiError) {
      if (error.code === "channel_not_found") {
        return { ok: false, code: "channel_not_found", method: "api_key" }
      }
      if (error.code === "quota_exceeded") {
        return { ok: false, code: "youtube_api_quota_exceeded", method: "api_key" }
      }
      if (error.code === "accessNotConfigured" || error.code === "forbidden") {
        return { ok: false, code: "youtube_api_disabled_or_forbidden", method: "api_key" }
      }
      if (error.code === "api_key_invalid") {
        return { ok: false, code: "api_key_invalid", method: "api_key" }
      }
    }
    return { ok: false, code: "youtube_api_error", method: "api_key" }
  }
}

export async function fetchRecentVideosForChannel(
  auth: YouTubeClientAuth,
  channelId: string,
  maxResults = 25,
): Promise<YouTubeApiVideoSummary[]> {
  const { accessToken, apiKey } = requireClientAuth(auth)
  const channel = await fetchYouTubeChannelById(channelId, { accessToken, apiKey })
  const uploadsPlaylistId = channel.uploadsPlaylistId
  if (!uploadsPlaylistId) {
    return []
  }

  const playlistData = await youtubeFetch<{ items?: PlaylistItem[] }>(
    accessToken,
    "playlistItems",
    {
      part: "snippet,contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: String(Math.min(maxResults, 50)),
    },
    apiKey,
  )

  const videoIds = (playlistData.items ?? [])
    .map((item) => item.snippet?.resourceId?.videoId)
    .filter(Boolean) as string[]

  if (videoIds.length === 0) return []

  return fetchYouTubeVideoDetails({ accessToken, apiKey }, videoIds)
}

export async function fetchRecentYouTubeVideos(
  auth: YouTubeClientAuth,
  maxResults = 25,
  channelId?: string | null,
): Promise<YouTubeApiVideoSummary[]> {
  const trimmedChannelId = channelId?.trim()
  if (trimmedChannelId) {
    return fetchRecentVideosForChannel(auth, trimmedChannelId, maxResults)
  }

  const { accessToken, apiKey } = requireClientAuth(auth)
  if (!accessToken) {
    throw new YouTubeApiError(
      "OAuth is required to fetch your videos without a saved channel ID.",
      "missing_auth",
    )
  }

  const searchData = await youtubeFetch<{ items?: Array<{ id?: { videoId?: string } }> }>(
    accessToken,
    "search",
    {
      part: "snippet",
      forMine: "true",
      type: "video",
      order: "date",
      maxResults: String(maxResults),
    },
    apiKey,
  )

  const videoIds = (searchData.items ?? [])
    .map((item) => item.id?.videoId)
    .filter(Boolean) as string[]

  if (videoIds.length === 0) return []

  return fetchYouTubeVideoDetails({ accessToken, apiKey }, videoIds)
}

export async function fetchYouTubeVideoDetails(
  auth: YouTubeClientAuth,
  videoIds: string[],
): Promise<YouTubeApiVideoSummary[]> {
  if (videoIds.length === 0) return []

  const { accessToken, apiKey } = requireClientAuth(auth)

  const data = await youtubeFetch<{ items?: VideoItem[] }>(
    accessToken,
    "videos",
    {
      part: "snippet,contentDetails,statistics,status",
      id: videoIds.join(","),
    },
    apiKey,
  )

  return (data.items ?? [])
    .map(mapVideoItem)
    .filter((item): item is YouTubeApiVideoSummary => item !== null)
}
