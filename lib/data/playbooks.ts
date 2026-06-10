import { normalizePlaybookRecord, parsePlaybookTags } from "@/lib/playbooks"
import type { PlaybookRecord } from "@/lib/types"
import type { Playbook as PrismaPlaybook } from "@/lib/generated/prisma/client"

export { normalizePlaybookRecord } from "@/lib/playbooks"

function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? (Array.isArray(value) ? [] : {}))
}

export function playbookToPrismaCreate(record: PlaybookRecord) {
  const normalized = normalizePlaybookRecord(record)
  return {
    id: normalized.id,
    name: normalized.name,
    description: normalized.description,
    playbookType: normalized.playbookType,
    category: normalized.category,
    status: normalized.status,
    targetCampaignType: normalized.targetCampaignType,
    recommendedPresetId: normalized.recommendedPresetId,
    recommendedPresetName: normalized.recommendedPresetName,
    recommendedWorkflowId: normalized.recommendedWorkflowId,
    recommendedWorkflowName: normalized.recommendedWorkflowName,
    defaultCampaignFields: JSON.stringify(normalized.defaultCampaignFields),
    taskTemplate: JSON.stringify(normalized.taskTemplate),
    publishingChecklistTemplate: JSON.stringify(normalized.publishingChecklistTemplate),
    assetChecklist: JSON.stringify(normalized.assetChecklist),
    promptChecklist: JSON.stringify(normalized.promptChecklist),
    experimentTemplate: JSON.stringify(normalized.experimentTemplate),
    automationNotes: normalized.automationNotes,
    exportPackTemplate: normalized.exportPackTemplate,
    tags: JSON.stringify(normalized.tags),
    notes: normalized.notes,
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function playbookToPrismaUpdate(record: PlaybookRecord) {
  const normalized = normalizePlaybookRecord(record)
  return {
    name: normalized.name,
    description: normalized.description,
    playbookType: normalized.playbookType,
    category: normalized.category,
    status: normalized.status,
    targetCampaignType: normalized.targetCampaignType,
    recommendedPresetId: normalized.recommendedPresetId,
    recommendedPresetName: normalized.recommendedPresetName,
    recommendedWorkflowId: normalized.recommendedWorkflowId,
    recommendedWorkflowName: normalized.recommendedWorkflowName,
    defaultCampaignFields: JSON.stringify(normalized.defaultCampaignFields),
    taskTemplate: JSON.stringify(normalized.taskTemplate),
    publishingChecklistTemplate: JSON.stringify(normalized.publishingChecklistTemplate),
    assetChecklist: JSON.stringify(normalized.assetChecklist),
    promptChecklist: JSON.stringify(normalized.promptChecklist),
    experimentTemplate: JSON.stringify(normalized.experimentTemplate),
    automationNotes: normalized.automationNotes,
    exportPackTemplate: normalized.exportPackTemplate,
    tags: JSON.stringify(normalized.tags),
    notes: normalized.notes,
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function prismaPlaybookToPlaybookRecord(row: PrismaPlaybook): PlaybookRecord {
  let defaultCampaignFields: unknown = {}
  let taskTemplate: unknown = []
  let publishingChecklistTemplate: unknown = { items: [] }
  let assetChecklist: unknown = []
  let promptChecklist: unknown = []
  let experimentTemplate: unknown = []

  try {
    defaultCampaignFields = JSON.parse(row.defaultCampaignFields || "{}")
  } catch {
    defaultCampaignFields = {}
  }
  try {
    taskTemplate = JSON.parse(row.taskTemplate || "[]")
  } catch {
    taskTemplate = []
  }
  try {
    publishingChecklistTemplate = JSON.parse(row.publishingChecklistTemplate || "{}")
  } catch {
    publishingChecklistTemplate = { items: [] }
  }
  try {
    assetChecklist = JSON.parse(row.assetChecklist || "[]")
  } catch {
    assetChecklist = []
  }
  try {
    promptChecklist = JSON.parse(row.promptChecklist || "[]")
  } catch {
    promptChecklist = []
  }
  try {
    experimentTemplate = JSON.parse(row.experimentTemplate || "[]")
  } catch {
    experimentTemplate = []
  }

  return normalizePlaybookRecord({
    id: row.id,
    name: row.name,
    description: row.description,
    playbookType: row.playbookType,
    category: row.category,
    status: row.status,
    targetCampaignType: row.targetCampaignType,
    recommendedPresetId: row.recommendedPresetId,
    recommendedPresetName: row.recommendedPresetName,
    recommendedWorkflowId: row.recommendedWorkflowId,
    recommendedWorkflowName: row.recommendedWorkflowName,
    defaultCampaignFields,
    taskTemplate,
    publishingChecklistTemplate,
    assetChecklist,
    promptChecklist,
    experimentTemplate,
    automationNotes: row.automationNotes,
    exportPackTemplate: row.exportPackTemplate,
    tags: parsePlaybookTags(row.tags),
    notes: row.notes,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}
