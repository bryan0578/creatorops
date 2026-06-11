import {
  GOOGLE_OAUTH_AUTH_URL,
  GOOGLE_OAUTH_TOKEN_URL,
  YOUTUBE_OAUTH_SCOPES,
  type YouTubeOAuthConfig,
  type YouTubeTokenResponse,
  YouTubeApiError,
} from "@/lib/youtube/types"

export function getYouTubeOAuthConfig(): YouTubeOAuthConfig | null {
  const clientId = process.env.YOUTUBE_CLIENT_ID?.trim()
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim()
  const redirectUri = normalizeRedirectUri(
    process.env.YOUTUBE_REDIRECT_URI?.trim() ||
      "http://localhost:3000/api/youtube/oauth/callback",
  )

  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret, redirectUri }
}

/** Strip trailing slash so redirect URI matches Google Cloud exactly. */
export function normalizeRedirectUri(uri: string): string {
  const trimmed = uri.trim()
  if (!trimmed) return trimmed
  return trimmed.replace(/\/+$/, "")
}

export function isYouTubeOAuthConfigured(): boolean {
  return getYouTubeOAuthConfig() !== null
}

export function buildYouTubeAuthUrl(state: string): string {
  const config = getYouTubeOAuthConfig()
  if (!config) {
    throw new YouTubeApiError(
      "YouTube credentials are missing. Add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET to .env.local.",
      "missing_credentials",
    )
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: YOUTUBE_OAUTH_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  })

  return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`
}

export async function exchangeYouTubeAuthCode(code: string): Promise<YouTubeTokenResponse> {
  const config = getYouTubeOAuthConfig()
  if (!config) {
    throw new YouTubeApiError(
      "YouTube credentials are missing. Add them to .env.local.",
      "missing_credentials",
    )
  }

  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  })

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  const data = (await response.json()) as YouTubeTokenResponse & {
    error?: string
    error_description?: string
  }

  if (!response.ok || data.error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[YouTube OAuth] token exchange error:", {
        error: data.error,
        description: data.error_description,
        status: response.status,
        redirectUri: config.redirectUri,
      })
    }
    throw new YouTubeApiError(
      data.error_description || data.error || "OAuth token exchange failed.",
      data.error || "oauth_exchange_failed",
      response.status,
    )
  }

  if (!data.access_token) {
    throw new YouTubeApiError("OAuth response did not include an access token.", "no_access_token")
  }

  return data
}

export async function refreshYouTubeAccessToken(
  refreshToken: string,
): Promise<YouTubeTokenResponse> {
  const config = getYouTubeOAuthConfig()
  if (!config) {
    throw new YouTubeApiError(
      "YouTube credentials are missing. Add them to .env.local.",
      "missing_credentials",
    )
  }

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
  })

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  const data = (await response.json()) as YouTubeTokenResponse & {
    error?: string
    error_description?: string
  }

  if (!response.ok || data.error) {
    throw new YouTubeApiError(
      data.error_description || data.error || "Failed to refresh YouTube token.",
      data.error || "refresh_failed",
      response.status,
    )
  }

  if (!data.access_token) {
    throw new YouTubeApiError("Refresh response did not include an access token.", "no_access_token")
  }

  return data
}
