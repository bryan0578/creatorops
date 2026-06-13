import { parseDashboardDate, priorityBadgeClass } from "@/lib/dashboard"
import type { GlobalTaskRecord } from "@/lib/data/global-tasks"
import type { CampaignRecord, CampaignTask, CampaignTaskStatus } from "@/lib/types"

export type NormalizedTaskStatus = "completed" | "in-progress" | "todo" | "blocked" | "waiting"

export type WorkspaceTaskSource = "Campaign" | "Global"

export interface WorkspaceTaskLink {
  label: string
  href: string
}

export interface WorkspaceTask {
  taskId: string
  taskIndex: number
  globalTaskId: string
  title: string
  description: string
  status: NormalizedTaskStatus
  rawStatus: string
  priority: string
  dueDate: string
  dueDateTs: number | null
  module: string
  taskType: string
  artistName: string
  campaignId: string
  campaignName: string
  campaignType: string
  campaignPriority: string
  songConceptId: string
  songTitle: string
  productId: string
  productName: string
  assetId: string
  integrationType: string
  sourceRecordType: string
  sourceRecordId: string
  tags: string[]
  href: string
  links: WorkspaceTaskLink[]
  source: WorkspaceTaskSource
}

export interface WorkspaceTaskFilters {
  search: string
  campaignId: string
  priority: string
  status: string
  taskType: string
  module: string
  artistName: string
  dueFrom: string
  dueTo: string
  showCompleted: boolean
}

export interface WorkspaceTaskSummary {
  total: number
  today: number
  upcoming: number
  overdue: number
  completed: number
  inProgress: number
}

export const TASK_COMMAND_CENTER_TABS = [
  { value: "all", label: "All Tasks" },
  { value: "upcoming", label: "Upcoming" },
  { value: "artist-setup", label: "Artist Setup" },
  { value: "campaigns", label: "Campaigns" },
  { value: "google-drive", label: "Google Drive" },
  { value: "assets", label: "Assets" },
  { value: "done", label: "Done" },
] as const

export type TaskCommandCenterTab = (typeof TASK_COMMAND_CENTER_TABS)[number]["value"]

export const TASK_TAB_ALIASES: Record<string, TaskCommandCenterTab> = {
  all: "all",
  upcoming: "upcoming",
  "artist-setup": "artist-setup",
  campaigns: "campaigns",
  "by-campaign": "campaigns",
  "google-drive": "google-drive",
  assets: "assets",
  done: "done",
  completed: "done",
  today: "upcoming",
  overdue: "all",
  "by-priority": "all",
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase()
}

export function normalizeTaskStatus(status: string | undefined | null): NormalizedTaskStatus {
  const value = norm(status)

  if (
    value === "done" ||
    value === "completed" ||
    value === "complete" ||
    value === "skipped" ||
    value === "archived"
  ) {
    return "completed"
  }

  if (value === "in progress" || value === "working" || value === "in-progress") {
    return "in-progress"
  }

  if (value === "waiting") {
    return "waiting"
  }

  if (value === "blocked") {
    return "blocked"
  }

  return "todo"
}

export function isTaskCompleted(task: WorkspaceTask): boolean {
  return task.status === "completed"
}

function startOfDay(date = new Date()): number {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy.getTime()
}

function endOfDay(date = new Date()): number {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy.getTime()
}

export function parseTaskDueDate(value: string): number | null {
  return parseDashboardDate(value)
}

function deriveTaskId(campaignId: string, task: CampaignTask, index: number): string {
  if (task.id?.trim()) return task.id.trim()
  return `${campaignId}-task-${index}`
}

function buildCampaignHref(campaignId: string): string {
  return `/campaigns?campaignId=${encodeURIComponent(campaignId)}`
}

function effectivePriority(campaign: CampaignRecord): string {
  return campaign.priority?.trim() || "Medium"
}

