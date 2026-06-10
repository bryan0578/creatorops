"use server"

import { revalidatePath } from "next/cache"

import { getAssets } from "@/lib/actions/assets"
import { getCampaigns } from "@/lib/actions/campaigns"
import { assetToPrismaCreate } from "@/lib/data/assets"
import {
  analyticsRecordToPrismaCreate,
} from "@/lib/data/analytics-records"
import {
  artistRelationsToNestedCreate,
  artistToPrismaCreate,
} from "@/lib/data/artists"
import {
  buildCampaignBundle,
  buildCampaignBundleIdMap,
  campaignBundleFilename,
  parseCampaignBundleJson,
  previewCampaignBundleImport,
  remapCampaignBundleForImport,
  assessCampaignBundleReadiness,
  type CampaignBundle,
  type CampaignBundleImportMode,
  type CampaignBundleImportPreview,
  type CampaignBundleReadiness,
  type CampaignBundleStore,
} from "@/lib/data/campaign-bundle"
import { loadCampaignLinkableStoreSlice } from "@/lib/data/campaign-linkable-store"
import { prismaCampaignToCampaignRecord } from "@/lib/data/campaigns"
import { campaignToPrismaCreate } from "@/lib/data/campaigns"
import { emailCampaignToPrismaCreate } from "@/lib/data/email-campaigns"
import { prismaExperimentToExperimentRecord } from "@/lib/data/experiments"
import { experimentToPrismaCreate } from "@/lib/data/experiments"
import { prismaMerchIdeaToMerchIdea } from "@/lib/data/merch-ideas"
import { merchIdeaToPrismaCreate } from "@/lib/data/merch-ideas"
import { prismaMockupPromptToMockupPromptRecord } from "@/lib/data/mockup-prompts"
import { mockupPromptToPrismaCreate } from "@/lib/data/mockup-prompts"
import { prismaPresetToPresetRecord } from "@/lib/data/presets"
import { presetToPrismaCreate } from "@/lib/data/presets"
import { prismaProductListingToProductListing } from "@/lib/data/product-listings"
import { productListingToPrismaCreate } from "@/lib/data/product-listings"
import { prismaPromptRunToPromptRun } from "@/lib/data/prompt-runs"
import { promptRunToPrismaCreate } from "@/lib/data/prompt-runs"
import { prismaReleasePlanToReleasePlan } from "@/lib/data/release-plans"
import { releasePlanToPrismaCreate } from "@/lib/data/release-plans"
import { prismaSocialRepurposingToSocialRepurposingRecord } from "@/lib/data/social-repurposing"
import { socialRepurposingToPrismaCreate } from "@/lib/data/social-repurposing"
import { prismaWorkflowRunToWorkflowRun } from "@/lib/data/workflow-runs"
import { workflowRunToPrismaCreate } from "@/lib/data/workflow-runs"
import { prismaYouTubePackageToYouTubePackage } from "@/lib/data/youtube-packages"
import { youtubePackageToPrismaCreate } from "@/lib/data/youtube-packages"
import { prismaYouTubeThumbnailToRecord } from "@/lib/data/youtube-thumbnails"
import { youtubeThumbnailToPrismaCreate } from "@/lib/data/youtube-thumbnails"
import { prisma } from "@/lib/prisma"
import type { AssetRecord, CampaignRecord } from "@/lib/types"

const REVALIDATE_PATHS = [
  "/",
  "/campaigns",
  "/campaign-board",
  "/backups",
  "/tasks",
  "/search",
  "/artist-crm",
  "/release-planner",
  "/youtube-packaging",
  "/youtube-thumbnails",
  "/social-repurposing",
  "/email-campaigns",
  "/merch-ideas",
  "/product-listings",
  "/mockup-prompts",
  "/analytics",
  "/experiments",
  "/runner",
  "/workflow-runner",
  "/presets",
  "/assets",
  "/data-health",
]

function revalidateBundleRoutes() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path)
  }
}

async function loadCampaignBundleStore(): Promise<
  CampaignBundleStore & { campaigns: CampaignRecord[] }
> {
  const [linkable, experiments, promptRuns, workflowRuns, presets, assets, campaigns] =
    await Promise.all([
      loadCampaignLinkableStoreSlice(),
      prisma.experiment.findMany({ orderBy: { updatedAt: "desc" } }),
      prisma.promptRun.findMany({ orderBy: { updatedAt: "desc" } }),
      prisma.workflowRun.findMany({ orderBy: { updatedAt: "desc" } }),
      prisma.preset.findMany({ orderBy: { updatedAt: "desc" } }),
      getAssets(),
      getCampaigns(),
    ])

  return {
    ...linkable,
    experiments: experiments.map(prismaExperimentToExperimentRecord),
    presets: presets.map(prismaPresetToPresetRecord),
    assets,
    runs: promptRuns.map(prismaPromptRunToPromptRun),
    workflowRuns: workflowRuns.map(prismaWorkflowRunToWorkflowRun),
    campaigns,
  }
}

