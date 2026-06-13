import { parseStringList } from "@/lib/artist-universe/utils"
import type { Task as PrismaTask } from "@/lib/generated/prisma/client"

export const GLOBAL_TASK_STATUSES = [
  "To Do",
  "In Progress",
  "Waiting",
  "Done",
  "Archived",
] as const

export const GLOBAL_TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const

export const GLOBAL_TASK_TYPES = [
  "Global",
  "Artist Setup",
  "Song Setup",
  "Campaign",
  "Google Drive",
  "Asset",
  "YouTube",
  "Product",
  "Merch",
  "Release",
  "Admin",
  "Review",
] as const

export const GLOBAL_TASK_MODULES = [
  "Artist Ops",
  "Song Concept Vault",
  "Lore Manager",
  "Visual Identity",
  "Google Drive",
  "Asset Library",
  "Campaign Builder",
  "YouTube Packaging",
  "Product Factory",
  "Commerce",
  "Analytics",
  "Admin",
] as const

export type GlobalTaskStatus = (typeof GLOBAL_TASK_STATUSES)[number]
export type GlobalTaskPriority = (typeof GLOBAL_TASK_PRIORITIES)[number]
export type GlobalTaskType = (typeof GLOBAL_TASK_TYPES)[number]
export type GlobalTaskModule = (typeof GLOBAL_TASK_MODULES)[number]

export type GlobalTaskRecord = {
  id: string
  title: string
  description: string
  status: string
  priority: string
  dueDate: string
  module: string
  taskType: string
  artistName: string
  campaignId: string
  campaignName: string
  songConceptId: string
  songTitle: string
  productId: string
  assetId: string
  integrationType: string
  sourceRecordType: string
  sourceRecordId: string
  tags: string[]
  notes: string
  createdAt: number
  updatedAt: number
}

export function normalizeGlobalTask(
  record: Partial<GlobalTaskRecord> & { title: string },
): GlobalTaskRecord {
  const now = Date.now()
  const status = record.status?.trim() || "To Do"
  const priority = record.priority?.trim() || "Medium"

  return {
    id: record.id?.trim() || "",
    title: record.title.trim() || "Untitled task",
    description: record.description?.trim() ?? "",
    status: GLOBAL_TASK_STATUSES.includes(status as GlobalTaskStatus) ? status : status,
    priority: GLOBAL_TASK_PRIORITIES.includes(priority as GlobalTaskPriority)
      ? priority
      : priority || "Medium",
    dueDate: record.dueDate?.trim() ?? "",
    module: record.module?.trim() ?? "",
    taskType: record.taskType?.trim() || "Global",
    artistName: record.artistName?.trim() ?? "",
    campaignId: record.campaignId?.trim() ?? "",
    campaignName: record.campaignName?.trim() ?? "",
    songConceptId: record.songConceptId?.trim() ?? "",
    songTitle: record.songTitle?.trim() ?? "",
    productId: record.productId?.trim() ?? "",
    assetId: record.assetId?.trim() ?? "",
    integrationType: record.integrationType?.trim() ?? "",
    sourceRecordType: record.sourceRecordType?.trim() ?? "",
    sourceRecordId: record.sourceRecordId?.trim() ?? "",
    tags: parseStringList(record.tags),
    notes: record.notes?.trim() ?? "",
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? now,
  }
}

export function prismaTaskToRecord(row: PrismaTask): GlobalTaskRecord {
  return normalizeGlobalTask({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.dueDate,
    module: row.module,
    taskType: row.taskType,
    artistName: row.artistName,
    campaignId: row.campaignId,
    campaignName: row.campaignName,
    songConceptId: row.songConceptId,
    songTitle: row.songTitle,
    productId: row.productId,
    assetId: row.assetId,
    integrationType: row.integrationType,
    sourceRecordType: row.sourceRecordType,
    sourceRecordId: row.sourceRecordId,
    tags: parseStringList(row.tags),
    notes: row.notes,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}

export function taskToPrismaCreate(record: GlobalTaskRecord) {
  const n = normalizeGlobalTask(record)
  return {
    id: n.id,
    title: n.title,
    description: n.description,
    status: n.status,
    priority: n.priority,
    dueDate: n.dueDate,
    module: n.module,
    taskType: n.taskType,
    artistName: n.artistName,
    campaignId: n.campaignId,
    campaignName: n.campaignName,
    songConceptId: n.songConceptId,
    songTitle: n.songTitle,
    productId: n.productId,
    assetId: n.assetId,
    integrationType: n.integrationType,
    sourceRecordType: n.sourceRecordType,
    sourceRecordId: n.sourceRecordId,
    tags: JSON.stringify(n.tags),
    notes: n.notes,
    createdAt: new Date(n.createdAt),
    updatedAt: new Date(n.updatedAt),
  }
}

export function taskToPrismaUpdate(record: GlobalTaskRecord) {
  const n = normalizeGlobalTask(record)
  return {
    title: n.title,
    description: n.description,
    status: n.status,
    priority: n.priority,
    dueDate: n.dueDate,
    module: n.module,
    taskType: n.taskType,
    artistName: n.artistName,
    campaignId: n.campaignId,
    campaignName: n.campaignName,
    songConceptId: n.songConceptId,
    songTitle: n.songTitle,
    productId: n.productId,
    assetId: n.assetId,
    integrationType: n.integrationType,
    sourceRecordType: n.sourceRecordType,
    sourceRecordId: n.sourceRecordId,
    tags: JSON.stringify(n.tags),
    notes: n.notes,
    updatedAt: new Date(n.updatedAt),
  }
}

export function normalizeTaskDedupeKey(title: string, artistName: string, taskType: string): string {
  return [title, artistName, taskType]
    .map((part) => part.trim().toLowerCase().replace(/\s+/g, " "))
    .join("|")
}

export function mapCampaignTaskStatusToGlobal(status: string): string {
  const value = status.trim().toLowerCase()
  if (value === "done" || value === "skipped") return "Done"
  if (value === "in progress") return "In Progress"
  return "To Do"
}

export function mapGlobalStatusToCampaign(status: string): "To Do" | "In Progress" | "Done" | "Skipped" {
  const value = status.trim().toLowerCase()
  if (value === "done" || value === "archived") return "Done"
  if (value === "in progress" || value === "waiting") return "In Progress"
  return "To Do"
}
