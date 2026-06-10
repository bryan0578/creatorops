"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Bot, CheckCircle2, Loader2, RefreshCw } from "lucide-react"

import { getAutomationReport } from "@/lib/actions/automation-rules"
import {
  filterSuggestionsForCampaign,
  type AutomationReport,
} from "@/lib/data/automation-rules"
import { AutomationSuggestionRow } from "@/components/automation/automation-suggestion-row"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

function useAutomationReport(campaignId?: string) {
  const [report, setReport] = React.useState<AutomationReport | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  const runScan = React.useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      try {
        const next = await getAutomationReport(
          campaignId ? { campaignId } : undefined,
        )
        setReport(next)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [campaignId],
  )

  React.useEffect(() => {
    void runScan()
  }, [runScan])

  const suggestions = React.useMemo(() => {
    if (!report) return []
    if (campaignId) return filterSuggestionsForCampaign(report, campaignId)
    return report.suggestions
  }, [report, campaignId])

  return { report, suggestions, loading, refreshing, runScan }
}

export function AutomationDashboardCard() {
  const { report, suggestions, loading, refreshing, runScan } = useAutomationReport()
  const top = suggestions[0]

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4 text-muted-foreground" />
              Automation Suggestions
            </CardTitle>
            <CardDescription>
              Proactive next actions from workspace scans
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={loading || refreshing}
            onClick={() => void runScan(true)}
            aria-label="Refresh automation scan"
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
        {loading && !report ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Scanning workspace…
          </div>
        ) : report ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="tabular-nums">
                {report.summary.totalSuggestions} total
              </Badge>
              {report.summary.highPriority > 0 ? (
                <Badge variant="destructive" className="tabular-nums">
                  {report.summary.highPriority} high
                </Badge>
              ) : null}
            </div>
            {top ? (
              <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-2">
                <p className="text-xs text-muted-foreground">Top suggestion</p>
                <p className="text-sm font-medium text-pretty">{top.title}</p>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                Workspace automation looks good.
              </p>
            )}
            <Link href="/automation" className={cn(buttonVariants({ size: "sm" }), "w-full sm:w-auto")}>
              Open Automation
              <ArrowRight className="size-4" />
            </Link>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function CampaignAutomationSuggestionsCard({
  campaignId,
}: {
  campaignId: string
}) {
  const { report, suggestions, loading, refreshing, runScan } =
    useAutomationReport(campaignId)
  const topThree = suggestions.slice(0, 3)

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4 text-muted-foreground" />
              Automation Suggestions
            </CardTitle>
            <CardDescription>Top suggestions for this campaign</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || refreshing}
              onClick={() => void runScan(true)}
            >
              {refreshing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Scan
            </Button>
            <Link
              href={`/automation?campaignId=${encodeURIComponent(campaignId)}`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              View Automation
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {loading && !report ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Scanning campaign…
          </div>
        ) : topThree.length ? (
          topThree.map((suggestion) => (
            <AutomationSuggestionRow
              key={suggestion.id}
              suggestion={suggestion}
              compact
              onApplied={() => void runScan(true)}
            />
          ))
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            Campaign automation looks good.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
