"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, ClipboardCheck, Loader2, RefreshCw } from "lucide-react"

import { getQualityReviewsForCampaign } from "@/lib/actions/quality-reviews"
import { filterQualityReviewsForCampaign, scoreColorClass } from "@/lib/quality-reviews"
import { buildQualityReviewUrl } from "@/lib/quality-prefill"
import type { QualityReviewRecord } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RECENT_RECORDS_CARD_CLASS } from "@/components/module/form-layout"

function useQualityRecords(campaignId?: string, campaignName?: string) {
  const [reviews, setReviews] = React.useState<QualityReviewRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  const runLoad = React.useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      try {
        if (campaignId) {
          const rows = await getQualityReviewsForCampaign(campaignId, campaignName)
          setReviews(rows)
        } else {
          const { getQualityReviews } = await import("@/lib/actions/quality-reviews")
          setReviews(await getQualityReviews())
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [campaignId, campaignName],
  )

  React.useEffect(() => {
    void runLoad()
  }, [runLoad])

  return { reviews, loading, refreshing, runLoad }
}

export function QualityDashboardCard() {
  const { reviews, loading, refreshing, runLoad } = useQualityRecords()
  const lowScoring = reviews.filter((item) => item.overallScore > 0 && item.overallScore < 60)
  const readyCount = reviews.filter(
    (item) => item.readinessLabel === "Ready to publish" || item.overallScore >= 80,
  ).length
  const recent = [...reviews].sort((a, b) => b.updatedAt - a.updatedAt)[0]

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="size-4 text-muted-foreground" />
              Quality Reviews
            </CardTitle>
            <CardDescription>Score creative outputs before publishing</CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={loading || refreshing}
            onClick={() => void runLoad(true)}
            aria-label="Refresh quality reviews"
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
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading quality reviews…
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{reviews.length} reviews</Badge>
              <Badge variant="outline">{lowScoring.length} low-scoring</Badge>
              <Badge variant="outline">{readyCount} ready</Badge>
            </div>
            {recent ? (
              <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-2">
                <p className="text-xs text-muted-foreground">Latest review</p>
                <p className="text-sm font-medium text-pretty">
                  {recent.reviewName || recent.reviewType}
                </p>
                <p className={`text-xs tabular-nums ${scoreColorClass(recent.overallScore)}`}>
                  {recent.overallScore}/100 · {recent.readinessLabel || recent.status}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No quality reviews yet. Score launch assets before publishing.
              </p>
            )}
            <Link href="/quality" className={buttonVariants({ size: "sm" })}>
              Open Quality Review
              <ArrowRight className="size-4" />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function CampaignQualityReviewCard({
  campaignId,
  campaignName,
}: {
  campaignId: string
  campaignName?: string
}) {
  const { reviews, loading, refreshing, runLoad } = useQualityRecords(campaignId, campaignName)
  const scoped = filterQualityReviewsForCampaign(reviews, campaignId, campaignName)
  const latest = [...scoped].sort((a, b) => b.updatedAt - a.updatedAt)[0]
  const lowest =
    scoped.length > 0
      ? [...scoped].sort((a, b) => a.overallScore - b.overallScore)[0]
      : null

  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="size-4 text-muted-foreground" />
              Quality Review
            </CardTitle>
            <CardDescription>Latest scores and readiness for this campaign</CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={loading || refreshing}
            onClick={() => void runLoad(true)}
            aria-label="Refresh quality reviews"
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
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{scoped.length} review{scoped.length === 1 ? "" : "s"}</Badge>
              {latest ? (
                <Badge variant="outline" className={scoreColorClass(latest.overallScore)}>
                  Latest: {latest.overallScore}/100
                </Badge>
              ) : null}
            </div>
            {lowest && lowest.overallScore < 70 ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Lowest score: {lowest.reviewName || lowest.reviewType} ({lowest.overallScore}/100)
              </p>
            ) : latest ? (
              <p className="text-sm text-muted-foreground">
                {latest.reviewName || latest.reviewType} — {latest.readinessLabel || latest.status}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No quality reviews for this campaign yet.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildQualityReviewUrl({
                  campaignId,
                  reviewType: "Campaign Readiness",
                })}
                className={buttonVariants({ size: "sm" })}
              >
                New Quality Review
              </Link>
              <Link
                href={`/quality?campaignId=${encodeURIComponent(campaignId)}`}
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                View Reviews
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
