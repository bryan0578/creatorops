/** Parse and serialize string arrays stored as JSON strings in SQLite/Prisma fields. */

export function parseJsonStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!value) return [...fallback]

  if (Array.isArray(value)) {
    const items = value
      .map((item) => String(item).trim())
      .filter(Boolean)
    return items.length ? items : [...fallback]
  }

  if (typeof value !== "string") {
    return [...fallback]
  }

  const trimmed = value.trim()
  if (!trimmed) return [...fallback]

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      const items = parsed
        .map((item) => String(item).trim())
        .filter(Boolean)
      return items.length ? items : [...fallback]
    }
  } catch {
    // fall through to delimiter split
  }

  const split = trimmed
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)

  return split.length ? split : [...fallback]
}

export function dedupeStringArray(value: unknown): string[] {
  const items = parseJsonStringArray(value)
  return items.filter(
    (item, index, arr) =>
      arr.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === index,
  )
}

export function stringifyStringArray(value: unknown): string {
  return JSON.stringify(dedupeStringArray(value))
}
