import Link from "next/link"
import { ClipboardCheck } from "lucide-react"

import { buildQualityReviewUrl } from "@/lib/quality-prefill"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const SAVE_FIRST_MESSAGE = "Save this record first to create a linked quality review."

export function QualityReviewActionLink({
  recordId,
  campaignId,
  campaignName,
  sourceRecordType,
  sourceRecordId,
  sourcePromptRunId,
  sourceExperimentId,
  reviewType,
  label,
  className,
  contextTitle,
  requireSavedRecord = true,
  hidden = false,
}: {
  recordId?: string | null
  campaignId?: string
  campaignName?: string
  sourceRecordType?: string
  sourceRecordId?: string
  sourcePromptRunId?: string
  sourceExperimentId?: string
  reviewType: string
  label: string
  className?: string
  contextTitle?: string
  /** When true, a saved source record id (or prompt run / experiment id) is required to navigate. */
  requireSavedRecord?: boolean
  /** Hide entirely (e.g. thumbnail prompt when no image prompt yet). */
  hidden?: boolean
}) {
  if (hidden) return null

  const resolvedSourceId = sourceRecordId || recordId || undefined
  const hasSavedRecord = Boolean(
    resolvedSourceId || sourcePromptRunId || sourceExperimentId,
  )

  if (requireSavedRecord && !hasSavedRecord) {
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
          <ClipboardCheck className="size-4" />
          {label}
        </span>
        <span className="text-xs text-muted-foreground text-pretty">{SAVE_FIRST_MESSAGE}</span>
      </div>
    )
  }

  return (
    <Link
      href={buildQualityReviewUrl({
        campaignId,
        campaignName,
        sourceRecordType,
        sourceRecordId: resolvedSourceId,
        sourcePromptRunId,
        sourceExperimentId,
        reviewType,
        contextTitle,
      })}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), className)}
    >
      <ClipboardCheck className="size-4" />
      {label}
    </Link>
  )
}
