"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"

import {
  getCalendarEventTypeLabel,
  type CalendarEvent,
} from "@/lib/data/calendar-events"
import { formatDisplayDate } from "@/lib/date-utils"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function EventTypeBadge({ eventType }: { eventType: CalendarEvent["eventType"] }) {
  return (
    <Badge variant="outline" className="text-[10px]">
      {getCalendarEventTypeLabel(eventType)}
    </Badge>
  )
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null
  const normalized = status.toLowerCase()
  if (normalized === "overdue") {
    return <Badge variant="destructive">{status}</Badge>
  }
  if (normalized === "due") {
    return (
      <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300">
        {status}
      </Badge>
    )
  }
  if (normalized === "completed" || normalized === "done") {
    return <Badge variant="secondary">{status}</Badge>
  }
  return <Badge variant="secondary">{status}</Badge>
}

export function CalendarEventRow({
  event,
  compact = false,
  showDate = true,
}: {
  event: CalendarEvent
  compact?: boolean
  showDate?: boolean
}) {
  const href = event.actionHref ?? event.sourceHref

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border/80 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between",
        compact && "py-2",
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <EventTypeBadge eventType={event.eventType} />
          {event.priority ? (
            <Badge variant="outline" className="text-[10px]">
              {event.priority}
            </Badge>
          ) : null}
          <StatusBadge status={event.status} />
        </div>
        <p className={cn("font-medium text-pretty", compact ? "text-sm" : "text-base")}>
          {event.title}
        </p>
        {!compact && event.description ? (
          <p className="text-sm text-muted-foreground text-pretty">{event.description}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {showDate ? <span>{formatDisplayDate(event.date)}</span> : null}
          {event.campaignName ? <span>Campaign: {event.campaignName}</span> : null}
        </div>
      </div>
      {href ? (
        <div className="flex shrink-0 items-center gap-2">
          <Link href={href} className={cn(buttonVariants({ size: "sm" }))}>
            Open
            <ExternalLink className="size-3.5" />
          </Link>
        </div>
      ) : null}
    </div>
  )
}
