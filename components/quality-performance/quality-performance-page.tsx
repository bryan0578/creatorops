"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  BarChart3,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Repeat,
  ScanSearch,
  Scale,
  Video,
} from "lucide-react"

import { analyzeQualityPerformance } from "@/lib/actions/quality-performance"
import { insightsForTab } from "@/lib/quality-performance/detectors"
import type { QualityPerformanceAnalyzeResponse } from "@/lib/quality-performance/types"
import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { ModuleShell, ModuleTabPanel, ModuleWorkflowTabs } from "@/components/module/form-layout"
import { QualityPerformanceCard } from "@/components/quality-performance/quality-performance-card"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const QP_TABS = [
  { value: "overview", label: "Overview" },
  { value: "youtube", label: "YouTube" },
  { value: "thumbnail", label: "Thumbnails" },
  { value: "campaign", label: "Campaigns" },
  { value: "product", label: "Products" },
  { value: "outliers", label: "Outliers" },
  { value: "gaps", label: "Gaps" },
  { value: "recommendations", label: "Recommendations" },
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

export function QualityPerformancePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const campaignId = searchParams.get("campaignId") ?? undefined
  const qualityReviewId = searchParams.get("qualityReviewId") ?? undefined
  const analyticsRecordId = searchParams.get("analyticsRecordId") ?? undefined
  const youtubeVideoId = searchParams.get("youtubeVideoId") ?? undefined
  const tabParam = searchParams.get("tab") ?? "overview"

  const [activeTab, setActiveTab] = React.useState(
    QP_TABS.some((tab) => tab.value === tabParam) ? tabParam : "overview",
  )
  const [loading, setLoading] = React.useState(true)
  const [failed, setFailed] = React.useState(false)
  const [result, setResult] = React.useState<QualityPerformanceAnalyzeResponse | null>(null)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const response = await analyzeQualityPerformance({
        campaignId,
        qualityReviewId,
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
  }, [campaignId, qualityReviewId, analyticsRecordId, youtubeVideoId])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    router.replace(`/quality-performance?${params.toString()}`)
  }

  const insights = result?.insights ?? []
  const summary = result?.summary
  const hasData = (result?.matchedPairs.length ?? 0) > 0 || insights.length > 0

  const strongest = insights
    .filter((item) => item.insightType === "quality-score-performance")
    .slice(0, 3)
  const outliers = insights.filter(
    (item) =>
      item.insightType === "high-quality-low-performance" ||
      item.insightType === "low-quality-high-performance",
  )
  const strengths = insights.filter((item) => item.insightType === "repeated-strength").slice(0, 3)
  const weaknesses = insights.filter((item) => item.insightType === "repeated-weakness").slice(0, 3)
  const recommended = insights
    .filter(
      (item) =>
        item.confidence === "high" ||
        item.insightType === "experiment-opportunity" ||
        item.insightType === "learning-gap",
    )
    .slice(0, 4)

  return (
    <ModuleShell>
      <ModulePageHeader
        title="Quality vs Performance"
        description="Compare quality scores against real performance to find what actually improves results."
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={loading} onClick={() => void refresh()}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Analyze Quality vs Performance
            </Button>
            <Link href="/quality" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <ClipboardCheck className="size-4" />
              Open Quality Reviews
            </Link>
            <Link href="/analytics" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <BarChart3 className="size-4" />
              Open Analytics
            </Link>
            <Link href="/patterns" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <ScanSearch className="size-4" />
              Pattern Detection
            </Link>
            <Link href="/feedback-loop?tab=quality" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Repeat className="size-4" />
              Open Feedback Loop
            </Link>
            <Link
              href="/learnings?sourceType=quality-performance"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Create Learning
            </Link>
          </div>
        }
      />

      {campaignId ? (
        <Card className="border-border/80">
          <CardContent className="flex flex-wrap items-center gap-2 py-3 text-sm">
            <Badge variant="secondary">Campaign filter</Badge>
            <span className="text-muted-foreground">Scoped to campaign {campaignId}</span>
            <Link href="/quality-performance" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Clear filter
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {failed ? (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-sm">Analysis failed. Your data is unchanged.</p>
            <Button type="button" size="sm" variant="outline" onClick={() => void refresh()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {loading && !result ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Matching quality reviews to performance records…
        </div>
      ) : null}

      {!loading && !hasData ? (
        <EmptyState
          icon={Scale}
          title="Not enough matched data yet"
          description="Create quality reviews and sync analytics to compare quality scores against real performance."
          primaryActionLabel="Open Quality Reviews"
          primaryActionHref="/quality"
          secondaryActionLabel="Open Analytics"
          secondaryActionHref="/analytics"
        />
      ) : null}

      {hasData && summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <SummaryStatCard label="Matched records" value={summary.matchedRecords} />
            <SummaryStatCard
              label="Avg quality score"
              value={Math.round(summary.averageQualityScore) || "—"}
            />
            <SummaryStatCard
              label="Avg performance"
              value={Math.round(summary.averagePerformance) || "—"}
            />
            <SummaryStatCard label="High-confidence" value={summary.highConfidence} />
            <SummaryStatCard label="Early signals" value={summary.earlySignals} />
            <SummaryStatCard label="Outliers" value={summary.outliers} />
            <SummaryStatCard label="Learning gaps" value={summary.learningGaps} />
            <SummaryStatCard label="Experiment opportunities" value={summary.experimentOpportunities} />
          </div>

          <ModuleWorkflowTabs
            tabs={QP_TABS.map((tab) => ({ value: tab.value, label: tab.label }))}
            value={activeTab}
            onValueChange={handleTabChange}
          >
            <ModuleTabPanel value="overview">
              <div className="space-y-8">
                {strongest.length > 0 ? (
                  <section className="space-y-3">
                    <h2 className="text-base font-semibold">Strongest Signals</h2>
                    <div className="grid gap-4">
                      {strongest.map((insight) => (
                        <QualityPerformanceCard key={insight.id} insight={insight} />
                      ))}
                    </div>
                  </section>
                ) : null}
                {outliers.length > 0 ? (
                  <section className="space-y-3">
                    <h2 className="text-base font-semibold">Top Outliers</h2>
                    <div className="grid gap-4">
                      {outliers.slice(0, 3).map((insight) => (
                        <QualityPerformanceCard key={insight.id} insight={insight} />
                      ))}
                    </div>
                  </section>
                ) : null}
                {strengths.length > 0 ? (
                  <section className="space-y-3">
                    <h2 className="text-base font-semibold">Repeated Strengths</h2>
                    <div className="grid gap-4">
                      {strengths.map((insight) => (
                        <QualityPerformanceCard key={insight.id} insight={insight} />
                      ))}
                    </div>
                  </section>
                ) : null}
                {weaknesses.length > 0 ? (
                  <section className="space-y-3">
                    <h2 className="text-base font-semibold">Repeated Weaknesses</h2>
                    <div className="grid gap-4">
                      {weaknesses.map((insight) => (
                        <QualityPerformanceCard key={insight.id} insight={insight} />
                      ))}
                    </div>
                  </section>
                ) : null}
                {recommended.length > 0 ? (
                  <section className="space-y-3">
                    <h2 className="text-base font-semibold">Recommended Next Actions</h2>
                    <ul className="space-y-2 text-sm">
                      {recommended.map((insight) => (
                        <li key={insight.id} className="rounded-md border border-border/70 px-3 py-2">
                          <span className="font-medium">{insight.title}</span>
                          <span className="text-muted-foreground"> — {insight.recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            </ModuleTabPanel>

            {QP_TABS.filter((tab) => tab.value !== "overview").map((tab) => (
              <ModuleTabPanel key={tab.value} value={tab.value}>
                {insightsForTab(insights, tab.value).length === 0 ? (
                  <EmptyState
                    title="No insights in this category yet"
                    description="Add more quality reviews and analytics, then run analysis again."
                    primaryActionLabel="Open Quality Reviews"
                    primaryActionHref="/quality"
                    secondaryActionLabel="Open Video Intelligence"
                    secondaryActionHref="/videos"
                  />
                ) : (
                  <div className="grid gap-4">
                    {insightsForTab(insights, tab.value).map((insight) => (
                      <QualityPerformanceCard key={insight.id} insight={insight} />
                    ))}
                  </div>
                )}
              </ModuleTabPanel>
            ))}
          </ModuleWorkflowTabs>

          {result?.scannedAt ? (
            <p className="text-xs text-muted-foreground">
              Last analyzed {new Date(result.scannedAt).toLocaleString()}
            </p>
          ) : null}
        </>
      ) : null}
    </ModuleShell>
  )
}
