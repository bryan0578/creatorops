import { parseJsonStringArray } from "@/lib/safe-json"
import {
  normalizePromptRunModuleType,
} from "@/lib/prompt-run-linking"
import type { PromptCategory, PromptRun } from "@/lib/types"
import type { CampaignLinkedRecordType } from "@/lib/types"
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

function parseTags(raw: string | null | undefined): string[] {
  return parseJsonStringArray(raw ?? "[]", [])
}

function stringifyTags(tags: string[]): string {
  return JSON.stringify(tags.filter(Boolean))
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

  const outputType = run.outputRecordType ?? ""
  const linkedOutputType =
    outputType && typeof outputType === "string"
      ? (outputType as CampaignLinkedRecordType)
      : ""

  return {
    id: run.id,
    promptId: run.promptId ?? "",
    promptName: run.promptName ?? "",
    category: (run.category ?? "General") as PromptCategory,
    inputValues,
    completedPrompt: run.completedPrompt ?? "",
    aiResponse: run.aiResponse ?? "",
    notes: run.notes ?? "",
    campaignId: run.campaignId ?? "",
    campaignName: run.campaignName ?? "",
    moduleType: normalizePromptRunModuleType(run.moduleType),
    outputRecordId: run.outputRecordId ?? "",
    outputRecordType: linkedOutputType,
    experimentId: run.experimentId ?? "",
    sourcePromptId: run.sourcePromptId ?? "",
    sourcePromptName: run.sourcePromptName ?? "",
    runType: run.runType ?? "",
    tags: Array.isArray(run.tags) ? run.tags.filter(Boolean) : parseTags(""),
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
    campaignId: normalized.campaignId,
    campaignName: normalized.campaignName,
    moduleType: normalized.moduleType,
    outputRecordId: normalized.outputRecordId,
    outputRecordType: normalized.outputRecordType,
    experimentId: normalized.experimentId,
    sourcePromptId: normalized.sourcePromptId,
    sourcePromptName: normalized.sourcePromptName,
    runType: normalized.runType,
    tags: stringifyTags(normalized.tags),
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
    campaignId: normalized.campaignId,
    campaignName: normalized.campaignName,
    moduleType: normalized.moduleType,
    outputRecordId: normalized.outputRecordId,
    outputRecordType: normalized.outputRecordType,
    experimentId: normalized.experimentId,
    sourcePromptId: normalized.sourcePromptId,
    sourcePromptName: normalized.sourcePromptName,
    runType: normalized.runType,
    tags: stringifyTags(normalized.tags),
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
    campaignId: row.campaignId ?? "",
    campaignName: row.campaignName ?? "",
    moduleType: row.moduleType ?? "",
    outputRecordId: row.outputRecordId ?? "",
    outputRecordType: (row.outputRecordType ?? "") as CampaignLinkedRecordType | "",
    experimentId: row.experimentId ?? "",
    sourcePromptId: row.sourcePromptId ?? "",
    sourcePromptName: row.sourcePromptName ?? "",
    runType: row.runType ?? "",
    tags: parseTags(row.tags),
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}
