"use server"

import { revalidatePath } from "next/cache"

import { resolveProviderStatus } from "@/lib/ai/ai-client"
import { getAssets } from "@/lib/actions/assets"
import { getExternalLinks } from "@/lib/actions/external-links"
import { getYouTubeVideos, getYouTubeConnectionStatus } from "@/lib/actions/youtube-integration"
import {
  getDriveConnectionStatus,
  getDriveFiles,
  getDriveFolders,
} from "@/lib/actions/drive-integration"
import { getLearnings } from "@/lib/actions/learnings"
import { getQualityReviews } from "@/lib/actions/quality-reviews"
import { getCampaigns, upsertCampaign } from "@/lib/actions/campaigns"
import { getDataHealthReport } from "@/lib/actions/data-health"
import { getExperiments } from "@/lib/actions/experiments"
import { getMerchIdeas } from "@/lib/actions/merch-ideas"
import { getMockupPromptRecords } from "@/lib/actions/mockup-prompts"
import { getProductListings } from "@/lib/actions/product-listings"
import { getReleasePlans } from "@/lib/actions/release-plans"
import { getPromptRuns } from "@/lib/actions/prompt-runs"
import { normalizeCampaignRecord } from "@/lib/campaigns"
import {
  buildAutomationReport,
  type AutomationActionPayload,
  type AutomationActionType,
  type AutomationReport,
  type AutomationSuggestion,
} from "@/lib/data/automation-rules"
import { loadCampaignLinkableStoreSlice } from "@/lib/data/campaign-linkable-store"
import { generateDefaultPublishingChecklist } from "@/lib/data/publishing-checklist"
import { createId } from "@/lib/storage"
import type { CampaignTask, YouTubeConnectionStatusSummary } from "@/lib/types"
import { getWorkspaceSettings } from "@/lib/actions/workspace-settings"

const REVALIDATE_PATHS = [
  "/",
  "/automation",
  "/campaigns",
  "/campaign-board",
  "/tasks",
  "/data-health",
  "/experiments",
  "/analytics",
  "/runner",
  "/quality",
]

function revalidateAutomationRoutes() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path)
  }
}

const EMPTY_YOUTUBE_CONNECTION_STATUS: YouTubeConnectionStatusSummary = {
  configured: false,
  encryptionConfigured: false,
  connected: false,
  oauthConnected: false,
  needsChannelSelection: false,
  needsOAuthReconnect: false,
  apiKeyConfigured: false,
  connection: null,
  clientIdConfigured: false,
  clientSecretConfigured: false,
  redirectUri: "",
}

