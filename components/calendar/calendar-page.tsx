"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

import { getCalendarEvents } from "@/lib/actions/calendar-events"
import {
  getDefaultTimelineRange,
  getDefaultUpcomingRange,
  groupUpcomingEvents,
  sortCalendarEvents,
  type CalendarEvent,
  type CalendarEventSummary,
  type CalendarEventType,
  type UpcomingGroup,
} from "@/lib/data/calendar-events"
import { addDays, formatDisplayDate, safeParseDate, startOfDay, toDateKey } from "@/lib/date-utils"
import { CalendarEventRow } from "@/components/calendar/calendar-event-row"
import {
  CalendarMonthGrid,
  getMonthRange,
  getUpcomingMonthAnchor,
} from "@/components/calendar/calendar-month-grid"
import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { ModuleShell } from "@/components/module/form-layout"
import { ModuleTabPanel, ModuleWorkflowTabs } from "@/components/module/workflow-tabs"
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
  SelectValue,
} from "@/components/ui/select"

const CALENDAR_TABS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "calendar", label: "Calendar" },
  { value: "timeline", label: "Timeline" },
  { value: "reviews", label: "Reviews" },
  { value: "by-campaign", label: "By Campaign" },
] as const

const UPCOMING_GROUP_LABELS: Record<UpcomingGroup, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  "this-week": "This Week",
  "next-week": "Next Week",
  later: "Later",
}

const EVENT_TYPES: CalendarEventType[] = [
  "campaign-start",
  "campaign-launch",
  "campaign-end",
  "campaign-task",
  "publishing-checklist",
  "experiment-start",
  "experiment-end",
  "analytics-review",
  "other",
]

function SummaryStatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function CalendarFilters({
  search,
  campaign,
  eventType,
  includeCompleted,
  campaigns,
  onSearchChange,
  onCampaignChange,
  onEventTypeChange,
  onIncludeCompletedChange,
}: {
  search: string
  campaign: string
  eventType: string
  includeCompleted: boolean
  campaigns: string[]
  onSearchChange: (value: string) => void
  onCampaignChange: (value: string) => void
  onEventTypeChange: (value: string) => void
  onIncludeCompletedChange: (value: boolean) => void
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-4">
      <div className="space-y-1.5 lg:col-span-2">
        <Label htmlFor="calendar-search">Search events</Label>
        <Input
          id="calendar-search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search title, campaign, description…"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Campaign</Label>
        <Select value={campaign} onValueChange={(value) => onCampaignChange(value ?? "all")}>
          <SelectTrigger>
            <SelectValue placeholder="All campaigns" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All campaigns</SelectItem>
            {campaigns.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Event type</Label>
        <Select value={eventType} onValueChange={(value) => onEventTypeChange(value ?? "all")}>
          <SelectTrigger>
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {EVENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 lg:col-span-4">
        <input
          id="include-completed"
          type="checkbox"
          className="size-4 rounded border border-input"
          checked={includeCompleted}
          onChange={(event) => onIncludeCompletedChange(event.target.checked)}
        />
        <Label htmlFor="include-completed">Include completed</Label>
      </div>
    </div>
  )
}

function applyClientFilters(
  events: CalendarEvent[],
  filters: {
    search: string
    campaign: string
    eventType: string
  },
): CalendarEvent[] {
  const query = filters.search.trim().toLowerCase()
  return events.filter((event) => {
    if (filters.campaign !== "all" && (event.campaignName ?? "") !== filters.campaign) {
      return false
    }
    if (filters.eventType !== "all" && event.eventType !== filters.eventType) {
      return false
    }
    if (!query) return true
    const haystack = [
      event.title,
      event.description,
      event.campaignName,
      event.status,
      event.eventType,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    return haystack.includes(query)
  })
}

function CalendarContent({
  events,
  summary,
  loading,
  refreshing,
  onRefresh,
  initialCampaignId,
  includeCompleted,
  onIncludeCompletedChange,
}: {
  events: CalendarEvent[]
  summary: CalendarEventSummary
  loading: boolean
  refreshing: boolean
  onRefresh: () => void
  initialCampaignId?: string
  includeCompleted: boolean
  onIncludeCompletedChange: (value: boolean) => void
}) {
  const [search, setSearch] = React.useState("")
  const [campaign, setCampaign] = React.useState("all")
  const [eventType, setEventType] = React.useState("all")
  const [month, setMonth] = React.useState(getUpcomingMonthAnchor())
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(startOfDay(new Date()))

  React.useEffect(() => {
    if (!initialCampaignId) return
    const match = events.find((event) => event.campaignId === initialCampaignId)
    if (match?.campaignName) setCampaign(match.campaignName)
  }, [initialCampaignId, events])

  const campaignNames = React.useMemo(() => {
    const names = new Set<string>()
    for (const event of events) {
      if (event.campaignName) names.add(event.campaignName)
    }
    return Array.from(names).sort()
  }, [events])

  const filtered = React.useMemo(
    () =>
      applyClientFilters(events, {
        search,
        campaign,
        eventType,
      }),
    [events, search, campaign, eventType],
  )

  const upcomingRange = getDefaultUpcomingRange()
  const upcomingEvents = filtered.filter((event) => {
    const parsed = safeParseDate(event.date)
    if (!parsed) return false
    return (
      parsed >= safeParseDate(upcomingRange.from)! &&
      parsed <= safeParseDate(upcomingRange.to)!
    )
  })
  const groupedUpcoming = groupUpcomingEvents(upcomingEvents)

  const timelineRange = getDefaultTimelineRange()
  const timelineEvents = sortCalendarEvents(
    filtered.filter((event) => {
      const parsed = safeParseDate(event.date)
      if (!parsed) return false
      const from = safeParseDate(timelineRange.from)
      const to = safeParseDate(timelineRange.to)
      const overdue =
        parsed < startOfDay(new Date()) &&
        (event.eventType === "campaign-task" || event.eventType === "publishing-checklist")
      return overdue || (from && to && parsed >= from && parsed <= to)
    }),
  )

  const reviewEvents = sortCalendarEvents(
    filtered.filter((event) => event.eventType === "analytics-review"),
  )

  const monthRange = getMonthRange(month)
  const monthEvents = filtered.filter((event) => {
    const parsed = safeParseDate(event.date)
    if (!parsed) return false
    const from = safeParseDate(monthRange.from)
    const to = safeParseDate(monthRange.to)
    if (!from || !to) return false
    return parsed >= from && parsed <= to
  })

  const selectedDayEvents = selectedDay
    ? monthEvents.filter((event) => event.date === toDateKey(selectedDay))
    : []

  const byCampaign = React.useMemo(() => {
    const map = new Map<string, { name: string; status?: string; events: CalendarEvent[] }>()
    for (const event of filtered) {
      const key = event.campaignId ?? event.campaignName ?? "workspace"
      const name = event.campaignName ?? "Workspace"
      const existing = map.get(key) ?? { name, status: event.status, events: [] }
      existing.events.push(event)
      map.set(key, existing)
    }
    return Array.from(map.entries())
      .map(([id, value]) => ({
        id,
        ...value,
        events: sortCalendarEvents(value.events),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [filtered])

  const hasEvents = filtered.length > 0

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryStatCard label="Today" value={summary.today} />
        <SummaryStatCard label="This week" value={summary.thisWeek} />
        <SummaryStatCard label="Upcoming launches" value={summary.upcomingLaunches} />
        <SummaryStatCard label="Overdue" value={summary.overdue} />
        <SummaryStatCard label="Reviews due" value={summary.reviewsDue} />
      </div>

      <CalendarFilters
        search={search}
        campaign={campaign}
        eventType={eventType}
        includeCompleted={includeCompleted}
        campaigns={campaignNames}
        onSearchChange={setSearch}
        onCampaignChange={setCampaign}
        onEventTypeChange={setEventType}
        onIncludeCompletedChange={onIncludeCompletedChange}
      />

      {!hasEvents && !loading ? (
        <EmptyState
          icon={CalendarDays}
          title="No timeline events yet"
          description="Add launch dates, task due dates, experiment dates, or publishing checklist due dates to see them here."
          primaryActionLabel="Open Campaigns"
          primaryActionHref="/campaigns"
          secondaryActionLabel="Open Tasks"
          secondaryActionHref="/tasks"
        />
      ) : (
        <ModuleWorkflowTabs defaultTab="upcoming" tabs={CALENDAR_TABS}>
          <ModuleTabPanel value="upcoming">
            <div className="space-y-4">
              {(Object.keys(groupedUpcoming) as UpcomingGroup[]).every(
                (key) => groupedUpcoming[key].length === 0,
              ) ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Nothing scheduled soon"
                  description="Your upcoming timeline is clear."
                />
              ) : (
                (Object.keys(groupedUpcoming) as UpcomingGroup[]).map((group) =>
                  groupedUpcoming[group].length ? (
                    <Card key={group} className="border-border/80">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{UPCOMING_GROUP_LABELS[group]}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {groupedUpcoming[group].map((event) => (
                          <CalendarEventRow key={event.id} event={event} />
                        ))}
                      </CardContent>
                    </Card>
                  ) : null,
                )
              )}
            </div>
          </ModuleTabPanel>

          <ModuleTabPanel value="calendar">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="text-base">Month view</CardTitle>
                  <CardDescription>Click a day to see scheduled items</CardDescription>
                </CardHeader>
                <CardContent>
                  <CalendarMonthGrid
                    events={monthEvents}
                    month={month}
                    onMonthChange={setMonth}
                    selectedDay={selectedDay}
                    onSelectDay={setSelectedDay}
                  />
                </CardContent>
              </Card>
              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="text-base">Day details</CardTitle>
                  <CardDescription>
                    {selectedDay ? formatDisplayDate(selectedDay) : "Select a day"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedDayEvents.length ? (
                    selectedDayEvents.map((event) => (
                      <CalendarEventRow key={event.id} event={event} compact showDate={false} />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No events on this day.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </ModuleTabPanel>

          <ModuleTabPanel value="timeline">
            <div className="space-y-2">
              {timelineEvents.length ? (
                timelineEvents.map((event) => (
                  <CalendarEventRow key={event.id} event={event} />
                ))
              ) : (
                <EmptyState
                  title="No timeline events in range"
                  description="Try widening filters or adding dated tasks and milestones."
                />
              )}
            </div>
          </ModuleTabPanel>

          <ModuleTabPanel value="reviews">
            <div className="space-y-2">
              {reviewEvents.length ? (
                reviewEvents.map((event) => (
                  <CalendarEventRow key={event.id} event={event} />
                ))
              ) : (
                <EmptyState
                  title="No review milestones"
                  description="Add launch dates to campaigns to derive 24-hour, 7-day, and 30-day reviews."
                  primaryActionLabel="Open Campaigns"
                  primaryActionHref="/campaigns"
                />
              )}
            </div>
          </ModuleTabPanel>

          <ModuleTabPanel value="by-campaign">
            <div className="space-y-4">
              {byCampaign.map((group) => {
                const launch = group.events.find((event) => event.eventType === "campaign-launch")
                const nextDue = group.events.find((event) => {
                  const parsed = safeParseDate(event.date)
                  return parsed && parsed >= startOfDay(new Date())
                })
                return (
                  <Card key={group.id} className="border-border/80">
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">{group.name}</CardTitle>
                          <CardDescription>
                            {group.events.length} dated event
                            {group.events.length === 1 ? "" : "s"}
                            {launch ? ` · Launch ${formatDisplayDate(launch.date)}` : ""}
                          </CardDescription>
                        </div>
                        {group.id !== "workspace" ? (
                          <Link
                            href={`/campaigns?campaignId=${encodeURIComponent(group.id)}`}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            Open Campaign
                          </Link>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {nextDue ? (
                        <p className="text-xs text-muted-foreground">
                          Next due: {nextDue.title} ({formatDisplayDate(nextDue.date)})
                        </p>
                      ) : null}
                      {group.events.slice(0, 8).map((event) => (
                        <CalendarEventRow key={event.id} event={event} compact />
                      ))}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </ModuleTabPanel>
        </ModuleWorkflowTabs>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href="/campaign-board" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Open Campaign Board
        </Link>
        <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh
        </Button>
      </div>
    </div>
  )
}

export function CalendarPage() {
  const searchParams = useSearchParams()
  const campaignId = searchParams.get("campaignId") ?? undefined
  const [events, setEvents] = React.useState<CalendarEvent[]>([])
  const [summary, setSummary] = React.useState<CalendarEventSummary>({
    today: 0,
    thisWeek: 0,
    upcomingLaunches: 0,
    overdue: 0,
    reviewsDue: 0,
  })
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [includeCompleted, setIncludeCompleted] = React.useState(true)

  const loadEvents = React.useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      try {
        const timelineRange = getDefaultTimelineRange()
        const result = await getCalendarEvents({
          from: timelineRange.from,
          to: toDateKey(addDays(new Date(), 120)),
          campaignId,
          includeCompleted,
        })
        setEvents(result.events)
        setSummary(result.summary)
        if (isRefresh) toast.success("Calendar refreshed")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load calendar."
        toast.error(message)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [campaignId, includeCompleted],
  )

  React.useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  return (
    <ModuleShell>
      <ModulePageHeader
        title="Campaign Calendar"
        description="Timeline view of launches, tasks, publishing checklists, experiments, and review milestones."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadEvents(true)}
            disabled={loading || refreshing}
          >
            {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Refresh
          </Button>
        }
      />

      {loading && events.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-muted/20 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading calendar events…
        </div>
      ) : (
        <CalendarContent
          events={events}
          summary={summary}
          loading={loading}
          refreshing={refreshing}
          onRefresh={() => void loadEvents(true)}
          initialCampaignId={campaignId}
          includeCompleted={includeCompleted}
          onIncludeCompletedChange={setIncludeCompleted}
        />
      )}
    </ModuleShell>
  )
}
