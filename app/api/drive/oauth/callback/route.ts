import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { runDriveOAuthCallbackFlow } from "@/lib/drive/complete-oauth-connection"
import {
  buildDriveOAuthRedirectPath,
  clearDriveOAuthStateCookie,
  oauthStatesMatch,
} from "@/lib/drive/oauth-state"
import { DRIVE_OAUTH_STATE_COOKIE } from "@/lib/drive/types"
import { isTokenEncryptionConfigured } from "@/lib/youtube/token-crypto"
import { isDriveOAuthConfigured } from "@/lib/drive/oauth"

function redirectWithError(code: string, request: Request): NextResponse {
  const response = NextResponse.redirect(
    buildDriveOAuthRedirectPath({ error: code }, request),
  )
  clearDriveOAuthStateCookie(response)
  return response
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const error = searchParams.get("error")
  if (error) {
    return redirectWithError(error === "access_denied" ? "consent_denied" : error, request)
  }

  const code = searchParams.get("code")
  const state = searchParams.get("state")
  if (!code) return redirectWithError("missing_code", request)
  if (!state) return redirectWithError("oauth_state_mismatch", request)

  const cookieStore = await cookies()
  const savedState = cookieStore.get(DRIVE_OAUTH_STATE_COOKIE)?.value
  if (!oauthStatesMatch(savedState, state)) {
    return redirectWithError("oauth_state_mismatch", request)
  }

  if (!isDriveOAuthConfigured()) {
    return redirectWithError("missing_credentials", request)
  }
  if (!isTokenEncryptionConfigured()) {
    return redirectWithError("missing_encryption_key", request)
  }

  try {
    await runDriveOAuthCallbackFlow(code)
    const response = NextResponse.redirect(
      buildDriveOAuthRedirectPath({ connected: "1" }, request),
    )
    clearDriveOAuthStateCookie(response)
    return response
  } catch (error) {
    const code =
      error instanceof Error && error.message === "missing_encryption_key"
        ? "missing_encryption_key"
        : "oauth_failed"
    return redirectWithError(code, request)
  }
}
