"use client"

import * as React from "react"
import Link from "next/link"
import { ExternalLink, Loader2, ScanSearch } from "lucide-react"

import { detectPatterns } from "@/lib/actions/patterns"
import type { DetectedPattern } from "@/lib/patterns/types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function confidenceVariant(confidence: DetectedPattern["confidence"]) {
  if (confidence === "high") return "default" as const
  if (confidence === "medium") return "secondary" as const
  return "outline" as const
}

export function PatternInsightsPanel({
  campaignId,
  youtubeVideoId,
  analyticsRecordId,
  limit = 3,
  title = "Pattern Insights",
  description = "Deterministic signals from local analytics, packaging, reviews, and learnings. No data is changed unless you take an action.",
  compact = false,
}: {
  campaignId?: string
  youtubeVideoId?: string
  analyticsRecordId?: string
  limit?: number
  title?: string
  description?: string
  compact?: boolean
}) {
  const [loading, setLoading] = React.useState(true)
  const [failed, setFailed] = React.useState(false)
  const [patterns, setPatterns] = React.useState<DetectedPattern[]>([])

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const result = await detectPatterns({
        campaignId,
        youtubeVideoId,
        analyticsRecordId,
        limit: limit + 6,
      })
      setPatterns(result.patterns.slice(0, limit))
    } catch {
      setFailed(true)
      setPatterns([])
    } finally {
      setLoading(false)
    }
  }, [campaignId, youtubeVideoId, analyticsRecordId, limit])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const query = new URLSearchParams()
  if (campaignId) query.set("campaignId", campaignId)
  if (youtubeVideoId) query.set("youtubeVideoId", youtubeVideoId)
  if (analyticsRecordId) query.set("analyticsRecordId", analyticsRecordId)
  const patternsHref = query.toString() ? `/patterns?${query.toString()}` : "/patterns"

  if (compact && !loading && patterns.length === 0 && !failed) return null

  return (
    <Card className="border-border/80">
      <CardHeader className={compact ? "pb-2" : undefined}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {!compact ? <CardDescription>{description}</CardDescription> : null}
          </div>
          <Link href={patternsHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ScanSearch className="size-3.5" />
            Open Pattern Detection
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Detecting patterns…
          </div>
        ) : null}

        {failed ? (
          <p className="text-sm text-muted-foreground">
            Pattern insights unavailable right now.
            <Button type="button" variant="link" className="h-auto px-1" onClick={() => void refresh()}>
              Retry
            </Button>
          </p>
        ) : null}

        {!loading && !failed && patterns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No strong patterns yet for this scope. Add analytics, reviews, or learnings to unlock insights.
          </p>
        ) : null}

        {patterns.map((pattern) => (
          <div
            key={pattern.id}
            className="rounded-md border border-border/60 px-3 py-2 space-y-1"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-pretty">{pattern.title}</p>
              <Badge variant={confidenceVariant(pattern.confidence)} className="text-xs">
                {pattern.confidence}
              </Badge>
              {pattern.earlySignal ? (
                <Badge variant="outline" className="text-xs">
                  Early signal
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">{pattern.summary}</p>
            {pattern.relatedRecords[0]?.href ? (
              <Link
                href={pattern.relatedRecords[0].href}
                className="inline-flex items-center gap-1 text-xs underline underline-offset-2"
              >
                <ExternalLink className="size-3" />
                {pattern.relatedRecords[0].title}
              </Link>
            ) : null}
          </div>
        ))}

        {patterns.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href={`${patternsHref}&tab=gaps`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Learning gaps
            </Link>
            <Link href="/learnings?sourceType=pattern-engine" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Create Learning
            </Link>
            <Link href="/experiments" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Create Experiment
            </Link>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
