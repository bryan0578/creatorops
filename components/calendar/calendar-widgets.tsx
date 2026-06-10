"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, CalendarDays, Loader2, RefreshCw } from "lucide-react"

import { getCalendarEvents } from "@/lib/actions/calendar-events"
import { sortCalendarEvents, type CalendarEvent } from "@/lib/data/calendar-events"
import { addDays, formatDisplayDate, toDateKey } from "@/lib/date-utils"
import { CalendarEventRow } from "@/components/calendar/calendar-event-row"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function useCalendarEvents(campaignId?: string) {
  const [events, setEvents] = React.useState<CalendarEvent[]>([])
  const [summary, setSummary] = React.useState({
    today: 0,
    thisWeek: 0,
    upcomingLaunches: 0,
    overdue: 0,
    reviewsDue: 0,
  })
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  const runLoad = React.useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      try {
        const now = new Date()
        const result = await getCalendarEvents({
          from: toDateKey(now),
          to: toDateKey(addDays(now, 60)),
          campaignId,
          includeCompleted: false,
        })
        setEvents(result.events)
        setSummary(result.summary)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [campaignId],
  )

  React.useEffect(() => {
    void runLoad()
  }, [runLoad])

  return { events, summary, loading, refreshing, runLoad }
}

export function CalendarDashboardCard() {
  const { events, summary, loading, refreshing, runLoad } = useCalendarEvents()
  const nextLaunch = events.find((event) => event.eventType === "campaign-launch")
  const dueThisWeek = summary.thisWeek

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 text-muted-foreground" />
              Upcoming Timeline
            </CardTitle>
            <CardDescription>Launches, tasks, and milestones</CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={loading || refreshing}
            onClick={() => void runLoad(true)}
            aria-label="Refresh calendar"
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading timeline…
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{dueThisWeek} due this week</Badge>
              <Badge variant="outline">{summary.upcomingLaunches} launches</Badge>
            </div>
            {nextLaunch ? (
              <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-2">
                <p className="text-xs text-muted-foreground">Next launch</p>
                <p className="text-sm font-medium text-pretty">{nextLaunch.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDisplayDate(nextLaunch.date)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming launches scheduled.</p>
            )}
            <Link href="/calendar" className={buttonVariants({ size: "sm" })}>
              Open Calendar
              <ArrowRight className="size-4" />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function CampaignCalendarTimelineCard({ campaignId }: { campaignId: string }) {
  const { events, loading, refreshing, runLoad } = useCalendarEvents(campaignId)
  const sorted = sortCalendarEvents(events)
  const topThree = sorted.slice(0, 3)
  const nextReview = sorted.find((event) => event.eventType === "analytics-review")

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 text-muted-foreground" />
              Timeline
            </CardTitle>
            <CardDescription>Upcoming dates for this campaign</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || refreshing}
              onClick={() => void runLoad(true)}
            >
              {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Refresh
            </Button>
            <Link
              href={`/calendar?campaignId=${encodeURIComponent(campaignId)}`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Open Calendar
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading timeline…
          </div>
        ) : topThree.length ? (
          topThree.map((event) => (
            <CalendarEventRow key={event.id} event={event} compact showDate />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No dated items yet. Add launch dates or task due dates.
          </p>
        )}
        {nextReview ? (
          <p className="text-xs text-muted-foreground">
            Next review: {nextReview.title} ({formatDisplayDate(nextReview.date)})
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
