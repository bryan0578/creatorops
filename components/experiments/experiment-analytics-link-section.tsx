"use client"

import * as React from "react"
import Link from "next/link"
import { BarChart3, Link2, Plus } from "lucide-react"
import { toast } from "sonner"

import {
  buildExperimentAnalyticsLink,
  matchAnalyticsRecordsForExperiment,
} from "@/lib/experiment-analytics"
import { useStore } from "@/lib/store"
import type { AnalyticsRecord, ExperimentRecord } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RECENT_RECORDS_CARD_CLASS } from "@/components/module/form-layout"
import { cn } from "@/lib/utils"

export function ExperimentAnalyticsLinkSection({
  experiment,
  onLinked,
}: {
  experiment: ExperimentRecord | null
  onLinked: (updated: ExperimentRecord) => void
}) {
  const { analyticsRecords, updateExperiment, updateAnalyticsRecord } = useStore()
  const [linkOpen, setLinkOpen] = React.useState(false)

  const matches = React.useMemo(() => {
    if (!experiment) return []
    return matchAnalyticsRecordsForExperiment(experiment, analyticsRecords)
  }, [experiment, analyticsRecords])

  const linkedRecord = React.useMemo(() => {
    if (!experiment?.analyticsRecordId) return null
    return (
      analyticsRecords.find((r) => r.id === experiment.analyticsRecordId) ??
      null
    )
  }, [experiment, analyticsRecords])

  async function linkAnalytics(analytics: AnalyticsRecord) {
    if (!experiment) return
    try {
      const { experiment: linkedExperiment, analytics: linkedAnalytics } =
        buildExperimentAnalyticsLink(experiment, analytics)
      await updateExperiment(linkedExperiment)
      await updateAnalyticsRecord(linkedAnalytics)
      onLinked(linkedExperiment)
      setLinkOpen(false)
      toast.success("Analytics record linked.")
    } catch {
      toast.error("Could not link analytics record.")
    }
  }

  if (!experiment?.id) {
    return (
      <Card className={RECENT_RECORDS_CARD_CLASS}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="size-4" />
            Analytics Link
          </CardTitle>
          <CardDescription>
            Save the experiment first to link or create an analytics record.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const createHref = `/analytics?campaignId=${encodeURIComponent(experiment.campaignId)}&experimentId=${encodeURIComponent(experiment.id)}&relatedCampaign=${encodeURIComponent(experiment.campaignName)}&itemName=${encodeURIComponent(experiment.experimentName)}`
  const openHref = experiment.analyticsRecordId
    ? `/analytics?recordId=${encodeURIComponent(experiment.analyticsRecordId)}`
    : null

  return (
    <>
      <Card className={RECENT_RECORDS_CARD_CLASS}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="size-4" />
            Analytics Link
          </CardTitle>
          <CardDescription>
            Connect this experiment to an analytics record for performance tracking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {experiment.analyticsRecordId ? (
            <div className="rounded-lg border border-border/80 p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Linked</Badge>
                <p className="font-medium">
                  {experiment.analyticsRecordName || linkedRecord?.itemName || "Analytics record"}
                </p>
              </div>
              {linkedRecord ? (
                <p className="text-xs text-muted-foreground">
                  {[linkedRecord.platform, linkedRecord.relatedCampaign]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Linked record not found in local data.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No analytics record linked yet.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
              <Link2 className="size-4" />
              Link Analytics Record
            </Button>
            <Link href={createHref} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              <Plus className="size-4" />
              Create Analytics Record
            </Link>
            {openHref ? (
              <Link href={openHref} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Open Analytics Record
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link analytics record</DialogTitle>
            <DialogDescription>
              Matching records by campaign, artist, song, title, and item name.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {matches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No matching analytics records found. Create one from Analytics Tracker.
              </p>
            ) : (
              matches.slice(0, 12).map((record) => (
                <button
                  key={record.id}
                  type="button"
                  className="flex w-full flex-col gap-1 rounded-lg border border-border/80 p-3 text-left hover:bg-muted/50"
                  onClick={() => linkAnalytics(record)}
                >
                  <p className="font-medium">{record.itemName || record.titleUsed || "Untitled"}</p>
                  <p className="text-xs text-muted-foreground">
                    {[record.relatedCampaign, record.platform, record.relatedSong]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLinkOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
