"use server"

import { revalidatePath } from "next/cache"

import { getCampaigns, upsertCampaign } from "@/lib/actions/campaigns"
import { getDataHealthReport } from "@/lib/actions/data-health"
import { getExperiments } from "@/lib/actions/experiments"
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
import type { CampaignTask } from "@/lib/types"

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
]

function revalidateAutomationRoutes() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path)
  }
}

async function loadAutomationContext() {
  const [campaigns, store, experiments, runs, dataHealth] = await Promise.all([
    getCampaigns(),
    loadCampaignLinkableStoreSlice(),
    getExperiments(),
    getPromptRuns(),
    getDataHealthReport().catch(() => null),
  ])

  return {
    campaigns,
    store: { ...store, experiments, runs },
    dataHealth,
    dataHealthFailed: dataHealth === null,
  }
}

/** Scan campaigns and workspace data for automation suggestions. */
export async function getAutomationReport(options?: {
  campaignId?: string
}): Promise<AutomationReport> {
  const ctx = await loadAutomationContext()
  return buildAutomationReport(
    {
      campaigns: ctx.campaigns,
      store: ctx.store,
      dataHealth: ctx.dataHealth,
      dataHealthFailed: ctx.dataHealthFailed,
    },
    options,
  )
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
