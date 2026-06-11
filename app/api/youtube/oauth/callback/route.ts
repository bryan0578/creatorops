import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { runYouTubeOAuthCallbackFlow } from "@/lib/youtube/complete-oauth-connection"
import {
  logOAuthCallbackStep,
  logOAuthEnvCheck,
  validateYouTubeOAuthEnvForCallback,
} from "@/lib/youtube/oauth-callback-diagnostics"
import {
  mapToYouTubeOAuthCallbackErrorCode,
  YouTubeOAuthCallbackError,
} from "@/lib/youtube/oauth-callback-errors"
import {
  buildYouTubeOAuthRedirectPath,
  clearOAuthStateCookie,
  logOAuthStateDebug,
  oauthStatesMatch,
} from "@/lib/youtube/oauth-state"
import { YOUTUBE_OAUTH_STATE_COOKIE } from "@/lib/youtube/types"

function redirectWithError(code: string, request: Request): NextResponse {
  const response = NextResponse.redirect(
    buildYouTubeOAuthRedirectPath({ error: code }, request),
  )
  clearOAuthStateCookie(response)
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

  if (!code) {
    return redirectWithError("missing_code", request)
  }
  if (!state) {
    return redirectWithError("oauth_state_mismatch", request)
  }

  const cookieStore = await cookies()
  const savedState = cookieStore.get(YOUTUBE_OAUTH_STATE_COOKIE)?.value
  const match = oauthStatesMatch(savedState, state)

  logOAuthStateDebug({
    queryStatePresent: Boolean(state),
    cookieStatePresent: Boolean(savedState),
    match,
  })

  if (!match) {
    return redirectWithError("oauth_state_mismatch", request)
  }

  logOAuthCallbackStep("state valid")

  const envCheck = validateYouTubeOAuthEnvForCallback()
  logOAuthEnvCheck()
  if (!envCheck.ok) {
    return redirectWithError(envCheck.code, request)
  }

  try {
    const result = await runYouTubeOAuthCallbackFlow(code)

    const response = NextResponse.redirect(
      buildYouTubeOAuthRedirectPath(
        result.needsChannelSelection
          ? { warning: "channel_select_required" }
          : { connected: "1" },
        request,
      ),
    )
    clearOAuthStateCookie(response)
    return response
  } catch (error) {
    const code =
      error instanceof YouTubeOAuthCallbackError
        ? error.code
        : mapToYouTubeOAuthCallbackErrorCode(error)
    return redirectWithError(code, request)
  }
}
