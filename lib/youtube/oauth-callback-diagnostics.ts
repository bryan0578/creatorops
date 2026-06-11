import { isTokenEncryptionConfigured } from "@/lib/youtube/token-crypto"
import { getYouTubeOAuthConfig } from "@/lib/youtube/oauth"

export function logOAuthCallbackStep(message: string, details?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "development") return
  if (details) {
    console.info(`[YouTube OAuth] callback: ${message}`, details)
  } else {
    console.info(`[YouTube OAuth] callback: ${message}`)
  }
}

export function logOAuthEnvCheck(): void {
  if (process.env.NODE_ENV !== "development") return
  const config = getYouTubeOAuthConfig()
  console.info("[YouTube OAuth] callback: env check", {
    hasClientId: Boolean(process.env.YOUTUBE_CLIENT_ID?.trim()),
    hasClientSecret: Boolean(process.env.YOUTUBE_CLIENT_SECRET?.trim()),
    redirectUri: config?.redirectUri ?? process.env.YOUTUBE_REDIRECT_URI?.trim() ?? null,
    hasEncryptionKey: isTokenEncryptionConfigured(),
  })
}

export function validateYouTubeOAuthEnvForCallback(): {
  ok: true
} | {
  ok: false
  code: "missing_youtube_env" | "missing_encryption_key"
} {
  const clientId = process.env.YOUTUBE_CLIENT_ID?.trim()
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim()
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI?.trim()

  if (!clientId || !clientSecret || !redirectUri) {
    return { ok: false, code: "missing_youtube_env" }
  }

  if (!isTokenEncryptionConfigured()) {
    return { ok: false, code: "missing_encryption_key" }
  }

  return { ok: true }
}
