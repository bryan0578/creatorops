import { parseJsonStringArray } from "@/lib/safe-json"

export function parseStringList(value: unknown): string[] {
  if (value == null || value === "") return []
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === "string") return parseJsonStringArray(value, [])
  return []
}

export function stringifyStringList(value: unknown): string {
  return JSON.stringify(parseStringList(value))
}

export function orNotSet(value: string | null | undefined): string {
  const text = value?.trim()
  return text ? text : "Not set"
}

export function dedupeStringsCaseInsensitive(items: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    const trimmed = item.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

/** Safe tag list for display: trims, dedupes, handles JSON/malformed input. */
export function normalizeTagsForDisplay(value: unknown): string[] {
  return dedupeStringsCaseInsensitive(parseStringList(value))
}

export function parseTagsFromInput(value: string): string[] {
  return dedupeStringsCaseInsensitive(
    value
      .split(/[,;\n]+/)
      .map((t) => t.trim())
      .filter(Boolean),
  )
}

export function parseListFromInput(value: string): string[] {
  return dedupeStringsCaseInsensitive(
    value
      .split(/\n|,/)
      .map((t) => t.trim())
      .filter(Boolean),
  )
}

export function formatListForInput(items: string[]): string {
  return items.join("\n")
}

export function formatTagsForInput(tags: string[]): string {
  return tags.join(", ")
}

/** Safe parse for JSON array fields stored as strings in SQLite. */
export const parseJsonArraySafe = parseStringList

/** Convert newline-separated input to a string array. */
export const linesToJsonArray = parseListFromInput

/** Render a string array as one item per line for textarea editing. */
export const jsonArrayToLines = formatListForInput
