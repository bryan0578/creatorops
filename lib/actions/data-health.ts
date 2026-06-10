"use server"

import { revalidatePath } from "next/cache"

import { getCampaigns, upsertCampaign } from "@/lib/actions/campaigns"
import { normalizeCampaignRecord } from "@/lib/campaigns"
import { prismaAnalyticsRecordToAnalyticsRecord } from "@/lib/data/analytics-records"
import { prismaArtistToArtistRecord } from "@/lib/data/artists"
import { prismaCampaignToCampaignRecord } from "@/lib/data/campaigns"
import {
  buildDataHealthReport,
  createDataLoadFailureIssue,
  createFailedDataHealthReport,
  type DataHealthIssue,
  type DataHealthJsonField,
  type DataHealthReport,
  type DataHealthScanInput,
} from "@/lib/data/data-health"
import { prismaEmailCampaignToEmailCampaignRecord } from "@/lib/data/email-campaigns"
import { prismaExperimentToExperimentRecord } from "@/lib/data/experiments"
import { prismaMerchIdeaToMerchIdea } from "@/lib/data/merch-ideas"
import { prismaMockupPromptToMockupPromptRecord } from "@/lib/data/mockup-prompts"
import { prismaPresetToPresetRecord } from "@/lib/data/presets"
import { prismaProductListingToProductListing } from "@/lib/data/product-listings"
import { prismaPromptRunToPromptRun } from "@/lib/data/prompt-runs"
import { prismaPromptToPrompt } from "@/lib/data/prompts"
import { prismaReleasePlanToReleasePlan } from "@/lib/data/release-plans"
import { prismaSocialRepurposingToSocialRepurposingRecord } from "@/lib/data/social-repurposing"
import { prismaWorkflowRunToWorkflowRun } from "@/lib/data/workflow-runs"
import { prismaWorkflowToWorkflow } from "@/lib/data/workflows"
import { prismaWorkspaceSettingsToRecord } from "@/lib/data/workspace-settings"
import { prismaYouTubePackageToYouTubePackage } from "@/lib/data/youtube-packages"
import { prismaYouTubeThumbnailToRecord } from "@/lib/data/youtube-thumbnails"
import { prisma } from "@/lib/prisma"
import { WORKSPACE_SETTINGS_ID } from "@/lib/workspace-settings"
import type { CampaignLinkedRecordType } from "@/lib/types"

const artistInclude = {
  releases: { orderBy: { sortOrder: "asc" as const } },
  products: { orderBy: { sortOrder: "asc" as const } },
  campaigns: { orderBy: { sortOrder: "asc" as const } },
}

const workflowInclude = {
  steps: { orderBy: { sortOrder: "asc" as const } },
}

const workflowRunInclude = {
  stepRuns: { orderBy: { sortOrder: "asc" as const } },
}

async function safeLoad<T>(
  moduleName: string,
  loader: () => Promise<T>,
  loadIssues: DataHealthIssue[],
  fallback: T,
): Promise<T> {
  try {
    return await loader()
  } catch (error) {
    loadIssues.push(createDataLoadFailureIssue(moduleName, error))
    return fallback
  }
}

async function loadJsonFields(): Promise<DataHealthJsonField[]> {
  const fields: DataHealthJsonField[] = []

  const [campaignRows, presetRows, promptRows, promptRunRows] = await Promise.all([
    prisma.campaign.findMany({
      select: {
        id: true,
        campaignName: true,
        linkedRecords: true,
        tasks: true,
        publishingChecklist: true,
      },
    }),
    prisma.preset.findMany({
      select: { id: true, name: true, tags: true, values: true },
    }),
    prisma.prompt.findMany({
      select: { id: true, name: true, variables: true, tags: true },
    }),
    prisma.promptRun.findMany({
      select: { id: true, promptId: true, inputValues: true },
    }),
  ])

  for (const row of campaignRows) {
    fields.push(
      {
        sourceType: "campaign",
        sourceId: row.id,
        sourceTitle: row.campaignName || "Untitled campaign",
        fieldName: "linkedRecords",
        raw: row.linkedRecords,
        expected: "array",
      },
      {
        sourceType: "campaign",
        sourceId: row.id,
        sourceTitle: row.campaignName || "Untitled campaign",
        fieldName: "tasks",
        raw: row.tasks,
        expected: "array",
      },
      {
        sourceType: "campaign",
        sourceId: row.id,
        sourceTitle: row.campaignName || "Untitled campaign",
        fieldName: "publishingChecklist",
        raw: row.publishingChecklist ?? "{}",
        expected: "object",
      },
    )
  }

  for (const row of presetRows) {
    fields.push(
      {
        sourceType: "preset",
        sourceId: row.id,
        sourceTitle: row.name || "Untitled preset",
        fieldName: "tags",
        raw: row.tags,
        expected: "array",
      },
      {
        sourceType: "preset",
        sourceId: row.id,
        sourceTitle: row.name || "Untitled preset",
        fieldName: "values",
        raw: row.values,
        expected: "object",
      },
    )
  }

  for (const row of promptRows) {
    fields.push(
      {
        sourceType: "prompt",
        sourceId: row.id,
        sourceTitle: row.name || "Untitled prompt",
        fieldName: "variables",
        raw: row.variables,
        expected: "array",
      },
      {
        sourceType: "prompt",
        sourceId: row.id,
        sourceTitle: row.name || "Untitled prompt",
        fieldName: "tags",
        raw: row.tags,
        expected: "array",
      },
    )
  }

  for (const row of promptRunRows) {
    fields.push({
      sourceType: "prompt-run",
      sourceId: row.id,
      sourceTitle: `Prompt run (${row.promptId || "unknown"})`,
      fieldName: "inputValues",
      raw: row.inputValues,
      expected: "object",
    })
  }

  return fields
}

