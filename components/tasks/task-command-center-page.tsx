"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  ExternalLink,
  CalendarDays,
  LayoutGrid,
  ListChecks,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

import { createArtistSetupTasks, createDriveSetupTasks, createGlobalTask, createSongSetupTasks } from "@/lib/actions/global-tasks"
import { getWorkspaceTasks, syncAllWorkspaceTasks, updateWorkspaceTaskStatus } from "@/lib/actions/tasks"
import {
  GLOBAL_TASK_MODULES,
  GLOBAL_TASK_PRIORITIES,
  GLOBAL_TASK_TYPES,
} from "@/lib/data/global-tasks"
import {
  applyWorkspaceTaskFilters,
  filterTasksForTab,
  formatTaskDueLabel,
  getCampaignContextLabel,
  getWorkspaceTaskSummary,
  groupTasksByCampaign,
  isTaskCompleted,
  nextTaskStatusOnToggle,
  priorityBadgeClass,
  TASK_TAB_ALIASES,
  taskStatusBadgeClass,
  taskStatusLabel,
  type TaskCommandCenterTab,
  type WorkspaceTask,
  type WorkspaceTaskFilters,
} from "@/lib/data/tasks"

import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { RECENT_RECORDS_CARD_CLASS } from "@/components/module/form-layout"
import {
  ModuleTabPanel,
  ModuleWorkflowTabs,
  TASK_COMMAND_CENTER_TABS,
} from "@/components/module/workflow-tabs"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const EMPTY_COPY: Record<
  TaskCommandCenterTab,
  { title: string; description?: string }
> = {
  all: {
    title: "No tasks yet",
    description: "Create global setup tasks, campaign tasks, or seed PrettyWise demo data.",
  },
  upcoming: {
    title: "No upcoming tasks",
    description: "No tasks are due soon. Add due dates or create artist setup tasks.",
  },
  "artist-setup": {
    title: "No artist setup tasks",
    description: "Create a PrettyWise artist setup checklist to track Drive uploads and universe setup.",
  },
  campaigns: {
    title: "No campaign tasks",
    description: "Create tasks inside Campaign Builder or link tasks to a campaign.",
  },
  "google-drive": {
    title: "No Google Drive tasks",
    description: "Create Drive setup tasks from Integrations or the artist setup checklist.",
  },
  assets: {
    title: "No asset tasks",
    description: "Tasks for creating or linking assets will appear here.",
  },
  done: {
    title: "No completed tasks yet",
    description: "Completed tasks will appear here.",
  },
}

function taskRowKey(task: WorkspaceTask): string {
  return task.globalTaskId || `${task.campaignId}:${task.taskId}`
}

