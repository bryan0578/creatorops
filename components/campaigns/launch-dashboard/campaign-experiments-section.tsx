"use client"

import Link from "next/link"
import { FlaskConical, Plus } from "lucide-react"

import {
  countRunningExperiments,
  filterExperimentsForCampaign,
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
  const newHref = `/experiments?campaignId=${encodeURIComponent(campaignId)}&campaignName=${encodeURIComponent(campaignName)}`

  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="size-4" />
          Experiments
        </CardTitle>
        <CardDescription>
          Track creative variations and performance tests for this campaign.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Linked experiments</p>
            <p className="text-lg font-semibold">{linked.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Active / reviewing</p>
            <p className="text-lg font-semibold">{running}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={newHref} className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="size-4" />
            New Experiment
          </Link>
          {linked.length > 0 ? (
            <Link
              href="/experiments"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              View All Experiments
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
