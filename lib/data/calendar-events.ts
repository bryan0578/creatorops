/**
 * Campaign Calendar — derive timeline events from existing workspace data.
 */

import {
  addDays,
  daysBetween,
  isDateInRange,
  safeParseDate,
  startOfDay,
  toDateKey,
} from "@/lib/date-utils"
import {
  isChecklistItemDone,
  isPublishedCampaignStatus,
} from "@/lib/data/publishing-checklist"
import type {
  AnalyticsRecord,
  CampaignRecord,
  CampaignTask,
  ExperimentRecord,
  PublishingChecklistPhase,
} from "@/lib/types"

export type CalendarEventType =
  | "campaign-start"
  | "campaign-launch"
  | "campaign-end"
  | "campaign-task"
  | "publishing-checklist"
  | "experiment-start"
  | "experiment-end"
  | "analytics-review"
  | "automation"
  | "other"

export type CalendarReviewStatus = "upcoming" | "due" | "overdue" | "completed"

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  eventType: CalendarEventType
  date: string
  endDate?: string
  status?: string
  priority?: string
  campaignId?: string
  campaignName?: string
  sourceType: string
  sourceId?: string
  sourceHref?: string
  actionHref?: string
  metadata?: Record<string, string | number | boolean>
}

export interface CalendarEventsContext {
  campaigns: CampaignRecord[]
  experiments: ExperimentRecord[]
  analyticsRecords: AnalyticsRecord[]
}

export interface GetCalendarEventsInput {
  from?: string
  to?: string
  campaignId?: string
  includeCompleted?: boolean
}

export interface CalendarEventSummary {
  today: number
  thisWeek: number
  upcomingLaunches: number
  overdue: number
  reviewsDue: number
}

const REVIEW_DEFS = [
  {
    days: 1,
    label: "24-hour review",
    pattern: /24[- ]?hour/i,
    phase: "24-Hour Review" as PublishingChecklistPhase,
  },
  {
    days: 7,
    label: "7-day review",
    pattern: /7[- ]?day/i,
    phase: "7-Day Review" as PublishingChecklistPhase,
  },
  {
    days: 30,
    label: "30-day review",
    pattern: /30[- ]?day/i,
    phase: "30-Day Review" as PublishingChecklistPhase,
  },
] as const

const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  "campaign-start": "Campaign Start",
  "campaign-launch": "Launch",
  "campaign-end": "Campaign End",
  "campaign-task": "Task",
  "publishing-checklist": "Checklist",
  "experiment-start": "Experiment",
  "experiment-end": "Experiment",
  "analytics-review": "Review",
  automation: "Automation",
  other: "Other",
}

export function getCalendarEventTypeLabel(eventType: CalendarEventType): string {
  return EVENT_TYPE_LABELS[eventType] ?? "Event"
}

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase()
}

function campaignHref(campaignId: string, tab?: string): string {
  const base = `/campaigns?campaignId=${encodeURIComponent(campaignId)}`
  return tab ? `${base}&tab=${encodeURIComponent(tab)}` : base
}

function taskIsCompleted(task: CampaignTask): boolean {
  return norm(task.status) === "done"
}

function campaignHasReviewTask(campaign: CampaignRecord, pattern: RegExp): boolean {
  return campaign.tasks.some((task) => pattern.test(task.title))
}

function reviewTaskCompleted(campaign: CampaignRecord, pattern: RegExp): boolean {
  const task = campaign.tasks.find((item) => pattern.test(item.title))
  if (task) return taskIsCompleted(task)
  return false
}

function checklistPhaseCompleted(
  campaign: CampaignRecord,
  phase: PublishingChecklistPhase,
): boolean {
  const items = campaign.publishingChecklist.items.filter((item) => item.phase === phase)
  if (items.length === 0) return false
  return items.every((item) => isChecklistItemDone(item.status))
}

function getReviewStatus(reviewDate: Date, completed: boolean, now: Date): CalendarReviewStatus {
  if (completed) return "completed"
  const diff = daysBetween(now, reviewDate)
  if (diff > 0) return "upcoming"
  if (diff === 0) return "due"
  return "overdue"
}

