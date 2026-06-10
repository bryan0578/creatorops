import type { CampaignLinkableStoreSlice } from "@/lib/campaigns"
import {
  buildCampaignHealthWarnings,
  buildLaunchDashboardData,
} from "@/lib/campaign-launch-dashboard"
import type { CampaignLinkedRecordType, CampaignRecord } from "@/lib/types"

export type CampaignHealthLabel =
  | "Healthy"
  | "Needs assets"
  | "Broken links"
  | "Incomplete"

export interface CampaignQuickCreateAction {
  label: string
  href: string
  type: CampaignLinkedRecordType
}

export interface CampaignReadinessSummary {
  assetReadinessPercent: number
  taskProgressPercent: number
  missingAssets: number
  brokenLinks: number
  linkedRecordCount: number
  healthLabel: CampaignHealthLabel
  quickCreateActions: CampaignQuickCreateAction[]
}

/** Summarize launch readiness and health for kanban cards. */
export function getCampaignReadiness(
  campaign: CampaignRecord,
  store: CampaignLinkableStoreSlice,
): CampaignReadinessSummary {
  const dashboard = buildLaunchDashboardData(campaign, store)
  const warnings = buildCampaignHealthWarnings(campaign, store)

  const brokenLinks = warnings.filter((warning) => warning.id.startsWith("broken:")).length
  const hasIncomplete = warnings.some((warning) => warning.id === "incomplete:campaign")
  const missingAssetItems = dashboard.readiness.assets.filter((asset) => !asset.completed)

  const quickCreateActions = missingAssetItems
    .filter((asset) => asset.createHref && asset.createLabel && asset.type)
    .map((asset) => ({
      label: asset.createLabel!,
      href: asset.createHref!,
      type: asset.type!,
    }))

  let healthLabel: CampaignHealthLabel = "Healthy"
  if (brokenLinks > 0) {
    healthLabel = "Broken links"
  } else if (missingAssetItems.length > 0) {
    healthLabel = "Needs assets"
  } else if (hasIncomplete) {
    healthLabel = "Incomplete"
  }

  return {
    assetReadinessPercent: dashboard.readiness.score,
    taskProgressPercent: dashboard.taskProgress.percent,
    missingAssets: missingAssetItems.length,
    brokenLinks,
    linkedRecordCount: campaign.linkedRecords.length,
    healthLabel,
    quickCreateActions,
  }
}
