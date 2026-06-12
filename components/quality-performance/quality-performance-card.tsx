"use client"

import Link from "next/link"
import { ExternalLink, FlaskConical, Lightbulb, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  createExperimentFromQualityPerformanceInsight,
  createLearningFromQualityPerformanceInsight,
} from "@/lib/actions/quality-performance"
import type { QualityPerformanceInsight } from "@/lib/quality-performance/types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function confidenceVariant(confidence: QualityPerformanceInsight["confidence"]) {
  if (confidence === "high") return "default" as const
  if (confidence === "medium") return "secondary" as const
  return "outline" as const
}

export function QualityPerformanceCard({ insight }: { insight: QualityPerformanceInsight }) {
  async function handleCreateLearning() {
    const result = await createLearningFromQualityPerformanceInsight(insight)
    if (result.success && result.href) {
      toast.success(result.message)
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
    const result = await createExperimentFromQualityPerformanceInsight(insight)
    if (result.success && result.href) {
      toast.success(result.message)
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
            <CardTitle className="text-base text-pretty">{insight.title}</CardTitle>
            <CardDescription>{insight.summary}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={confidenceVariant(insight.confidence)}>
              {insight.confidence} · n={insight.sampleSize}
            </Badge>
            <Badge variant="outline">{insight.insightType}</Badge>
            {insight.earlySignal ? <Badge variant="outline">Early signal</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 text-sm">
          {insight.qualityScore !== undefined ? (
            <span>
              <span className="text-muted-foreground">Quality: </span>
              {insight.qualityScore}
            </span>
          ) : null}
          {insight.performanceMetric ? (
            <span>
              <span className="text-muted-foreground">{insight.performanceMetric}: </span>
              {insight.performanceValue ?? "—"}
            </span>
          ) : null}
          <span>
            <span className="text-muted-foreground">Score: </span>
            {insight.score}
          </span>
        </div>

        {insight.evidence.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Evidence</p>
            <ul className="space-y-1 text-sm">
              {insight.evidence.slice(0, 5).map((item, index) => (
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
          {insight.recommendation}
        </p>

        {insight.relatedRecords.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {insight.relatedRecords.slice(0, 4).map((record) => (
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
          <Button type="button" size="sm" onClick={() => void handleCreateLearning()}>
            <Lightbulb className="size-4" />
            Create Learning
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void handleCreateExperiment()}
          >
            <FlaskConical className="size-4" />
            Create Experiment
          </Button>
          <Link href="/quality" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Open Quality Review
          </Link>
          <Link href="/analytics" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Open Analytics
          </Link>
          <Link href="/patterns" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Pattern Detection
          </Link>
          <Link href="/feedback-loop?tab=quality" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Open Feedback Loop
          </Link>
          <Link href="/playbooks" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Suggest Playbook Update
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
