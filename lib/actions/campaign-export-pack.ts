"use server"

import { prismaCampaignToCampaignRecord } from "@/lib/data/campaigns"
import {
  buildCampaignExportPack,
  type CampaignExportPackResult,
} from "@/lib/data/campaign-export-pack"
import { loadCampaignLinkableStoreSlice } from "@/lib/data/campaign-linkable-store"
import { prisma } from "@/lib/prisma"

/** Build a publish-ready export pack for a campaign and its linked records. */
export async function getCampaignExportPack(
  campaignId: string,
): Promise<CampaignExportPackResult> {
  const trimmedId = campaignId.trim()
  if (!trimmedId) {
    throw new Error("Campaign id is required.")
  }

  const [row, store] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: trimmedId } }),
    loadCampaignLinkableStoreSlice(),
  ])

  if (!row) {
    throw new Error("Campaign not found.")
  }

  const campaign = prismaCampaignToCampaignRecord(row)
  return buildCampaignExportPack(campaign, store)
}
