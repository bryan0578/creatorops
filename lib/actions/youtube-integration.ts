"use server"

import { revalidatePath } from "next/cache"

import { upsertAnalyticsRecord, getAnalyticsRecords } from "@/lib/actions/analytics-records"
import {
  createExternalLink,
  getExternalLinks,
  updateExternalLink,
} from "@/lib/actions/external-links"
import { prisma } from "@/lib/prisma"
import { createId } from "@/lib/storage"
import type {
  ExternalLinkRecord,
  YouTubeConnectionStatusSummary,
  YouTubeVideoRecord,
} from "@/lib/types"
import {
  resolveYouTubePublicAuth,
  tryGetYouTubeAccessToken,
  getYouTubeApiKey,
  logYouTubeFetchVideosDebug,
  type YouTubePublicAuthResult,
} from "@/lib/youtube/access"
import {
  tryFetchMyYouTubeChannel,
  fetchRecentYouTubeVideos,
  fetchYouTubeChannelById,
  fetchYouTubeVideoDetails,
} from "@/lib/youtube/client"
import {
  lookupYouTubeChannelWithApiKey,
  lookupYouTubeChannelWithOAuth,
  logManualChannelSaveDebug,
} from "@/lib/youtube/channel-lookup"
import { parseYouTubeChannelIdInput } from "@/lib/youtube/channel-id"
import {
  apiVideoToYouTubeVideoRecord,
  filterYouTubeVideosForCampaign,
  findExistingAnalyticsRecordForYouTubeVideo,
  prismaYouTubeVideoToRecord,
  youtubeVideoToAnalyticsRecord,
  youtubeVideoToPrismaCreate,
  youtubeVideoToPrismaUpdate,
} from "@/lib/youtube/mappers"
import { parseYouTubeVideoStats } from "@/lib/youtube/types"
import {
  saveYouTubeOAuthConnection,
} from "@/lib/youtube/complete-oauth-connection"
import {
  buildYouTubeAuthUrl,
  isYouTubeOAuthConfigured,
  refreshYouTubeAccessToken,
} from "@/lib/youtube/oauth"
import {
  buildYouTubeConnectionStatusSummary,
  emptyYouTubeConnectionCreate,
  prismaYouTubeConnectionToPublicRecord,
  readAccessToken,
  readRefreshToken,
  storeTokens,
} from "@/lib/youtube/token-store"
import { isTokenEncryptionConfigured } from "@/lib/youtube/token-crypto"
import {
  YOUTUBE_CONNECTION_ID,
  YouTubeApiError,
  type YouTubeApiVideoSummary,
} from "@/lib/youtube/types"
import { normalizeExternalLinkRecord } from "@/lib/data/external-links"

const YOUTUBE_PATHS = [
  "/videos",
  "/integrations",
  "/campaigns",
  "/analytics",
  "/search",
  "/backups",
  "/data-health",
  "/automation",
  "/",
]

function revalidateYouTubeRoutes() {
  for (const path of YOUTUBE_PATHS) {
    revalidatePath(path)
  }
}