function getCampaignAnchorDate(
  campaign: CampaignRecord,
  analyticsRecords: AnalyticsRecord[],
): Date | null {
  const launch = safeParseDate(campaign.launchDate)
  if (launch) return launch

  const linkedAnalytics = analyticsRecords.filter(
    (record) =>
      norm(record.relatedCampaign) === norm(campaign.campaignName) ||
      campaign.linkedRecords.some(
        (link) => link.type === "analytics" && link.id === record.id,
      ),
  )
  for (const record of linkedAnalytics) {
    const publish = safeParseDate(record.publishDate)
    if (publish) return publish
  }
  return null
}

function pushEvent(events: CalendarEvent[], event: CalendarEvent | null) {
  if (!event) return
  events.push(event)
}

function buildCampaignMilestoneEvents(
  campaign: CampaignRecord,
  includeCompleted: boolean,
): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const milestones: Array<{
    date: string
    eventType: CalendarEventType
    title: string
  }> = [
    { date: campaign.startDate, eventType: "campaign-start", title: "Campaign start" },
    { date: campaign.launchDate, eventType: "campaign-launch", title: "Campaign launch" },
    { date: campaign.endDate, eventType: "campaign-end", title: "Campaign end" },
  ]

  for (const milestone of milestones) {
    const parsed = safeParseDate(milestone.date)
    if (!parsed) continue
    pushEvent(events, {
      id: `${milestone.eventType}:${campaign.id}`,
      title: `${campaign.campaignName || "Campaign"} — ${milestone.title}`,
      description: milestone.title,
      eventType: milestone.eventType,
      date: toDateKey(parsed),
      status: campaign.status,
      priority: campaign.priority,
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      sourceType: "campaign",
      sourceId: campaign.id,
      sourceHref: campaignHref(campaign.id),
      actionHref: campaignHref(campaign.id, "overview"),
    })
  }

  for (const task of campaign.tasks) {
    const parsed = safeParseDate(task.dueDate)
    if (!parsed) continue
    if (!includeCompleted && taskIsCompleted(task)) continue
    pushEvent(events, {
      id: `campaign-task:${campaign.id}:${task.id}`,
      title: task.title || "Campaign task",
      description: task.description || undefined,
      eventType: "campaign-task",
      date: toDateKey(parsed),
      status: task.status,
      priority: campaign.priority,
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      sourceType: "campaign-task",
      sourceId: task.id,
      sourceHref: campaignHref(campaign.id, "tasks"),
      actionHref: campaignHref(campaign.id, "tasks"),
    })
  }

  for (const item of campaign.publishingChecklist.items) {
    const parsed = safeParseDate(item.dueDate)
    if (!parsed) continue
    if (!includeCompleted && isChecklistItemDone(item.status)) continue
    pushEvent(events, {
      id: `publishing-checklist:${campaign.id}:${item.id}`,
      title: item.title,
      description: item.phase,
      eventType: "publishing-checklist",
      date: toDateKey(parsed),
      status: item.status,
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      sourceType: "publishing-checklist",
      sourceId: item.id,
      sourceHref: campaignHref(campaign.id, "publishing-checklist"),
      actionHref: campaignHref(campaign.id, "publishing-checklist"),
      metadata: { phase: item.phase },
    })
  }

  return events
}

function buildReviewMilestones(
  campaign: CampaignRecord,
  analyticsRecords: AnalyticsRecord[],
  includeCompleted: boolean,
  now: Date,
): CalendarEvent[] {
  const anchor = getCampaignAnchorDate(campaign, analyticsRecords)
  if (!anchor) return []

  const events: CalendarEvent[] = []
  for (const def of REVIEW_DEFS) {
    if (campaignHasReviewTask(campaign, def.pattern)) continue

    const reviewDate = addDays(anchor, def.days)
    const completed =
      reviewTaskCompleted(campaign, def.pattern) ||
      checklistPhaseCompleted(campaign, def.phase)
    if (!includeCompleted && completed) continue

    const reviewStatus = getReviewStatus(reviewDate, completed, now)
    events.push({
      id: `analytics-review:${campaign.id}:${def.days}`,
      title: `${def.label} — ${campaign.campaignName || "Campaign"}`,
      description: `Performance review milestone (${def.days} day${def.days === 1 ? "" : "s"} after launch).`,
      eventType: "analytics-review",
      date: toDateKey(reviewDate),
      status: reviewStatus,
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      sourceType: "analytics-review",
      sourceId: campaign.id,
      sourceHref: campaignHref(campaign.id, "tasks"),
      actionHref: `/analytics?campaignId=${encodeURIComponent(campaign.id)}`,
      metadata: { reviewDays: def.days, reviewLabel: def.label },
    })
  }
  return events
}

