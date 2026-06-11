import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"

import { buildDriveAuthUrl } from "@/lib/drive/oauth"
import {
  buildDriveOAuthRedirectPath,
  setDriveOAuthStateCookie,
} from "@/lib/drive/oauth-state"
import { isTokenEncryptionConfigured } from "@/lib/youtube/token-crypto"
import { isDriveOAuthConfigured } from "@/lib/drive/oauth"

export async function GET(request: Request) {
  if (!isDriveOAuthConfigured()) {
    return NextResponse.redirect(
      buildDriveOAuthRedirectPath({ error: "missing_credentials" }, request),
    )
  }

  if (!isTokenEncryptionConfigured()) {
    return NextResponse.redirect(
      buildDriveOAuthRedirectPath({ error: "missing_encryption_key" }, request),
    )
  }

  const state = randomBytes(24).toString("base64url")
  const response = NextResponse.redirect(buildDriveAuthUrl(state))
  setDriveOAuthStateCookie(response, state)
  return response
}
