import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import { fetchDriveUserProfile } from "@/lib/drive/client"
import { exchangeDriveAuthCode } from "@/lib/drive/oauth"
import {
  DRIVE_CONNECTION_ID,
  DRIVE_OAUTH_SCOPES,
} from "@/lib/drive/types"
import {
  emptyDriveConnectionCreate,
  storeDriveTokens,
} from "@/lib/drive/token-store"
import { isTokenEncryptionConfigured } from "@/lib/youtube/token-crypto"

const DRIVE_PATHS = ["/integrations", "/assets", "/campaigns", "/backups", "/data-health", "/automation", "/search"]

function revalidateDriveRoutes() {
  for (const path of DRIVE_PATHS) revalidatePath(path)
}

export async function saveDriveOAuthConnection(input: {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  tokenType?: string
  scopes?: string[]
}): Promise<void> {
  const stored = storeDriveTokens(input)
  const profile = await fetchDriveUserProfile(input.accessToken)
  const now = new Date()

  await prisma.driveConnection.upsert({
    where: { id: DRIVE_CONNECTION_ID },
    create: {
      ...emptyDriveConnectionCreate(now),
      ...stored,
      accountEmail: profile.email,
      displayName: profile.name,
      lastSyncedAt: now,
    },
    update: {
      accessTokenEncrypted: stored.accessTokenEncrypted,
      refreshTokenEncrypted: stored.refreshTokenEncrypted,
      tokenType: stored.tokenType,
      expiryDate: stored.expiryDate,
      scopes: stored.scopes,
      status: "Connected",
      accountEmail: profile.email || undefined,
      displayName: profile.name || undefined,
      lastSyncedAt: now,
      updatedAt: now,
    },
  })

  revalidateDriveRoutes()
}

export async function runDriveOAuthCallbackFlow(code: string): Promise<void> {
  if (!isTokenEncryptionConfigured()) {
    throw new Error("missing_encryption_key")
  }

  const tokenResponse = await exchangeDriveAuthCode(code)
  await saveDriveOAuthConnection({
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresIn: tokenResponse.expires_in,
    tokenType: tokenResponse.token_type,
    scopes: tokenResponse.scope?.split(" ").filter(Boolean) ?? [...DRIVE_OAUTH_SCOPES],
  })
}
