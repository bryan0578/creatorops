"use server"

import { revalidatePath } from "next/cache"

import { importAnalyticsRecords } from "@/lib/actions/analytics-records"
import { getAssets, importAssets } from "@/lib/actions/assets"
import { importArtists } from "@/lib/actions/artists"
import { importCampaigns } from "@/lib/actions/campaigns"
import { importPlaybooks } from "@/lib/actions/playbooks"
import { getLearnings, importLearnings } from "@/lib/actions/learnings"
import { getQualityReviews, importQualityReviews } from "@/lib/actions/quality-reviews"
import { importWorkspaceSettings } from "@/lib/actions/workspace-settings"
import { importEmailCampaignRecords } from "@/lib/actions/email-campaigns"
import { getExperiments, importExperiments } from "@/lib/actions/experiments"
import { importMerchIdeas } from "@/lib/actions/merch-ideas"
import { importMockupPromptRecords } from "@/lib/actions/mockup-prompts"
import { importProductListings } from "@/lib/actions/product-listings"
import { importPromptRuns } from "@/lib/actions/prompt-runs"
import { importPrompts } from "@/lib/actions/prompts"
import { importReleasePlans } from "@/lib/actions/release-plans"
import { importSocialRepurposingRecords } from "@/lib/actions/social-repurposing"
import { importWorkflowRuns } from "@/lib/actions/workflow-runs"
import { importWorkflows } from "@/lib/actions/workflows"
import { importYouTubePackages } from "@/lib/actions/youtube-packages"
import { importYouTubeThumbnails } from "@/lib/actions/youtube-thumbnails"
import {
  BACKUP_DATA_KEYS,
  BACKUP_MODULE_META,
  type BackupDataKey,
  type BackupImportMode,
  type BackupModuleMeta,
  type BackupRecordCounts,
  type CreatorOpsBackup,
  type CreatorOpsBackupData,
  buildFullBackup,
  countBackupData,
  emptyBackupData,
  maxUpdatedAt,
  normalizeBackupPayload,
  totalFromCounts,
  validateFullBackup,
} from "@/lib/data/backups"
import { getAnalyticsRecords } from "@/lib/actions/analytics-records"
import { getArtists } from "@/lib/actions/artists"
import { getCampaigns } from "@/lib/actions/campaigns"
import { getPlaybooks } from "@/lib/actions/playbooks"
import { getPresets, importPresets } from "@/lib/actions/presets"
import { getWorkspaceSettings } from "@/lib/actions/workspace-settings"
import { getEmailCampaignRecords } from "@/lib/actions/email-campaigns"
import { getMerchIdeas } from "@/lib/actions/merch-ideas"
import { getMockupPromptRecords } from "@/lib/actions/mockup-prompts"
import { getProductListings } from "@/lib/actions/product-listings"
import { getPromptRuns } from "@/lib/actions/prompt-runs"
import { getPrompts } from "@/lib/actions/prompts"
import { getReleasePlans } from "@/lib/actions/release-plans"
import { getSocialRepurposingRecords } from "@/lib/actions/social-repurposing"
import { getWorkflowRuns } from "@/lib/actions/workflow-runs"
import { getWorkflows } from "@/lib/actions/workflows"
import { getYouTubePackages } from "@/lib/actions/youtube-packages"
import { getYouTubeThumbnails } from "@/lib/actions/youtube-thumbnails"
import { getExternalLinks, importExternalLinks } from "@/lib/actions/external-links"
import { getYouTubeVideos, importYouTubeVideoRecords } from "@/lib/actions/youtube-integration"
import { prisma } from "@/lib/prisma"
import type {
  AssetRecord,
  ExperimentRecord,
  AnalyticsRecord,
  ArtistRecord,
  CampaignRecord,
  PresetRecord,
  PlaybookRecord,
  LearningRecord,
  QualityReviewRecord,
  WorkspaceSettingsRecord,
  EmailCampaignRecord,
  MerchIdea,
  MockupPromptRecord,
  ProductListing,
  Prompt,
  PromptRun,
  ReleasePlan,
  SocialRepurposingRecord,
  Workflow,
  WorkflowRun,
  YouTubePackage,
  YouTubeThumbnailRecord,
  ExternalLinkRecord,
  YouTubeVideoRecord,
} from "@/lib/types"
import { youtubeConnectionToBackupMetadata } from "@/lib/youtube/token-store"
import { YOUTUBE_CONNECTION_ID } from "@/lib/youtube/types"

const REVALIDATE_PATHS = [
  "/",
  "/backups",
  "/prompts",
  "/workflows",
  "/runner",
  "/workflow-runner",
  "/youtube-packaging",
  "/youtube-thumbnails",
  "/release-planner",
  "/artist-crm",
  "/merch-ideas",
  "/product-listings",
  "/social-repurposing",
  "/analytics",
  "/mockup-prompts",
  "/email-campaigns",
  "/experiments",
  "/campaigns",
  "/presets",
  "/playbooks",
  "/assets",
  "/quality",
  "/learnings",
  "/integrations",
  "/search",
  "/settings",
]

