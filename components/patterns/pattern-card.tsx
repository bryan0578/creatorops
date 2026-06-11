"use client"

import Link from "next/link"
import { ExternalLink, FlaskConical, Lightbulb, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  createExperimentFromPattern,
  createLearningFromPattern,
} from "@/lib/actions/patterns"
import type { DetectedPattern } from "@/lib/patterns/types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function confidenceVariant(confidence: DetectedPattern["confidence"]) {
  if (confidence === "high") return "default" as const
  if (confidence === "medium") return "secondary" as const
  return "outline" as const
}

export function PatternCard({
  pattern,
  busy,
  onAction,
}: {
  pattern: DetectedPattern
  busy?: string | null
  onAction?: () => void
}) {
  async function handleCreateLearning() {
    const result = await createLearningFromPattern(pattern)
    if (result.success && result.href) {
      toast.success(result.message)
      onAction?.()
      window.location.href = result.href
      return
    }
    if (result.href) {
      toast.message("Opening prefilled learning form…")
      window.location.href = result.href
      return
    }
    toast.error(result.message)
  }

  async function handleCreateExperiment() {
    const result = await createExperimentFromPattern(pattern)
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

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base text-pretty">{pattern.title}</CardTitle>
            <CardDescription>{pattern.summary}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={confidenceVariant(pattern.confidence)}>
              {pattern.confidence} · {pattern.score}
            </Badge>
            <Badge variant="outline">{pattern.patternType}</Badge>
            {pattern.earlySignal ? <Badge variant="outline">Early signal</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {pattern.evidence.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Evidence</p>
            <ul className="space-y-1 text-sm">
              {pattern.evidence.slice(0, 5).map((item, index) => (
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
          </div>
        ) : null}

        <p className="text-sm">
          <span className="font-medium">Recommendation: </span>
          {pattern.recommendation}
        </p>

        {pattern.relatedRecords.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {pattern.relatedRecords.slice(0, 4).map((record) => (
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
          <Button
            type="button"
            size="sm"
            disabled={busy === `${pattern.id}:learning`}
            onClick={() => void handleCreateLearning()}
          >
            {busy === `${pattern.id}:learning` ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Lightbulb className="size-4" />
            )}
            Create Learning
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy === `${pattern.id}:experiment`}
            onClick={() => void handleCreateExperiment()}
          >
            {busy === `${pattern.id}:experiment` ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FlaskConical className="size-4" />
            )}
            Create Experiment
          </Button>
          <Link href="/playbooks" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Suggest Playbook Update
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
