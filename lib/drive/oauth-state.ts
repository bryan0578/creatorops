import { timingSafeEqual } from "node:crypto"
import type { NextResponse } from "next/server"

import { DRIVE_OAUTH_STATE_COOKIE } from "@/lib/drive/types"

const OAUTH_STATE_MAX_AGE = 10 * 60

export function getDriveOAuthStateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE,
  }
}

export function setDriveOAuthStateCookie(response: NextResponse, state: string): void {
  response.cookies.set(DRIVE_OAUTH_STATE_COOKIE, state, getDriveOAuthStateCookieOptions())
}

export function clearDriveOAuthStateCookie(response: NextResponse): void {
  response.cookies.set(DRIVE_OAUTH_STATE_COOKIE, "", {
    ...getDriveOAuthStateCookieOptions(),
    maxAge: 0,
  })
}

export function resolveDriveOAuthAppOrigin(request?: Request): string {
  const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI?.trim()
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

export function buildDriveOAuthRedirectPath(
  params: Record<string, string>,
  request?: Request,
): URL {
  const origin = resolveDriveOAuthAppOrigin(request)
  const url = new URL("/integrations", origin)
  url.searchParams.set("tab", "google-drive")
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
