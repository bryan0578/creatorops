import {
  parseJsonStringArray,
  stringifyJsonArray,
} from "@/lib/data/prompts"
import type { PromptCategory, PromptRun } from "@/lib/types"
import type { PromptRun as PrismaPromptRun } from "@/lib/generated/prisma/client"

/**
 * Shared prompt-run data layer — maps between app types and Prisma rows.
 */

export function parseJsonRecord(
  value: string | null | undefined,
): Record<string, string> {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    const result: Record<string, string> = {}
    for (const [key, val] of Object.entries(parsed)) {
      if (typeof val === "string") result[key] = val
    }
    return result
  } catch {
    return {}
  }
}

export function stringifyJsonRecord(values: Record<string, string>): string {
  return JSON.stringify(values)
}

export function normalizePromptRun(
  run: Partial<PromptRun> & Pick<PromptRun, "id">,
): PromptRun {
  const now = Date.now()
  const inputValues =
    run.inputValues && typeof run.inputValues === "object"
      ? Object.fromEntries(
          Object.entries(run.inputValues).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        )
      : {}

  return {
    id: run.id,
    promptId: run.promptId ?? "",
    promptName: run.promptName ?? "",
    category: (run.category ?? "General") as PromptCategory,
    inputValues,
    completedPrompt: run.completedPrompt ?? "",
    aiResponse: run.aiResponse ?? "",
    notes: run.notes ?? "",
    createdAt: run.createdAt ?? now,
    updatedAt: run.updatedAt ?? now,
  }
}

export function promptRunToPrismaCreate(run: PromptRun) {
  const normalized = normalizePromptRun(run)
  return {
    id: normalized.id,
    promptId: normalized.promptId,
    promptName: normalized.promptName,
    category: normalized.category,
    inputValues: stringifyJsonRecord(normalized.inputValues),
    completedPrompt: normalized.completedPrompt,
    aiResponse: normalized.aiResponse,
    notes: normalized.notes,
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function promptRunToPrismaUpdate(run: PromptRun) {
  const normalized = normalizePromptRun(run)
  return {
    promptId: normalized.promptId,
    promptName: normalized.promptName,
    category: normalized.category,
    inputValues: stringifyJsonRecord(normalized.inputValues),
    completedPrompt: normalized.completedPrompt,
    aiResponse: normalized.aiResponse,
    notes: normalized.notes,
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function prismaPromptRunToPromptRun(row: PrismaPromptRun): PromptRun {
  return normalizePromptRun({
    id: row.id,
    promptId: row.promptId,
    promptName: row.promptName,
    category: row.category as PromptCategory,
    inputValues: parseJsonRecord(row.inputValues),
    completedPrompt: row.completedPrompt,
    aiResponse: row.aiResponse,
    notes: row.notes,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}

// Re-export for callers that need JSON helpers alongside prompt-run mappers.
export { parseJsonStringArray, stringifyJsonArray }