function friendlyYouTubeError(error: unknown): string {
  if (error instanceof YouTubeApiError) {
    if (error.code === "oauth_and_api_key_missing") {
      return error.message
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return "YouTube integration request failed."
}

const API_KEY_FALLBACK_NOTE = " Using API key fallback for public YouTube data."

async function resolvePublicYouTubeAuthForConnection(): Promise<YouTubePublicAuthResult> {
  const row = await getConnectionRow()
  const authResult = await resolveYouTubePublicAuth()
  logYouTubeFetchVideosDebug({
    hasChannelId: Boolean(row?.channelId?.trim()),
    status: row?.status ?? null,
    hasYouTubeApiKey: Boolean(getYouTubeApiKey()),
    oauthAvailable: authResult.oauthAvailable,
    usingApiKeyFallback: authResult.usingApiKeyFallback,
  })
  return authResult
}

async function getConnectionRow() {
  return prisma.youTubeConnection.findUnique({ where: { id: YOUTUBE_CONNECTION_ID } })
}

async function ensureConnectionRow() {
  const existing = await getConnectionRow()
  if (existing) return existing
  return prisma.youTubeConnection.create({ data: emptyYouTubeConnectionCreate() })
}

async function persistRefreshedTokens(
  rowId: string,
  tokenResponse: { access_token: string; expires_in?: number; refresh_token?: string; token_type?: string },
  existingRefresh?: string | null,
  existingStatus?: string | null,
) {
  const stored = storeTokens({
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token ?? existingRefresh ?? undefined,
    expiresIn: tokenResponse.expires_in,
    tokenType: tokenResponse.token_type,
  })
  await prisma.youTubeConnection.update({
    where: { id: rowId },
    data: {
      accessTokenEncrypted: stored.accessTokenEncrypted,
      refreshTokenEncrypted: stored.refreshTokenEncrypted,
      tokenType: stored.tokenType,
      expiryDate: stored.expiryDate,
      scopes: stored.scopes,
      status:
        existingStatus === "ConnectedNeedsChannel" ? "ConnectedNeedsChannel" : "Connected",
      updatedAt: new Date(),
    },
  })
}

function isYouTubeOAuthActiveStatus(status: string | undefined | null): boolean {
  return (
    status === "Connected" ||
    status === "ConnectedNeedsChannel" ||
    status === "ConnectedNeedsReconnect" ||
    status === "ChannelIdSaved"
  )
}

export interface SaveManualYouTubeChannelIdResult {
  success: boolean
  partial?: boolean
  code?: string
  validationMethod?: "oauth" | "api_key" | "unvalidated"
  message: string
  connection?: ReturnType<typeof prismaYouTubeConnectionToPublicRecord>
}

function manualChannelSaveErrorMessage(code: string): string {
  switch (code) {
    case "invalid_channel_id_format":
    case "invalid_channel_id":
      return "Enter a valid YouTube channel ID (starts with UC) or channel URL."
    case "handle_not_supported":
      return "Paste the Channel ID from YouTube Studio. It should start with UC."
    case "channel_not_found":
      return "No YouTube channel was found for that ID. Confirm it starts with UC."
    case "youtube_api_disabled_or_forbidden":
      return "YouTube Data API v3 is disabled or blocked for your API key. Enable YouTube Data API v3 in Google Cloud."
    case "youtube_api_quota_exceeded":
      return "YouTube API quota exceeded. Try again later or check Google Cloud quota."
    case "youtube_api_error":
      return "YouTube API returned an error while validating the channel ID."
    case "api_key_invalid":
      return "YOUTUBE_API_KEY is invalid. Check the key in .env.local and restart the dev server."
    case "api_key_missing_saved_unvalidated":
    case "channel_saved_unvalidated":
    case "token_expired_api_key_missing":
      return "Channel ID saved but not validated. Add YOUTUBE_API_KEY or reconnect YouTube to validate."
    case "channel_validated":
      return "Channel connected successfully."
    case "oauth_refresh_failed_used_api_key":
      return "OAuth was unavailable. Channel validated with API key."
    case "oauth_refresh_failed":
      return "YouTube OAuth refresh failed. Add YOUTUBE_API_KEY to validate public channels, or reconnect YouTube."
    case "youtube_api_key_missing":
      return "Add YOUTUBE_API_KEY to .env.local to validate public channels without OAuth."
    default:
      return "Could not save the YouTube channel ID."
  }
}

async function saveUnvalidatedYouTubeChannelId(
  rowId: string,
  channelId: string,
  notes: string,
): Promise<ReturnType<typeof prismaYouTubeConnectionToPublicRecord>> {
  const now = new Date()
  const updated = await prisma.youTubeConnection.update({
    where: { id: rowId },
    data: {
      channelId,
      channelTitle: "",
      channelHandle: "",
      channelUrl: `https://www.youtube.com/channel/${channelId}`,
      thumbnailUrl: "",
      status: "ChannelIdSaved",
      notes,
      updatedAt: now,
    },
  })
  revalidateYouTubeRoutes()
  return prismaYouTubeConnectionToPublicRecord(updated)
}

export async function getYouTubeConnectionStatus(): Promise<YouTubeConnectionStatusSummary> {
  try {
    const row = await getConnectionRow()
    return buildYouTubeConnectionStatusSummary(row)
  } catch {
    return buildYouTubeConnectionStatusSummary(null)
  }
}

export async function getYouTubeAuthUrl(): Promise<{ url: string } | { error: string }> {
  if (!isYouTubeOAuthConfigured()) {
    return {
      error:
        "YouTube credentials are missing. Add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET to .env.local.",
    }
  }
  if (!isTokenEncryptionConfigured()) {
    return {
      error:
        "Add CREATOROPS_TOKEN_ENCRYPTION_KEY to .env.local before connecting YouTube.",
    }
  }
  try {
    const state = createId("ytstate")
    return { url: buildYouTubeAuthUrl(state) }
  } catch (error) {
    return { error: friendlyYouTubeError(error) }
  }
}

export async function refreshYouTubeTokenIfNeeded(): Promise<string> {
  const row = await getConnectionRow()
  if (!row || !isYouTubeOAuthActiveStatus(row.status)) {
    throw new YouTubeApiError("YouTube is not connected.", "not_connected")
  }

  const expiry = row.expiryDate?.getTime() ?? 0
  const accessToken = readAccessToken(row)
  if (accessToken && expiry > Date.now() + 60_000) {
    return accessToken
  }

  const refreshToken = readRefreshToken(row)
  if (!refreshToken) {
    await prisma.youTubeConnection.update({
      where: { id: row.id },
      data: { status: "Expired", updatedAt: new Date() },
    })
    throw new YouTubeApiError(
      "YouTube connection expired. Reconnect your channel.",
      "expired",
    )
  }

  const tokenResponse = await refreshYouTubeAccessToken(refreshToken)
  await persistRefreshedTokens(row.id, tokenResponse, refreshToken, row.status)
  return tokenResponse.access_token
}

export async function disconnectYouTube(): Promise<{ success: boolean; message: string }> {
  try {
    await prisma.youTubeConnection.deleteMany({ where: { id: YOUTUBE_CONNECTION_ID } })
    revalidateYouTubeRoutes()
    return { success: true, message: "YouTube disconnected." }
  } catch (error) {
    return { success: false, message: friendlyYouTubeError(error) }
  }
}

export async function fetchYouTubeChannel(): Promise<{
  success: boolean
  message: string
  connection?: ReturnType<typeof prismaYouTubeConnectionToPublicRecord>
}> {
  try {
    const accessToken = await refreshYouTubeTokenIfNeeded()
    const row = await ensureConnectionRow()
    const channelResult = await tryFetchMyYouTubeChannel(accessToken)

    if (!channelResult.channel) {
      if (row.channelId?.trim()) {
        const channel = await fetchYouTubeChannelById(row.channelId, { accessToken })
        const updated = await prisma.youTubeConnection.update({
          where: { id: row.id },
          data: {
            channelId: channel.id,
            channelTitle: channel.title,
            channelHandle: channel.handle,
            channelUrl: channel.url,
            thumbnailUrl: channel.thumbnailUrl,
            status: "Connected",
            lastSyncedAt: new Date(),
            notes: "",
            updatedAt: new Date(),
          },
        })
        revalidateYouTubeRoutes()
        return {
          success: true,
          message: `Refreshed ${channel.title}.`,
          connection: prismaYouTubeConnectionToPublicRecord(updated),
        }
      }
      return {
        success: false,
        message:
          "No channel returned from YouTube. Enter your channel ID manually or reconnect and select the correct Brand Account.",
      }
    }

    const channel = channelResult.channel
    const updated = await prisma.youTubeConnection.update({
      where: { id: row.id },
      data: {
        channelId: channel.id,
        channelTitle: channel.title,
        channelHandle: channel.handle,
        channelUrl: channel.url,
        thumbnailUrl: channel.thumbnailUrl,
        status: "Connected",
        lastSyncedAt: new Date(),
        notes: "",
        updatedAt: new Date(),
      },
    })
    revalidateYouTubeRoutes()
    return {
      success: true,
      message: `Connected to ${channel.title}.`,
      connection: prismaYouTubeConnectionToPublicRecord(updated),
    }
  } catch (error) {
    return { success: false, message: friendlyYouTubeError(error) }
  }
}

export async function saveManualYouTubeChannelId(
  input: string,
): Promise<SaveManualYouTubeChannelIdResult> {
  try {
    const parsed = parseYouTubeChannelIdInput(input)
    if (!parsed.ok) {
      const code =
        parsed.reason === "handle_not_supported"
          ? "handle_not_supported"
          : "invalid_channel_id_format"
      return { success: false, code, message: manualChannelSaveErrorMessage(code) }
    }

    const channelId = parsed.channelId
    const row = await ensureConnectionRow()
    const apiKey = getYouTubeApiKey()
    const tokenResult = await tryGetYouTubeAccessToken()

    logManualChannelSaveDebug({
      hasInput: Boolean(input?.trim()),
      normalizedChannelId: channelId,
      startsWithUC: channelId.startsWith("UC"),
      hasYouTubeApiKey: Boolean(apiKey),
      hasOAuthConnection: Boolean(row),
      connectionStatus: row.status ?? null,
      hasAccessTokenEncrypted: Boolean(row.accessTokenEncrypted),
      hasRefreshTokenEncrypted: Boolean(row.refreshTokenEncrypted),
    })

    let validatedChannel: import("@/lib/youtube/types").YouTubeApiChannel | null = null
    let validationMethod: "oauth" | "api_key" | "unvalidated" = "unvalidated"
    let validationCode: string | undefined
    let oauthLookupFailed = false
    let oauthChannelNotFound = false

    if (tokenResult.ok) {
      const oauthResult = await lookupYouTubeChannelWithOAuth(channelId, tokenResult.accessToken)
      if (oauthResult.ok) {
        validatedChannel = oauthResult.channel
        validationMethod = "oauth"
        validationCode = "channel_validated"
      } else if (oauthResult.code === "channel_not_found") {
        oauthChannelNotFound = true
        oauthLookupFailed = true
      } else {
        oauthLookupFailed = true
      }
    } else {
      oauthLookupFailed = true
    }

    if (!validatedChannel && apiKey) {
      const apiKeyLookup = await lookupYouTubeChannelWithApiKey(channelId)
      if (apiKeyLookup.ok) {
        validatedChannel = apiKeyLookup.channel
        validationMethod = "api_key"
        validationCode = oauthLookupFailed
          ? "oauth_refresh_failed_used_api_key"
          : "channel_validated"
      } else if (apiKeyLookup.code === "channel_not_found" || oauthChannelNotFound) {
        return {
          success: false,
          code: "channel_not_found",
          message: manualChannelSaveErrorMessage("channel_not_found"),
        }
      } else if (
        apiKeyLookup.code === "youtube_api_disabled_or_forbidden" ||
        apiKeyLookup.code === "youtube_api_quota_exceeded" ||
        apiKeyLookup.code === "api_key_invalid"
      ) {
        return {
          success: false,
          code: apiKeyLookup.code,
          message: manualChannelSaveErrorMessage(apiKeyLookup.code),
        }
      }
    } else if (!validatedChannel && oauthChannelNotFound) {
      return {
        success: false,
        code: "channel_not_found",
        message: manualChannelSaveErrorMessage("channel_not_found"),
      }
    }

    if (!validatedChannel) {
      const notes =
        "Channel ID saved manually but not validated. Add YOUTUBE_API_KEY or reconnect YouTube to validate."
      const connection = await saveUnvalidatedYouTubeChannelId(row.id, channelId, notes)
      const code = apiKey
        ? "channel_saved_unvalidated"
        : "api_key_missing_saved_unvalidated"
      return {
        success: true,
        partial: true,
        code,
        validationMethod: "unvalidated",
        message: manualChannelSaveErrorMessage(code),
        connection,
      }
    }

    const now = new Date()
    const notes =
      validationMethod === "api_key"
        ? "Channel ID validated manually with API key. Reconnect YouTube later if private sync is needed."
        : validationMethod === "oauth"
          ? "Channel ID validated manually with OAuth."
          : ""

    const updated = await prisma.youTubeConnection.update({
      where: { id: row.id },
      data: {
        channelId: validatedChannel.id,
        channelTitle: validatedChannel.title,
        channelHandle: validatedChannel.handle,
        channelUrl: validatedChannel.url,
        thumbnailUrl: validatedChannel.thumbnailUrl,
        status: "Connected",
        lastSyncedAt: now,
        notes,
        updatedAt: now,
      },
    })
    revalidateYouTubeRoutes()

    let message = `Channel connected: ${validatedChannel.title}.`
    if (validationMethod === "api_key") {
      message =
        validationCode === "oauth_refresh_failed_used_api_key"
          ? manualChannelSaveErrorMessage("oauth_refresh_failed_used_api_key") +
            ` Channel: ${validatedChannel.title}.`
          : "Channel ID validated with API key. Reconnect YouTube later if private sync is needed."
    }

    return {
      success: true,
      code: validationCode ?? "channel_validated",
      validationMethod,
      message,
      connection: prismaYouTubeConnectionToPublicRecord(updated),
    }
  } catch (error) {
    if (error instanceof YouTubeApiError) {
      return {
        success: false,
        code: error.code,
        message: manualChannelSaveErrorMessage(error.code) || error.message,
      }
    }
    return {
      success: false,
      code: "youtube_api_error",
      message: friendlyYouTubeError(error),
    }
  }
}

export async function fetchRecentYouTubeVideosAction(
  maxResults = 25,
): Promise<{
  success: boolean
  message: string
  videos: YouTubeApiVideoSummary[]
  usingApiKeyFallback?: boolean
}> {
  try {
    const row = await getConnectionRow()
    const channelId = row?.channelId?.trim()
    if (!channelId) {
      return {
        success: false,
        message: "Save a YouTube channel ID before fetching recent videos.",
        videos: [],
      }
    }

    const { auth, usingApiKeyFallback } = await resolvePublicYouTubeAuthForConnection()
    const videos = await fetchRecentYouTubeVideos(auth, maxResults, channelId)
    let message = `Fetched ${videos.length} recent video(s).`
    if (usingApiKeyFallback) {
      message += API_KEY_FALLBACK_NOTE
    }
    return { success: true, message, videos, usingApiKeyFallback }
  } catch (error) {
    return { success: false, message: friendlyYouTubeError(error), videos: [] }
  }
}

export async function getYouTubeVideos(): Promise<YouTubeVideoRecord[]> {
  const rows = await prisma.youTubeVideo.findMany({ orderBy: { updatedAt: "desc" } })
  return rows.map(prismaYouTubeVideoToRecord)
}

export async function getYouTubeVideosForCampaign(
  campaignId: string,
): Promise<YouTubeVideoRecord[]> {
  const videos = await getYouTubeVideos()
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
  return filterYouTubeVideosForCampaign(
    videos,
    campaignId,
    campaign?.campaignName ?? undefined,
  )
}

async function findVideoRecord(idOrYoutubeId: string): Promise<YouTubeVideoRecord | null> {
  const trimmed = idOrYoutubeId.trim()
  const byId = await prisma.youTubeVideo.findUnique({ where: { id: trimmed } })
  if (byId) return prismaYouTubeVideoToRecord(byId)
  const byYoutubeId = await prisma.youTubeVideo.findUnique({
    where: { youtubeVideoId: trimmed },
  })
  return byYoutubeId ? prismaYouTubeVideoToRecord(byYoutubeId) : null
}

async function upsertYouTubeVideoRecord(record: YouTubeVideoRecord): Promise<YouTubeVideoRecord> {
  const existing = await prisma.youTubeVideo.findUnique({
    where: { youtubeVideoId: record.youtubeVideoId },
  })
  if (existing) {
    const row = await prisma.youTubeVideo.update({
      where: { id: existing.id },
      data: youtubeVideoToPrismaUpdate({ ...record, id: existing.id }),
    })
    return prismaYouTubeVideoToRecord(row)
  }
  const row = await prisma.youTubeVideo.create({
    data: youtubeVideoToPrismaCreate(record),
  })
  return prismaYouTubeVideoToRecord(row)
}

export async function importYouTubeVideo(
  videoId: string,
  campaignId?: string,
): Promise<{ success: boolean; message: string; video?: YouTubeVideoRecord }> {
  try {
    const { auth, usingApiKeyFallback } = await resolvePublicYouTubeAuthForConnection()
    const [apiVideo] = await fetchYouTubeVideoDetails(auth, [videoId.trim()])
    if (!apiVideo) {
      return { success: false, message: "Video not found on YouTube." }
    }

    const existing = await prisma.youTubeVideo.findUnique({
      where: { youtubeVideoId: apiVideo.youtubeVideoId },
    })
    let campaignFields: Partial<YouTubeVideoRecord> = {}
    if (campaignId?.trim()) {
      const campaign = await prisma.campaign.findUnique({ where: { id: campaignId.trim() } })
      if (campaign) {
        campaignFields = {
          campaignId: campaign.id,
          campaignName: campaign.campaignName,
          artistName: campaign.artistName,
          songTitle: campaign.songTitle,
        }
      }
    }

    const record = apiVideoToYouTubeVideoRecord(apiVideo, {
      ...(existing ? prismaYouTubeVideoToRecord(existing) : {}),
      ...campaignFields,
    })
    const saved = await upsertYouTubeVideoRecord(record)
    revalidateYouTubeRoutes()
    let message = `Imported "${saved.title}".`
    if (usingApiKeyFallback) message += API_KEY_FALLBACK_NOTE
    return { success: true, message, video: saved }
  } catch (error) {
    return { success: false, message: friendlyYouTubeError(error) }
  }
}

export async function linkYouTubeVideoToCampaign(
  videoId: string,
  campaignId: string,
): Promise<{ success: boolean; message: string; video?: YouTubeVideoRecord }> {
  try {
    const video = await findVideoRecord(videoId)
    if (!video) return { success: false, message: "YouTube video not found locally." }
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId.trim() } })
    if (!campaign) return { success: false, message: "Campaign not found." }

    const saved = await upsertYouTubeVideoRecord({
      ...video,
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      artistName: campaign.artistName,
      songTitle: campaign.songTitle,
      updatedAt: Date.now(),
    })
    revalidateYouTubeRoutes()
    return {
      success: true,
      message: `Linked "${saved.title}" to ${campaign.campaignName}.`,
      video: saved,
    }
  } catch (error) {
    return { success: false, message: friendlyYouTubeError(error) }
  }
}

