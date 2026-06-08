import type { Prompt, PromptCategory } from "@/lib/types"
import type { Prompt as PrismaPrompt } from "@/lib/generated/prisma/client"

/**
 * Shared prompt data layer — maps between app `Prompt` types and Prisma rows.
 * TODO: Use this pattern for future module migrations (workflows, runs, etc.).
 */

export function parseJsonStringArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : []
  } catch {
    return []
  }
}

export function stringifyJsonArray(values: string[]): string {
  return JSON.stringify(values)
}

export function normalizePrompt(
  prompt: Partial<Prompt> & Pick<Prompt, "id">,
): Prompt {
  const now = Date.now()
  return {
    id: prompt.id,
    name: prompt.name ?? "",
    category: (prompt.category ?? "General") as PromptCategory,
    description: prompt.description ?? "",
    promptText: prompt.promptText ?? "",
    variables: Array.isArray(prompt.variables) ? prompt.variables : [],
    outputFormat: prompt.outputFormat ?? "",
    tags: Array.isArray(prompt.tags) ? prompt.tags : [],
    rating: typeof prompt.rating === "number" ? prompt.rating : 0,
    notes: prompt.notes ?? "",
    createdAt: prompt.createdAt ?? now,
    updatedAt: prompt.updatedAt ?? now,
  }
}

export function promptToPrismaCreate(prompt: Prompt) {
  const normalized = normalizePrompt(prompt)
  return {
    id: normalized.id,
    name: normalized.name,
    category: normalized.category,
    description: normalized.description,
    promptText: normalized.promptText,
    variables: stringifyJsonArray(normalized.variables),
    outputFormat: normalized.outputFormat,
    tags: stringifyJsonArray(normalized.tags),
    rating: normalized.rating,
    notes: normalized.notes,
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function promptToPrismaUpdate(prompt: Prompt) {
  const normalized = normalizePrompt(prompt)
  return {
    name: normalized.name,
    category: normalized.category,
    description: normalized.description,
    promptText: normalized.promptText,
    variables: stringifyJsonArray(normalized.variables),
    outputFormat: normalized.outputFormat,
    tags: stringifyJsonArray(normalized.tags),
    rating: normalized.rating,
    notes: normalized.notes,
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function prismaPromptToPrompt(row: PrismaPrompt): Prompt {
  return normalizePrompt({
    id: row.id,
    name: row.name,
    category: row.category as PromptCategory,
    description: row.description,
    promptText: row.promptText,
    variables: parseJsonStringArray(row.variables),
    outputFormat: row.outputFormat,
    tags: parseJsonStringArray(row.tags),
    rating: row.rating,
    notes: row.notes,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}
