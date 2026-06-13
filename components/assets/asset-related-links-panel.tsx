"use client"

import { RelatedLinksPanel } from "@/components/related-records/related-links-panel"

export function AssetRelatedLinksPanel({
  assetId,
  onLinksChanged,
  showBulkActions = true,
}: {
  assetId: string | null
  onLinksChanged?: () => void
  showBulkActions?: boolean
}) {
  return (
    <RelatedLinksPanel
      sourceType="Asset"
      sourceId={assetId}
      onLinksChanged={onLinksChanged}
      showBulkActions={showBulkActions}
    />
  )
}
