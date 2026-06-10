"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Lightbulb, Loader2, RefreshCw } from "lucide-react"

import { getLearningsForCampaign, getLearnings } from "@/lib/actions/learnings"
import { filterLearningsForCampaign } from "@/lib/learnings"
import { buildLearningUrl } from "@/lib/learning-prefill"
import type { LearningRecord } from "@/lib/types"
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

function useLearningRecords(campaignId?: string, campaignName?: string) {
  const [learnings, setLearnings] = React.useState<LearningRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  const runLoad = React.useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      try {
        if (campaignId) {
          setLearnings(await getLearningsForCampaign(campaignId, campaignName))
        } else {
          setLearnings(await getLearnings())
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

  return { learnings, loading, refreshing, runLoad }
}

function topReusableInsight(learnings: LearningRecord[]): LearningRecord | null {
  const ranked = [...learnings]
    .filter((l) => l.status === "Active" || l.status === "Validated")
    .sort((a, b) => {
      const score = (item: LearningRecord) => {
        let s = 0
        if (item.impact === "High") s += 3
        if (item.confidence === "High") s += 2
        return s
      }
      return score(b) - score(a) || b.updatedAt - a.updatedAt
    })
  return ranked[0] ?? null
}

export function LearningsDashboardCard() {
  const { learnings, loading, refreshing, runLoad } = useLearningRecords()
  const recent = [...learnings].sort((a, b) => b.updatedAt - a.updatedAt)[0]
  const top = topReusableInsight(learnings)

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="size-4 text-muted-foreground" />
              Learnings
            </CardTitle>
            <CardDescription>Reusable insights from campaigns and analytics</CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={loading || refreshing}
            onClick={() => void runLoad(true)}
            aria-label="Refresh learnings"
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
            Loading learnings…
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{learnings.length} learnings</Badge>
              <Badge variant="outline">
                {learnings.filter((l) => l.impact === "High").length} high impact
              </Badge>
            </div>
            {top ? (
              <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-2">
                <p className="text-xs text-muted-foreground">Top reusable insight</p>
                <p className="text-sm font-medium text-pretty">{top.title || top.insight}</p>
              </div>
            ) : recent ? (
              <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-2">
                <p className="text-xs text-muted-foreground">Latest learning</p>
                <p className="text-sm font-medium text-pretty">{recent.title}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No learnings yet. Capture wins and patterns from analytics and experiments.
              </p>
            )}
            <Link href="/learnings" className={buttonVariants({ size: "sm" })}>
              Open Learnings
              <ArrowRight className="size-4" />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function CampaignLearningLibraryCard({
  campaignId,
  campaignName,
}: {
  campaignId: string
  campaignName?: string
}) {
  const { learnings, loading, refreshing, runLoad } = useLearningRecords(campaignId, campaignName)
  const scoped = filterLearningsForCampaign(learnings, campaignId, campaignName)
  const latest = [...scoped].sort((a, b) => b.updatedAt - a.updatedAt)[0]
  const highImpact = scoped.filter((l) => l.impact === "High").length

  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="size-4 text-muted-foreground" />
              Learning Library
            </CardTitle>
            <CardDescription>
              {scoped.length > 0
                ? "Campaign learnings and reusable patterns"
                : "No learnings linked to this campaign yet."}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={loading || refreshing}
            onClick={() => void runLoad(true)}
            aria-label="Refresh learnings"
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
              <Badge variant="secondary">
                {scoped.length} learning{scoped.length === 1 ? "" : "s"}
              </Badge>
              {highImpact > 0 ? (
                <Badge variant="outline">{highImpact} high impact</Badge>
              ) : null}
            </div>
            {latest ? (
              <p className="text-sm text-muted-foreground text-pretty">
                Latest: {latest.title || latest.insight}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Capture what worked and what to avoid for future launches.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildLearningUrl({ campaignId, campaignName })}
                className={buttonVariants({ size: "sm" })}
              >
                New Learning
              </Link>
              <Link
                href={`/learnings?campaignId=${encodeURIComponent(campaignId)}`}
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                View Learnings
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
