import { parseDashboardDate, priorityBadgeClass } from "@/lib/dashboard"
import type { CampaignRecord, CampaignTask, CampaignTaskStatus } from "@/lib/types"

export type NormalizedTaskStatus = "completed" | "in-progress" | "todo" | "blocked"

export type WorkspaceTaskSource = "Campaign"

export interface WorkspaceTask {
  taskId: string
  taskIndex: number
  title: string
  description: string
  status: NormalizedTaskStatus
  rawStatus: CampaignTaskStatus
  priority: string
  dueDate: string
  dueDateTs: number | null
  campaignId: string
  campaignName: string
  campaignType: string
  campaignPriority: string
  artistName: string
  songTitle: string
  productName: string
  href: string
  source: WorkspaceTaskSource
}

export interface WorkspaceTaskFilters {
  search: string
  campaignId: string
  priority: string
  status: string
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
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "overdue", label: "Overdue" },
  { value: "by-campaign", label: "By Campaign" },
  { value: "by-priority", label: "By Priority" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All Tasks" },
] as const

export type TaskCommandCenterTab = (typeof TASK_COMMAND_CENTER_TABS)[number]["value"]

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
    value === "skipped"
  ) {
    return "completed"
  }

  if (value === "in progress" || value === "working" || value === "in-progress") {
    return "in-progress"
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
  return campaign.priority?.trim() || "No Priority"
}

export function buildWorkspaceTask(
  campaign: CampaignRecord,
  task: CampaignTask,
  index: number,
): WorkspaceTask {
  const taskId = deriveTaskId(campaign.id, task, index)
  const dueDateTs = parseTaskDueDate(task.dueDate)

  return {
    taskId,
    taskIndex: index,
    title: task.title.trim() || "Untitled task",
    description: task.description.trim(),
    status: normalizeTaskStatus(task.status),
    rawStatus: task.status,
    priority: effectivePriority(campaign),
    dueDate: task.dueDate.trim(),
    dueDateTs,
    campaignId: campaign.id,
    campaignName: campaign.campaignName.trim() || "Untitled campaign",
    campaignType: campaign.campaignType,
    campaignPriority: campaign.priority,
    artistName: campaign.artistName,
    songTitle: campaign.songTitle,
    productName: campaign.productName,
    href: buildCampaignHref(campaign.id),
    source: "Campaign",
  }
}

export function buildWorkspaceTasks(campaigns: CampaignRecord[]): WorkspaceTask[] {
  const tasks: WorkspaceTask[] = []

  for (const campaign of campaigns) {
    campaign.tasks.forEach((task, index) => {
      if (!task.title?.trim() && !task.description?.trim()) return
      tasks.push(buildWorkspaceTask(campaign, task, index))
    })
  }

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
    today: filterTasksForTab(tasks, "today").length,
    upcoming: filterTasksForTab(tasks, "upcoming").length,
    overdue: filterTasksForTab(tasks, "overdue").length,
    completed: filterTasksForTab(tasks, "completed").length,
    inProgress: tasks.filter((task) => task.status === "in-progress").length,
  }
}

export function getCampaignContextLabel(task: WorkspaceTask): string {
  const parts = [task.artistName, task.songTitle, task.productName].filter(Boolean)
  return parts.join(" · ") || task.campaignType || "Campaign"
}

function isDueToday(task: WorkspaceTask, now = new Date()): boolean {
  if (task.dueDateTs == null) return false
  return task.dueDateTs >= startOfDay(now) && task.dueDateTs <= endOfDay(now)
}

function isOverdueTask(task: WorkspaceTask, now = new Date()): boolean {
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
    case "today": {
      const dueToday = tasks.filter((task) => isDueToday(task, now) && !isTaskCompleted(task))
      const inProgressNoDue = tasks.filter(
        (task) =>
          !isTaskCompleted(task) &&
          task.status === "in-progress" &&
          task.dueDateTs == null &&
          !dueToday.some((item) => item.taskId === task.taskId),
      )
      return [...dueToday, ...inProgressNoDue]
    }
    case "upcoming":
      return tasks.filter((task) => isUpcomingTask(task, now))
    case "overdue":
      return tasks.filter((task) => isOverdueTask(task, now))
    case "completed":
      return tasks.filter((task) => isTaskCompleted(task))
    case "by-campaign":
    case "by-priority":
    case "all":
      return tasks
    default:
      return tasks
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

    if (filters.status !== "all") {
      if (filters.status === "completed" && !isTaskCompleted(task)) return false
      if (filters.status !== "completed" && task.status !== filters.status) return false
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
      task.dueDate,
      task.rawStatus,
    ]
      .join(" ")
      .toLowerCase()

    return haystack.includes(search)
  })
}

export function groupTasksByCampaign(tasks: WorkspaceTask[]) {
  const map = new Map<string, { campaignName: string; href: string; tasks: WorkspaceTask[] }>()

  for (const task of tasks) {
    const existing = map.get(task.campaignId)
    if (existing) {
      existing.tasks.push(task)
    } else {
      map.set(task.campaignId, {
        campaignName: task.campaignName,
        href: task.href,
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
    const key = task.priority || "No Priority"
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
    case "blocked":
      return "border-destructive/40 bg-destructive/10 text-destructive"
    default:
      return ""
  }
}

export function taskStatusLabel(status: NormalizedTaskStatus): string {
  switch (status) {
    case "completed":
      return "Completed"
    case "in-progress":
      return "In Progress"
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

export function nextTaskStatusOnToggle(task: WorkspaceTask): CampaignTaskStatus {
  return isTaskCompleted(task) ? "To Do" : "Done"
}

export { priorityBadgeClass }
