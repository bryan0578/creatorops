import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12

/**
 * Derive a 32-byte AES-256 key from CREATOROPS_TOKEN_ENCRYPTION_KEY.
 * Accepts any string (e.g. output of `openssl rand -base64 32`) via SHA-256.
 */
function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest()
}

export function isTokenEncryptionConfigured(): boolean {
  return Boolean(process.env.CREATOROPS_TOKEN_ENCRYPTION_KEY?.trim())
}

export function getTokenEncryptionKey(): string | null {
  const key = process.env.CREATOROPS_TOKEN_ENCRYPTION_KEY?.trim()
  return key || null
}

/** Encrypt a token for local SQLite storage. Requires CREATOROPS_TOKEN_ENCRYPTION_KEY. */
export function encryptToken(plaintext: string): string {
  const secret = getTokenEncryptionKey()
  if (!secret) {
    throw new Error(
      "CREATOROPS_TOKEN_ENCRYPTION_KEY is required to store YouTube OAuth tokens.",
    )
  }
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, deriveKey(secret), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`
}

/** Decrypt a token from local SQLite storage. */
export function decryptToken(payload: string): string {
  const secret = getTokenEncryptionKey()
  if (!secret) {
    throw new Error(
      "CREATOROPS_TOKEN_ENCRYPTION_KEY is required to read YouTube OAuth tokens.",
    )
  }
  const [ivB64, tagB64, dataB64] = payload.split(".")
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted token payload.")
  }
  const iv = Buffer.from(ivB64, "base64url")
  const tag = Buffer.from(tagB64, "base64url")
  const data = Buffer.from(dataB64, "base64url")
  const decipher = createDecipheriv(ALGORITHM, deriveKey(secret), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8")
}
