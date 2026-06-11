"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Bot, Loader2 } from "lucide-react"

import { getAutomationReport } from "@/lib/actions/automation-rules"
import type { AutomationSuggestion } from "@/lib/data/automation-rules"
import { AutomationSuggestionRow } from "@/components/automation/automation-suggestion-row"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function ControlCenterNextActions() {
  const [suggestions, setSuggestions] = React.useState<AutomationSuggestion[]>([])
  const [loading, setLoading] = React.useState(true)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    void getAutomationReport()
      .then((report) => {
        if (cancelled) return
        setSuggestions(report.suggestions.slice(0, 3))
        setFailed(false)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4 text-muted-foreground" />
              Next Best Actions
            </CardTitle>
            <CardDescription>
              Top automation suggestions from your workspace scan
            </CardDescription>
          </div>
          <Link href="/automation" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            View all
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {loading ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/80 px-3 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading suggestions…
          </div>
        ) : failed ? (
          <div className="rounded-lg border border-dashed border-border/80 px-3 py-6 text-center text-sm text-muted-foreground">
            Suggestions are not available right now. Open Automation to run a scan manually.
          </div>
        ) : suggestions.length ? (
          suggestions.map((suggestion) => (
            <AutomationSuggestionRow key={suggestion.id} suggestion={suggestion} compact />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border/80 px-3 py-6 text-center">
            <p className="text-sm text-muted-foreground text-pretty">
              No proactive suggestions yet. Import campaigns, connect YouTube, or run a data
              health scan to unlock next steps.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Link href="/campaigns" className={buttonVariants({ size: "sm" })}>
                Open Campaigns
              </Link>
              <Link
                href="/integrations?tab=youtube-api"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Connect YouTube
              </Link>
              <Link
                href="/data-health"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Run Data Health
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
