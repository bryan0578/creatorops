"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  BarChart3,
  ClipboardCheck,
  FlaskConical,
  Loader2,
  RefreshCw,
  Repeat,
  Scale,
  ScanSearch,
} from "lucide-react"

import { getLearningFeedbackSuggestions } from "@/lib/actions/feedback-loop"
import { suggestionsForTab } from "@/lib/feedback-loop/suggestions"
import type { FeedbackLoopResponse } from "@/lib/feedback-loop/types"
import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { FeedbackSuggestionCard } from "@/components/feedback-loop/feedback-suggestion-card"
import { ModuleShell, ModuleTabPanel, ModuleWorkflowTabs } from "@/components/module/form-layout"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const FEEDBACK_TABS = [
  { value: "overview", label: "Overview" },
  { value: "learning", label: "Learning Suggestions" },
  { value: "retrospective", label: "Campaign Retrospectives" },
  { value: "experiment", label: "Experiment Results" },
  { value: "pattern", label: "Pattern Learnings" },
  { value: "quality", label: "Quality Learnings" },
  { value: "playbook", label: "Playbook Updates" },
  { value: "ai-context", label: "AI Context" },
] as const

function SummaryStatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

export function FeedbackLoopPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const campaignId = searchParams.get("campaignId") ?? undefined
  const tabParam = searchParams.get("tab") ?? "overview"

  const [activeTab, setActiveTab] = React.useState(
    FEEDBACK_TABS.some((tab) => tab.value === tabParam) ? tabParam : "overview",
  )
  const [loading, setLoading] = React.useState(true)
  const [failed, setFailed] = React.useState(false)
  const [result, setResult] = React.useState<FeedbackLoopResponse | null>(null)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const response = await getLearningFeedbackSuggestions({ campaignId, limit: 80 })
      setResult(response)
    } catch {
      setFailed(true)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    router.replace(`/feedback-loop?${params.toString()}`)
  }

  const suggestions = result?.suggestions ?? []
  const summary = result?.summary
  const hasData = suggestions.length > 0

  return (
    <ModuleShell>
      <ModulePageHeader
        title="Learning Feedback Loop"
        description="Turn performance data, experiments, quality reviews, patterns, and campaign results into reusable learnings and playbook improvements."
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={loading} onClick={() => void refresh()}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Generate Feedback Suggestions
            </Button>
            <Link href="/learnings" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Open Learnings
            </Link>
            <Link href="/patterns" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <ScanSearch className="size-4" />
              Pattern Detection
            </Link>
            <Link href="/quality-performance" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Scale className="size-4" />
              Quality vs Performance
            </Link>
            <Link href="/experiments" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <FlaskConical className="size-4" />
              Open Experiments
            </Link>
          </div>
        }
      />

      {campaignId ? (
        <Card className="border-border/80">
          <CardContent className="flex flex-wrap items-center gap-2 py-3 text-sm">
            <Badge variant="secondary">Campaign filter</Badge>
            <span className="text-muted-foreground">Scoped to campaign {campaignId}</span>
            <Link href="/feedback-loop" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Clear filter
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {loading && !result ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Generating feedback suggestions…
        </div>
      ) : null}

      {!loading && !hasData ? (
        <EmptyState
          icon={Repeat}
          title="No feedback suggestions yet"
          description="Sync analytics, complete experiments, run quality reviews, and detect patterns to generate learning feedback suggestions."
          primaryActionLabel="Open Analytics"
          primaryActionHref="/analytics"
          secondaryActionLabel="Open Experiments"
          secondaryActionHref="/experiments"
        />
      ) : null}

      {hasData && summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <SummaryStatCard label="Suggested learnings" value={summary.totalSuggestions} />
            <SummaryStatCard label="High-confidence" value={summary.highConfidence} />
            <SummaryStatCard label="Campaign retrospectives" value={summary.campaignsNeedingRetrospective} />
            <SummaryStatCard label="Experiments needing learning" value={summary.experimentsNeedingLearning} />
            <SummaryStatCard label="Patterns needing learning" value={summary.patternsNeedingLearning} />
            <SummaryStatCard label="Quality insights" value={summary.qualityInsightsNeedingLearning} />
            <SummaryStatCard label="Playbook updates" value={summary.playbookOpportunities} />
            <SummaryStatCard label="AI context opportunities" value={summary.aiContextOpportunities} />
          </div>

          <ModuleWorkflowTabs
            tabs={FEEDBACK_TABS.map((tab) => ({ value: tab.value, label: tab.label }))}
            value={activeTab}
            onValueChange={handleTabChange}
          >
            <ModuleTabPanel value="overview">
              <div className="space-y-8">
                <section className="space-y-3">
                  <h2 className="text-base font-semibold">Top Feedback Suggestions</h2>
                  <div className="grid gap-4">
                    {summary.topSuggestions.map((suggestion) => (
                      <FeedbackSuggestionCard key={suggestion.id} suggestion={suggestion} onAction={() => void refresh()} />
                    ))}
                  </div>
                </section>
                {suggestions.filter((item) => item.suggestionType === "campaign-retrospective").length > 0 ? (
                  <section className="space-y-3">
                    <h2 className="text-base font-semibold">Campaigns Needing Review</h2>
                    <div className="grid gap-4">
                      {suggestions
                        .filter((item) => item.suggestionType === "campaign-retrospective")
                        .slice(0, 3)
                        .map((suggestion) => (
                          <FeedbackSuggestionCard key={suggestion.id} suggestion={suggestion} />
                        ))}
                    </div>
                  </section>
                ) : null}
              </div>
            </ModuleTabPanel>

            {FEEDBACK_TABS.filter((tab) => tab.value !== "overview").map((tab) => (
              <ModuleTabPanel key={tab.value} value={tab.value}>
                {suggestionsForTab(suggestions, tab.value).length === 0 ? (
                  <EmptyState
                    title="No suggestions in this category"
                    description="Add more source data or run Generate Feedback Suggestions again."
                    primaryActionLabel="Open Analytics"
                    primaryActionHref="/analytics"
                    secondaryActionLabel="Open Quality Reviews"
                    secondaryActionHref="/quality"
                  />
                ) : (
                  <div className="grid gap-4">
                    {suggestionsForTab(suggestions, tab.value).map((suggestion) => (
                      <FeedbackSuggestionCard key={suggestion.id} suggestion={suggestion} onAction={() => void refresh()} />
                    ))}
                  </div>
                )}
              </ModuleTabPanel>
            ))}
          </ModuleWorkflowTabs>

          {result?.scannedAt ? (
            <p className="text-xs text-muted-foreground">
              Last generated {new Date(result.scannedAt).toLocaleString()}
            </p>
          ) : null}
        </>
      ) : null}
    </ModuleShell>
  )
}