async function loadScanInput(): Promise<{
  input: DataHealthScanInput
  loadIssues: DataHealthIssue[]
}> {
  const loadIssues: DataHealthIssue[] = []

  const [
    campaigns,
    artists,
    youtubePackages,
    youtubeThumbnails,
    releasePlans,
    socialRepurposing,
    emailCampaigns,
    merchIdeas,
    productListings,
    mockupPrompts,
    analyticsRecords,
    experiments,
    presets,
    prompts,
    promptRuns,
    workflows,
    workflowRuns,
    workspaceSettings,
    jsonFields,
  ] = await Promise.all([
    safeLoad(
      "Campaigns",
      async () => {
        const rows = await prisma.campaign.findMany({ orderBy: { updatedAt: "desc" } })
        return rows.map(prismaCampaignToCampaignRecord)
      },
      loadIssues,
      [],
    ),
    safeLoad(
      "Artists",
      async () => {
        const rows = await prisma.artist.findMany({
          include: artistInclude,
          orderBy: { updatedAt: "desc" },
        })
        return rows.map(prismaArtistToArtistRecord)
      },
      loadIssues,
      [],
    ),
    safeLoad(
      "YouTube packages",
      async () => {
        const rows = await prisma.youTubePackage.findMany({
          orderBy: { updatedAt: "desc" },
        })
        return rows.map(prismaYouTubePackageToYouTubePackage)
      },
      loadIssues,
      [],
    ),
    safeLoad(
      "YouTube thumbnails",
      async () => {
        const rows = await prisma.youTubeThumbnail.findMany({
          orderBy: { updatedAt: "desc" },
        })
        return rows.map(prismaYouTubeThumbnailToRecord)
      },
      loadIssues,
      [],
    ),
    safeLoad(
      "Release plans",
      async () => {
        const rows = await prisma.releasePlan.findMany({ orderBy: { updatedAt: "desc" } })
        return rows.map(prismaReleasePlanToReleasePlan)
      },
      loadIssues,
      [],
    ),
    safeLoad(
      "Social repurposing",
      async () => {
        const rows = await prisma.socialRepurposing.findMany({
          orderBy: { updatedAt: "desc" },
        })
        return rows.map(prismaSocialRepurposingToSocialRepurposingRecord)
      },
      loadIssues,
      [],
    ),
    safeLoad(
      "Email campaigns",
      async () => {
        const rows = await prisma.emailCampaign.findMany({ orderBy: { updatedAt: "desc" } })
        return rows.map(prismaEmailCampaignToEmailCampaignRecord)
      },
      loadIssues,
      [],
    ),
    safeLoad(
      "Merch ideas",
      async () => {
        const rows = await prisma.merchIdea.findMany({ orderBy: { updatedAt: "desc" } })
        return rows.map(prismaMerchIdeaToMerchIdea)
      },
      loadIssues,
      [],
    ),
    safeLoad(
      "Product listings",
      async () => {
        const rows = await prisma.productListing.findMany({ orderBy: { updatedAt: "desc" } })
        return rows.map(prismaProductListingToProductListing)
      },
      loadIssues,
      [],
    ),
    safeLoad(
      "Mockup prompts",
      async () => {
        const rows = await prisma.mockupPrompt.findMany({ orderBy: { updatedAt: "desc" } })
        return rows.map(prismaMockupPromptToMockupPromptRecord)
      },
      loadIssues,
      [],
    ),
    safeLoad(
      "Analytics records",
      async () => {
        const rows = await prisma.analyticsRecord.findMany({ orderBy: { updatedAt: "desc" } })
        return rows.map(prismaAnalyticsRecordToAnalyticsRecord)
      },
      loadIssues,
      [],
    ),
    safeLoad(
      "Experiments",
      async () => {
        const rows = await prisma.experiment.findMany({ orderBy: { updatedAt: "desc" } })
        return rows.map(prismaExperimentToExperimentRecord)
      },
      loadIssues,
      [],
    ),
    safeLoad(
      "Presets",
      async () => {
        const rows = await prisma.preset.findMany({ orderBy: { updatedAt: "desc" } })
        return rows.map(prismaPresetToPresetRecord)
      },
      loadIssues,
      [],
    ),
    safeLoad(
      "Prompts",
      async () => {
        const rows = await prisma.prompt.findMany({ orderBy: { updatedAt: "desc" } })
        return rows.map(prismaPromptToPrompt)
      },
      loadIssues,
      [],
    ),
    safeLoad(
      "Prompt runs",
      async () => {
        const rows = await prisma.promptRun.findMany({ orderBy: { updatedAt: "desc" } })
        return rows.map(prismaPromptRunToPromptRun)
      },
      loadIssues,
      [],
    ),
    safeLoad(
      "Workflows",
      async () => {
        const rows = await prisma.workflow.findMany({
          include: workflowInclude,
          orderBy: { updatedAt: "desc" },
        })
        return rows.map(prismaWorkflowToWorkflow)
      },
      loadIssues,
      [],
    ),
    safeLoad(
      "Workflow runs",
      async () => {
        const rows = await prisma.workflowRun.findMany({
          include: workflowRunInclude,
          orderBy: { updatedAt: "desc" },
        })
        return rows.map(prismaWorkflowRunToWorkflowRun)
      },
      loadIssues,
      [],
    ),
    safeLoad(
      "Workspace settings",
      async () => {
        const row = await prisma.workspaceSettings.findUnique({
          where: { id: WORKSPACE_SETTINGS_ID },
        })
        return row ? prismaWorkspaceSettingsToRecord(row) : null
      },
      loadIssues,
      null,
    ),
    safeLoad("JSON fields", loadJsonFields, loadIssues, []),
  ])

  return {
    input: {
      campaigns,
      artists,
      youtubePackages,
      youtubeThumbnails,
      releasePlans,
      socialRepurposing,
      emailCampaigns,
      merchIdeas,
      productListings,
      mockupPrompts,
      analyticsRecords,
      experiments,
      presets,
      prompts,
      promptRuns,
      workflows,
      workflowRuns,
      workspaceSettings,
      jsonFields,
    },
    loadIssues,
  }
}

