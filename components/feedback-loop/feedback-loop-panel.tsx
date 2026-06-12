"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2, Repeat } from "lucide-react"

import { getLearningFeedbackSuggestions } from "@/lib/actions/feedback-loop"
import type { FeedbackSuggestion } from "@/lib/feedback-loop/types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function FeedbackLoopPanel({
  campaignId,
  analyticsRecordId,
  experimentId,
  qualityReviewId,
  youtubeVideoId,
  limit = 3,
  title = "Learning Feedback",
  compact = false,
}: {
  campaignId?: string
  analyticsRecordId?: string
  experimentId?: string
  qualityReviewId?: string
  youtubeVideoId?: string
  limit?: number
  title?: string
  compact?: boolean
}) {
  const [loading, setLoading] = React.useState(true)
  const [suggestions, setSuggestions] = React.useState<FeedbackSuggestion[]>([])

  const refresh = React.useCallback(async () => {
    setLoading(true)
    try {
      const result = await getLearningFeedbackSuggestions({
        campaignId,
        analyticsRecordId,
        experimentId,
        qualityReviewId,
        youtubeVideoId,
        limit: limit + 6,
      })
      setSuggestions(result.suggestions.slice(0, limit))
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [campaignId, analyticsRecordId, experimentId, qualityReviewId, youtubeVideoId, limit])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const query = new URLSearchParams()
  if (campaignId) query.set("campaignId", campaignId)
  if (analyticsRecordId) query.set("analyticsRecordId", analyticsRecordId)
  const href = query.toString() ? `/feedback-loop?${query.toString()}` : "/feedback-loop"

  return (
    <Card className="border-border/80">
      <CardHeader className={compact ? "pb-2" : undefined}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {!compact ? (
              <CardDescription>
                Suggestions to convert analytics, experiments, patterns, and reviews into learnings.
              </CardDescription>
            ) : null}
          </div>
          <Link href={href} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Repeat className="size-3.5" />
            Open Feedback Loop
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Checking feedback opportunities…
          </div>
        ) : null}
        {!loading && suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending feedback suggestions for this scope.</p>
        ) : null}
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="rounded-md border border-border/60 px-3 py-2 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{suggestion.title}</p>
              <Badge variant="outline" className="text-xs">
                {suggestion.confidence}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{suggestion.summary}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