/** Export a portable JSON bundle for one campaign and linked records. */
export async function exportCampaignBundle(
  campaignId: string,
): Promise<CampaignBundle> {
  const trimmedId = campaignId.trim()
  if (!trimmedId) {
    throw new Error("Campaign id is required.")
  }

  const [row, store] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: trimmedId } }),
    loadCampaignBundleStore(),
  ])

  if (!row) {
    throw new Error("Campaign not found.")
  }

  const campaign = prismaCampaignToCampaignRecord(row)
  return buildCampaignBundle(campaign, store)
}

/** Summarize bundle readiness without returning full record payloads to the client. */
export async function getCampaignBundleReadiness(
  campaignId: string,
): Promise<CampaignBundleReadiness> {
  const bundle = await exportCampaignBundle(campaignId)
  return assessCampaignBundleReadiness(bundle)
}

export { campaignBundleFilename }

/** Preview import conflicts and plan before writing records. */
export async function previewCampaignBundleImportAction(
  bundleJson: unknown,
  mode: CampaignBundleImportMode = "create-copy",
): Promise<CampaignBundleImportPreview> {
  const parsed = parseCampaignBundleJson(bundleJson)
  if (!parsed.ok) {
    return {
      valid: false,
      error: parsed.error,
      summary: {
        campaign: 0,
        artists: 0,
        releasePlans: 0,
        youtubePackages: 0,
        youtubeThumbnails: 0,
        socialRepurposing: 0,
        emailCampaigns: 0,
        merchIdeas: 0,
        productListings: 0,
        mockupPrompts: 0,
        analyticsRecords: 0,
        experiments: 0,
        promptRuns: 0,
        workflowRuns: 0,
        presets: 0,
        assets: 0,
      },
      conflicts: [],
      warnings: [],
      missingRecords: [],
      importPlan: [],
    }
  }

  const store = await loadCampaignBundleStore()
  return previewCampaignBundleImport(parsed.bundle, store, mode)
}

export interface ImportCampaignBundleInput {
  bundleJson: unknown
  mode?: CampaignBundleImportMode
  includeWorkspaceSettings?: boolean
}

export interface ImportCampaignBundleResult {
  success: boolean
  message: string
  campaignId?: string
  campaignName?: string
}

