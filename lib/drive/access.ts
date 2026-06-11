import { prisma } from "@/lib/prisma"
import { refreshDriveAccessToken } from "@/lib/drive/oauth"
import {
  readDriveAccessToken,
  readDriveRefreshToken,
  storeDriveTokens,
} from "@/lib/drive/token-store"
import { DRIVE_CONNECTION_ID } from "@/lib/drive/types"

const OAUTH_ACTIVE = new Set(["Connected", "Expired"])

export async function tryGetDriveAccessToken(): Promise<
  | { ok: true; accessToken: string }
  | { ok: false; code: string; message?: string }
> {
  const row = await prisma.driveConnection.findUnique({
    where: { id: DRIVE_CONNECTION_ID },
  })
  if (!row || !OAUTH_ACTIVE.has(row.status)) {
    return { ok: false, code: "not_connected" }
  }

  const accessToken = readDriveAccessToken(row.accessTokenEncrypted)
  const refreshToken = readDriveRefreshToken(row.refreshTokenEncrypted)
  const expiryMs = row.expiryDate?.getTime() ?? 0
  const stillValid = accessToken && expiryMs > Date.now() + 60_000

  if (stillValid && accessToken) {
    return { ok: true, accessToken }
  }

  if (!refreshToken) {
    await prisma.driveConnection.update({
      where: { id: row.id },
      data: { status: "Expired", updatedAt: new Date() },
    })
    return { ok: false, code: "refresh_missing", message: "Reconnect Google Drive." }
  }

  try {
    const refreshed = await refreshDriveAccessToken(refreshToken)
    const stored = storeDriveTokens({
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? refreshToken,
      expiresIn: refreshed.expires_in,
      tokenType: refreshed.token_type,
    })
    await prisma.driveConnection.update({
      where: { id: row.id },
      data: {
        accessTokenEncrypted: stored.accessTokenEncrypted,
        refreshTokenEncrypted: stored.refreshTokenEncrypted,
        tokenType: stored.tokenType,
        expiryDate: stored.expiryDate,
        scopes: stored.scopes,
        status: "Connected",
        updatedAt: new Date(),
      },
    })
    return { ok: true, accessToken: refreshed.access_token }
  } catch (error) {
    await prisma.driveConnection.update({
      where: { id: row.id },
      data: { status: "Expired", updatedAt: new Date() },
    })
    return {
      ok: false,
      code: "refresh_failed",
      message: error instanceof Error ? error.message : "Token refresh failed.",
    }
  }
}

export async function requireDriveAccessToken(): Promise<string> {
  const result = await tryGetDriveAccessToken()
  if (!result.ok) {
    throw new Error(result.message || "Google Drive is not connected.")
  }
  return result.accessToken
}
