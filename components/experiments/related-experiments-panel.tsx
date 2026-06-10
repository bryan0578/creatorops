"use client"

import Link from "next/link"
import { FlaskConical } from "lucide-react"

import { filterExperimentsForAnalytics } from "@/lib/experiments"
import { useStore } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
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

export function RelatedExperimentsPanel({
  experimentId,
  relatedCampaign,
  relatedArtist,
  relatedSong,
  titleUsed,
  itemName,
  platform,
  analyticsRecordId,
}: {
  experimentId?: string
  relatedCampaign?: string
  relatedArtist?: string
  relatedSong?: string
  titleUsed?: string
  itemName?: string
  platform?: string
  analyticsRecordId?: string
}) {
  const { experiments } = useStore()
  const related = filterExperimentsForAnalytics({
    experiments,
    experimentId,
    relatedCampaign,
    relatedArtist,
    relatedSong,
    titleUsed,
    itemName,
    platform,
    analyticsRecordId,
  })

  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="size-4" />
          Related Experiments
        </CardTitle>
        <CardDescription>
          Experiments matched by campaign, artist, song, title, platform, or direct link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {related.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No related experiments found for this analytics record yet.
          </p>
        ) : (
          related.slice(0, 8).map((experiment) => (
            <div
              key={experiment.id}
              className="flex flex-col gap-2 rounded-lg border border-border/80 p-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-medium">{experiment.experimentName}</p>
                <div className="flex flex-wrap gap-1.5">
                  {experiment.experimentType ? (
                    <Badge variant="outline">{experiment.experimentType}</Badge>
                  ) : null}
                  {experiment.status ? (
                    <Badge variant="secondary">{experiment.status}</Badge>
                  ) : null}
                  {experiment.metricFocus ? (
                    <Badge variant="outline">{experiment.metricFocus}</Badge>
                  ) : null}
                </div>
                {experiment.winner ? (
                  <p className="text-sm text-muted-foreground">
                    Winner: {experiment.winner}
                  </p>
                ) : null}
                {experiment.learningSummary ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {experiment.learningSummary}
                  </p>
                ) : null}
              </div>
              <Link
                href={`/experiments?recordId=${encodeURIComponent(experiment.id)}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
              >
                Open Experiment
              </Link>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
