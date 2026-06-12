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

export function parseTagsFromInput(value: string): string[] {
  return value
    .split(/[,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

export function parseListFromInput(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((t) => t.trim())
    .filter(Boolean)
}

export function formatListForInput(items: string[]): string {
  return items.join("\n")
}

export function formatTagsForInput(tags: string[]): string {
  return tags.join(", ")
}