/** Import a campaign bundle using create-copy or skip-existing modes. */
export async function importCampaignBundle(
  input: ImportCampaignBundleInput,
): Promise<ImportCampaignBundleResult> {
  const mode = input.mode ?? "create-copy"
  if (mode === "update-existing") {
    return {
      success: false,
      message: "Update existing mode is not available yet. Use Create copy instead.",
    }
  }

  const parsed = parseCampaignBundleJson(input.bundleJson)
  if (!parsed.ok) {
    return { success: false, message: parsed.error }
  }

  const store = await loadCampaignBundleStore()
  const preview = previewCampaignBundleImport(parsed.bundle, store, mode)
  const idMap = buildCampaignBundleIdMap(parsed.bundle, preview.importPlan, mode)
  const remapped = remapCampaignBundleForImport(parsed.bundle, idMap, {
    campaignNameSuffix: mode === "create-copy" ? " (Imported)" : "",
  })

  const campaignPlan = preview.importPlan.find((item) => item.recordType === "campaign")
  const skipCampaignCreate =
    campaignPlan?.action === "link-existing" && Boolean(campaignPlan.targetId)

  try {
    await prisma.$transaction(async (tx) => {
      const bundle = parsed.bundle

      for (let i = 0; i < bundle.linkedRecords.artists.length; i++) {
        const original = bundle.linkedRecords.artists[i]
        if (shouldSkipImport("artist", original.id, preview)) continue
        const record = remapped.linkedRecords.artists[i]
        await tx.artist.create({
          data: {
            ...artistToPrismaCreate(record),
            ...artistRelationsToNestedCreate(record),
          },
        })
      }

      await createPairedRecords(
        tx,
        bundle.linkedRecords.releasePlans,
        remapped.linkedRecords.releasePlans,
        "release-plan",
        preview,
        (record) => tx.releasePlan.create({ data: releasePlanToPrismaCreate(record) }),
      )
      await createPairedRecords(
        tx,
        bundle.linkedRecords.youtubePackages,
        remapped.linkedRecords.youtubePackages,
        "youtube-package",
        preview,
        (record) =>
          tx.youTubePackage.create({ data: youtubePackageToPrismaCreate(record) }),
      )
      await createPairedRecords(
        tx,
        bundle.linkedRecords.youtubeThumbnails,
        remapped.linkedRecords.youtubeThumbnails,
        "youtube-thumbnail",
        preview,
        (record) =>
          tx.youTubeThumbnail.create({ data: youtubeThumbnailToPrismaCreate(record) }),
      )
      await createPairedRecords(
        tx,
        bundle.linkedRecords.socialRepurposing,
        remapped.linkedRecords.socialRepurposing,
        "social-repurposing",
        preview,
        (record) =>
          tx.socialRepurposing.create({
            data: socialRepurposingToPrismaCreate(record),
          }),
      )
      await createPairedRecords(
        tx,
        bundle.linkedRecords.emailCampaigns,
        remapped.linkedRecords.emailCampaigns,
        "email-campaign",
        preview,
        (record) =>
          tx.emailCampaign.create({ data: emailCampaignToPrismaCreate(record) }),
      )
      await createPairedRecords(
        tx,
        bundle.linkedRecords.merchIdeas,
        remapped.linkedRecords.merchIdeas,
        "merch-idea",
        preview,
        (record) => tx.merchIdea.create({ data: merchIdeaToPrismaCreate(record) }),
      )
      await createPairedRecords(
        tx,
        bundle.linkedRecords.productListings,
        remapped.linkedRecords.productListings,
        "product-listing",
        preview,
        (record) =>
          tx.productListing.create({ data: productListingToPrismaCreate(record) }),
      )
      await createPairedRecords(
        tx,
        bundle.linkedRecords.mockupPrompts,
        remapped.linkedRecords.mockupPrompts,
        "mockup-prompt",
        preview,
        (record) =>
          tx.mockupPrompt.create({ data: mockupPromptToPrismaCreate(record) }),
      )
      await createPairedRecords(
        tx,
        bundle.linkedRecords.analyticsRecords,
        remapped.linkedRecords.analyticsRecords,
        "analytics",
        preview,
        (record) =>
          tx.analyticsRecord.create({ data: analyticsRecordToPrismaCreate(record) }),
      )
      await createPairedRecords(
        tx,
        bundle.linkedRecords.experiments,
        remapped.linkedRecords.experiments,
        "experiment",
        preview,
        (record) => tx.experiment.create({ data: experimentToPrismaCreate(record) }),
      )
      await createPairedRecords(
        tx,
        bundle.linkedRecords.promptRuns,
        remapped.linkedRecords.promptRuns,
        "prompt-run",
        preview,
        (record) => tx.promptRun.create({ data: promptRunToPrismaCreate(record) }),
      )
      await createPairedRecords(
        tx,
        bundle.linkedRecords.workflowRuns,
        remapped.linkedRecords.workflowRuns,
        "workflow-run",
        preview,
        (record) =>
          tx.workflowRun.create({ data: workflowRunToPrismaCreate(record) }),
      )
      await createPairedRecords(
        tx,
        bundle.linkedRecords.presets,
        remapped.linkedRecords.presets,
        "preset",
        preview,
        (record) => tx.preset.create({ data: presetToPrismaCreate(record) }),
      )
      await createPairedRecords(
        tx,
        bundle.linkedRecords.assets,
        remapped.linkedRecords.assets,
        "asset",
        preview,
        (record) => tx.asset.create({ data: assetToPrismaCreate(record as AssetRecord) }),
      )

      if (!skipCampaignCreate) {
        await tx.campaign.create({ data: campaignToPrismaCreate(remapped.campaign) })
      }
    })

    revalidateBundleRoutes()

    const resultCampaignId = skipCampaignCreate
      ? campaignPlan?.targetId
      : remapped.campaign.id
    const resultCampaignName = skipCampaignCreate
      ? store.campaigns.find((c) => c.id === campaignPlan?.targetId)?.campaignName ??
        parsed.bundle.campaign.campaignName
      : remapped.campaign.campaignName

    return {
      success: true,
      message: skipCampaignCreate
        ? "Campaign bundle imported and linked to existing campaign."
        : "Campaign bundle imported.",
      campaignId: resultCampaignId,
      campaignName: resultCampaignName,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Campaign bundle import failed."
    return {
      success: false,
      message: `Import failed — no changes were saved. ${message}`,
    }
  }
}

function shouldSkipImport(
  recordType: string,
  originalBundleRecordId: string,
  preview: CampaignBundleImportPreview,
): boolean {
  const planItem = preview.importPlan.find(
    (item) =>
      item.recordType === recordType &&
      item.bundleRecordId === originalBundleRecordId,
  )
  return planItem?.action === "link-existing"
}

async function createPairedRecords<T extends { id: string }>(
  _tx: unknown,
  originals: T[],
  remapped: T[],
  recordType: string,
  preview: CampaignBundleImportPreview,
  createFn: (record: T) => Promise<unknown>,
) {
  for (let i = 0; i < originals.length; i++) {
    if (shouldSkipImport(recordType, originals[i].id, preview)) continue
    await createFn(remapped[i])
  }
}
