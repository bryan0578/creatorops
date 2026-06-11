import { YouTubeApiError } from "@/lib/youtube/types"

export const YOUTUBE_OAUTH_CALLBACK_ERROR_CODES = [
  "missing_code",
  "missing_youtube_env",
  "missing_encryption_key",
  "token_exchange_failed",
  "token_encrypt_failed",
  "channel_fetch_failed",
  "connection_save_failed",
  "oauth_state_mismatch",
  "oauth_failed",
] as const

export type YouTubeOAuthCallbackErrorCode =
  (typeof YOUTUBE_OAUTH_CALLBACK_ERROR_CODES)[number]

export class YouTubeOAuthCallbackError extends Error {
  readonly code: YouTubeOAuthCallbackErrorCode
  readonly step: string

  constructor(
    code: YouTubeOAuthCallbackErrorCode,
    step: string,
    message?: string,
    options?: { cause?: unknown },
  ) {
    super(message ?? code, options)
    this.name = "YouTubeOAuthCallbackError"
    this.code = code
    this.step = step
  }
}

export function mapToYouTubeOAuthCallbackErrorCode(error: unknown): YouTubeOAuthCallbackErrorCode {
  if (error instanceof YouTubeOAuthCallbackError) {
    return error.code
  }

  if (error instanceof YouTubeApiError) {
    const exchangeCodes = new Set([
      "oauth_exchange_failed",
      "invalid_grant",
      "redirect_uri_mismatch",
      "invalid_client",
      "unauthorized_client",
      "no_access_token",
    ])
    if (exchangeCodes.has(error.code)) {
      return "token_exchange_failed"
    }
    const channelCodes = new Set([
      "no_channel",
      "quota_exceeded",
      "unauthorized",
      "api_error",
      "accessNotConfigured",
      "forbidden",
    ])
    if (channelCodes.has(error.code) || error.status === 403 || error.status === 401) {
      return "channel_fetch_failed"
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes("encryption") || message.includes("encrypt")) {
      return "token_encrypt_failed"
    }
    if (
      message.includes("prisma") ||
      message.includes("database") ||
      message.includes("sqlite")
    ) {
      return "connection_save_failed"
    }
  }

  return "oauth_failed"
}

export function logOAuthCallbackFailure(step: string, error: unknown): void {
  if (process.env.NODE_ENV !== "development") return

  const details: Record<string, string | number | undefined> = { step }

  if (error instanceof YouTubeOAuthCallbackError) {
    details.code = error.code
    details.message = error.message
  } else if (error instanceof YouTubeApiError) {
    details.code = error.code
    details.status = error.status
    details.message = error.message
  } else if (error instanceof Error) {
    details.message = error.message
    details.name = error.name
  } else {
    details.message = String(error)
  }

  console.error("[YouTube OAuth] callback failed:", details)
}
