"use client"

import { QualityPerformancePanel } from "@/components/quality-performance/quality-performance-panel"

export function CampaignQualityPerformanceCard({
  campaignId,
  campaignName,
}: {
  campaignId: string
  campaignName?: string
}) {
  return (
    <QualityPerformancePanel
      campaignId={campaignId}
      limit={3}
      title="Quality vs Performance"
      description={
        campaignName
          ? `Quality scores vs performance for ${campaignName}.`
          : "Quality scores vs performance for this campaign."
      }
    />
  )
}
