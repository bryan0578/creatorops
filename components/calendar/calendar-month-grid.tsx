"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import type { CalendarEvent } from "@/lib/data/calendar-events"
import {
  endOfMonth,
  formatShortDate,
  isSameDay,
  isToday,
  safeParseDate,
  startOfMonth,
  toDateKey,
} from "@/lib/date-utils"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const key = toDateKey(day)
  return events.filter((event) => event.date === key)
}

export function CalendarMonthGrid({
  events,
  month,
  onMonthChange,
  selectedDay,
  onSelectDay,
}: {
  events: CalendarEvent[]
  month: Date
  onMonthChange: (next: Date) => void
  selectedDay: Date | null
  onSelectDay: (day: Date) => void
}) {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const startPad = monthStart.getDay()
  const daysInMonth = monthEnd.getDate()

  const cells: Array<Date | null> = []
  for (let i = 0; i < startPad; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() =>
            onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="text-sm font-semibold">
          {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() =>
            onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1 font-medium">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (!day) {
            return <div key={`pad-${index}`} className="min-h-16 rounded-md bg-muted/10" />
          }

          const dayEvents = eventsForDay(events, day)
          const selected = selectedDay ? isSameDay(day, selectedDay) : false
          const today = isToday(day)

          return (
            <button
              key={toDateKey(day)}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                "flex min-h-16 flex-col rounded-md border border-border/60 p-1.5 text-left transition-colors hover:bg-muted/40",
                selected && "border-primary bg-primary/5",
                today && "ring-1 ring-primary/40",
              )}
            >
              <span className={cn("text-xs font-medium", today && "text-primary")}>
                {day.getDate()}
              </span>
              {dayEvents.length > 0 ? (
                <span className="mt-1 inline-flex w-fit rounded bg-muted px-1 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                  {dayEvents.length}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {selectedDay ? (
        <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
          <p className="text-sm font-medium">{formatShortDate(selectedDay)}</p>
          <p className="text-xs text-muted-foreground">
            {eventsForDay(events, selectedDay).length} event
            {eventsForDay(events, selectedDay).length === 1 ? "" : "s"}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Select a day to view events.</p>
      )}
    </div>
  )
}

export function getMonthRange(month: Date): { from: string; to: string } {
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  return { from: toDateKey(start), to: toDateKey(end) }
}

export function getUpcomingMonthAnchor(now = new Date()): Date {
  return startOfMonth(now)
}
