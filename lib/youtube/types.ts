/**
 * YouTube Data API — shared types and constants.
 */

export const YOUTUBE_CONNECTION_ID = "creatorops-youtube-connection"

export const YOUTUBE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
] as const

export const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"
export const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
export const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"

export const YOUTUBE_OAUTH_STATE_COOKIE = "creatorops_youtube_oauth_state"

export interface YouTubeOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface YouTubeTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope?: string
  token_type?: string
}

export interface YouTubeApiChannel {
  id: string
  title: string
  handle: string
  url: string
  thumbnailUrl: string
  uploadsPlaylistId?: string
}

export interface YouTubeApiVideoSummary {
  youtubeVideoId: string
  title: string
  description: string
  channelId: string
  channelTitle: string
  publishedAt: string | null
  thumbnailUrl: string
  videoUrl: string
  duration: string
  privacyStatus: string
  viewCount: number
  likeCount: number
  commentCount: number
  raw: Record<string, unknown>
}

export class YouTubeApiError extends Error {
  readonly code: string
  readonly status?: number

  constructor(message: string, code: string, status?: number) {
    super(message)
    this.name = "YouTubeApiError"
    this.code = code
    this.status = status
  }
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
}

export function parseYouTubeVideoStats(rawJson: string): {
  viewCount: number
  likeCount: number
  commentCount: number
} {
  try {
    const parsed = JSON.parse(rawJson) as {
      statistics?: {
        viewCount?: string
        likeCount?: string
        commentCount?: string
      }
    }
    const stats = parsed.statistics ?? {}
    return {
      viewCount: Number.parseInt(stats.viewCount ?? "0", 10) || 0,
      likeCount: Number.parseInt(stats.likeCount ?? "0", 10) || 0,
      commentCount: Number.parseInt(stats.commentCount ?? "0", 10) || 0,
    }
  } catch {
    return { viewCount: 0, likeCount: 0, commentCount: 0 }
  }
}