async function findExternalLinkForVideoUrl(url: string): Promise<ExternalLinkRecord | null> {
  const links = await getExternalLinks()
  const normalized = url.trim().toLowerCase()
  const match = links.find((link) => link.url.trim().toLowerCase() === normalized)
  return match ?? null
}

export async function createOrUpdateExternalLinkFromYouTubeVideo(
  videoId: string,
): Promise<{ success: boolean; message: string; externalLinkId?: string }> {
  try {
    const video = await findVideoRecord(videoId)
    if (!video) return { success: false, message: "YouTube video not found locally." }

    const existing = video.externalLinkId
      ? (await getExternalLinks()).find((link) => link.id === video.externalLinkId)
      : await findExternalLinkForVideoUrl(video.videoUrl)

    if (existing) {
      const updated = await updateExternalLink(
        normalizeExternalLinkRecord({
          ...existing,
          name: video.title,
          url: video.videoUrl,
          campaignId: video.campaignId,
          campaignName: video.campaignName,
          artistName: video.artistName,
          songTitle: video.songTitle,
          sourceRecordType: "YouTubeVideo",
          sourceRecordId: video.id,
          analyticsRecordId: video.analyticsRecordId,
          updatedAt: Date.now(),
        }),
      )
      await upsertYouTubeVideoRecord({
        ...video,
        externalLinkId: updated.id,
        updatedAt: Date.now(),
      })
      revalidateYouTubeRoutes()
      return { success: true, message: "External link updated.", externalLinkId: updated.id }
    }

    const created = await createExternalLink({
      name: video.title,
      platform: "YouTube",
      linkType: "Published Video",
      url: video.videoUrl,
      status: "Active",
      campaignId: video.campaignId,
      campaignName: video.campaignName,
      artistName: video.artistName,
      songTitle: video.songTitle,
      sourceRecordType: "YouTubeVideo",
      sourceRecordId: video.id,
      analyticsRecordId: video.analyticsRecordId,
      notes: "",
      tags: ["youtube-api"],
    })
    await upsertYouTubeVideoRecord({
      ...video,
      externalLinkId: created.id,
      updatedAt: Date.now(),
    })
    revalidateYouTubeRoutes()
    return { success: true, message: "External link created.", externalLinkId: created.id }
  } catch (error) {
    return { success: false, message: friendlyYouTubeError(error) }
  }
}

