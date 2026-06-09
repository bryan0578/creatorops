import type { CampaignRecord, CampaignTask, ReleasePlan } from "@/lib/types"

const PRIORITY_ORDER: Record<string, number> = {
  Urgent: 0,
  High: 1,
  Medium: 2,
  Low: 3,
}

export function parseDashboardDate(value: string): number | null {
  if (!value?.trim()) return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

export function formatDashboardDate(value: string): string {
  const ts = parseDashboardDate(value)
  if (ts === null) return value?.trim() || "TBD"
  return new Date(ts).toLocaleDateString(undefined, { dateStyle: "medium" })
}

export function formatLaunchLabel(launchDate: string): string {
  const formatted = formatDashboardDate(launchDate)
  return formatted === "TBD" ? "Launch: TBD" : `Launch: ${formatted}`
}

export function getCampaignSubject(campaign: CampaignRecord): string {
  const parts = [campaign.artistName, campaign.songTitle, campaign.productName].filter(
    Boolean,
  )
  return parts.join(" · ") || "No artist / song / product"
}

export function getCampaignTaskProgress(tasks: CampaignTask[]) {
  if (!tasks.length) return null
  const done = tasks.filter((t) => t.status === "Done").length
  const inProgress = tasks.filter((t) => t.status === "In Progress").length
  return {
    done,
    total: tasks.length,
    inProgress,
    label: `${done}/${tasks.length} tasks done`,
    percent: Math.round((done / tasks.length) * 100),
  }
}

export function sortActiveCampaigns(campaigns: CampaignRecord[]): CampaignRecord[] {
  return campaigns
    .filter((c) => c.status === "Active" || c.status === "Planning")
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99
      const pb = PRIORITY_ORDER[b.priority] ?? 99
      if (pa !== pb) return pa - pb
      const launchA = parseDashboardDate(a.launchDate) ?? Number.MAX_SAFE_INTEGER
      const launchB = parseDashboardDate(b.launchDate) ?? Number.MAX_SAFE_INTEGER
      if (launchA !== launchB) return launchA - launchB
      return b.updatedAt - a.updatedAt
    })
}

export interface UpcomingLaunchItem {
  id: string
  name: string
  date: string
  dateTs: number
  type: string
  status: string
  href: string
  source: "campaign" | "release-plan"
}

export function getUpcomingLaunches(
  campaigns: CampaignRecord[],
  releasePlans: ReleasePlan[],
  limit = 8,
): UpcomingLaunchItem[] {
  const now = Date.now()
  const items: UpcomingLaunchItem[] = []

  for (const campaign of campaigns) {
    const dateTs = parseDashboardDate(campaign.launchDate)
    if (dateTs === null || dateTs < now - 86_400_000) continue
    if (campaign.status === "Archived" || campaign.status === "Complete") continue

    items.push({
      id: campaign.id,
      name: campaign.campaignName || "Untitled campaign",
      date: campaign.launchDate,
      dateTs,
      type: campaign.campaignType,
      status: campaign.status,
      href: `/campaigns?campaignId=${encodeURIComponent(campaign.id)}`,
      source: "campaign",
    })
  }

  for (const plan of releasePlans) {
    const dateTs = parseDashboardDate(plan.releaseDate)
    if (dateTs === null || dateTs < now - 86_400_000) continue

    const name =
      [plan.artistName, plan.songTitle].filter(Boolean).join(" — ") ||
      "Untitled release plan"

    items.push({
      id: plan.id,
      name,
      date: plan.releaseDate,
      dateTs,
      type: "Release Plan",
      status: "Scheduled",
      href: `/release-planner?recordId=${encodeURIComponent(plan.id)}`,
      source: "release-plan",
    })
  }

  return items.sort((a, b) => a.dateTs - b.dateTs).slice(0, limit)
}

export function priorityBadgeClass(priority: string): string {
  switch (priority) {
    case "Urgent":
      return "border-destructive/50 bg-destructive/10 text-destructive"
    case "High":
      return "border-orange-500/40 bg-orange-500/10 text-orange-400"
    case "Medium":
      return "border-border bg-muted/50 text-foreground"
    case "Low":
      return "border-border/60 bg-muted/30 text-muted-foreground"
    default:
      return ""
  }
}

export function campaignStatusBadgeClass(status: string): string {
  switch (status) {
    case "Active":
      return "border-primary/50 bg-primary/15 text-primary"
    case "Planning":
      return "border-sky-500/40 bg-sky-500/10 text-sky-400"
    case "Launched":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
    default:
      return ""
  }
}
