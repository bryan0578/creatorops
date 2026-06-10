"use client"

import Link from "next/link"
import { ArrowRight, History } from "lucide-react"

import {
  getCampaignPromptRuns,
  promptRunRunnerHref,
  promptRunsForCampaignHref,
} from "@/lib/prompt-run-linking"
import type { CampaignRecord, PromptRun } from "@/lib/types"
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

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function CampaignPromptHistoryCard({
  campaign,
  runs,
}: {
  campaign: CampaignRecord
  runs: PromptRun[]
}) {
  const linked = getCampaignPromptRuns(runs, campaign.id)
  const latest = linked.slice(0, 5)

  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4 text-primary" />
              Prompt History
            </CardTitle>
            <CardDescription>
              AI generation runs linked to this campaign
            </CardDescription>
          </div>
          <Badge variant="secondary">{linked.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {linked.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No prompt runs linked yet. Save a prompt or AI response from a generator module.
          </p>
        ) : (
          <ul className="space-y-2">
            {latest.map((run) => (
              <li
                key={run.id}
                className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium truncate">{run.promptName}</p>
                    {run.moduleType ? (
                      <Badge variant="outline" className="text-[10px]">
                        {run.moduleType}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(run.updatedAt)}</p>
                </div>
                <Link
                  href={promptRunRunnerHref(run.id, campaign.id)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Open Prompt Run
                  <ArrowRight className="size-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link
          href={promptRunsForCampaignHref(campaign.id)}
          className={buttonVariants({ variant: linked.length > 0 ? "default" : "outline", size: "sm" })}
        >
          View all prompt runs
        </Link>
      </CardContent>
    </Card>
  )
}