function revalidateAllRoutes() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path)
  }
}

export interface BackupModuleSummary {
  key: BackupDataKey
  label: string
  category: BackupModuleMeta["category"]
  exportFilename: string
  count: number
  lastUpdated: number | null
}

export interface BackupSummary {
  totalRecords: number
  modulesIncluded: number
  databaseType: "SQLite"
  modules: BackupModuleSummary[]
}

async function fetchAllBackupData(): Promise<CreatorOpsBackupData> {
  const [
    prompts,
    workflows,
    promptRuns,
    workflowRuns,
    youtubePackages,
    youtubeThumbnails,
    releasePlans,
    artists,
    merchIdeas,
    productListings,
    socialRepurposing,
    analyticsRecords,
    mockupPrompts,
    emailCampaigns,
    experiments,
    campaigns,
    presets,
    playbooks,
    assets,
    qualityReviews,
    learnings,
    externalLinks,
    youtubeVideos,
    workspaceSettingsRow,
  ] = await Promise.all([
    getPrompts(),
    getWorkflows(),
    getPromptRuns(),
    getWorkflowRuns(),
    getYouTubePackages(),
    getYouTubeThumbnails(),
    getReleasePlans(),
    getArtists(),
    getMerchIdeas(),
    getProductListings(),
    getSocialRepurposingRecords(),
    getAnalyticsRecords(),
    getMockupPromptRecords(),
    getEmailCampaignRecords(),
    getExperiments(),
    getCampaigns(),
    getPresets(),
    getPlaybooks(),
    getAssets(),
    getQualityReviews(),
    getLearnings(),
    getExternalLinks(),
    getYouTubeVideos(),
    getWorkspaceSettings(),
  ])

  const workspaceSettings = workspaceSettingsRow ? [workspaceSettingsRow] : []

  return {
    prompts,
    workflows,
    promptRuns,
    workflowRuns,
    youtubePackages,
    youtubeThumbnails,
    releasePlans,
    artists,
    merchIdeas,
    productListings,
    socialRepurposing,
    analyticsRecords,
    mockupPrompts,
    emailCampaigns,
    experiments,
    campaigns,
    presets,
    playbooks,
    assets,
    qualityReviews,
    learnings,
    externalLinks,
    youtubeVideos,
    workspaceSettings,
  }
}

/** Load backup summary for the Backup Center UI. */
export async function getBackupSummary(): Promise<BackupSummary> {
  const data = await fetchAllBackupData()

  const modules: BackupModuleSummary[] = BACKUP_MODULE_META.map((meta) => {
    const items = data[meta.key] as { updatedAt?: number }[]
    return {
      key: meta.key,
      label: meta.label,
      category: meta.category,
      exportFilename: meta.exportFilename,
      count: items.length,
      lastUpdated: maxUpdatedAt(items),
    }
  })

  const counts = countBackupData(data)

  return {
    totalRecords: totalFromCounts(counts),
    modulesIncluded: BACKUP_DATA_KEYS.length,
    databaseType: "SQLite",
    modules,
  }
}

/** Export a full CreatorOps backup JSON payload. */
export async function exportFullBackup(): Promise<CreatorOpsBackup> {
  const data = await fetchAllBackupData()
  const connectionRow = await prisma.youTubeConnection.findUnique({
    where: { id: YOUTUBE_CONNECTION_ID },
  })
  return buildFullBackup(data, {
    youtubeConnectionMetadata: connectionRow
      ? youtubeConnectionToBackupMetadata(connectionRow)
      : undefined,
    securityNotes: [
      "YouTube OAuth access and refresh tokens are not exported for security.",
      "Reconnect YouTube after restoring a backup to resume API sync.",
    ],
  })
}

/** Export one module as a JSON-compatible array (matches per-module export). */
export async function exportModuleBackup(
  key: BackupDataKey,
): Promise<unknown[]> {
  const data = await fetchAllBackupData()
  return data[key]
}

async function clearAllBackupTables(): Promise<void> {
  await prisma.workflowRun.deleteMany()
  await prisma.promptRun.deleteMany()
  await prisma.workflow.deleteMany()
  await prisma.prompt.deleteMany()
  await prisma.youTubePackage.deleteMany()
  await prisma.youTubeThumbnail.deleteMany()
  await prisma.releasePlan.deleteMany()
  await prisma.artist.deleteMany()
  await prisma.merchIdea.deleteMany()
  await prisma.productListing.deleteMany()
  await prisma.socialRepurposing.deleteMany()
  await prisma.analyticsRecord.deleteMany()
  await prisma.mockupPrompt.deleteMany()
  await prisma.emailCampaign.deleteMany()
  await prisma.experiment.deleteMany()
  await prisma.campaign.deleteMany()
  await prisma.preset.deleteMany()
  await prisma.playbook.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.qualityReview.deleteMany()
  await prisma.learning.deleteMany()
  await prisma.externalLink.deleteMany()
  await prisma.youTubeVideo.deleteMany()
  await prisma.workspaceSettings.deleteMany()
}

