"use client"

import Link from "next/link"
import { Copy, ExternalLink, FlaskConical, Lightbulb, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  createExperimentFromFeedbackSuggestion,
  createLearningFromFeedbackSuggestion,
  createPlaybookUpdateRecommendation,
} from "@/lib/actions/feedback-loop"
import type { FeedbackSuggestion } from "@/lib/feedback-loop/types"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function confidenceVariant(confidence: FeedbackSuggestion["confidence"]) {
  if (confidence === "high") return "default" as const
  if (confidence === "medium") return "secondary" as const
  return "outline" as const
}

export function FeedbackSuggestionCard({
  suggestion,
  onAction,
}: {
  suggestion: FeedbackSuggestion
  onAction?: () => void
}) {
  async function handleCreateLearning() {
    const result = await createLearningFromFeedbackSuggestion(suggestion)
    if (result.duplicate) {
      toast.message(result.message)
    } else if (result.success) {
      toast.success(result.message)
    }
    if (result.href) {
      onAction?.()
      window.location.href = result.href
      return
    }
    toast.error(result.message)
  }

  async function handleCreateExperiment() {
    const result = await createExperimentFromFeedbackSuggestion(suggestion)
    if (result.success && result.href) {
      toast.success(result.message)
      onAction?.()
      window.location.href = result.href
      return
    }
    if (result.href) {
      toast.message("Opening prefilled experiment form…")
      window.location.href = result.href
      return
    }
    toast.error(result.message)
  }

  async function handlePlaybookRecommendation() {
    const result = await createPlaybookUpdateRecommendation(suggestion)
    await copyToClipboard(result.copyText)
    toast.success("Playbook recommendation copied to clipboard.")
    window.location.href = result.href
  }

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base text-pretty">{suggestion.title}</CardTitle>
            <CardDescription>{suggestion.summary}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={confidenceVariant(suggestion.confidence)}>
              {suggestion.confidence} · {suggestion.score}
            </Badge>
            <Badge variant="outline">{suggestion.suggestionType}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Source: {suggestion.sourceName}
          {suggestion.campaignName ? ` · ${suggestion.campaignName}` : ""}
          {suggestion.platform ? ` · ${suggestion.platform}` : ""}
        </div>

        {suggestion.evidence.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {suggestion.evidence.slice(0, 5).map((item, index) => (
              <li key={`${item.label}-${index}`}>
                {item.href ? (
                  <Link href={item.href} className="underline underline-offset-2">
                    {item.label}: {item.value}
                  </Link>
                ) : (
                  <span>
                    {item.label}: {item.value}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-sm space-y-1">
          <p className="font-medium">Recommended learning preview</p>
          <p>{suggestion.recommendedLearning.title}</p>
          <p className="text-muted-foreground">{suggestion.recommendedLearning.insight}</p>
        </div>

        {suggestion.relatedRecords.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {suggestion.relatedRecords.slice(0, 4).map((record) => (
              <Link
                key={`${record.sourceType}-${record.sourceId}`}
                href={record.href}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <ExternalLink className="size-3.5" />
                {record.title}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {suggestion.suggestionType !== "playbook-update" &&
          suggestion.suggestionType !== "ai-context" ? (
            <Button type="button" size="sm" onClick={() => void handleCreateLearning()}>
              <Lightbulb className="size-4" />
              Create Learning
            </Button>
          ) : null}
          {suggestion.supportsExperiment ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void handleCreateExperiment()}
            >
              <FlaskConical className="size-4" />
              Create Experiment
            </Button>
          ) : null}
          {suggestion.suggestionType === "playbook-update" ? (
            <Button type="button" size="sm" variant="outline" onClick={() => void handlePlaybookRecommendation()}>
              <Copy className="size-4" />
              Recommend Playbook Update
            </Button>
          ) : (
            <Link href="/playbooks" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Open Playbooks
            </Link>
          )}
          <Link
            href={suggestion.recommendedActions.find((action) => action.actionType === "navigate")?.href ?? "/feedback-loop"}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Open Source
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
