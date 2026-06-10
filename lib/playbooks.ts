import { addDays, safeParseDate, toDateKey } from "@/lib/date-utils"
import {
  generateDefaultPublishingChecklist,
  normalizePublishingChecklistItem,
} from "@/lib/data/publishing-checklist"
import { parseJsonObject, parseJsonStringArray } from "@/lib/safe-json"
import {
  PLAYBOOK_STATUSES,
  PLAYBOOK_TYPES,
  PUBLISHING_CHECKLIST_PHASES,
  type PlaybookAssetChecklistItem,
  type PlaybookChecklistTemplateItem,
  type PlaybookDefaultCampaignFields,
  type PlaybookExperimentTemplateItem,
  type PlaybookFormValues,
  type PlaybookPromptChecklistItem,
  type PlaybookPublishingChecklistTemplate,
  type PlaybookRecord,
  type PlaybookTaskTemplateItem,
  type CampaignTask,
  type PublishingChecklist,
  type PublishingChecklistPhase,
} from "@/lib/types"

export { PLAYBOOK_STATUSES, PLAYBOOK_TYPES } from "@/lib/types"

export const PLAYBOOK_REFERENCE_PREFIX = "Playbook:"

export function emptyPlaybookForm(): PlaybookFormValues {
  return {
    name: "",
    description: "",
    playbookType: "Other",
    category: "",
    status: "Active",
    targetCampaignType: "",
    recommendedPresetId: "",
    recommendedPresetName: "",
    recommendedWorkflowId: "",
    recommendedWorkflowName: "",
    defaultCampaignFields: {},
    taskTemplate: [],
    publishingChecklistTemplate: { version: 1, items: [] },
    assetChecklist: [],
    promptChecklist: [],
    experimentTemplate: [],
    automationNotes: "",
    exportPackTemplate: "full-release-pack",
    tags: "",
    notes: "",
  }
}

export function parsePlaybookTags(raw: string | string[] | undefined | null): string[] {
  if (Array.isArray(raw)) return raw.map((tag) => String(tag).trim()).filter(Boolean)
  return parseJsonStringArray(raw ?? "[]", [])
}

export function formatPlaybookTags(tags: string[]): string {
  return tags.filter(Boolean).join(", ")
}

export function tagsFromPlaybookInput(input: string): string[] {
  const trimmed = input.trim()
  if (!trimmed) return []
  if (trimmed.startsWith("[")) return parsePlaybookTags(trimmed)
  return trimmed
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function parseTaskTemplate(raw: unknown): PlaybookTaskTemplateItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const obj = item as PlaybookTaskTemplateItem
      if (!obj.title?.trim()) return null
      return {
        title: obj.title.trim(),
        description: obj.description?.trim() ?? "",
        phase: obj.phase?.trim() ?? "",
        status: obj.status?.trim() ?? "To Do",
        priority: obj.priority?.trim() ?? "",
        dueOffset: obj.dueOffset?.trim() ?? "",
      }
    })
    .filter((item): item is PlaybookTaskTemplateItem => item != null)
}

function parseChecklistTemplate(raw: unknown): PlaybookPublishingChecklistTemplate {
  if (!raw || typeof raw !== "object") return { version: 1, items: [] }
  const obj = raw as PlaybookPublishingChecklistTemplate
  const items = Array.isArray(obj.items) ? obj.items : []
  return {
    version: 1,
    items: items
      .map((item) => {
        if (!item?.title?.trim()) return null
        const phase = PUBLISHING_CHECKLIST_PHASES.includes(item.phase as PublishingChecklistPhase)
          ? (item.phase as PublishingChecklistPhase)
          : "Pre-Publish"
        return {
          phase,
          title: item.title.trim(),
          status: item.status?.trim() ?? "todo",
          dueOffset: item.dueOffset?.trim() ?? "",
          notes: item.notes?.trim() ?? "",
        }
      })
      .filter((item): item is PlaybookChecklistTemplateItem => item != null),
  }
}

function parseAssetChecklist(raw: unknown): PlaybookAssetChecklistItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const obj = item as PlaybookAssetChecklistItem
      if (!obj.title?.trim()) return null
      return {
        assetType: obj.assetType?.trim() || "Other",
        title: obj.title.trim(),
        required: Boolean(obj.required),
        notes: obj.notes?.trim() ?? "",
        suggestedModule: obj.suggestedModule?.trim() ?? "",
        dueOffset: obj.dueOffset?.trim() ?? "",
      }
    })
    .filter((item): item is PlaybookAssetChecklistItem => item != null)
}

