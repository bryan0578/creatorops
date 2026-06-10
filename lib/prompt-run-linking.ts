import type {
  CampaignLinkedRecordType,
  PromptCategory,
  PromptRun,
  PromptRunModuleType,
} from "@/lib/types"
import { PROMPT_RUN_MODULE_TYPES } from "@/lib/types"
import { buildRecordHref } from "@/lib/data/related-records"

export { PROMPT_RUN_MODULE_TYPES }

export const MODULE_TO_OUTPUT_RECORD_TYPE: Partial<
  Record<PromptRunModuleType, CampaignLinkedRecordType>
> = {
  "YouTube Packaging": "youtube-package",
  "YouTube Thumbnail": "youtube-thumbnail",
  "Release Plan": "release-plan",
  "Social Repurposing": "social-repurposing",
  "Email Campaign": "email-campaign",
  "Merch Idea": "merch-idea",
  "Product Listing": "product-listing",
  "Mockup Prompt": "mockup-prompt",
  Analytics: "analytics",
  Experiment: "experiment",
}

export type SaveLinkedPromptRunInput = {
  id?: string
  promptId?: string
  promptName?: string
  category?: PromptCategory
  campaignId?: string
  campaignName?: string
  moduleType?: PromptRunModuleType | ""
  outputRecordId?: string
  outputRecordType?: CampaignLinkedRecordType | ""
  experimentId?: string
  sourcePromptId?: string
  sourcePromptName?: string
  runType?: string
  completedPrompt: string
  aiResponse?: string
  inputValues?: Record<string, string>
  notes?: string
  tags?: string[]
}

export function normalizePromptRunModuleType(
  value: string | undefined | null,
): PromptRunModuleType | "" {
  if (!value?.trim()) return ""
  return PROMPT_RUN_MODULE_TYPES.includes(value as PromptRunModuleType)
    ? (value as PromptRunModuleType)
    : "Other"
}

export function buildLinkedPromptRun(
  input: SaveLinkedPromptRunInput,
  idFactory: () => string,
): PromptRun {
  const now = Date.now()
  const moduleType = normalizePromptRunModuleType(input.moduleType)
  const outputRecordType =
    input.outputRecordType ??
    (moduleType ? MODULE_TO_OUTPUT_RECORD_TYPE[moduleType] ?? "" : "")

  return {
    id: input.id ?? idFactory(),
    promptId: input.promptId ?? input.sourcePromptId ?? "",
    promptName:
      input.promptName ??
      input.sourcePromptName ??
      (moduleType ? `${moduleType} prompt run` : "Module prompt run"),
    category: input.category ?? "General",
    inputValues: input.inputValues ?? {},
    completedPrompt: input.completedPrompt ?? "",
    aiResponse: input.aiResponse ?? "",
    notes: input.notes ?? "",
    campaignId: input.campaignId ?? "",
    campaignName: input.campaignName ?? "",
    moduleType,
    outputRecordId: input.outputRecordId ?? "",
    outputRecordType,
    experimentId: input.experimentId ?? "",
    sourcePromptId: input.sourcePromptId ?? input.promptId ?? "",
    sourcePromptName: input.sourcePromptName ?? input.promptName ?? "",
    runType: input.runType ?? (moduleType ? "module" : "runner"),
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  }
}

export function getCampaignPromptRuns(
  runs: PromptRun[],
  campaignId: string,
): PromptRun[] {
  if (!campaignId) return []
  return runs
    .filter((run) => run.campaignId === campaignId)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export function getExperimentPromptRuns(
  runs: PromptRun[],
  experimentId: string,
): PromptRun[] {
  if (!experimentId) return []
  return runs
    .filter((run) => run.experimentId === experimentId)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export function getOutputRecordHref(
  outputRecordType: string,
  outputRecordId: string,
): string | null {
  if (!outputRecordType || !outputRecordId) return null
  try {
    return buildRecordHref(
      outputRecordType as CampaignLinkedRecordType,
      outputRecordId,
    )
  } catch {
    return null
  }
}

export function canSaveLinkedPromptRun(input: {
  completedPrompt?: string
  aiResponse?: string
}): boolean {
  return Boolean(input.completedPrompt?.trim() || input.aiResponse?.trim())
}

export function promptRunRunnerHref(
  runId: string,
  campaignId?: string,
): string {
  const params = new URLSearchParams()
  params.set("recordId", runId)
  if (campaignId?.trim()) params.set("campaignId", campaignId.trim())
  return `/runner?${params.toString()}`
}

export function promptRunsForCampaignHref(campaignId: string): string {
  return `/runner?campaignId=${encodeURIComponent(campaignId)}`
}
