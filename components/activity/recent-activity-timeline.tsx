"use client"

import * as React from "react"
import Link from "next/link"
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  ImageIcon,
  ImagePlus,
  Library,
  ListChecks,
  Loader2,
  Mail,
  Megaphone,
  Play,
  Share2,
  Shirt,
  ShoppingBag,
  Users,
  Video,
  Workflow as WorkflowIcon,
  type LucideIcon,
} from "lucide-react"

import { getRecentActivity } from "@/lib/actions/recent-activity"
import type { ActivityType, RecentActivityItem } from "@/lib/data/recent-activity"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  prompt: Library,
  workflow: WorkflowIcon,
  "prompt-run": Play,
  "workflow-run": ListChecks,
  campaign: Megaphone,
  "youtube-package": Video,
  "youtube-thumbnail": ImagePlus,
  "release-plan": CalendarDays,
  artist: Users,
  "merch-idea": Shirt,
  "product-listing": ShoppingBag,
  "social-repurposing": Share2,
  analytics: BarChart3,
  "mockup-prompt": ImageIcon,
  "email-campaign": Mail,
}

function formatActivityTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function ActivityRow({
  item,
  compact = false,
}: {
  item: RecentActivityItem
  compact?: boolean
}) {
  const Icon = ACTIVITY_ICONS[item.type] ?? Activity

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5 sm:gap-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/50">
          <Icon className="size-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">{item.title}</p>
          {item.subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
          ) : null}
          <div className="mt-0.5 flex flex-wrap items-center gap-1 sm:hidden">
            <Badge
              variant={item.action === "Created" ? "secondary" : "outline"}
              className="h-5 px-1.5 text-[10px]"
            >
              {item.action}
            </Badge>
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] capitalize">
              {item.category}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {formatActivityTime(item.timestamp)}
            </span>
          </div>
        </div>
        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <Badge
            variant={item.action === "Created" ? "secondary" : "outline"}
            className="h-5 px-1.5 text-[10px]"
          >
            {item.action}
          </Badge>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] capitalize">
            {item.category}
          </Badge>
          <span className="max-w-36 truncate text-[11px] text-muted-foreground">
            {formatActivityTime(item.timestamp)}
          </span>
        </div>
        <Link
          href={item.href}
          className={cn(
            buttonVariants({
              variant: item.directOpen ? "default" : "outline",
              size: "sm",
            }),
            "h-7 shrink-0 px-2 text-xs",
          )}
        >
          {item.directOpen ? "Open" : "Go"}
        </Link>
      </div>
    )
  }

  return (
    <div className="flex gap-3 rounded-xl border border-border/80 p-3 sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={item.action === "Created" ? "secondary" : "outline"}
              className="text-xs"
            >
              {item.action}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {item.category}
            </Badge>
            <span className="text-xs text-muted-foreground">{item.badgeLabel}</span>
          </div>
          <p className="truncate text-sm font-medium">{item.title}</p>
          {item.subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">{formatActivityTime(item.timestamp)}</p>
        </div>
      </div>
      <Link
        href={item.href}
        className={cn(
          buttonVariants({
            variant: item.directOpen ? "default" : "outline",
            size: "sm",
          }),
          "shrink-0",
        )}
      >
        {item.directOpen ? "Open" : "Go to module"}
        <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}

export function RecentActivityTimeline({
  limit = 20,
  showViewAll = true,
  compact = false,
  className,
}: {
  limit?: number
  showViewAll?: boolean
  compact?: boolean
  className?: string
}) {
  const [items, setItems] = React.useState<RecentActivityItem[]>([])
  const [loading, setLoading] = React.useState(true)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    try {
      const next = await getRecentActivity(limit)
      setItems(next)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [limit])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <Card className={cn("border-border/80", className)}>
      <CardHeader className={cn(compact && "gap-1 py-3")}>
        <CardTitle className={cn("text-base", compact && "text-sm")}>
          Recent Activity
        </CardTitle>
        {!compact ? (
          <CardDescription>
            Recently created or updated records across CreatorOps
          </CardDescription>
        ) : null}
        {showViewAll ? (
          <CardAction>
            <Link
              href="/activity"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              View all activity
              <ArrowRight className="size-4" />
            </Link>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className={cn(compact ? "space-y-1 pt-0" : "space-y-2")}>
        {loading ? (
          <div
            className={cn(
              "flex items-center gap-2 text-sm text-muted-foreground",
              compact ? "py-4" : "py-8",
            )}
          >
            <Loader2 className="size-4 animate-spin" />
            Loading activity…
          </div>
        ) : items.length === 0 ? (
          <p
            className={cn(
              "text-center text-sm text-muted-foreground text-pretty",
              compact ? "py-4" : "py-8",
            )}
          >
            No activity yet. Create or update records to see activity here.
          </p>
        ) : (
          items.map((item) => (
            <ActivityRow
              key={`${item.type}-${item.id}-${item.timestamp}`}
              item={item}
              compact={compact}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}

export { ActivityRow, formatActivityTime, ACTIVITY_ICONS }
