import Link from "next/link"
import { ClipboardCheck } from "lucide-react"

import { buildQualityReviewUrl } from "@/lib/quality-prefill"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function QualityReviewActionLink({
  recordId,
  campaignId,
  sourceRecordType,
  sourceRecordId,
  sourcePromptRunId,
  sourceExperimentId,
  reviewType,
  label,
  className,
}: {
  recordId?: string | null
  campaignId?: string
  sourceRecordType?: string
  sourceRecordId?: string
  sourcePromptRunId?: string
  sourceExperimentId?: string
  reviewType: string
  label: string
  className?: string
}) {
  const linkId = sourceRecordId || sourcePromptRunId || sourceExperimentId || recordId
  if (!linkId) return null

  return (
    <Link
      href={buildQualityReviewUrl({
        campaignId,
        sourceRecordType,
        sourceRecordId: sourceRecordId || recordId || undefined,
        sourcePromptRunId,
        sourceExperimentId,
        reviewType,
      })}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), className)}
    >
      <ClipboardCheck className="size-4" />
      {label}
    </Link>
  )
}