export function buildTaskLinks(task: Pick<
  WorkspaceTask,
  | "artistName"
  | "campaignId"
  | "songConceptId"
  | "assetId"
  | "integrationType"
  | "module"
  | "taskType"
  | "href"
>): WorkspaceTaskLink[] {
  const links: WorkspaceTaskLink[] = []

  if (task.artistName.trim()) {
    links.push({
      label: "Artist Bible",
      href: `/artist-bible?artist=${encodeURIComponent(task.artistName.trim())}`,
    })
    links.push({
      label: "Lore Manager",
      href: `/lore?artist=${encodeURIComponent(task.artistName.trim())}`,
    })
    links.push({
      label: "Visual Identity",
      href: `/visual-identity?artist=${encodeURIComponent(task.artistName.trim())}`,
    })
  }

  if (task.songConceptId.trim()) {
    links.push({
      label: "Song Concept",
      href: `/song-vault?recordId=${encodeURIComponent(task.songConceptId.trim())}`,
    })
  } else if (task.artistName.trim() && task.taskType === "Song Setup") {
    links.push({
      label: "Song Vault",
      href: `/song-vault?artist=${encodeURIComponent(task.artistName.trim())}`,
    })
  }

  if (task.campaignId.trim()) {
    links.push({
      label: "Campaign",
      href: `/campaigns?campaignId=${encodeURIComponent(task.campaignId.trim())}`,
    })
  }

  if (task.assetId.trim()) {
    links.push({
      label: "Asset",
      href: `/assets?recordId=${encodeURIComponent(task.assetId.trim())}`,
    })
  } else if (task.taskType === "Asset" || task.module === "Asset Library") {
    links.push({ label: "Asset Library", href: "/assets" })
  }

  if (
    task.integrationType === "google-drive" ||
    task.taskType === "Google Drive" ||
    task.module === "Google Drive"
  ) {
    links.push({ label: "Google Drive", href: "/integrations?tab=google-drive" })
  }

  if (task.href && !links.some((link) => link.href === task.href)) {
    links.push({ label: "Open record", href: task.href })
  }

  return links
}

export function buildWorkspaceTaskFromGlobal(task: GlobalTaskRecord): WorkspaceTask {
  const dueDateTs = parseTaskDueDate(task.dueDate)
  const href = task.campaignId.trim()
    ? buildCampaignHref(task.campaignId)
    : task.songConceptId.trim()
      ? `/song-vault?recordId=${encodeURIComponent(task.songConceptId)}`
      : task.artistName.trim()
        ? `/tasks?artist=${encodeURIComponent(task.artistName)}`
        : "/tasks"

  const workspace: WorkspaceTask = {
    taskId: task.id,
    taskIndex: -1,
    globalTaskId: task.id,
    title: task.title.trim() || "Untitled task",
    description: task.description.trim(),
    status: normalizeTaskStatus(task.status),
    rawStatus: task.status,
    priority: task.priority.trim() || "Medium",
    dueDate: task.dueDate.trim(),
    dueDateTs,
    module: task.module,
    taskType: task.taskType,
    artistName: task.artistName,
    campaignId: task.campaignId,
    campaignName: task.campaignName,
    campaignType: task.taskType === "Campaign" ? "Campaign" : "",
    campaignPriority: task.priority,
    songConceptId: task.songConceptId,
    songTitle: task.songTitle,
    productId: task.productId,
    productName: "",
    assetId: task.assetId,
    integrationType: task.integrationType,
    sourceRecordType: task.sourceRecordType,
    sourceRecordId: task.sourceRecordId,
    tags: task.tags,
    href,
    links: [],
    source: "Global",
  }
  workspace.links = buildTaskLinks(workspace)
  return workspace
}

export function buildWorkspaceTask(
  campaign: CampaignRecord,
  task: CampaignTask,
  index: number,
): WorkspaceTask {
  const taskId = deriveTaskId(campaign.id, task, index)
  const dueDateTs = parseTaskDueDate(task.dueDate)
  const href = buildCampaignHref(campaign.id)

  const workspace: WorkspaceTask = {
    taskId,
    taskIndex: index,
    globalTaskId: "",
    title: task.title.trim() || "Untitled task",
    description: task.description.trim(),
    status: normalizeTaskStatus(task.status),
    rawStatus: task.status,
    priority: effectivePriority(campaign),
    dueDate: task.dueDate.trim(),
    dueDateTs,
    module: "Campaign Builder",
    taskType: "Campaign",
    artistName: campaign.artistName,
    campaignId: campaign.id,
    campaignName: campaign.campaignName.trim() || "Untitled campaign",
    campaignType: campaign.campaignType,
    campaignPriority: campaign.priority,
    songConceptId: "",
    songTitle: campaign.songTitle,
    productId: "",
    productName: campaign.productName,
    assetId: "",
    integrationType: "",
    sourceRecordType: "campaign-task",
    sourceRecordId: taskId,
    tags: ["campaign"],
    href,
    links: [],
    source: "Campaign",
  }
  workspace.links = buildTaskLinks(workspace)
  return workspace
}

export function buildWorkspaceTasks(campaigns: CampaignRecord[]): WorkspaceTask[] {
  const tasks: WorkspaceTask[] = []

  for (const campaign of campaigns) {
    campaign.tasks.forEach((task, index) => {
      if (!task.title?.trim() && !task.description?.trim()) return
      tasks.push(buildWorkspaceTask(campaign, task, index))
    })
  }

  return sortWorkspaceTasks(tasks)
}