function buildExperimentEvents(
  experiment: ExperimentRecord,
  includeCompleted: boolean,
): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const pairs: Array<{ date: string; eventType: "experiment-start" | "experiment-end"; title: string }> = [
    { date: experiment.startDate, eventType: "experiment-start", title: "Experiment start" },
    { date: experiment.endDate, eventType: "experiment-end", title: "Experiment end" },
  ]

  for (const pair of pairs) {
    const parsed = safeParseDate(pair.date)
    if (!parsed) continue
    if (!includeCompleted && experiment.status === "Archived") continue
    events.push({
      id: `${pair.eventType}:${experiment.id}`,
      title: `${experiment.experimentName || "Experiment"} — ${pair.title}`,
      description: experiment.experimentType,
      eventType: pair.eventType,
      date: toDateKey(parsed),
      status: experiment.status,
      campaignId: experiment.campaignId || undefined,
      campaignName: experiment.campaignName || undefined,
      sourceType: "experiment",
      sourceId: experiment.id,
      sourceHref: `/experiments?recordId=${encodeURIComponent(experiment.id)}`,
      actionHref: `/experiments?recordId=${encodeURIComponent(experiment.id)}`,
    })
  }
  return events
}

function buildAnalyticsPublishEvents(
  record: AnalyticsRecord,
  campaigns: CampaignRecord[],
  includeCompleted: boolean,
): CalendarEvent[] {
  const parsed = safeParseDate(record.publishDate)
  if (!parsed) return []

  const linkedCampaign = campaigns.find(
    (campaign) =>
      norm(campaign.campaignName) === norm(record.relatedCampaign) ||
      campaign.linkedRecords.some((link) => link.type === "analytics" && link.id === record.id),
  )

  if (linkedCampaign) {
    const launch = safeParseDate(linkedCampaign.launchDate)
    if (launch && toDateKey(launch) === toDateKey(parsed)) return []
  }

  return [
    {
      id: `analytics-publish:${record.id}`,
      title: `${record.itemName || "Analytics"} published`,
      description: record.platform,
      eventType: "other",
      date: toDateKey(parsed),
      status: record.platform,
      campaignId: linkedCampaign?.id,
      campaignName: linkedCampaign?.campaignName ?? record.relatedCampaign,
      sourceType: "analytics",
      sourceId: record.id,
      sourceHref: `/analytics?recordId=${encodeURIComponent(record.id)}`,
      actionHref: `/analytics?recordId=${encodeURIComponent(record.id)}`,
    },
  ]
}

function filterByOptions(
  events: CalendarEvent[],
  options?: GetCalendarEventsInput,
): CalendarEvent[] {
  const from = options?.from ? safeParseDate(options.from) : null
  const to = options?.to ? safeParseDate(options.to) : null

  return events.filter((event) => {
    if (options?.campaignId && event.campaignId && event.campaignId !== options.campaignId) {
      return false
    }
    if (options?.campaignId && !event.campaignId && event.eventType !== "other") {
      return false
    }
    const parsed = safeParseDate(event.date)
    if (!parsed) return false
    if (!isDateInRange(parsed, from, to)) return false
    return true
  })
}

export function sortCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const aTs = safeParseDate(a.date)?.getTime() ?? 0
    const bTs = safeParseDate(b.date)?.getTime() ?? 0
    if (aTs !== bTs) return aTs - bTs
    return a.title.localeCompare(b.title)
  })
}

/** Build normalized calendar events from workspace records. */
export function buildCalendarEvents(
  context: CalendarEventsContext,
  options?: GetCalendarEventsInput,
): CalendarEvent[] {
  const includeCompleted = options?.includeCompleted ?? true
  const now = new Date()
  const events: CalendarEvent[] = []

  for (const campaign of context.campaigns) {
    events.push(...buildCampaignMilestoneEvents(campaign, includeCompleted))
    events.push(...buildReviewMilestones(campaign, context.analyticsRecords, includeCompleted, now))
  }

  for (const experiment of context.experiments) {
    events.push(...buildExperimentEvents(experiment, includeCompleted))
  }

  for (const record of context.analyticsRecords) {
    events.push(...buildAnalyticsPublishEvents(record, context.campaigns, includeCompleted))
  }

  return sortCalendarEvents(filterByOptions(events, options))
}

