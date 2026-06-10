"use client"

import { ClipboardList } from "lucide-react"

import {
  computePublishingChecklistProgress,
  generateDefaultPublishingChecklist,
  getNextIncompleteItems,
} from "@/lib/data/publishing-checklist"
import type { CampaignRecord, PublishingChecklist } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RECENT_RECORDS_CARD_CLASS } from "@/components/module/form-layout"

export function CampaignPublishingChecklistCard({
  campaign,
  onOpenChecklist,
  onGenerateChecklist,
}: {
  campaign: CampaignRecord
  onOpenChecklist: () => void
  onGenerateChecklist: (checklist: PublishingChecklist) => void
}) {
  const checklist = campaign.publishingChecklist
  const hasItems = checklist.items.length > 0
  const progress = computePublishingChecklistProgress(checklist)
  const nextItems = getNextIncompleteItems(checklist, 3)

  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4 text-primary" />
              Publishing Checklist
            </CardTitle>
            <CardDescription>
              Release-day execution workflow before and after publish
            </CardDescription>
          </div>
          {progress.blocked > 0 ? (
            <Badge variant="destructive">{progress.blocked} blocked</Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasItems ? (
          <>
            <p className="text-sm text-muted-foreground">
              No publishing checklist generated yet.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  onGenerateChecklist(
                    generateDefaultPublishingChecklist(campaign.campaignType),
                  )
                }
              >
                Generate checklist
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={onOpenChecklist}>
                Open Publishing Checklist
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-end justify-between gap-2">
                <span className="text-2xl font-semibold tabular-nums">
                  {progress.percent}%
                </span>
                <span className="text-xs text-muted-foreground">
                  {progress.done}/{progress.total} complete
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="text-sm">
                Current phase:{" "}
                <span className="font-medium">{progress.currentPhase}</span>
              </p>
            </div>

            {nextItems.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Next up
                </p>
                <ul className="space-y-1.5">
                  {nextItems.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                    >
                      <span className="text-xs text-muted-foreground">{item.phase}</span>
                      <p className="font-medium">{item.title}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                All publishing checklist items are complete.
              </p>
            )}

            <Button type="button" size="sm" onClick={onOpenChecklist}>
              Open Publishing Checklist
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