export function mergeWorkspaceTasks(
  campaigns: CampaignRecord[],
  globalTasks: GlobalTaskRecord[],
): WorkspaceTask[] {
  const syncedCampaignKeys = new Set<string>()
  for (const task of globalTasks) {
    if (task.sourceRecordType === "campaign-task" && task.campaignId && task.sourceRecordId) {
      syncedCampaignKeys.add(`${task.campaignId}:${task.sourceRecordId}`)
    }
  }

  const merged: WorkspaceTask[] = globalTasks.map(buildWorkspaceTaskFromGlobal)

  for (const campaign of campaigns) {
    campaign.tasks.forEach((task, index) => {
      if (!task.title?.trim() && !task.description?.trim()) return
      const sourceId = deriveTaskId(campaign.id, task, index)
      if (syncedCampaignKeys.has(`${campaign.id}:${sourceId}`)) return
      merged.push(buildWorkspaceTask(campaign, task, index))
    })
  }

  return sortWorkspaceTasks(merged)
}

function sortWorkspaceTasks(tasks: WorkspaceTask[]): WorkspaceTask[] {
  return tasks.sort((a, b) => {
    const dueA = a.dueDateTs ?? Number.MAX_SAFE_INTEGER
    const dueB = b.dueDateTs ?? Number.MAX_SAFE_INTEGER
    if (dueA !== dueB) return dueA - dueB
    return a.title.localeCompare(b.title)
  })
}

export function getWorkspaceTaskSummary(tasks: WorkspaceTask[]): WorkspaceTaskSummary {
  return {
    total: tasks.length,
    today: filterTasksForTab(tasks, "upcoming").filter((task) => isDueToday(task)).length,
    upcoming: filterTasksForTab(tasks, "upcoming").length,
    overdue: tasks.filter((task) => isOverdueTask(task)).length,
    completed: filterTasksForTab(tasks, "done").length,
    inProgress: tasks.filter((task) => task.status === "in-progress").length,
  }
}

export function getCampaignContextLabel(task: WorkspaceTask): string {
  const parts = [task.artistName, task.songTitle, task.productName, task.module, task.taskType].filter(
    Boolean,
  )
  return parts.join(" · ") || task.campaignType || "Task"
}

function isDueToday(task: WorkspaceTask, now = new Date()): boolean {
  if (task.dueDateTs == null) return false
  return task.dueDateTs >= startOfDay(now) && task.dueDateTs <= endOfDay(now)
}

export function isOverdueTask(task: WorkspaceTask, now = new Date()): boolean {
  if (isTaskCompleted(task)) return false
  if (task.dueDateTs == null) return false
  return task.dueDateTs < startOfDay(now)
}

function isUpcomingTask(task: WorkspaceTask, now = new Date()): boolean {
  if (isTaskCompleted(task)) return false
  if (task.dueDateTs == null) return false
  const todayStart = startOfDay(now)
  const windowEnd = todayStart + 14 * MS_PER_DAY
  return task.dueDateTs > endOfDay(now) && task.dueDateTs <= windowEnd
}

export function filterTasksForTab(
  tasks: WorkspaceTask[],
  tab: TaskCommandCenterTab,
  now = new Date(),
): WorkspaceTask[] {
  switch (tab) {
    case "upcoming":
      return tasks.filter(
        (task) =>
          !isTaskCompleted(task) &&
          (isUpcomingTask(task, now) || isDueToday(task, now) || isOverdueTask(task, now)),
      )
    case "artist-setup":
      return tasks.filter(
        (task) => task.taskType === "Artist Setup" || task.sourceRecordType === "artist-setup",
      )
    case "campaigns":
      return tasks.filter(
        (task) => task.taskType === "Campaign" || Boolean(task.campaignId.trim()),
      )
    case "google-drive":
      return tasks.filter(
        (task) =>
          task.taskType === "Google Drive" ||
          task.module === "Google Drive" ||
          task.integrationType === "google-drive",
      )
    case "assets":
      return tasks.filter(
        (task) => task.taskType === "Asset" || task.module === "Asset Library" || Boolean(task.assetId.trim()),
      )
    case "done":
      return tasks.filter((task) => isTaskCompleted(task))
    case "all":
    default:
      return tasks.filter((task) => task.rawStatus.toLowerCase() !== "archived")
  }
}