async function linkAnalyticsRecordToExternalLink(
  video: YouTubeVideoRecord,
  analyticsRecordId: string,
): Promise<void> {
  if (!video.externalLinkId?.trim()) return

  const links = await getExternalLinks()
  const link = links.find((item) => item.id === video.externalLinkId)
  if (!link || link.analyticsRecordId === analyticsRecordId) return

  await updateExternalLink(
    normalizeExternalLinkRecord({
      ...link,
      analyticsRecordId,
      updatedAt: Date.now(),
    }),
  )
}

export async function createOrUpdateAnalyticsFromYouTubeVideo(
  videoId: string,
): Promise<{ success: boolean; message: string; analyticsRecordId?: string }> {
  try {
    const video = await findVideoRecord(videoId)
    if (!video) return { success: false, message: "YouTube video not found locally." }

    const allAnalytics = await getAnalyticsRecords()
    const existing = findExistingAnalyticsRecordForYouTubeVideo(video, allAnalytics)
    const analytics = youtubeVideoToAnalyticsRecord(video, existing)
    const saved = await upsertAnalyticsRecord(analytics)

    const stats = parseYouTubeVideoStats(video.rawJson)
    if (process.env.NODE_ENV === "development") {
      console.log("[YouTube Analytics Sync]", {
        youtubeVideoId: video.youtubeVideoId,
        localVideoId: video.id,
        hasExistingAnalyticsRecord: Boolean(existing),
        analyticsRecordId: saved.id,
        views: stats.viewCount,
        likes: stats.likeCount,
        comments: stats.commentCount,
      })
    }

    await upsertYouTubeVideoRecord({
      ...video,
      analyticsRecordId: saved.id,
      updatedAt: Date.now(),
    })
    await linkAnalyticsRecordToExternalLink(
      { ...video, analyticsRecordId: saved.id },
      saved.id,
    )
    revalidateYouTubeRoutes()
    return {
      success: true,
      message: existing ? "Analytics record updated." : "Analytics record created.",
      analyticsRecordId: saved.id,
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[YouTube Analytics Sync] failed", error)
    }
    return { success: false, message: friendlyYouTubeError(error) }
  }
}