function parsePromptChecklist(raw: unknown): PlaybookPromptChecklistItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const obj = item as PlaybookPromptChecklistItem
      if (!obj.moduleType?.trim()) return null
      return {
        promptName: obj.promptName?.trim() ?? "",
        promptType: obj.promptType?.trim() ?? "",
        moduleType: obj.moduleType.trim(),
        required: Boolean(obj.required),
        notes: obj.notes?.trim() ?? "",
        suggestedPromptId: obj.suggestedPromptId?.trim() ?? "",
      }
    })
    .filter((item): item is PlaybookPromptChecklistItem => item != null)
}

function parseExperimentTemplate(raw: unknown): PlaybookExperimentTemplateItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const obj = item as PlaybookExperimentTemplateItem
      if (!obj.experimentName?.trim()) return null
      return {
        experimentName: obj.experimentName.trim(),
        experimentType: obj.experimentType?.trim() || "Other",
        hypothesis: obj.hypothesis?.trim() ?? "",
        metricFocus: obj.metricFocus?.trim() ?? "",
        platform: obj.platform?.trim() ?? "",
        variantA: obj.variantA?.trim() ?? "",
        variantB: obj.variantB?.trim() ?? "",
        variantC: obj.variantC?.trim() ?? "",
        notes: obj.notes?.trim() ?? "",
      }
    })
    .filter((item): item is PlaybookExperimentTemplateItem => item != null)
}

function parseDefaultCampaignFields(raw: unknown): PlaybookDefaultCampaignFields {
  const obj = parseJsonObject(typeof raw === "string" ? raw : JSON.stringify(raw ?? {}), {})
  if (!obj) return {}
  return {
    campaignType: String(obj.campaignType ?? "").trim() || undefined,
    status: String(obj.status ?? "").trim() || undefined,
    priority: String(obj.priority ?? "").trim() || undefined,
    niche: String(obj.niche ?? "").trim() || undefined,
    primaryGoal: String(obj.primaryGoal ?? "").trim() || undefined,
    targetAudience: String(obj.targetAudience ?? "").trim() || undefined,
    description: String(obj.description ?? "").trim() || undefined,
    notes: String(obj.notes ?? "").trim() || undefined,
    launchTimelineNotes: String(obj.launchTimelineNotes ?? "").trim() || undefined,
  }
}

export function normalizePlaybookRecord(
  input: Partial<PlaybookRecord> & { id: string },
): PlaybookRecord {
  const now = Date.now()
  const playbookType = PLAYBOOK_TYPES.includes(
    input.playbookType as (typeof PLAYBOOK_TYPES)[number],
  )
    ? input.playbookType!
    : "Other"
  const status = PLAYBOOK_STATUSES.includes(
    input.status as (typeof PLAYBOOK_STATUSES)[number],
  )
    ? input.status!
    : "Active"

  return {
    id: input.id,
    name: (input.name ?? "").trim(),
    description: (input.description ?? "").trim(),
    playbookType,
    category: (input.category ?? "").trim(),
    status,
    targetCampaignType: (input.targetCampaignType ?? "").trim(),
    recommendedPresetId: (input.recommendedPresetId ?? "").trim(),
    recommendedPresetName: (input.recommendedPresetName ?? "").trim(),
    recommendedWorkflowId: (input.recommendedWorkflowId ?? "").trim(),
    recommendedWorkflowName: (input.recommendedWorkflowName ?? "").trim(),
    defaultCampaignFields: input.defaultCampaignFields
      ? parseDefaultCampaignFields(input.defaultCampaignFields)
      : parseDefaultCampaignFields("{}"),
    taskTemplate: parseTaskTemplate(input.taskTemplate ?? []),
    publishingChecklistTemplate: parseChecklistTemplate(
      input.publishingChecklistTemplate ?? { items: [] },
    ),
    assetChecklist: parseAssetChecklist(input.assetChecklist ?? []),
    promptChecklist: parsePromptChecklist(input.promptChecklist ?? []),
    experimentTemplate: parseExperimentTemplate(input.experimentTemplate ?? []),
    automationNotes: (input.automationNotes ?? "").trim(),
    exportPackTemplate: (input.exportPackTemplate ?? "").trim() || "full-release-pack",
    tags: parsePlaybookTags(input.tags as string | string[] | undefined),
    notes: (input.notes ?? "").trim(),
    createdAt: typeof input.createdAt === "number" ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === "number" ? input.updatedAt : now,
  }
}

