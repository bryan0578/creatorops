import {
  DRIVE_OAUTH_SCOPES,
  DriveApiError,
  GOOGLE_OAUTH_AUTH_URL,
  GOOGLE_OAUTH_TOKEN_URL,
  type DriveOAuthConfig,
  type DriveTokenResponse,
} from "@/lib/drive/types"

function normalizeRedirectUri(uri: string): string {
  const trimmed = uri.trim()
  if (!trimmed) return trimmed
  return trimmed.replace(/\/+$/, "")
}

export function getDriveOAuthConfig(): DriveOAuthConfig | null {
  const driveClientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim()
  const driveClientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim()
  const driveRedirectUri = normalizeRedirectUri(
    process.env.GOOGLE_DRIVE_REDIRECT_URI?.trim() ||
      "http://localhost:3000/api/drive/oauth/callback",
  )

  if (driveClientId && driveClientSecret) {
    return {
      clientId: driveClientId,
      clientSecret: driveClientSecret,
      redirectUri: driveRedirectUri,
      credentialSource: "drive",
    }
  }

  const youtubeClientId = process.env.YOUTUBE_CLIENT_ID?.trim()
  const youtubeClientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim()
  if (youtubeClientId && youtubeClientSecret) {
    return {
      clientId: youtubeClientId,
      clientSecret: youtubeClientSecret,
      redirectUri: driveRedirectUri,
      credentialSource: "youtube-fallback",
    }
  }

  return null
}

export function isDriveOAuthConfigured(): boolean {
  return getDriveOAuthConfig() !== null
}

export function buildDriveAuthUrl(state: string): string {
  const config = getDriveOAuthConfig()
  if (!config) {
    throw new DriveApiError(
      "Google Drive credentials are missing. Add GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET (or YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET) to .env.local.",
      "missing_credentials",
    )
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: DRIVE_OAUTH_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  })

  return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`
}

async function exchangeToken(body: URLSearchParams): Promise<DriveTokenResponse> {
  const config = getDriveOAuthConfig()
  if (!config) {
    throw new DriveApiError(
      "Google Drive credentials are missing.",
      "missing_credentials",
    )
  }

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  const data = (await response.json()) as DriveTokenResponse & {
    error?: string
    error_description?: string
  }

  if (!response.ok || data.error) {
    throw new DriveApiError(
      data.error_description || data.error || "OAuth token exchange failed.",
      data.error || "oauth_exchange_failed",
      response.status,
    )
  }

  if (!data.access_token) {
    throw new DriveApiError("OAuth response did not include an access token.", "no_access_token")
  }

  return data
}

export async function exchangeDriveAuthCode(code: string): Promise<DriveTokenResponse> {
  const config = getDriveOAuthConfig()
  if (!config) {
    throw new DriveApiError("Google Drive credentials are missing.", "missing_credentials")
  }

  return exchangeToken(
    new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  )
}

export async function refreshDriveAccessToken(refreshToken: string): Promise<DriveTokenResponse> {
  const config = getDriveOAuthConfig()
  if (!config) {
    throw new DriveApiError("Google Drive credentials are missing.", "missing_credentials")
  }

  return exchangeToken(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    }),
  )
}
