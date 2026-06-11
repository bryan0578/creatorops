"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  BarChart3,
  ClipboardCheck,
  FlaskConical,
  Lightbulb,
  Loader2,
  RefreshCw,
  Scale,
  ScanSearch,
  Video,
} from "lucide-react"

import { detectPatterns } from "@/lib/actions/patterns"
import { patternsForTab } from "@/lib/patterns/detectors"
import type { DetectedPattern, PatternDetectResponse } from "@/lib/patterns/types"
import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { ModuleShell, ModuleTabPanel, ModuleWorkflowTabs } from "@/components/module/form-layout"
import { PatternCard } from "@/components/patterns/pattern-card"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const PATTERN_TABS = [
  { value: "overview", label: "Overview" },
  { value: "youtube", label: "YouTube Patterns" },
  { value: "thumbnail", label: "Thumbnail Patterns" },
  { value: "campaign", label: "Campaign Patterns" },
  { value: "product", label: "Product Patterns" },
  { value: "experiment", label: "Experiment Patterns" },
  { value: "gaps", label: "Gaps & Issues" },
] as const

function SummaryStatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: number | string
  hint?: string
}) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  )
}

function PatternList({
  patterns,
  emptyTitle,
  emptyDescription,
}: {
  patterns: DetectedPattern[]
  emptyTitle: string
  emptyDescription: string
}) {
  if (patterns.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        primaryActionLabel="Detect Patterns"
        primaryActionOnClick={() => window.location.reload()}
      />
    )
  }

  return (
    <div className="grid gap-4">
      {patterns.map((pattern) => (
        <PatternCard key={pattern.id} pattern={pattern} />
      ))}
    </div>
  )
}

function OverviewSection({
  title,
  description,
  patterns,
  href,
}: {
  title: string
  description?: string
  patterns: DetectedPattern[]
  href?: string
}) {
  if (patterns.length === 0) return null
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {href ? (
          <Link href={href} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            View all
          </Link>
        ) : null}
      </div>
      <div className="grid gap-4">
        {patterns.slice(0, 4).map((pattern) => (
          <PatternCard key={pattern.id} pattern={pattern} />
        ))}
      </div>
    </section>
  )
}