export function summarizeCalendarEvents(
  events: CalendarEvent[],
  now = new Date(),
): CalendarEventSummary {
  const todayKey = toDateKey(now)
  const weekEnd = addDays(now, 7)

  let today = 0
  let thisWeek = 0
  let upcomingLaunches = 0
  let overdue = 0
  let reviewsDue = 0

  for (const event of events) {
    const parsed = safeParseDate(event.date)
    if (!parsed) continue
    const key = toDateKey(parsed)

    if (key === todayKey) today += 1
    if (isDateInRange(parsed, startOfDay(now), weekEnd)) thisWeek += 1

    if (event.eventType === "campaign-launch") {
      if (parsed.getTime() >= startOfDay(now).getTime()) upcomingLaunches += 1
    }

    const isDone = norm(event.status) === "done" || event.status === "completed"

    if (
      !isDone &&
      parsed.getTime() < startOfDay(now).getTime() &&
      (event.eventType === "campaign-task" || event.eventType === "publishing-checklist")
    ) {
      overdue += 1
    }

    if (
      event.eventType === "analytics-review" &&
      (event.status === "due" || event.status === "overdue")
    ) {
      reviewsDue += 1
    }
  }

  return { today, thisWeek, upcomingLaunches, overdue, reviewsDue }
}

export function filterEventsForCampaign(
  events: CalendarEvent[],
  campaignId: string,
): CalendarEvent[] {
  return events.filter((event) => event.campaignId === campaignId)
}

export type UpcomingGroup = "today" | "tomorrow" | "this-week" | "next-week" | "later"

export function groupUpcomingEvents(
  events: CalendarEvent[],
  now = new Date(),
): Record<UpcomingGroup, CalendarEvent[]> {
  const groups: Record<UpcomingGroup, CalendarEvent[]> = {
    today: [],
    tomorrow: [],
    "this-week": [],
    "next-week": [],
    later: [],
  }

  const today = startOfDay(now)
  const tomorrow = addDays(today, 1)
  const weekEnd = addDays(today, 7)
  const nextWeekEnd = addDays(today, 14)

  for (const event of events) {
    const parsed = safeParseDate(event.date)
    if (!parsed) continue
    const day = startOfDay(parsed)

    if (isSameDayKey(day, today)) {
      groups.today.push(event)
    } else if (isSameDayKey(day, tomorrow)) {
      groups.tomorrow.push(event)
    } else if (day > today && day <= weekEnd) {
      groups["this-week"].push(event)
    } else if (day > weekEnd && day <= nextWeekEnd) {
      groups["next-week"].push(event)
    } else if (day > nextWeekEnd) {
      groups.later.push(event)
    }
  }

  for (const key of Object.keys(groups) as UpcomingGroup[]) {
    groups[key] = sortCalendarEvents(groups[key])
  }
  return groups
}

function isSameDayKey(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b)
}

export function getDefaultUpcomingRange(now = new Date()): { from: string; to: string } {
  return {
    from: toDateKey(now),
    to: toDateKey(addDays(now, 60)),
  }
}

export function getDefaultTimelineRange(now = new Date()): { from: string; to: string } {
  const from = addDays(now, -30)
  return {
    from: toDateKey(from),
    to: toDateKey(addDays(now, 90)),
  }
}

export function isLaunchReadyWithoutDate(campaign: CampaignRecord): boolean {
  return (
    (isPublishedCampaignStatus(campaign.status) ||
      norm(campaign.status) === "ready to publish") &&
    !safeParseDate(campaign.launchDate)
  )
}

export function hasReviewPhaseWithoutLaunch(campaign: CampaignRecord): boolean {
  if (safeParseDate(campaign.launchDate)) return false
  return campaign.publishingChecklist.items.some(
    (item) =>
      item.phase === "24-Hour Review" ||
      item.phase === "7-Day Review" ||
      item.phase === "30-Day Review",
  )
}

export function experimentHasInvalidDateRange(experiment: ExperimentRecord): boolean {
  const start = safeParseDate(experiment.startDate)
  const end = safeParseDate(experiment.endDate)
  if (!start || !end) return false
  return end.getTime() < start.getTime()
}
