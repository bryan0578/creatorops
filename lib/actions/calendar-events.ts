"use server"

import { getAnalyticsRecords } from "@/lib/actions/analytics-records"
import { getCampaigns } from "@/lib/actions/campaigns"
import { getExperiments } from "@/lib/actions/experiments"
import {
  buildCalendarEvents,
  summarizeCalendarEvents,
  type CalendarEvent,
  type CalendarEventSummary,
  type GetCalendarEventsInput,
} from "@/lib/data/calendar-events"

export interface CalendarEventsResult {
  events: CalendarEvent[]
  summary: CalendarEventSummary
  scannedAt: number
}

async function loadCalendarContext() {
  const [campaigns, experiments, analyticsRecords] = await Promise.all([
    getCampaigns(),
    getExperiments(),
    getAnalyticsRecords(),
  ])
  return { campaigns, experiments, analyticsRecords }
}

/** Load normalized calendar events for the workspace. */
export async function getCalendarEvents(
  input?: GetCalendarEventsInput,
): Promise<CalendarEventsResult> {
  const context = await loadCalendarContext()
  const events = buildCalendarEvents(context, input)
  return {
    events,
    summary: summarizeCalendarEvents(events),
    scannedAt: Date.now(),
  }
}
