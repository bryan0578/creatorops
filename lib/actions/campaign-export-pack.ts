"use server"

import { getAssets } from "@/lib/actions/assets"
import { prismaCampaignToCampaignRecord } from "@/lib/data/campaigns"
import { prismaExperimentToExperimentRecord } from "@/lib/data/experiments"
import {
  buildCampaignExportPack,
  type CampaignExportPackResult,
} from "@/lib/data/campaign-export-pack"
import { loadCampaignLinkableStoreSlice } from "@/lib/data/campaign-linkable-store"
import { prisma } from "@/lib/prisma"

/** Build a publish-ready export pack for a campaign and its linked records. */
export async function getCampaignExportPack(
  campaignId: string,
  templateId?: string,
): Promise<CampaignExportPackResult> {
  const trimmedId = campaignId.trim()
  if (!trimmedId) {
    throw new Error("Campaign id is required.")
  }

  const [row, store, experimentRows, assets] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: trimmedId } }),
    loadCampaignLinkableStoreSlice(),
    prisma.experiment.findMany({ orderBy: { updatedAt: "desc" } }),
    getAssets(),
  ])

  if (!row) {
    throw new Error("Campaign not found.")
  }

  const campaign = prismaCampaignToCampaignRecord(row)
  const experiments = experimentRows.map(prismaExperimentToExperimentRecord)
  return buildCampaignExportPack(campaign, store, { templateId, experiments, assets })
}
