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

import { updateCampaignTaskStatus } from "@/lib/actions/tasks"
import {
  applyWorkspaceTaskFilters,
  buildWorkspaceTasks,
  filterTasksForTab,
  formatTaskDueLabel,
  getCampaignContextLabel,
  getWorkspaceTaskSummary,
  groupTasksByCampaign,
  groupTasksByPriority,
  isTaskCompleted,
  nextTaskStatusOnToggle,
  priorityBadgeClass,
  taskStatusBadgeClass,
  taskStatusLabel,
  type TaskCommandCenterTab,
  type WorkspaceTask,
  type WorkspaceTaskFilters,
} from "@/lib/data/tasks"
import { useStore } from "@/lib/store"
import type { CampaignTaskStatus } from "@/lib/types"

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
  today: {
    title: "No tasks due today",
    description: "You're clear for today, or add due dates in Campaign Builder.",
  },
  upcoming: {
    title: "No upcoming tasks",
    description: "No tasks are due in the next 14 days.",
  },
  overdue: {
    title: "No overdue tasks",
    description: "Nothing is past due right now.",
  },
  "by-campaign": {
    title: "No campaign tasks",
    description: "Create tasks inside a campaign to track launch work.",
  },
  "by-priority": {
    title: "No tasks to group",
    description: "Adjust filters or add campaign tasks.",
  },
  completed: {
    title: "No completed tasks yet",
    description: "Completed tasks will appear here.",
  },
  all: {
    title: "No tasks yet",
    description: "Create campaign tasks or seed PrettyWise demo data to test the task command center.",
  },
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
          <span className="font-medium text-foreground/90">{task.campaignName}</span>
          <span>{task.campaignType}</span>
          <span>{getCampaignContextLabel(task)}</span>
          <span className={cn(overdue && "font-medium text-destructive")}>
            {formatTaskDueLabel(task)}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={task.href} className={buttonVariants({ size: "sm", variant: "outline" })}>
            <ExternalLink className="size-3.5" />
            Open Campaign
          </Link>
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
          key={`${task.campaignId}:${task.taskId}`}
          task={task}
          onToggle={onToggle}
          updating={updatingId === `${task.campaignId}:${task.taskId}`}
        />
      ))}
    </div>
  )
}

export function TaskCommandCenterPage() {
  const store = useStore()
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get("tab") as TaskCommandCenterTab) || "today"
  const initialCampaignId = searchParams.get("campaignId") ?? "all"

  const defaultTab = TASK_COMMAND_CENTER_TABS.some((tab) => tab.value === initialTab)
    ? initialTab
    : "today"

  const [filters, setFilters] = React.useState<WorkspaceTaskFilters>({
    search: "",
    campaignId: initialCampaignId,
    priority: "all",
    status: "all",
    dueFrom: "",
    dueTo: "",
    showCompleted: false,
  })
  const [refreshing, setRefreshing] = React.useState(false)
  const [updatingId, setUpdatingId] = React.useState<string | null>(null)

  const allTasks = React.useMemo(
    () => buildWorkspaceTasks(store.campaigns),
    [store.campaigns],
  )

  const filteredTasks = React.useMemo(
    () => applyWorkspaceTaskFilters(allTasks, filters),
    [allTasks, filters],
  )

  const summary = React.useMemo(() => getWorkspaceTaskSummary(allTasks), [allTasks])

  const campaignOptions = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const task of allTasks) {
      map.set(task.campaignId, task.campaignName)
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [allTasks])

  const priorityOptions = React.useMemo(() => {
    const set = new Set(allTasks.map((task) => task.priority))
    return Array.from(set).sort()
  }, [allTasks])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await store.reloadCampaigns()
      toast.success("Tasks refreshed")
    } catch {
      toast.error("Could not refresh tasks")
    } finally {
      setRefreshing(false)
    }
  }

  async function handleToggle(task: WorkspaceTask) {
    const key = `${task.campaignId}:${task.taskId}`
    setUpdatingId(key)
    try {
      const nextStatus: CampaignTaskStatus = nextTaskStatusOnToggle(task)
      await updateCampaignTaskStatus({
        campaignId: task.campaignId,
        taskId: task.taskId,
        taskIndex: task.taskIndex,
        status: nextStatus,
      })
      await store.reloadCampaigns()
      toast.success("Task updated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update task")
    } finally {
      setUpdatingId(null)
    }
  }

  if (!store.hydrated) {
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
        description="Track upcoming, overdue, and completed work across campaigns."
        action={
          <div className="flex flex-wrap items-center gap-2">
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
          { label: "Due today", value: summary.today, href: "/tasks?tab=today" },
          { label: "Upcoming", value: summary.upcoming, href: "/tasks?tab=upcoming" },
          { label: "Overdue", value: summary.overdue, href: "/tasks?tab=overdue" },
          { label: "Completed", value: summary.completed, href: "/tasks?tab=completed" },
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
            Search and narrow tasks across campaigns.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
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
                {priorityOptions.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
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
                    : taskStatusLabel(filters.status as never)}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
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

      <ModuleWorkflowTabs defaultTab={defaultTab} tabs={TASK_COMMAND_CENTER_TABS} className="gap-4">
        {TASK_COMMAND_CENTER_TABS.map((tab) => {
          const tabTasks = filterTasksForTab(filteredTasks, tab.value)

          return (
          <ModuleTabPanel key={tab.value} value={tab.value}>
            {tab.value === "by-campaign" ? (
              groupTasksByCampaign(tabTasks).length ? (
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
                            key={`${task.campaignId}:${task.taskId}`}
                            task={task}
                            onToggle={handleToggle}
                            updating={updatingId === `${task.campaignId}:${task.taskId}`}
                          />
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <TaskList
                  tasks={[]}
                  tab="by-campaign"
                  onToggle={handleToggle}
                  updatingId={updatingId}
                />
              )
            ) : tab.value === "by-priority" ? (
              groupTasksByPriority(tabTasks).length ? (
                <div className="space-y-4">
                  {groupTasksByPriority(tabTasks).map((group) => (
                    <Card key={group.priority} className={RECENT_RECORDS_CARD_CLASS}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{group.priority}</CardTitle>
                        <CardDescription>{group.tasks.length} task(s)</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {group.tasks.map((task) => (
                          <TaskRow
                            key={`${task.campaignId}:${task.taskId}`}
                            task={task}
                            onToggle={handleToggle}
                            updating={updatingId === `${task.campaignId}:${task.taskId}`}
                          />
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <TaskList
                  tasks={[]}
                  tab="by-priority"
                  onToggle={handleToggle}
                  updatingId={updatingId}
                />
              )
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
