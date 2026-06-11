"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlertTriangle,
  BarChart3,
  Bot,
  ListChecks,
  Megaphone,
  ShieldCheck,
  Video,
} from "lucide-react"

import { getAIProviderStatus } from "@/lib/actions/ai-generation"
import { getDataHealthReport } from "@/lib/actions/data-health"
import { getYouTubeConnectionStatus } from "@/lib/actions/youtube-integration"
import { useStore } from "@/lib/store"
import {
  buildWorkspaceTasks,
  getWorkspaceTaskSummary,
} from "@/lib/data/tasks"
import { sortActiveCampaigns } from "@/lib/dashboard"
import { cn } from "@/lib/utils"

type StatusCardProps = {
  label: string
  value: React.ReactNode
  hint?: string
  href?: string
  icon: React.ElementType
  tone?: "default" | "warning" | "success"
}

function StatusCard({
  label,
  value,
  hint,
  href,
  icon: Icon,
  tone = "default",
}: StatusCardProps) {
  const content = (
    <div
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-colors",
        href && "hover:bg-muted/30",
        tone === "warning" && "border-amber-500/30 bg-amber-500/5",
        tone === "success" && "border-emerald-500/30 bg-emerald-500/5",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/50",
          tone === "warning" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          tone === "success" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-base font-semibold leading-tight tabular-nums">{value}</p>
        {hint ? (
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block min-w-0">
        {content}
      </Link>
    )
  }

  return content
}

export function ControlCenterStatusCards() {
  const { campaigns } = useStore()
  const [youtubeStatus, setYoutubeStatus] = React.useState<string>("Loading…")
  const [aiStatus, setAiStatus] = React.useState<string>("Loading…")
  const [healthSummary, setHealthSummary] = React.useState<{
    warnings: number
    missingAssets: number
  } | null>(null)

  const activeCampaigns = React.useMemo(
    () => sortActiveCampaigns(campaigns).length,
    [campaigns],
  )

  const taskSummary = React.useMemo(
    () => getWorkspaceTaskSummary(buildWorkspaceTasks(campaigns)),
    [campaigns],
  )

  const tasksDue = taskSummary.today + taskSummary.overdue

  React.useEffect(() => {
    let cancelled = false

    void getYouTubeConnectionStatus()
      .then((status) => {
        if (cancelled) return
        if (!status.connected) {
          setYoutubeStatus("Not connected")
          return
        }
        const label = status.connection?.channelTitle?.trim() || "Connected"
        setYoutubeStatus(label)
      })
      .catch(() => {
        if (!cancelled) setYoutubeStatus("Not available")
      })

    void getAIProviderStatus()
      .then((status) => {
        if (cancelled) return
        if (!status.configured) {
          setAiStatus("Not configured")
          return
        }
        setAiStatus(`${status.provider} · ${status.model || "default"}`)
      })
      .catch(() => {
        if (!cancelled) setAiStatus("Not available")
      })

    void getDataHealthReport()
      .then((report) => {
        if (cancelled) return
        setHealthSummary({
          warnings: report.summary.totalIssues,
          missingAssets: report.summary.missingAssets,
        })
      })
      .catch(() => {
        if (!cancelled) setHealthSummary(null)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const healthWarnings = healthSummary?.warnings ?? null
  const missingAssets = healthSummary?.missingAssets ?? null

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <StatusCard
        label="Active Campaigns"
        value={activeCampaigns}
        hint="Planning and active launches"
        href="/campaigns"
        icon={Megaphone}
      />
      <StatusCard
        label="Tasks Due"
        value={tasksDue}
        hint={`${taskSummary.today} today · ${taskSummary.overdue} overdue`}
        href="/tasks"
        icon={ListChecks}
        tone={taskSummary.overdue > 0 ? "warning" : "default"}
      />
      <StatusCard
        label="Missing Assets"
        value={missingAssets ?? "Not available"}
        hint={
          missingAssets === null
            ? "Run a data health scan"
            : missingAssets === 0
              ? "No missing asset warnings"
              : "Review linked campaign assets"
        }
        href="/data-health"
        icon={BarChart3}
        tone={typeof missingAssets === "number" && missingAssets > 0 ? "warning" : "default"}
      />
      <StatusCard
        label="Data Health Warnings"
        value={healthWarnings ?? "Not available"}
        hint={
          healthWarnings === null
            ? "Scan unavailable"
            : healthWarnings === 0
              ? "No open issues"
              : "Broken links, duplicates, and more"
        }
        href="/data-health"
        icon={ShieldCheck}
        tone={typeof healthWarnings === "number" && healthWarnings > 0 ? "warning" : "default"}
      />
      <StatusCard
        label="AI Provider Status"
        value={aiStatus}
        hint="Text generation and copilot"
        href="/settings"
        icon={Bot}
        tone={aiStatus === "Not configured" ? "warning" : "default"}
      />
      <StatusCard
        label="YouTube Connection"
        value={youtubeStatus}
        hint="Brand account and video sync"
        href="/integrations?tab=youtube-api"
        icon={Video}
        tone={
          youtubeStatus !== "Not connected" &&
          youtubeStatus !== "Not available" &&
          youtubeStatus !== "Loading…"
            ? "success"
            : youtubeStatus === "Not connected"
              ? "warning"
              : "default"
        }
      />
    </section>
  )
}

export function ControlCenterStatusFallback() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <StatusCard label="System status" value="Not available" icon={AlertTriangle} />
    </section>
  )
}