export function playbookFormFromRecord(record: PlaybookRecord): PlaybookFormValues {
  return {
    name: record.name,
    description: record.description,
    playbookType: record.playbookType,
    category: record.category,
    status: record.status,
    targetCampaignType: record.targetCampaignType,
    recommendedPresetId: record.recommendedPresetId,
    recommendedPresetName: record.recommendedPresetName,
    recommendedWorkflowId: record.recommendedWorkflowId,
    recommendedWorkflowName: record.recommendedWorkflowName,
    defaultCampaignFields: { ...record.defaultCampaignFields },
    taskTemplate: [...record.taskTemplate],
    publishingChecklistTemplate: {
      version: 1,
      items: [...record.publishingChecklistTemplate.items],
    },
    assetChecklist: [...record.assetChecklist],
    promptChecklist: [...record.promptChecklist],
    experimentTemplate: [...record.experimentTemplate],
    automationNotes: record.automationNotes,
    exportPackTemplate: record.exportPackTemplate,
    tags: formatPlaybookTags(record.tags),
    notes: record.notes,
  }
}

export function recordFromPlaybookForm(
  id: string,
  form: PlaybookFormValues,
  timestamps?: { createdAt?: number; updatedAt?: number },
): PlaybookRecord {
  return normalizePlaybookRecord({
    id,
    ...form,
    tags: tagsFromPlaybookInput(form.tags),
    createdAt: timestamps?.createdAt,
    updatedAt: timestamps?.updatedAt ?? Date.now(),
  })
}

/** Parse due offset strings like -14 days, launch day, +7 days. */
export function dueDateFromOffset(launchDate: string, offset: string | undefined): string {
  if (!launchDate?.trim() || !offset?.trim()) return ""
  const launch = safeParseDate(launchDate)
  if (!launch) return ""

  const norm = offset.trim().toLowerCase()
  if (norm === "launch day" || norm === "launch" || norm === "0 days" || norm === "0 day") {
    return toDateKey(launch)
  }

  const signedMatch = norm.match(/^([+-]?\d+)\s*days?$/)
  if (signedMatch) {
    const days = Number(signedMatch[1])
    if (!Number.isNaN(days)) return toDateKey(addDays(launch, days))
  }

  const plusMatch = norm.match(/^\+(\d+)\s*days?$/)
  if (plusMatch) return toDateKey(addDays(launch, Number(plusMatch[1])))

  return ""
}

export function buildPlaybookReferenceNote(playbook: PlaybookRecord): string {
  return `${PLAYBOOK_REFERENCE_PREFIX} ${playbook.name} (id: ${playbook.id})`
}

export function extractPlaybookIdFromNotes(notes: string): string | null {
  const match = notes.match(/Playbook:.*\(id:\s*([^)]+)\)/i)
  return match?.[1]?.trim() ?? null
}

export function tasksFromPlaybookTemplate(
  template: PlaybookTaskTemplateItem[],
  launchDate: string,
  createId: (prefix: string) => string,
): CampaignTask[] {
  return template.map((item, index) => ({
    id: createId("task"),
    title: item.title,
    description: item.description ?? "",
    status: item.status?.trim() || "To Do",
    dueDate: dueDateFromOffset(launchDate, item.dueOffset),
    relatedRecordType: "",
    relatedRecordId: "",
    order: index,
  }))
}

export function publishingChecklistFromPlaybookTemplate(
  template: PlaybookPublishingChecklistTemplate,
  campaignType: string,
  launchDate: string,
): PublishingChecklist {
  if (!template.items.length) {
    return generateDefaultPublishingChecklist(campaignType)
  }

  const items = template.items
    .map((item, index) =>
      normalizePublishingChecklistItem(
        {
          phase: item.phase,
          title: item.title,
          status: item.status ?? "todo",
          dueDate: dueDateFromOffset(launchDate, item.dueOffset),
          notes: item.notes ?? "",
        },
        index,
      ),
    )
    .filter((item): item is NonNullable<typeof item> => item != null)

  return { version: 1, items }
}

export function playbookSummaryCounts(record: PlaybookRecord) {
  return {
    tasks: record.taskTemplate.length,
    checklist: record.publishingChecklistTemplate.items.length,
    assets: record.assetChecklist.length,
    prompts: record.promptChecklist.length,
    experiments: record.experimentTemplate.length,
  }
}
