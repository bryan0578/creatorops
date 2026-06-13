"use server"

import { revalidatePath } from "next/cache"

import { getCampaigns, upsertCampaign } from "@/lib/actions/campaigns"
import {
  mapCampaignTaskStatusToGlobal,
  mapGlobalStatusToCampaign,
  normalizeGlobalTask,
  normalizeTaskDedupeKey,
  prismaTaskToRecord,
  taskToPrismaCreate,
  taskToPrismaUpdate,
  type GlobalTaskRecord,
} from "@/lib/data/global-tasks"
import {
  NO_EXIT_SONG_SETUP_TASKS,
  PRETTYWISE_ARTIST_SETUP_TASKS,
  type TaskTemplateInput,
} from "@/lib/data/task-templates"
import { normalizeCampaignRecord } from "@/lib/campaigns"
import { prisma } from "@/lib/prisma"
import { createId } from "@/lib/storage"
import type { CampaignRecord, CampaignTask } from "@/lib/types"

const PATHS = ["/tasks", "/campaigns", "/campaign-board", "/", "/search", "/integrations", "/assets"]

function revalidate() {
  for (const path of PATHS) revalidatePath(path)
}

function wrapDbError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("no such table") || message.includes("does not exist")) {
    return new Error(`${context} Task table is missing. Run npm run db:migrate.`)
  }
  return new Error(`${context} ${message}`)
}

export async function getGlobalTasks(): Promise<GlobalTaskRecord[]> {
  try {
    const rows = await prisma.task.findMany({ orderBy: { updatedAt: "desc" } })
    return rows.map(prismaTaskToRecord)
  } catch (error) {
    throw wrapDbError(error, "Failed to load tasks.")
  }
}

export async function getGlobalTaskById(id: string): Promise<GlobalTaskRecord | null> {
  try {
    const row = await prisma.task.findUnique({ where: { id: id.trim() } })
    return row ? prismaTaskToRecord(row) : null
  } catch {
    return null
  }
}

