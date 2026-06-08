import type { WorkflowStatus } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const STATUS_STYLES: Record<WorkflowStatus, string> = {
  Active:
    "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  Draft:
    "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  Paused:
    "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  Archived:
    "border-transparent bg-muted text-muted-foreground",
}

export function StatusBadge({ status }: { status: WorkflowStatus }) {
  return <Badge className={cn(STATUS_STYLES[status])}>{status}</Badge>
}