export async function syncYouTubeVideoStats(
  videoId: string,
): Promise<{
  success: boolean
  message: string
  video?: YouTubeVideoRecord
  analyticsUpdated?: boolean
}> {
  try {
    const video = await findVideoRecord(videoId)
    if (!video) return { success: false, message: "YouTube video not found locally." }

    const { auth, usingApiKeyFallback } = await resolvePublicYouTubeAuthForConnection()
    const [apiVideo] = await fetchYouTubeVideoDetails(auth, [video.youtubeVideoId])
    if (!apiVideo) return { success: false, message: "Video not found on YouTube." }

    const updated = await upsertYouTubeVideoRecord(
      apiVideoToYouTubeVideoRecord(apiVideo, video),
    )
    const analyticsResult = await createOrUpdateAnalyticsFromYouTubeVideo(updated.id)
    if (updated.externalLinkId) {
      await createOrUpdateExternalLinkFromYouTubeVideo(updated.id)
    }

    const connection = await getConnectionRow()
    if (connection) {
      await prisma.youTubeConnection.update({
        where: { id: connection.id },
        data: { lastSyncedAt: new Date(), updatedAt: new Date() },
      })
    }

    revalidateYouTubeRoutes()
    let message = analyticsResult.success
      ? "YouTube stats synced and Analytics record updated."
      : "Stats synced, but Analytics record could not be updated."
    if (!analyticsResult.success && analyticsResult.message) {
      message += ` ${analyticsResult.message}`
    }
    if (usingApiKeyFallback) message += API_KEY_FALLBACK_NOTE
    return {
      success: true,
      message,
      video: updated,
      analyticsUpdated: analyticsResult.success,
    }
  } catch (error) {
    return { success: false, message: friendlyYouTubeError(error) }
  }
}

