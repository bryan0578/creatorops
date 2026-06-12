"use client"

import { FeedbackLoopPanel } from "@/components/feedback-loop/feedback-loop-panel"

export function CampaignFeedbackLoopCard({
  campaignId,
  campaignName,
}: {
  campaignId: string
  campaignName?: string
}) {
  return (
    <FeedbackLoopPanel
      campaignId={campaignId}
      limit={3}
      title="Learning Feedback Loop"
      description={
        campaignName
          ? `Turn ${campaignName} results into reusable learnings and playbook updates.`
          : "Turn campaign results into reusable learnings."
      }
    />
  )
}