export function applyWorkspaceTaskFilters(
  tasks: WorkspaceTask[],
  filters: WorkspaceTaskFilters,
): WorkspaceTask[] {
  const search = filters.search.trim().toLowerCase()

  return tasks.filter((task) => {
    if (!filters.showCompleted && isTaskCompleted(task)) return false

    if (filters.campaignId !== "all" && task.campaignId !== filters.campaignId) {
      return false
    }

    if (filters.priority !== "all" && task.priority !== filters.priority) {
      return false
    }

    if (filters.taskType !== "all" && task.taskType !== filters.taskType) {
      return false
    }

    if (filters.module !== "all" && task.module !== filters.module) {
      return false
    }

    if (
      filters.artistName !== "all" &&
      task.artistName.trim().toLowerCase() !== filters.artistName.trim().toLowerCase()
    ) {
      return false
    }

    if (filters.status !== "all") {
      if (filters.status === "completed" && !isTaskCompleted(task)) return false
      if (filters.status === "overdue" && !isOverdueTask(task)) return false
      if (
        filters.status !== "completed" &&
        filters.status !== "overdue" &&
        task.status !== filters.status
      ) {
        return false
      }
    }

    if (filters.dueFrom) {
      const fromTs = parseTaskDueDate(filters.dueFrom)
      if (fromTs != null && (task.dueDateTs == null || task.dueDateTs < fromTs)) {
        return false
      }
    }

    if (filters.dueTo) {
      const toTs = parseTaskDueDate(filters.dueTo)
      if (toTs != null && (task.dueDateTs == null || task.dueDateTs > toTs)) {
        return false
      }
    }

    if (!search) return true

    const haystack = [
      task.title,
      task.description,
      task.campaignName,
      task.campaignType,
      task.priority,
      task.artistName,
      task.songTitle,
      task.productName,
      task.module,
      task.taskType,
      task.dueDate,
      task.rawStatus,
      ...task.tags,
    ]
      .join(" ")
      .toLowerCase()

    return haystack.includes(search)
  })
}

export function groupTasksByCampaign(tasks: WorkspaceTask[]) {
  const map = new Map<string, { campaignName: string; href: string; tasks: WorkspaceTask[] }>()

  for (const task of tasks) {
    if (!task.campaignId) continue
    const existing = map.get(task.campaignId)
    if (existing) {
      existing.tasks.push(task)
    } else {
      map.set(task.campaignId, {
        campaignName: task.campaignName || "Untitled campaign",
        href: task.href || buildCampaignHref(task.campaignId),
        tasks: [task],
      })
    }
  }

  return Array.from(map.entries())
    .map(([campaignId, group]) => ({
      campaignId,
      ...group,
      completed: group.tasks.filter((task) => isTaskCompleted(task)).length,
      total: group.tasks.length,
    }))
    .sort((a, b) => a.campaignName.localeCompare(b.campaignName))
}

const PRIORITY_ORDER = ["Urgent", "High", "Medium", "Low", "No Priority"]

export function groupTasksByPriority(tasks: WorkspaceTask[]) {
  const map = new Map<string, WorkspaceTask[]>()

  for (const task of tasks) {
    const key = task.priority || "Medium"
    const list = map.get(key) ?? []
    list.push(task)
    map.set(key, list)
  }

  return PRIORITY_ORDER.filter((priority) => map.has(priority)).map((priority) => ({
    priority,
    tasks: map.get(priority) ?? [],
  }))
}

export function formatTaskDueLabel(task: WorkspaceTask): string {
  if (!task.dueDate.trim()) return "No due date"
  if (task.dueDateTs == null) return task.dueDate
  return new Date(task.dueDateTs).toLocaleDateString(undefined, { dateStyle: "medium" })
}

export function taskStatusBadgeClass(status: NormalizedTaskStatus): string {
  switch (status) {
    case "completed":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
    case "in-progress":
      return "border-primary/40 bg-primary/10 text-primary"
    case "waiting":
      return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "blocked":
      return "border-destructive/40 bg-destructive/10 text-destructive"
    default:
      return ""
  }
}

export function taskStatusLabel(status: NormalizedTaskStatus): string {
  switch (status) {
    case "completed":
      return "Done"
    case "in-progress":
      return "In Progress"
    case "waiting":
      return "Waiting"
    case "blocked":
      return "Blocked"
    default:
      return "To Do"
  }
}

export function campaignStatusForNormalizedStatus(
  status: NormalizedTaskStatus,
): CampaignTaskStatus {
  switch (status) {
    case "completed":
      return "Done"
    case "in-progress":
      return "In Progress"
    default:
      return "To Do"
  }
}

export function nextTaskStatusOnToggle(task: WorkspaceTask): string {
  return isTaskCompleted(task) ? "To Do" : "Done"
}

export { priorityBadgeClass }
