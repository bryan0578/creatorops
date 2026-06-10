"use client"

import Link from "next/link"
import { FlaskConical, Plus, Trophy } from "lucide-react"

import {
  countRunningExperiments,
  countWinnerChosenExperiments,
  filterExperimentsForCampaign,
  getExperimentsWithWinners,
  getLatestLearningSummary,
} from "@/lib/experiments"
import { useStore } from "@/lib/store"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RECENT_RECORDS_CARD_CLASS } from "@/components/module/form-layout"
import { cn } from "@/lib/utils"

export function CampaignExperimentsSection({
  campaignId,
  campaignName,
}: {
  campaignId: string
  campaignName: string
}) {
  const { experiments } = useStore()
  const linked = filterExperimentsForCampaign(experiments, campaignId, campaignName)
  const running = countRunningExperiments(linked)
  const winners = countWinnerChosenExperiments(linked)
  const latestLearning = getLatestLearningSummary(linked)
  const winnerExperiments = getExperimentsWithWinners(linked).slice(0, 4)
  const newHref = `/experiments?campaignId=${encodeURIComponent(campaignId)}&campaignName=${encodeURIComponent(campaignName)}`
  const viewHref = `/experiments?campaignId=${encodeURIComponent(campaignId)}`

  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="size-4" />
          Experiments
        </CardTitle>
        <CardDescription>
          Track creative variations, compare variants, and capture learnings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Linked experiments</p>
            <p className="text-lg font-semibold">{linked.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Running / reviewing</p>
            <p className="text-lg font-semibold">{running}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Winners chosen</p>
            <p className="text-lg font-semibold">{winners}</p>
          </div>
        </div>

        {latestLearning ? (
          <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-sm">
            <p className="text-xs font-medium text-muted-foreground">Latest learning</p>
            <p className="mt-1 line-clamp-3">{latestLearning}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Link href={newHref} className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="size-4" />
            New Experiment
          </Link>
          <Link
            href={viewHref}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            View Experiments
          </Link>
        </div>

        {winnerExperiments.length > 0 ? (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Trophy className="size-4" />
              Experiment learnings
            </p>
            <div className="space-y-2">
              {winnerExperiments.map((experiment) => (
                <div
                  key={experiment.id}
                  className="rounded-lg border border-border/80 p-3 text-sm"
                >
                  <p className="font-medium">{experiment.experimentName}</p>
                  {experiment.winner ? (
                    <p className="text-xs text-muted-foreground">
                      Winner: {experiment.winner}
                    </p>
                  ) : null}
                  {experiment.learningSummary ? (
                    <p className="mt-1 line-clamp-2 text-muted-foreground">
                      {experiment.learningSummary}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
