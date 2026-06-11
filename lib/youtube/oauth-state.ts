import { timingSafeEqual } from "node:crypto"
import type { NextResponse } from "next/server"

import { YOUTUBE_OAUTH_STATE_COOKIE } from "@/lib/youtube/types"

const OAUTH_STATE_MAX_AGE = 10 * 60

/** Cookie options for OAuth CSRF state (localhost-safe: secure only in production). */
export function getOAuthStateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE,
  }
}

export function setOAuthStateCookie(response: NextResponse, state: string): void {
  response.cookies.set(YOUTUBE_OAUTH_STATE_COOKIE, state, getOAuthStateCookieOptions())
}

export function clearOAuthStateCookie(response: NextResponse): void {
  response.cookies.set(YOUTUBE_OAUTH_STATE_COOKIE, "", {
    ...getOAuthStateCookieOptions(),
    maxAge: 0,
  })
}

/**
 * Resolve app origin for post-OAuth redirects.
 * Prefer YOUTUBE_REDIRECT_URI origin so host matches OAuth callback (localhost vs 127.0.0.1).
 */
export function resolveYouTubeOAuthAppOrigin(request?: Request): string {
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI?.trim()
  if (redirectUri) {
    try {
      return new URL(redirectUri).origin
    } catch {
      // fall through
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (appUrl) {
    try {
      return new URL(appUrl).origin
    } catch {
      // fall through
    }
  }

  if (request) {
    return new URL(request.url).origin
  }

  return "http://localhost:3000"
}

export function buildYouTubeOAuthRedirectPath(
  params: Record<string, string>,
  request?: Request,
): URL {
  const origin = resolveYouTubeOAuthAppOrigin(request)
  const url = new URL("/integrations", origin)
  url.searchParams.set("tab", "youtube-api")
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return url
}

export function oauthStatesMatch(cookieState: string | undefined, queryState: string): boolean {
  if (!cookieState || !queryState) return false
  const a = Buffer.from(cookieState)
  const b = Buffer.from(queryState)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function logOAuthStateDebug(details: {
  queryStatePresent: boolean
  cookieStatePresent: boolean
  match: boolean
}): void {
  if (process.env.NODE_ENV !== "development") return
  console.info("[YouTube OAuth] state validation:", {
    "state in query": details.queryStatePresent ? "yes" : "no",
    "state cookie": details.cookieStatePresent ? "yes" : "no",
    "state match": details.match ? "yes" : "no",
  })
}
