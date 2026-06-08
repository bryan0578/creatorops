import type { StepRunStatus, WorkflowRunStatus } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const STEP_STYLES: Record<StepRunStatus, string> = {
  "Not started":
    "border-transparent bg-muted text-muted-foreground",
  "In progress":
    "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  Complete:
    "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  Skipped:
    "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
}

const RUN_STYLES: Record<WorkflowRunStatus, string> = {
  "Not started":
    "border-transparent bg-muted text-muted-foreground",
  "In progress":
    "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  Complete:
    "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  Archived:
    "border-transparent bg-muted text-muted-foreground",
}

export function StepRunStatusBadge({ status }: { status: StepRunStatus }) {
  return <Badge className={cn(STEP_STYLES[status])}>{status}</Badge>
}

export function WorkflowRunStatusBadge({ status }: { status: WorkflowRunStatus }) {
  return <Badge className={cn(RUN_STYLES[status])}>{status}</Badge>
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  )
}

export function WorkflowProgress({
  done,
  total,
  percent,
}: {
  done: number
  total: number
  percent: number
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-medium">
          {done} of {total} steps complete ({percent}%)
        </span>
      </div>
      <ProgressBar percent={percent} />
    </div>
  )
}
