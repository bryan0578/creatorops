import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import {
  tryFetchMyYouTubeChannel,
  YOUTUBE_BRAND_ACCOUNT_CHANNEL_NOTE,
} from "@/lib/youtube/client"
import {
  logOAuthCallbackFailure,
  YouTubeOAuthCallbackError,
} from "@/lib/youtube/oauth-callback-errors"
import {
  logOAuthCallbackStep,
  validateYouTubeOAuthEnvForCallback,
} from "@/lib/youtube/oauth-callback-diagnostics"
import { exchangeYouTubeAuthCode } from "@/lib/youtube/oauth"
import {
  emptyYouTubeConnectionCreate,
  storeTokens,
} from "@/lib/youtube/token-store"
import { YOUTUBE_CONNECTION_ID, YOUTUBE_OAUTH_SCOPES, YouTubeApiError } from "@/lib/youtube/types"

const YOUTUBE_PATHS = ["/integrations", "/campaigns", "/analytics", "/data-health", "/automation"]

function revalidateYouTubeRoutes(): void {
  for (const path of YOUTUBE_PATHS) {
    revalidatePath(path)
  }
}

export interface YouTubeOAuthSaveResult {
  needsChannelSelection: boolean
}

function isRecoverableEmptyChannelResult(
  result: Awaited<ReturnType<typeof tryFetchMyYouTubeChannel>>,
): boolean {
  if (result.channel) return false
  if (result.itemCount === 0) return true
  if (result.error?.code === "no_channel") return true
  return false
}

export async function saveYouTubeOAuthConnection(input: {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  tokenType?: string
  scopes?: string[]
}): Promise<YouTubeOAuthSaveResult> {
  let stored: ReturnType<typeof storeTokens>
  try {
    stored = storeTokens(input)
    logOAuthCallbackStep("token encrypt/store success", {
      hasAccessToken: Boolean(input.accessToken),
      hasRefreshToken: Boolean(input.refreshToken),
      expiryDate:
        input.expiresIn && input.expiresIn > 0
          ? new Date(Date.now() + input.expiresIn * 1000).toISOString()
          : null,
    })
  } catch (error) {
    logOAuthCallbackFailure("token_encrypt", error)
    throw new YouTubeOAuthCallbackError(
      "token_encrypt_failed",
      "token_encrypt",
      error instanceof Error ? error.message : undefined,
      { cause: error },
    )
  }

  logOAuthCallbackStep("channel fetch start")
  const channelResult = await tryFetchMyYouTubeChannel(input.accessToken)

  if (channelResult.channel) {
    logOAuthCallbackStep("channel fetch success", {
      channelId: channelResult.channel.id,
      channelTitle: channelResult.channel.title,
    })
  } else if (isRecoverableEmptyChannelResult(channelResult)) {
    logOAuthCallbackStep("channel fetch empty — saving OAuth without channel (Brand Account)", {
      itemCount: channelResult.itemCount,
    })
  } else if (channelResult.error) {
    logOAuthCallbackFailure("channel_fetch", channelResult.error)
    throw new YouTubeOAuthCallbackError(
      "channel_fetch_failed",
      "channel_fetch",
      channelResult.error.message,
      { cause: channelResult.error },
    )
  }

  const channel = channelResult.channel
  const needsChannelSelection = !channel
  const now = new Date()

  try {
    await prisma.youTubeConnection.upsert({
      where: { id: YOUTUBE_CONNECTION_ID },
      create: {
        ...emptyYouTubeConnectionCreate(now),
        ...stored,
        accessTokenEncrypted: stored.accessTokenEncrypted,
        refreshTokenEncrypted: stored.refreshTokenEncrypted,
        tokenType: stored.tokenType,
        expiryDate: stored.expiryDate,
        scopes: stored.scopes,
        status: needsChannelSelection ? "ConnectedNeedsChannel" : "Connected",
        notes: needsChannelSelection ? YOUTUBE_BRAND_ACCOUNT_CHANNEL_NOTE : "",
        channelId: channel?.id ?? "",
        channelTitle: channel?.title ?? "",
        channelHandle: channel?.handle ?? "",
        channelUrl: channel?.url ?? "",
        thumbnailUrl: channel?.thumbnailUrl ?? "",
        lastSyncedAt: needsChannelSelection ? null : now,
      },
      update: {
        accessTokenEncrypted: stored.accessTokenEncrypted,
        refreshTokenEncrypted: stored.refreshTokenEncrypted,
        tokenType: stored.tokenType,
        expiryDate: stored.expiryDate,
        scopes: stored.scopes,
        status: needsChannelSelection ? "ConnectedNeedsChannel" : "Connected",
        notes: needsChannelSelection ? YOUTUBE_BRAND_ACCOUNT_CHANNEL_NOTE : "",
        channelId: channel?.id ?? "",
        channelTitle: channel?.title ?? "",
        channelHandle: channel?.handle ?? "",
        channelUrl: channel?.url ?? "",
        thumbnailUrl: channel?.thumbnailUrl ?? "",
        lastSyncedAt: needsChannelSelection ? null : now,
        updatedAt: now,
      },
    })
    logOAuthCallbackStep("connection save success", {
      status: needsChannelSelection ? "ConnectedNeedsChannel" : "Connected",
    })
  } catch (error) {
    logOAuthCallbackFailure("connection_save", error)
    throw new YouTubeOAuthCallbackError(
      "connection_save_failed",
      "connection_save",
      error instanceof Error ? error.message : undefined,
      { cause: error },
    )
  }

  revalidateYouTubeRoutes()
  return { needsChannelSelection }
}

/** Full OAuth callback: env check → token exchange → encrypt/store → channel → Prisma. */
export async function runYouTubeOAuthCallbackFlow(
  code: string,
): Promise<YouTubeOAuthSaveResult> {
  const envCheck = validateYouTubeOAuthEnvForCallback()
  if (!envCheck.ok) {
    throw new YouTubeOAuthCallbackError(envCheck.code, "env_check")
  }

  logOAuthCallbackStep("token exchange start")
  let tokenResponse: Awaited<ReturnType<typeof exchangeYouTubeAuthCode>>
  try {
    tokenResponse = await exchangeYouTubeAuthCode(code)
    logOAuthCallbackStep("token exchange success", {
      hasAccessToken: Boolean(tokenResponse.access_token),
      hasRefreshToken: Boolean(tokenResponse.refresh_token),
      expiryDate:
        tokenResponse.expires_in && tokenResponse.expires_in > 0
          ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
          : null,
    })
  } catch (error) {
    logOAuthCallbackFailure("token_exchange", error)
    throw new YouTubeOAuthCallbackError(
      "token_exchange_failed",
      "token_exchange",
      error instanceof Error ? error.message : undefined,
      { cause: error },
    )
  }

  return saveYouTubeOAuthConnection({
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresIn: tokenResponse.expires_in,
    tokenType: tokenResponse.token_type,
    scopes: tokenResponse.scope?.split(" ").filter(Boolean) ?? [...YOUTUBE_OAUTH_SCOPES],
  })
}
