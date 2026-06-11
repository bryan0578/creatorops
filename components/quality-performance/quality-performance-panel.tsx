"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2, Scale } from "lucide-react"

import { analyzeQualityPerformance } from "@/lib/actions/quality-performance"
import type { QualityPerformanceInsight } from "@/lib/quality-performance/types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function confidenceVariant(confidence: QualityPerformanceInsight["confidence"]) {
  if (confidence === "high") return "default" as const
  if (confidence === "medium") return "secondary" as const
  return "outline" as const
}

export function QualityPerformancePanel({
  campaignId,
  qualityReviewId,
  analyticsRecordId,
  youtubeVideoId,
  limit = 3,
  title = "Quality vs Performance",
  description = "Compares rubric scores against analytics and video stats. No data is changed unless you take an action.",
  compact = false,
}: {
  campaignId?: string
  qualityReviewId?: string
  analyticsRecordId?: string
  youtubeVideoId?: string
  limit?: number
  title?: string
  description?: string
  compact?: boolean
}) {
  const [loading, setLoading] = React.useState(true)
  const [failed, setFailed] = React.useState(false)
  const [insights, setInsights] = React.useState<QualityPerformanceInsight[]>([])
  const [matchedCount, setMatchedCount] = React.useState(0)
  const [avgQuality, setAvgQuality] = React.useState(0)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const result = await analyzeQualityPerformance({
        campaignId,
        qualityReviewId,
        analyticsRecordId,
        youtubeVideoId,
        limit: limit + 8,
      })
      setInsights(result.insights.slice(0, limit))
      setMatchedCount(result.summary.matchedRecords)
      setAvgQuality(result.summary.averageQualityScore)
    } catch {
      setFailed(true)
      setInsights([])
    } finally {
      setLoading(false)
    }
  }, [campaignId, qualityReviewId, analyticsRecordId, youtubeVideoId, limit])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const query = new URLSearchParams()
  if (campaignId) query.set("campaignId", campaignId)
  if (qualityReviewId) query.set("qualityReviewId", qualityReviewId)
  if (analyticsRecordId) query.set("analyticsRecordId", analyticsRecordId)
  if (youtubeVideoId) query.set("youtubeVideoId", youtubeVideoId)
  const href = query.toString() ? `/quality-performance?${query.toString()}` : "/quality-performance"

  if (compact && !loading && insights.length === 0 && matchedCount === 0 && !failed) {
    return (
      <Card className="border-border/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No matched quality/performance data yet.
          <Link href={href} className="ml-1 underline underline-offset-2">
            Analyze
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/80">
      <CardHeader className={compact ? "pb-2" : undefined}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {!compact ? <CardDescription>{description}</CardDescription> : null}
          </div>
          <Link href={href} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Scale className="size-3.5" />
            Open Quality vs Performance
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Analyzing…
          </div>
        ) : null}

        {failed ? (
          <p className="text-sm text-muted-foreground">
            Analysis unavailable.
            <Button type="button" variant="link" className="h-auto px-1" onClick={() => void refresh()}>
              Retry
            </Button>
          </p>
        ) : null}

        {!loading && !failed && matchedCount > 0 ? (
          <p className="text-xs text-muted-foreground">
            {matchedCount} matched record(s)
            {avgQuality > 0 ? ` · avg quality ${Math.round(avgQuality)}` : ""}
          </p>
        ) : null}

        {insights.map((insight) => (
          <div key={insight.id} className="rounded-md border border-border/60 px-3 py-2 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-pretty">{insight.title}</p>
              <Badge variant={confidenceVariant(insight.confidence)} className="text-xs">
                {insight.confidence} · n={insight.sampleSize}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{insight.summary}</p>
          </div>
        ))}

        {!loading && !failed ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href={`${href}&tab=outliers`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Outliers
            </Link>
            <Link href={`${href}&tab=gaps`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Gaps
            </Link>
            <Link href="/learnings?sourceType=quality-performance" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Create Learning
            </Link>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