async function importBackupData(
  data: CreatorOpsBackupData,
  mode: BackupImportMode,
): Promise<BackupRecordCounts> {
  if (mode === "replace") {
    await clearAllBackupTables()
  }

  if (data.prompts.length > 0) {
    await importPrompts(data.prompts as Prompt[])
  }
  if (data.workflows.length > 0) {
    await importWorkflows(data.workflows as Workflow[])
  }
  if (data.promptRuns.length > 0) {
    await importPromptRuns(data.promptRuns as PromptRun[])
  }
  if (data.workflowRuns.length > 0) {
    await importWorkflowRuns(data.workflowRuns as WorkflowRun[])
  }
  if (data.youtubePackages.length > 0) {
    await importYouTubePackages(data.youtubePackages as YouTubePackage[])
  }
  if (data.youtubeThumbnails.length > 0) {
    await importYouTubeThumbnails(data.youtubeThumbnails as YouTubeThumbnailRecord[])
  }
  if (data.releasePlans.length > 0) {
    await importReleasePlans(data.releasePlans as ReleasePlan[])
  }
  if (data.artists.length > 0) {
    await importArtists(data.artists as ArtistRecord[])
  }
  if (data.merchIdeas.length > 0) {
    await importMerchIdeas(data.merchIdeas as MerchIdea[])
  }
  if (data.productListings.length > 0) {
    await importProductListings(data.productListings as ProductListing[])
  }
  if (data.socialRepurposing.length > 0) {
    await importSocialRepurposingRecords(
      data.socialRepurposing as SocialRepurposingRecord[],
    )
  }
  if (data.analyticsRecords.length > 0) {
    await importAnalyticsRecords(data.analyticsRecords as AnalyticsRecord[])
  }
  if (data.mockupPrompts.length > 0) {
    await importMockupPromptRecords(data.mockupPrompts as MockupPromptRecord[])
  }
  if (data.emailCampaigns.length > 0) {
    await importEmailCampaignRecords(data.emailCampaigns as EmailCampaignRecord[])
  }
  if (data.experiments.length > 0) {
    await importExperiments(data.experiments as ExperimentRecord[])
  }
  if (data.campaigns.length > 0) {
    await importCampaigns(data.campaigns as CampaignRecord[])
  }
  if (data.presets.length > 0) {
    await importPresets(data.presets as PresetRecord[])
  }
  if (data.playbooks.length > 0) {
    await importPlaybooks(data.playbooks as PlaybookRecord[])
  }
  if (data.assets.length > 0) {
    await importAssets(data.assets as AssetRecord[])
  }
  if (data.qualityReviews.length > 0) {
    await importQualityReviews(data.qualityReviews as QualityReviewRecord[])
  }
  if (data.learnings.length > 0) {
    const result = await importLearnings(data.learnings)
    if (result.imported === 0 && data.learnings.length > 0) {
      console.warn("[CreatorOps] Learnings import returned 0 items.")
    }
  }
  if (data.externalLinks.length > 0) {
    await importExternalLinks(data.externalLinks as ExternalLinkRecord[])
  }
  if (data.youtubeVideos.length > 0) {
    await importYouTubeVideoRecords(data.youtubeVideos as YouTubeVideoRecord[])
  }
  if (data.workspaceSettings.length > 0) {
    await importWorkspaceSettings(data.workspaceSettings as WorkspaceSettingsRecord[])
  }

  revalidateAllRoutes()
  return countBackupData(data)
}

export interface ImportBackupResult {
  success: boolean
  mode: BackupImportMode
  importedCounts: BackupRecordCounts
  totalImported: number
  message: string
}

/**
 * Import a full or partial CreatorOps backup.
 * Default mode merges by id (upsert). Replace clears all tables first.
 */
export async function importFullBackup(
  payload: unknown,
  mode: BackupImportMode = "merge",
): Promise<ImportBackupResult> {
  const data = normalizeBackupPayload(payload)

  const hasAnyData = BACKUP_DATA_KEYS.some((key) => data[key].length > 0)
  if (!hasAnyData) {
    return {
      success: false,
      mode,
      importedCounts: countBackupData(emptyBackupData()),
      totalImported: 0,
      message: "Backup file contains no importable records.",
    }
  }

  if (!validateFullBackup(payload) && mode === "replace") {
    // Partial backups are still allowed in merge mode; replace requires full shape
    const record = payload as Record<string, unknown>
    if (!record.data) {
      return {
        success: false,
        mode,
        importedCounts: countBackupData(data),
        totalImported: 0,
        message:
          "Replace mode requires a full CreatorOps backup file with a data section.",
      }
    }
  }

  try {
    const importedCounts = await importBackupData(data, mode)
    const totalImported = totalFromCounts(importedCounts)

    return {
      success: true,
      mode,
      importedCounts,
      totalImported,
      message:
        mode === "merge"
          ? `Imported ${totalImported} record(s) using add/update mode.`
          : `Replaced database with ${totalImported} record(s) from backup.`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      mode,
      importedCounts: countBackupData(emptyBackupData()),
      totalImported: 0,
      message: `Import failed: ${message}`,
    }
  }
}
