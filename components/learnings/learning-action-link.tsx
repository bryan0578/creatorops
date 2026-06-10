"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Lightbulb, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  createLearningFromAnalytics,
  createLearningFromExperiment,
  createLearningFromQualityReview,
} from "@/lib/actions/learnings"
import { buildLearningUrl } from "@/lib/learning-prefill"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const SAVE_FIRST_MESSAGE = "Save this record first to create a linked learning."

type LearningSource = "analytics" | "experiment" | "quality-review"

export function CreateLearningButton({
  source,
  sourceId,
  campaignId,
  campaignName,
  label,
  className,
  requireSavedRecord = true,
}: {
  source: LearningSource
  sourceId?: string | null
  campaignId?: string
  campaignName?: string
  label: string
  className?: string
  requireSavedRecord?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const resolvedId = sourceId?.trim()

  if (requireSavedRecord && !resolvedId) {
    return (
      <div className="flex max-w-xs flex-col gap-0.5">
        <span
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "pointer-events-none cursor-not-allowed opacity-60",
            className,
          )}
          aria-disabled="true"
          title={SAVE_FIRST_MESSAGE}
        >
          <Lightbulb className="size-4" />
          {label}
        </span>
        <span className="text-xs text-muted-foreground text-pretty">{SAVE_FIRST_MESSAGE}</span>
      </div>
    )
  }

  async function handleCreate() {
    if (!resolvedId) return
    setLoading(true)
    try {
      const input = {
        campaignId,
        campaignName,
        analyticsRecordId: source === "analytics" ? resolvedId : undefined,
        experimentId: source === "experiment" ? resolvedId : undefined,
        qualityReviewId: source === "quality-review" ? resolvedId : undefined,
      }
      const result =
        source === "analytics"
          ? await createLearningFromAnalytics(input)
          : source === "experiment"
            ? await createLearningFromExperiment(input)
            : await createLearningFromQualityReview(input)

      if (result.ok && result.href) {
        toast.success("Learning created — review and save updates.")
        router.push(result.href)
      } else {
        toast.error(result.message ?? "Could not create learning.")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create learning.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      disabled={loading}
      onClick={() => void handleCreate()}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Lightbulb className="size-4" />}
      {label}
    </Button>
  )
}

export function NewLearningLink({
  campaignId,
  campaignName,
  label = "New Learning",
  className,
}: {
  campaignId?: string
  campaignName?: string
  label?: string
  className?: string
}) {
  return (
    <a
      href={buildLearningUrl({ campaignId, campaignName })}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), className)}
    >
      <Lightbulb className="size-4" />
      {label}
    </a>
  )
}
