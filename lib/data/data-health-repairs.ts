/**
 * Safe repair helpers for Data Health — create-asset navigation only (no mutations).
 */

import { campaignFormFromRecord } from "@/lib/campaigns"
import {
  buildCampaignQuickActionHref,
  type CampaignQuickActionModule,
} from "@/lib/campaign-prefill"
import type { DataHealthRepair } from "@/lib/data/data-health"
import type { CampaignLinkedRecordType, CampaignRecord } from "@/lib/types"

const QUICK_ACTION_MODULE: Partial<
  Record<CampaignLinkedRecordType, CampaignQuickActionModule>
> = {
  "release-plan": "release-planner",
  "youtube-package": "youtube-packaging",
  "youtube-thumbnail": "youtube-thumbnails",
  "social-repurposing": "social-repurposing",
  "merch-idea": "merch-ideas",
  "product-listing": "product-listings",
  "mockup-prompt": "mockup-prompts",
  "email-campaign": "email-campaigns",
  analytics: "analytics",
}

const CREATE_ASSET_LABELS: Partial<Record<CampaignLinkedRecordType, string>> = {
  "release-plan": "Create Release Plan",
  "youtube-package": "Create YouTube Package",
  "youtube-thumbnail": "Create Thumbnail",
  "social-repurposing": "Create Social Content",
  "email-campaign": "Create Email Campaign",
  analytics: "Add Analytics Record",
  artist: "Create Artist Profile",
  "merch-idea": "Create Merch Idea",
  "product-listing": "Create Product Listing",
  "mockup-prompt": "Create Mockup Prompt",
}

function buildArtistCampaignHref(
  form: ReturnType<typeof campaignFormFromRecord>,
  campaignId: string,
): string {
  const params = new URLSearchParams()
  params.set("campaignId", campaignId)
  if (form.campaignName) params.set("campaignName", form.campaignName)
  if (form.campaignType) params.set("campaignType", form.campaignType)
  if (form.artistName) params.set("artistName", form.artistName)
  if (form.songTitle) params.set("songTitle", form.songTitle)
  if (form.productName) params.set("productName", form.productName)
  if (form.niche) params.set("niche", form.niche)
  if (form.primaryGoal) params.set("primaryGoal", form.primaryGoal)
  if (form.targetAudience) params.set("targetAudience", form.targetAudience)
  if (form.description) params.set("description", form.description)
  return `/artist-crm?${params.toString()}`
}

/** Build a create-asset repair action for a missing campaign linked record type. */
export function buildMissingAssetRepair(
  campaign: CampaignRecord,
  assetType: CampaignLinkedRecordType,
): DataHealthRepair | undefined {
  const label = CREATE_ASSET_LABELS[assetType]
  if (!label) return undefined

  const form = campaignFormFromRecord(campaign)

  if (assetType === "artist") {
    return {
      kind: "create-asset",
      label,
      href: buildArtistCampaignHref(form, campaign.id),
    }
  }

  const module = QUICK_ACTION_MODULE[assetType]
  if (!module) return undefined

  return {
    kind: "create-asset",
    label,
    href: buildCampaignQuickActionHref(module, form, campaign.id),
  }
}

/** Build a remove-broken-link repair for a campaign linkedRecords entry. */
export function buildRemoveBrokenLinkRepair(
  campaignId: string,
  linkedRecordId: string,
  linkedRecordType: CampaignLinkedRecordType,
): DataHealthRepair {
  return {
    kind: "remove-broken-link",
    campaignId,
    linkedRecordId,
    linkedRecordType,
  }
}