export function PatternDetectionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const campaignId = searchParams.get("campaignId") ?? undefined
  const analyticsRecordId = searchParams.get("analyticsRecordId") ?? undefined
  const youtubeVideoId = searchParams.get("youtubeVideoId") ?? undefined
  const tabParam = searchParams.get("tab") ?? "overview"

  const [activeTab, setActiveTab] = React.useState(
    PATTERN_TABS.some((tab) => tab.value === tabParam) ? tabParam : "overview",
  )
  const [loading, setLoading] = React.useState(true)
  const [failed, setFailed] = React.useState(false)
  const [result, setResult] = React.useState<PatternDetectResponse | null>(null)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const response = await detectPatterns({
        campaignId,
        analyticsRecordId,
        youtubeVideoId,
        limit: 80,
      })
      setResult(response)
    } catch {
      setFailed(true)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [campaignId, analyticsRecordId, youtubeVideoId])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    router.replace(`/patterns?${params.toString()}`)
  }

  const patterns = result?.patterns ?? []
  const summary = result?.summary
  const hasEnoughData = patterns.length > 0

  const topPatterns = [...patterns]
    .filter((p) => p.patternType !== "learning-gap" && p.patternType !== "repeated-issue")
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)

  const learningOpportunities = patterns.filter((p) => p.patternType === "learning-gap").slice(0, 4)
  const repeatedIssues = patterns.filter((p) => p.patternType === "repeated-issue").slice(0, 4)

  const recommendedActions = patterns
    .filter((p) => p.confidence === "high" || p.patternType === "learning-gap")
    .slice(0, 3)

  return (
    <ModuleShell>
      <ModulePageHeader
        title="Pattern Detection"
        description="Find repeatable patterns across videos, campaigns, thumbnails, titles, products, experiments, quality reviews, and learnings."
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={loading} onClick={() => void refresh()}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Detect Patterns
            </Button>
            <Link href="/quality-performance" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Scale className="size-4" />
              Quality vs Performance
            </Link>
            <Link href="/learnings?sourceType=pattern-engine" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Lightbulb className="size-4" />
              Create Learning
            </Link>
            <Link href="/analytics" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <BarChart3 className="size-4" />
              Open Analytics
            </Link>
            <Link href="/experiments" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <FlaskConical className="size-4" />
              Open Experiments
            </Link>
            <Link href="/quality" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <ClipboardCheck className="size-4" />
              Open Quality Reviews
            </Link>
          </div>
        }
      />

      {campaignId ? (
        <Card className="border-border/80">
          <CardContent className="flex flex-wrap items-center gap-2 py-3 text-sm">
            <Badge variant="secondary">Campaign filter</Badge>
            <span className="text-muted-foreground">
              Showing patterns scoped to campaign{" "}
              <span className="font-medium text-foreground">{campaignId}</span>
            </span>
            <Link href="/patterns" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Clear filter
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {failed ? (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-sm">Pattern detection failed. Your data is unchanged.</p>
            <Button type="button" size="sm" variant="outline" onClick={() => void refresh()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {loading && !result ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Scanning local records for patterns…
        </div>
      ) : null}

      {!loading && !hasEnoughData ? (
        <EmptyState
          icon={ScanSearch}
          title="Not enough data yet"
          description="Import YouTube videos, sync analytics, complete quality reviews, and create learnings to unlock pattern detection."
          primaryActionLabel="Open Video Intelligence"
          primaryActionHref="/videos"
          secondaryActionLabel="Open Analytics"
          secondaryActionHref="/analytics"
        />
      ) : null}

      {hasEnoughData && summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <SummaryStatCard label="Patterns detected" value={summary.total} />
            <SummaryStatCard label="High-confidence" value={summary.highConfidence} />
            <SummaryStatCard label="Early signals" value={summary.earlySignals} />
            <SummaryStatCard label="Learning opportunities" value={summary.learningOpportunities} />
            <SummaryStatCard label="Repeated issues" value={summary.repeatedIssues} />
            <SummaryStatCard
              label="Best performing pattern"
              value={summary.bestPattern?.score ?? "—"}
              hint={summary.bestPattern?.title}
            />
            <SummaryStatCard
              label="Biggest gap"
              value={summary.biggestGap?.score ?? "—"}
              hint={summary.biggestGap?.title}
            />
          </div>

          <ModuleWorkflowTabs
            tabs={PATTERN_TABS.map((tab) => ({ value: tab.value, label: tab.label }))}
            value={activeTab}
            onValueChange={handleTabChange}
          >
            <ModuleTabPanel value="overview">
              <div className="space-y-8">
                <OverviewSection
                  title="Top Patterns"
                  description="Strongest repeatable signals from your local data."
                  patterns={topPatterns}
                  href="/patterns?tab=youtube"
                />
                <OverviewSection
                  title="Learning Opportunities"
                  description="High-performing or reviewed records without a captured learning."
                  patterns={learningOpportunities}
                  href="/patterns?tab=gaps"
                />
                <OverviewSection
                  title="Repeated Issues"
                  description="Issues that show up across multiple campaigns or records."
                  patterns={repeatedIssues}
                  href="/patterns?tab=gaps"
                />
                {recommendedActions.length > 0 ? (
                  <section className="space-y-3">
                    <h2 className="text-base font-semibold">Recommended Next Actions</h2>
                    <ul className="space-y-2 text-sm">
                      {recommendedActions.map((pattern) => (
                        <li key={pattern.id} className="rounded-md border border-border/70 px-3 py-2">
                          <span className="font-medium">{pattern.title}</span>
                          <span className="text-muted-foreground"> — {pattern.recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            </ModuleTabPanel>

            {PATTERN_TABS.filter((tab) => tab.value !== "overview").map((tab) => (
              <ModuleTabPanel key={tab.value} value={tab.value}>
                <PatternList
                  patterns={patternsForTab(patterns, tab.value)}
                  emptyTitle="No patterns in this category yet"
                  emptyDescription="Add more records in this area or run Detect Patterns again after syncing analytics and reviews."
                />
              </ModuleTabPanel>
            ))}
          </ModuleWorkflowTabs>

          {result?.scannedAt ? (
            <p className="text-xs text-muted-foreground">
              Last scanned {new Date(result.scannedAt).toLocaleString()}
            </p>
          ) : null}
        </>
      ) : null}
    </ModuleShell>
  )
}
