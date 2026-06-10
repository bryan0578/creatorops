/**
 * Safe JSON parsing for CreatorOps — avoids crashes on malformed stored/imported data.
 * Does not mutate source values; callers decide how to surface Data Health issues.
 */

export function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (value === undefined || value === null) return fallback

  if (typeof value !== "string") {
    return (value as T) ?? fallback
  }

  const trimmed = value.trim()
  if (!trimmed) return fallback

  try {
    return JSON.parse(trimmed) as T
  } catch {
    return fallback
  }
}

export function parseJsonArray(value: unknown, fallback: unknown[] = []): unknown[] {
  const parsed = safeJsonParse<unknown>(value, fallback)
  return Array.isArray(parsed) ? parsed : fallback
}

export function parseJsonStringArray(
  value: unknown,
  fallback: string[] = [],
): string[] {
  const parsed = parseJsonArray(value, fallback)
  return parsed.filter((item): item is string => typeof item === "string")
}

export function parseJsonObject(
  value: unknown,
  fallback: Record<string, unknown> = {},
): Record<string, unknown> {
  const parsed = safeJsonParse<unknown>(value, fallback)
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>
  }
  return fallback
}

export function safeStringify(value: unknown, fallback = "{}"): string {
  try {
    return JSON.stringify(value ?? JSON.parse(fallback))
  } catch {
    return fallback
  }
}

export function isValidJsonString(
  value: string,
  expected: "array" | "object",
): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (expected === "array") return Array.isArray(parsed)
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
  } catch {
    return false
  }
}

export type ImportJsonParseResult =
  | { ok: true; value: unknown }
  | { ok: false; message: string }

/** Parse user-selected import/backup JSON files without throwing. */
export function parseImportJsonText(text: string): ImportJsonParseResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: false, message: "Import file is empty." }
  }

  try {
    return { ok: true, value: JSON.parse(trimmed) as unknown }
  } catch {
    return { ok: false, message: "Invalid JSON file." }
  }
}
