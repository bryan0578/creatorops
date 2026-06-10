"use server"

import { prismaCampaignToCampaignRecord } from "@/lib/data/campaigns"
import {
  buildCampaignContext,
  type CampaignContextBundle,
} from "@/lib/data/campaign-context"
import { getLearnings } from "@/lib/actions/learnings"
import { loadCampaignLinkableStoreSlice } from "@/lib/data/campaign-linkable-store"
import { prismaWorkspaceSettingsToRecord } from "@/lib/data/workspace-settings"
import { prisma } from "@/lib/prisma"
import { WORKSPACE_SETTINGS_ID } from "@/lib/workspace-settings"

/** Load normalized campaign context for prompt building. */
export async function getCampaignContext(
  campaignId: string,
): Promise<CampaignContextBundle> {
  const trimmedId = campaignId.trim()
  if (!trimmedId) {
    throw new Error("Campaign id is required.")
  }

  const [row, store, settingsRow, learnings] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: trimmedId } }),
    loadCampaignLinkableStoreSlice(),
    prisma.workspaceSettings.findUnique({ where: { id: WORKSPACE_SETTINGS_ID } }),
    getLearnings(),
  ])

  if (!row) {
    throw new Error("Campaign not found.")
  }

  const campaign = prismaCampaignToCampaignRecord(row)
  const workspaceSettings = settingsRow
    ? prismaWorkspaceSettingsToRecord(settingsRow)
    : null

  return buildCampaignContext(campaign, store, workspaceSettings, learnings)
}
