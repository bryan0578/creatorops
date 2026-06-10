"use server"

import { revalidatePath } from "next/cache"

import { getCampaigns, upsertCampaign } from "@/lib/actions/campaigns"
import {
  buildWorkspaceTask,
  buildWorkspaceTasks,
  type WorkspaceTask,
} from "@/lib/data/tasks"
import { normalizeCampaignRecord } from "@/lib/campaigns"
import type { CampaignTaskStatus } from "@/lib/types"

const TASK_PATHS = ["/tasks", "/campaigns", "/campaign-board", "/", "/search"]

function revalidateTaskRoutes() {
  for (const path of TASK_PATHS) {
    revalidatePath(path)
  }
}

/** Load all workspace tasks from campaign records. */
export async function getWorkspaceTasks(): Promise<WorkspaceTask[]> {
  const campaigns = await getCampaigns()
  return buildWorkspaceTasks(campaigns)
}

export interface UpdateCampaignTaskStatusInput {
  campaignId: string
  taskId?: string
  taskIndex?: number
  status: string
}

function resolveCampaignTaskStatus(status: string): CampaignTaskStatus {
  const value = status.trim()
  const allowed: CampaignTaskStatus[] = ["To Do", "In Progress", "Done", "Skipped"]
  if (allowed.includes(value as CampaignTaskStatus)) {
    return value as CampaignTaskStatus
  }
  if (value.toLowerCase() === "done" || value.toLowerCase() === "completed") {
    return "Done"
  }
  if (value.toLowerCase() === "in progress") {
    return "In Progress"
  }
  return "To Do"
}

/** Update a single task status on a campaign without mutating other tasks. */
export async function updateCampaignTaskStatus(
  input: UpdateCampaignTaskStatusInput,
): Promise<WorkspaceTask | null> {
  const campaignId = input.campaignId.trim()
  if (!campaignId) {
    throw new Error("Campaign id is required.")
  }

  const campaigns = await getCampaigns()
  const campaign = campaigns.find((item) => item.id === campaignId)
  if (!campaign) {
    throw new Error("Campaign not found.")
  }

  const nextStatus = resolveCampaignTaskStatus(input.status)
  let updated = false

  const tasks = campaign.tasks.map((task, index) => {
    const matchesId = input.taskId?.trim() && task.id === input.taskId.trim()
    const matchesIndex =
      input.taskIndex != null && Number.isFinite(input.taskIndex) && index === input.taskIndex

    if (matchesId || matchesIndex) {
      updated = true
      return { ...task, status: nextStatus }
    }

    return task
  })

  if (!updated) {
    throw new Error("Task not found.")
  }

  const saved = await upsertCampaign(
    normalizeCampaignRecord({
      ...campaign,
      tasks,
      updatedAt: Date.now(),
    }),
  )

  revalidateTaskRoutes()

  const matchIndex =
    input.taskIndex ??
    saved.tasks.findIndex((task) => task.id === input.taskId?.trim())
  const matchTask = saved.tasks[matchIndex]
  if (!matchTask || matchIndex < 0) return null

  return buildWorkspaceTask(saved, matchTask, matchIndex)
}
