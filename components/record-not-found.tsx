"use client"

import { FileQuestion } from "lucide-react"

import { EmptyState } from "@/components/empty-state"

export function RecordNotFound({
  recordId,
  recordLabel = "Record",
  moduleHref,
  moduleLabel,
}: {
  recordId?: string | null
  recordLabel?: string
  moduleHref: string
  moduleLabel: string
}) {
  return (
    <EmptyState
      icon={FileQuestion}
      title={`${recordLabel} not found`}
      description={
        recordId
          ? `No saved ${recordLabel.toLowerCase()} matches ID "${recordId}". It may have been deleted or the link is outdated.`
          : `That ${recordLabel.toLowerCase()} could not be loaded.`
      }
      primaryActionLabel={`Open ${moduleLabel}`}
      primaryActionHref={moduleHref}
      secondaryActionLabel="Control Center"
      secondaryActionHref="/"
    />
  )
}