/** Scan local SQLite data and return a read-only health report. */
export async function getDataHealthReport(): Promise<DataHealthReport> {
  try {
    const { input, loadIssues } = await loadScanInput()
    return buildDataHealthReport(input, loadIssues)
  } catch (error) {
    return createFailedDataHealthReport(error)
  }
}

export type RemoveBrokenLinkResult = {
  ok: boolean
  message?: string
}

/**
 * Remove a single broken linkedRecords entry from a campaign.
 * Only mutates when the user explicitly triggers this action.
 */
export async function removeBrokenCampaignLink(
  campaignId: string,
  linkedRecordId: string,
  linkedRecordType: CampaignLinkedRecordType,
): Promise<RemoveBrokenLinkResult> {
  const campaigns = await getCampaigns()
  const campaign = campaigns.find((item) => item.id === campaignId)

  if (!campaign) {
    return { ok: false, message: "Campaign not found." }
  }

  const beforeCount = campaign.linkedRecords.length
  const linkedRecords = campaign.linkedRecords.filter(
    (record) =>
      !(record.id === linkedRecordId && record.type === linkedRecordType),
  )

  if (linkedRecords.length === beforeCount) {
    return { ok: false, message: "Broken link was not found on this campaign." }
  }

  await upsertCampaign(
    normalizeCampaignRecord({
      ...campaign,
      linkedRecords,
      updatedAt: Date.now(),
    }),
  )

  revalidatePath("/data-health")
  revalidatePath("/campaigns")

  return { ok: true }
}