export async function createGlobalTask(
  data: Omit<GlobalTaskRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<GlobalTaskRecord> {
  const record = normalizeGlobalTask({
    ...data,
    id: data.id?.trim() || createId("task"),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  try {
    const row = await prisma.task.create({
      data: taskToPrismaCreate(record) as Parameters<typeof prisma.task.create>[0]["data"],
    })
    revalidate()
    return prismaTaskToRecord(row)
  } catch (error) {
    throw wrapDbError(error, "Could not create task.")
  }
}

export async function updateGlobalTask(
  id: string,
  data: Partial<Omit<GlobalTaskRecord, "id" | "createdAt">>,
): Promise<GlobalTaskRecord> {
  const existing = await getGlobalTaskById(id)
  if (!existing) throw new Error("Task not found.")
  const record = normalizeGlobalTask({ ...existing, ...data, id, updatedAt: Date.now() })
  try {
    const row = await prisma.task.update({
      where: { id },
      data: taskToPrismaUpdate(record),
    })
    revalidate()
    return prismaTaskToRecord(row)
  } catch (error) {
    throw wrapDbError(error, "Could not update task.")
  }
}

async function createTemplateTasks(
  templates: TaskTemplateInput[],
  artistName: string,
): Promise<{ created: number; skipped: number; message: string }> {
  const existing = await getGlobalTasks()
  const existingKeys = new Set(
    existing.map((task) => normalizeTaskDedupeKey(task.title, task.artistName, task.taskType)),
  )

  let created = 0
  let skipped = 0
  for (const template of templates) {
    const payload = {
      ...template,
      artistName: artistName.trim() || template.artistName,
    }
    const key = normalizeTaskDedupeKey(payload.title, payload.artistName, payload.taskType)
    if (existingKeys.has(key)) {
      skipped += 1
      continue
    }
    await createGlobalTask(payload)
    existingKeys.add(key)
    created += 1
  }

  if (created === 0) {
    return { created: 0, skipped, message: "Setup tasks already exist." }
  }
  return {
    created,
    skipped,
    message: `Created ${created} task${created === 1 ? "" : "s"}.`,
  }
}

export async function createArtistSetupTasks(artistName = "PrettyWise") {
  const templates =
    artistName.trim().toLowerCase() === "prettywise"
      ? PRETTYWISE_ARTIST_SETUP_TASKS
      : PRETTYWISE_ARTIST_SETUP_TASKS.map((task) => ({
          ...task,
          artistName: artistName.trim(),
          tags: [...task.tags.filter((tag) => tag !== "prettywise"), artistName.trim().toLowerCase()],
        }))
  return createTemplateTasks(templates, artistName)
}

export async function createSongSetupTasks(artistName = "PrettyWise", songTitle = "No Exit") {
  const templates =
    songTitle.trim().toLowerCase() === "no exit" && artistName.trim().toLowerCase() === "prettywise"
      ? NO_EXIT_SONG_SETUP_TASKS
      : NO_EXIT_SONG_SETUP_TASKS.map((task) => ({
          ...task,
          artistName: artistName.trim(),
          songTitle: songTitle.trim(),
          title: task.title.replace("No Exit", songTitle.trim()),
          description: task.description.replace(/No Exit/g, songTitle.trim()),
          tags: [...task.tags.filter((tag) => tag !== "no-exit"), songTitle.trim().toLowerCase()],
        }))
  return createTemplateTasks(templates, artistName)
}

export async function createDriveSetupTasks(artistName = "PrettyWise") {
  return createArtistSetupTasks(artistName)
}

export async function createReleaseArchiveTask(artistName: string, songTitle: string) {
  const artist = artistName.trim() || "Unknown artist"
  const song = songTitle.trim() || "Untitled song"
  const title = `Release archive review: ${song}`
  const existing = await getGlobalTasks()
  const key = normalizeTaskDedupeKey(title, artist, "Release Archive")
  if (existing.some((task) => normalizeTaskDedupeKey(task.title, task.artistName, task.taskType) === key)) {
    return { created: 0, message: "Release archive task already exists." }
  }
  await createGlobalTask({
    title,
    description: `Review published archive data for ${song}: URL, assets, lore links, performance notes, and future campaign ideas.`,
    status: "Open",
    priority: "Medium",
    dueDate: "",
    module: "Song Concept Vault",
    taskType: "Release Archive",
    artistName: artist,
    campaignId: "",
    campaignName: "",
    songTitle: song,
    productId: "",
    assetId: "",
    songConceptId: "",
    integrationType: "",
    sourceRecordType: "published-song-archive",
    sourceRecordId: `${artist}-${song}`.toLowerCase().replace(/\s+/g, "-"),
    tags: ["published-song", "release-archive", artist.toLowerCase()],
    notes: "",
  })
  return { created: 1, message: "Release archive task created." }
}

function campaignTaskSourceId(campaignId: string, task: CampaignTask, index: number): string {
  return task.id?.trim() || `${campaignId}-task-${index}`
}

export async function syncCampaignTasksToGlobal(campaign: CampaignRecord): Promise<void> {
  try {
    const existing = await prisma.task.findMany({
      where: { campaignId: campaign.id, sourceRecordType: "campaign-task" },
    })
    const bySource = new Map(existing.map((row) => [row.sourceRecordId, row]))
    const seenSourceIds = new Set<string>()
    const now = Date.now()

    for (const [index, task] of campaign.tasks.entries()) {
      if (!task.title?.trim() && !task.description?.trim()) continue
      const sourceId = campaignTaskSourceId(campaign.id, task, index)
      seenSourceIds.add(sourceId)
      const existingRow = bySource.get(sourceId)
      const record = normalizeGlobalTask({
        id: existingRow?.id ?? createId("task"),
        title: task.title.trim() || "Untitled task",
        description: task.description?.trim() ?? "",
        status: mapCampaignTaskStatusToGlobal(task.status),
        priority: campaign.priority?.trim() || "Medium",
        dueDate: task.dueDate?.trim() ?? "",
        module: "Campaign Builder",
        taskType: "Campaign",
        artistName: campaign.artistName?.trim() ?? "",
        campaignId: campaign.id,
        campaignName: campaign.campaignName?.trim() ?? "",
        songTitle: campaign.songTitle?.trim() ?? "",
        productId: "",
        assetId: "",
        songConceptId: "",
        integrationType: "",
        sourceRecordType: "campaign-task",
        sourceRecordId: sourceId,
        tags: ["campaign"],
        notes: "",
        createdAt: existingRow?.createdAt.getTime() ?? now,
        updatedAt: now,
      })

      await prisma.task.upsert({
        where: { id: record.id },
        create: taskToPrismaCreate(record) as Parameters<typeof prisma.task.create>[0]["data"],
        update: taskToPrismaUpdate(record),
      })
    }

    for (const row of existing) {
      if (!seenSourceIds.has(row.sourceRecordId)) {
        await prisma.task.delete({ where: { id: row.id } })
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("no such table")) return
    throw error
  }
}

export async function updateGlobalTaskStatus(
  taskId: string,
  status: string,
): Promise<GlobalTaskRecord | null> {
  const task = await getGlobalTaskById(taskId)
  if (!task) throw new Error("Task not found.")

  const updated = await updateGlobalTask(taskId, { status: status.trim() || "To Do" })

  if (task.sourceRecordType === "campaign-task" && task.campaignId) {
    const campaigns = await getCampaigns()
    const campaign = campaigns.find((item) => item.id === task.campaignId)
    if (campaign) {
      const nextCampaignStatus = mapGlobalStatusToCampaign(updated.status)
      const tasks = campaign.tasks.map((campaignTask, index) => {
        const sourceId = campaignTaskSourceId(campaign.id, campaignTask, index)
        if (sourceId === task.sourceRecordId || campaignTask.id === task.sourceRecordId) {
          return { ...campaignTask, status: nextCampaignStatus }
        }
        return campaignTask
      })
      await upsertCampaign(
        normalizeCampaignRecord({
          ...campaign,
          tasks,
          updatedAt: Date.now(),
        }),
      )
    }
  }

  revalidate()
  return updated
}