function TaskRow({
  task,
  onToggle,
  updating,
}: {
  task: WorkspaceTask
  onToggle: (task: WorkspaceTask) => Promise<void>
  updating: boolean
}) {
  const completed = isTaskCompleted(task)
  const overdue =
    !completed &&
    task.dueDateTs != null &&
    task.dueDateTs < new Date(new Date().setHours(0, 0, 0, 0)).getTime()

  return (
    <div className="flex min-w-0 gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="mt-0.5 shrink-0"
        disabled={updating}
        aria-label={completed ? "Mark task incomplete" : "Mark task complete"}
        onClick={() => onToggle(task)}
      >
        {updating ? (
          <Loader2 className="size-4 animate-spin" />
        ) : completed ? (
          <CheckCircle2 className="size-4 text-emerald-500" />
        ) : (
          <Circle className="size-4 text-muted-foreground" />
        )}
      </Button>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p
              className={cn(
                "text-sm font-medium text-pretty",
                completed && "text-muted-foreground line-through",
              )}
            >
              {task.title}
            </p>
            {task.description ? (
              <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge
              variant="outline"
              className={cn("text-[10px]", taskStatusBadgeClass(task.status))}
            >
              {taskStatusLabel(task.status)}
            </Badge>
            {task.priority ? (
              <Badge
                variant="outline"
                className={cn("text-[10px]", priorityBadgeClass(task.priority))}
              >
                {task.priority}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {task.taskType ? <Badge variant="secondary" className="text-[10px]">{task.taskType}</Badge> : null}
          {task.module ? <span>{task.module}</span> : null}
          {task.campaignName ? (
            <span className="font-medium text-foreground/90">{task.campaignName}</span>
          ) : null}
          <span>{getCampaignContextLabel(task)}</span>
          <span className={cn(overdue && "font-medium text-destructive")}>
            {formatTaskDueLabel(task)}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {task.links.map((link) => (
            <Link
              key={`${task.taskId}-${link.href}`}
              href={link.href}
              className={buttonVariants({ size: "sm", variant: "outline", className: "h-7 px-2 text-xs" })}
            >
              <ExternalLink className="size-3" />
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function TaskList({
  tasks,
  tab,
  onToggle,
  updatingId,
}: {
  tasks: WorkspaceTask[]
  tab: TaskCommandCenterTab
  onToggle: (task: WorkspaceTask) => Promise<void>
  updatingId: string | null
}) {
  if (!tasks.length) {
    const copy = EMPTY_COPY[tab]
    if (tab === "all") {
      return (
        <EmptyState
          icon={ListChecks}
          title={copy.title}
          description={copy.description}
          primaryActionLabel="Open Campaigns"
          primaryActionHref="/campaigns"
          secondaryActionLabel="Open Backup Center"
          secondaryActionHref="/backups"
        />
      )
    }

    return (
      <EmptyState
        title={copy.title}
        description={copy.description}
        primaryActionLabel="Open Campaigns"
        primaryActionHref="/campaigns"
      />
    )
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskRow
          key={taskRowKey(task)}
          task={task}
          onToggle={onToggle}
          updating={updatingId === taskRowKey(task)}
        />
      ))}
    </div>
  )
}

const DOMAIN_TAB_MAP: Record<string, TaskCommandCenterTab> = {
  "artist-ops": "artist-setup",
  "campaign-command": "campaigns",
  "assets-integrations": "google-drive",
  admin: "all",
}

function resolveInitialTab(rawTab: string | null, domain: string | null): TaskCommandCenterTab {
  if (domain && DOMAIN_TAB_MAP[domain]) return DOMAIN_TAB_MAP[domain]
  return resolveTaskTab(rawTab)
}

function resolveTaskTab(raw: string | null): TaskCommandCenterTab {
  const aliased = raw ? TASK_TAB_ALIASES[raw] : undefined
  const candidate = (aliased || raw || "all") as TaskCommandCenterTab
  return TASK_COMMAND_CENTER_TABS.some((tab) => tab.value === candidate) ? candidate : "all"
}

export function TaskCommandCenterPage() {
  const searchParams = useSearchParams()
  const initialCampaignId = searchParams.get("campaignId") ?? "all"
  const artistQuery = searchParams.get("artist")?.trim() ?? ""
  const domainQuery = searchParams.get("domain")?.trim() ?? ""

  const [activeTab, setActiveTab] = React.useState<TaskCommandCenterTab>(() =>
    resolveInitialTab(searchParams.get("tab"), domainQuery || null),
  )
  const [allTasks, setAllTasks] = React.useState<WorkspaceTask[]>([])
  const [loading, setLoading] = React.useState(true)
  const [templateLoading, setTemplateLoading] = React.useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = React.useState("")
  const [creatingTask, setCreatingTask] = React.useState(false)

  React.useEffect(() => {
    setActiveTab(resolveInitialTab(searchParams.get("tab"), searchParams.get("domain")))
    const artist = searchParams.get("artist")?.trim()
    const filter = searchParams.get("filter")?.trim()
    setFilters((prev) => ({
      ...prev,
      ...(artist ? { artistName: artist } : {}),
      ...(filter === "overdue" ? { status: "overdue", showCompleted: false } : {}),
    }))
  }, [searchParams])

  const [filters, setFilters] = React.useState<WorkspaceTaskFilters>({
    search: "",
    campaignId: initialCampaignId,
    priority: "all",
    status: "all",
    taskType: "all",
    module: "all",
    artistName: artistQuery || "all",
    dueFrom: "",
    dueTo: "",
    showCompleted: false,
  })
  const [refreshing, setRefreshing] = React.useState(false)
  const [updatingId, setUpdatingId] = React.useState<string | null>(null)

  const loadTasks = React.useCallback(async () => {
    setLoading(true)
    try {
      const tasks = await getWorkspaceTasks()
      setAllTasks(tasks)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load tasks")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  const filteredTasks = React.useMemo(
    () => applyWorkspaceTaskFilters(allTasks, filters),
    [allTasks, filters],
  )

  const summary = React.useMemo(() => getWorkspaceTaskSummary(allTasks), [allTasks])

  const campaignOptions = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const task of allTasks) {
      if (task.campaignId) map.set(task.campaignId, task.campaignName)
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [allTasks])

  const artistOptions = React.useMemo(() => {
    const set = new Set(allTasks.map((task) => task.artistName.trim()).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [allTasks])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await syncAllWorkspaceTasks()
      await loadTasks()
      toast.success("Tasks refreshed and synced")
    } catch {
      toast.error("Could not refresh tasks")
    } finally {
      setRefreshing(false)
    }
  }

  async function handleTemplate(kind: "artist" | "song" | "drive") {
    setTemplateLoading(kind)
    try {
      const artist = filters.artistName !== "all" ? filters.artistName : "PrettyWise"
      const result =
        kind === "artist"
          ? await createArtistSetupTasks(artist)
          : kind === "song"
            ? await createSongSetupTasks(artist, "No Exit")
            : await createDriveSetupTasks(artist)
      toast.success(result.message)
      await loadTasks()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create tasks")
    } finally {
      setTemplateLoading(null)
    }
  }

  async function handleCreateTask() {
    const title = newTaskTitle.trim()
    if (!title) {
      toast.error("Enter a task title.")
      return
    }
    setCreatingTask(true)
    try {
      await createGlobalTask({
        title,
        description: "",
        status: "To Do",
        priority: "Medium",
        dueDate: "",
        module: activeTab === "google-drive" ? "Google Drive" : activeTab === "artist-setup" ? "Artist Ops" : "",
        taskType: "Global",
        artistName: filters.artistName !== "all" ? filters.artistName : "",
        campaignId: filters.campaignId !== "all" ? filters.campaignId : "",
        campaignName: "",
        songConceptId: "",
        songTitle: "",
        productId: "",
        assetId: "",
        integrationType: "",
        sourceRecordType: "",
        sourceRecordId: "",
        tags: [],
        notes: "",
      })
      setNewTaskTitle("")
      toast.success("Task created")
      await loadTasks()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create task")
    } finally {
      setCreatingTask(false)
    }
  }

  async function handleToggle(task: WorkspaceTask) {
    const key = taskRowKey(task)
    setUpdatingId(key)
    try {
      const nextStatus = nextTaskStatusOnToggle(task)
      await updateWorkspaceTaskStatus({
        globalTaskId: task.globalTaskId || undefined,
        campaignId: task.campaignId,
        taskId: task.taskId,
        taskIndex: task.taskIndex >= 0 ? task.taskIndex : undefined,
        status: nextStatus,
      })
      await loadTasks()
      toast.success("Task updated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update task")
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading && allTasks.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading tasks…
      </div>
    )
  }

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-6 overflow-x-hidden">
      <ModulePageHeader
        title="Task Command Center"
        description="Track global setup work, campaign tasks, Drive sync, assets, and release checklists."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={creatingTask}
              onClick={() => void handleCreateTask()}
            >
              {creatingTask ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              New Task
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={templateLoading === "artist"}
              onClick={() => void handleTemplate("artist")}
            >
              {templateLoading === "artist" ? "Creating…" : "Create Artist Setup Checklist"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={templateLoading === "song"}
              onClick={() => void handleTemplate("song")}
            >
              {templateLoading === "song" ? "Creating…" : "Create Song Setup Checklist"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={templateLoading === "drive"}
              onClick={() => void handleTemplate("drive")}
            >
              {templateLoading === "drive" ? "Creating…" : "Create Drive Setup Tasks"}
            </Button>
            <Link href="/campaigns" className={buttonVariants({ size: "sm" })}>
              <Plus className="size-4" />
              New Campaign
            </Link>
            <Link href="/campaign-board" className={buttonVariants({ size: "sm", variant: "outline" })}>
              <LayoutGrid className="size-4" />
              Open Campaign Board
            </Link>
            <Link href="/calendar" className={buttonVariants({ size: "sm", variant: "outline" })}>
              <CalendarDays className="size-4" />
              View on Calendar
            </Link>
            <Button type="button" size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Refresh
            </Button>
          </div>
        }
      />

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Upcoming", value: summary.upcoming, href: "/tasks?tab=upcoming" },
          { label: "Overdue", value: summary.overdue, href: "/tasks?filter=overdue" },
          { label: "In progress", value: summary.inProgress, href: "/tasks?tab=all" },
          { label: "Done", value: summary.completed, href: "/tasks?tab=done" },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-lg border border-border/80 bg-card px-3 py-2.5 shadow-sm transition-colors hover:bg-muted/30"
          >
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-lg font-semibold tabular-nums">{item.value}</p>
          </Link>
        ))}
      </section>

      <Card className={RECENT_RECORDS_CARD_CLASS}>
        <CardHeader className="gap-1 space-y-0 pb-2">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription className="text-xs">
            Search and narrow tasks across artists, campaigns, modules, and types.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-6">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Quick add task title…"
              className="h-9"
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleCreateTask()
              }}
            />
            <Button
              type="button"
              size="sm"
              className="h-9 shrink-0"
              disabled={creatingTask}
              onClick={() => void handleCreateTask()}
            >
              Add Task
            </Button>
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-2 xl:col-span-2">
            <Label htmlFor="task-search" className="text-xs">
              Search tasks
            </Label>
            <Input
              id="task-search"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Title, campaign, artist, thumbnail…"
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Campaign</Label>
            <Select
              value={filters.campaignId}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, campaignId: value ?? "all" }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <span className="truncate">
                  {filters.campaignId === "all"
                    ? "All campaigns"
                    : campaignOptions.find(([id]) => id === filters.campaignId)?.[1]}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All campaigns</SelectItem>
                {campaignOptions.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Priority</Label>
            <Select
              value={filters.priority}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, priority: value ?? "all" }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <span className="truncate">
                  {filters.priority === "all" ? "All priorities" : filters.priority}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {GLOBAL_TASK_PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Task type</Label>
            <Select
              value={filters.taskType}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, taskType: value ?? "all" }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <span className="truncate">
                  {filters.taskType === "all" ? "All types" : filters.taskType}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {GLOBAL_TASK_TYPES.map((taskType) => (
                  <SelectItem key={taskType} value={taskType}>
                    {taskType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Module</Label>
            <Select
              value={filters.module}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, module: value ?? "all" }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <span className="truncate">
                  {filters.module === "all" ? "All modules" : filters.module}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {GLOBAL_TASK_MODULES.map((moduleName) => (
                  <SelectItem key={moduleName} value={moduleName}>
                    {moduleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Artist</Label>
            <Select
              value={filters.artistName}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, artistName: value ?? "all" }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <span className="truncate">
                  {filters.artistName === "all" ? "All artists" : filters.artistName}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All artists</SelectItem>
                {artistOptions.map((artist) => (
                  <SelectItem key={artist} value={artist}>
                    {artist}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, status: value ?? "all" }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <span className="truncate">
                  {filters.status === "all"
                    ? "All statuses"
                    : filters.status === "overdue"
                      ? "Overdue"
                      : taskStatusLabel(filters.status as never)}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-1 xl:col-span-1">
            <Button
              type="button"
              size="sm"
              variant={filters.showCompleted ? "secondary" : "outline"}
              className="h-9 w-full sm:w-auto"
              onClick={() =>
                setFilters((prev) => ({ ...prev, showCompleted: !prev.showCompleted }))
              }
            >
              {filters.showCompleted ? "Hide completed" : "Show completed"}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:col-span-2 sm:grid-cols-2 lg:col-span-2 xl:col-span-2">
            <div className="space-y-1">
              <Label htmlFor="due-from" className="text-xs">
                Due from
              </Label>
              <Input
                id="due-from"
                type="date"
                value={filters.dueFrom}
                onChange={(e) => setFilters((prev) => ({ ...prev, dueFrom: e.target.value }))}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="due-to" className="text-xs">
                Due to
              </Label>
              <Input
                id="due-to"
                type="date"
                value={filters.dueTo}
                onChange={(e) => setFilters((prev) => ({ ...prev, dueTo: e.target.value }))}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <ModuleWorkflowTabs
        value={activeTab}
        onValueChange={(next) => setActiveTab(next as TaskCommandCenterTab)}
        tabs={TASK_COMMAND_CENTER_TABS}
        className="gap-4"
      >
        {TASK_COMMAND_CENTER_TABS.map((tab) => {
          const tabTasks = filterTasksForTab(filteredTasks, tab.value)

          return (
          <ModuleTabPanel key={tab.value} value={tab.value}>
            {tab.value === "campaigns" && groupTasksByCampaign(tabTasks).length > 1 ? (
              <div className="space-y-4">
                {groupTasksByCampaign(tabTasks).map((group) => (
                  <Card key={group.campaignId} className={RECENT_RECORDS_CARD_CLASS}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">{group.campaignName}</CardTitle>
                          <CardDescription>
                            {group.completed}/{group.total} tasks complete
                          </CardDescription>
                        </div>
                        <Link
                          href={group.href}
                          className={buttonVariants({ size: "sm", variant: "outline" })}
                        >
                          Open Campaign
                          <ArrowRight className="size-4" />
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {group.tasks.map((task) => (
                        <TaskRow
                          key={taskRowKey(task)}
                          task={task}
                          onToggle={handleToggle}
                          updating={updatingId === taskRowKey(task)}
                        />
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <TaskList
                tasks={tabTasks}
                tab={tab.value}
                onToggle={handleToggle}
                updatingId={updatingId}
              />
            )}
          </ModuleTabPanel>
          )
        })}
      </ModuleWorkflowTabs>
    </div>
  )
}