async function safeLoad<T>(label: string, loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader()
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[Automation] Failed to load ${label}:`,
        error instanceof Error ? error.message : String(error),
      )
    }
    return fallback
  }
}

async function loadAutomationContext() {
  const [
    campaigns,
    store,
    experiments,
    runs,
    assets,
    qualityReviews,
    learnings,
    externalLinks,
    youtubeConnection,
    youtubeVideos,
    driveConnection,
    driveFolders,
    driveFiles,
    productListings,
    merchIdeas,
    mockupPrompts,
    releasePlans,
    dataHealth,
    workspaceSettings,
  ] = await Promise.all([
    safeLoad("campaigns", () => getCampaigns(), []),
    safeLoad("campaignLinkableStore", () => loadCampaignLinkableStoreSlice(), {
      releasePlans: [],
      youtubePackages: [],
      youtubeThumbnailRecords: [],
      socialRepurposingRecords: [],
      merchIdeas: [],
      productListings: [],
      mockupPromptRecords: [],
      emailCampaignRecords: [],
      analyticsRecords: [],
      artistRecords: [],
      workflows: [],
      workflowRuns: [],
      runs: [],
    }),
    safeLoad("experiments", () => getExperiments(), []),
    safeLoad("promptRuns", () => getPromptRuns(), []),
    safeLoad("assets", () => getAssets(), []),
    safeLoad("qualityReviews", () => getQualityReviews(), []),
    safeLoad("learnings", () => getLearnings(), []),
    safeLoad("externalLinks", () => getExternalLinks(), []),
    safeLoad(
      "youtubeConnection",
      () => getYouTubeConnectionStatus(),
      EMPTY_YOUTUBE_CONNECTION_STATUS,
    ),
    safeLoad("youtubeVideos", () => getYouTubeVideos(), []),
    safeLoad("driveConnection", () => getDriveConnectionStatus(), {
      configured: false,
      encryptionConfigured: false,
      connected: false,
      oauthConnected: false,
      connection: null,
      clientIdConfigured: false,
      clientSecretConfigured: false,
      redirectUri: "",
      credentialSource: null,
      usingYoutubeFallback: false,
    }),
    safeLoad("driveFolders", () => getDriveFolders(), []),
    safeLoad("driveFiles", () => getDriveFiles(), []),
    safeLoad("productListings", () => getProductListings(), []),
    safeLoad("merchIdeas", () => getMerchIdeas(), []),
    safeLoad("mockupPrompts", () => getMockupPromptRecords(), []),
    safeLoad("releasePlans", () => getReleasePlans(), []),
    getDataHealthReport().catch(() => null),
    getWorkspaceSettings(),
  ])

  const aiProviderConfigured = resolveProviderStatus({
    enabled: workspaceSettings.aiGenerationEnabled,
    preferredProvider: workspaceSettings.aiDefaultProvider,
    preferredModel: workspaceSettings.aiDefaultModel,
  }).configured

  return {
    campaigns,
    store: {
      ...store,
      experiments,
      runs,
      assets,
      qualityReviews,
      learnings,
      externalLinks,
      youtubeVideos,
      driveFolders,
      driveFiles,
      productListings,
      merchIdeas,
      mockupPrompts,
      releasePlans,
    },
    youtubeConnectionConnected: youtubeConnection.oauthConnected,
    driveConnectionConnected: driveConnection.oauthConnected,
    dataHealth,
    dataHealthFailed: dataHealth === null,
    workspaceSettings,
    aiProviderConfigured,
  }
}

/** Scan campaigns and workspace data for automation suggestions. */
export async function getAutomationReport(options?: {
  campaignId?: string
}): Promise<AutomationReport> {
  try {
    const ctx = await loadAutomationContext()
    return buildAutomationReport(
      {
        campaigns: ctx.campaigns,
        store: ctx.store,
        youtubeConnectionConnected: ctx.youtubeConnectionConnected,
        driveConnectionConnected: ctx.driveConnectionConnected,
        dataHealth: ctx.dataHealth,
        dataHealthFailed: ctx.dataHealthFailed,
        workspaceSettings: ctx.workspaceSettings,
        aiProviderConfigured: ctx.aiProviderConfigured,
      },
      options,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      scannedAt: Date.now(),
      summary: {
        totalSuggestions: 1,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 1,
        campaignsScanned: 0,
        readyToApply: 0,
        informational: 1,
      },
      suggestions: [
        {
          id: "automation-load-failed",
          ruleId: "automation-load-failed",
          priority: "low",
          category: "Cleanup",
          title: "Automation scan unavailable",
          description: message,
          suggestedActionLabel: "Open Data Health",
          actionType: "openDataHealth",
          actionPayload: { href: "/data-health" },
          href: "/data-health",
          canApply: true,
          reason: "The automation engine could not load workspace data.",
        },
      ],
      dataHealthOk: false,
    }
  }
}

export interface ApplyAutomationSuggestionInput {
  suggestionId: string
  actionType: AutomationActionType
  actionPayload: AutomationActionPayload
}

export interface ApplyAutomationSuggestionResult {
  success: boolean
  message: string
  href?: string
  navigate?: boolean
}

function norm(value: string): string {
  return value.trim().toLowerCase()
}

function mergeTasks(
  existing: CampaignTask[],
  additions: { title: string; description?: string }[],
): CampaignTask[] {
  const merged = [...existing]
  const maxOrder = existing.reduce((max, task) => Math.max(max, task.order), 0)
  let order = maxOrder

  for (const addition of additions) {
    const title = addition.title.trim()
    if (!title) continue
    if (merged.some((task) => norm(task.title) === norm(title))) continue
    order += 1
    merged.push({
      id: createId("task"),
      title,
      description: addition.description?.trim() ?? "",
      status: "To Do",
      dueDate: "",
      relatedRecordType: "",
      relatedRecordId: "",
      order,
    })
  }

  return merged
}

/** Apply a single automation suggestion after explicit user confirmation. */
export async function applyAutomationSuggestion(
  input: ApplyAutomationSuggestionInput,
): Promise<ApplyAutomationSuggestionResult> {
  const { actionType, actionPayload } = input

  if (actionType === "navigate" || actionType === "openDataHealth") {
    const href = actionPayload.href ?? "/data-health"
    return { success: true, message: "Opening link.", href, navigate: true }
  }

  if (actionType === "createMissingAsset") {
    const href = actionPayload.href
    if (!href) {
      return { success: false, message: "Missing navigation target." }
    }
    return { success: true, message: "Opening create flow.", href, navigate: true }
  }

  const campaignId = actionPayload.campaignId?.trim()
  if (!campaignId) {
    return { success: false, message: "Campaign id is required for this action." }
  }

  const campaigns = await getCampaigns()
  const campaign = campaigns.find((item) => item.id === campaignId)
  if (!campaign) {
    return { success: false, message: "Campaign not found." }
  }

  try {
    if (actionType === "generatePublishingChecklist") {
      if (campaign.publishingChecklist.items.length > 0 && !actionPayload.replaceChecklist) {
        return {
          success: false,
          message: "Campaign already has a publishing checklist.",
        }
      }
      const checklist = generateDefaultPublishingChecklist(campaign.campaignType)
      await upsertCampaign(
        normalizeCampaignRecord({
          ...campaign,
          publishingChecklist: checklist,
          updatedAt: Date.now(),
        }),
      )
      revalidateAutomationRoutes()
      return { success: true, message: "Publishing checklist generated." }
    }

    if (actionType === "updateCampaignStatus") {
      const status = actionPayload.status?.trim()
      if (!status) {
        return { success: false, message: "Status is required." }
      }
      await upsertCampaign(
        normalizeCampaignRecord({
          ...campaign,
          status,
          updatedAt: Date.now(),
        }),
      )
      revalidateAutomationRoutes()
      return { success: true, message: `Campaign status updated to ${status}.` }
    }

    if (actionType === "addCampaignTasks" || actionType === "addReviewTasks") {
      const tasks = actionPayload.tasks ?? []
      if (tasks.length === 0) {
        return { success: false, message: "No tasks to add." }
      }
      const merged = mergeTasks(campaign.tasks, tasks)
      if (merged.length === campaign.tasks.length) {
        return { success: true, message: "Similar tasks already exist." }
      }
      await upsertCampaign(
        normalizeCampaignRecord({
          ...campaign,
          tasks: merged,
          updatedAt: Date.now(),
        }),
      )
      revalidateAutomationRoutes()
      return { success: true, message: "Tasks added to campaign." }
    }

    return { success: false, message: "Unsupported action type." }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not apply suggestion."
    return { success: false, message }
  }
}
