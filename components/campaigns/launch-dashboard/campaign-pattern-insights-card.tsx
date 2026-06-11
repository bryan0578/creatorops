"use client"

import { PatternInsightsPanel } from "@/components/patterns/pattern-insights-panel"

export function CampaignPatternInsightsCard({
  campaignId,
  campaignName,
}: {
  campaignId: string
  campaignName?: string
}) {
  return (
    <PatternInsightsPanel
      campaignId={campaignId}
      limit={3}
      title="Pattern Insights"
      description={
        campaignName
          ? `Repeatable signals for ${campaignName} from analytics, packaging, reviews, and learnings.`
          : "Repeatable signals for this campaign from local records."
      }
    />
  )
}
