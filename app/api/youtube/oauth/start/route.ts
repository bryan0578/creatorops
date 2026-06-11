import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"

import { buildYouTubeAuthUrl } from "@/lib/youtube/oauth"
import {
  buildYouTubeOAuthRedirectPath,
  setOAuthStateCookie,
} from "@/lib/youtube/oauth-state"
import { isTokenEncryptionConfigured } from "@/lib/youtube/token-crypto"

export async function GET(request: Request) {
  const clientId = process.env.YOUTUBE_CLIENT_ID?.trim()
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim()

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      buildYouTubeOAuthRedirectPath({ error: "missing_credentials" }, request),
    )
  }

  if (!isTokenEncryptionConfigured()) {
    return NextResponse.redirect(
      buildYouTubeOAuthRedirectPath({ error: "missing_encryption_key" }, request),
    )
  }

  const state = randomBytes(24).toString("base64url")
  const url = buildYouTubeAuthUrl(state)

  const response = NextResponse.redirect(url)
  setOAuthStateCookie(response, state)

  if (process.env.NODE_ENV === "development") {
    console.info("[YouTube OAuth] start: fresh state issued and attached to redirect response")
  }

  return response
}