export async function syncCampaignYouTubeVideos(
  campaignId: string,
): Promise<{ success: boolean; message: string; synced: number }> {
  try {
    const videos = await getYouTubeVideosForCampaign(campaignId)
    let synced = 0
    for (const video of videos) {
      const result = await syncYouTubeVideoStats(video.id)
      if (result.success) synced += 1
    }
    return {
      success: true,
      message: `Synced ${synced} of ${videos.length} campaign video(s).`,
      synced,
    }
  } catch (error) {
    return { success: false, message: friendlyYouTubeError(error), synced: 0 }
  }
}

export async function completeYouTubeOAuthConnection(input: {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  tokenType?: string
  scopes?: string[]
}): Promise<void> {
  await saveYouTubeOAuthConnection(input)
}

export async function importYouTubeVideoRecords(
  records: YouTubeVideoRecord[],
): Promise<number> {
  let count = 0
  for (const record of records) {
    await upsertYouTubeVideoRecord(record)
    count += 1
  }
  revalidateYouTubeRoutes()
  return count
}

export async function importYouTubeVideosById(
  videoIds: string[],
  campaignId?: string,
): Promise<{ success: boolean; message: string; imported: number }> {
  let imported = 0
  for (const id of videoIds) {
    const result = await importYouTubeVideo(id, campaignId)
    if (result.success) imported += 1
  }
  return {
    success: imported > 0,
    message: `Imported ${imported} of ${videoIds.length} video(s).`,
    imported,
  }
}
