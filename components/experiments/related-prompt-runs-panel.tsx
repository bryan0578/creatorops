"use client"

import Link from "next/link"
import { History } from "lucide-react"

import {
  getExperimentPromptRuns,
  promptRunRunnerHref,
} from "@/lib/prompt-run-linking"
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

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function RelatedPromptRunsPanel({
  experimentId,
  campaignId,
}: {
  experimentId?: string | null
  campaignId?: string | null
}) {
  const { runs } = useStore()

  const linked = experimentId
    ? getExperimentPromptRuns(runs, experimentId)
    : campaignId
      ? runs
          .filter((run) => run.campaignId === campaignId && run.moduleType === "Experiment")
          .sort((a, b) => b.updatedAt - a.updatedAt)
      : []

  if (linked.length === 0) return null

  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4 text-primary" />
          Related Prompt Runs
        </CardTitle>
        <CardDescription>AI generation history linked to this experiment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {linked.slice(0, 5).map((run) => (
          <div
            key={run.id}
            className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{run.promptName}</p>
                {run.moduleType ? (
                  <Badge variant="outline" className="text-[10px]">
                    {run.moduleType}
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(run.updatedAt)}</p>
            </div>
            <Link
              href={promptRunRunnerHref(run.id, run.campaignId)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Open run
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
