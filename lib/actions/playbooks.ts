"use server"

import { revalidatePath } from "next/cache"

import { createAsset } from "@/lib/actions/assets"
import { upsertCampaign } from "@/lib/actions/campaigns"
import { createExperiment } from "@/lib/actions/experiments"
import { getPresetById } from "@/lib/actions/presets"
import {
  emptyCampaignRecord,
  normalizeCampaignRecord,
  normalizeLinkedRecord,
} from "@/lib/campaigns"
import { STARTER_PLAYBOOKS } from "@/lib/data/playbook-starters"
import {
  playbookToPrismaCreate,
  playbookToPrismaUpdate,
  prismaPlaybookToPlaybookRecord,
} from "@/lib/data/playbooks"
import {
  buildPlaybookReferenceNote,
  normalizePlaybookRecord,
  publishingChecklistFromPlaybookTemplate,
  tasksFromPlaybookTemplate,
} from "@/lib/playbooks"
import { prisma } from "@/lib/prisma"
import { createId } from "@/lib/storage"
import type {
  CampaignLinkedRecord,
  CampaignRecord,
  CreateCampaignFromPlaybookInput,
  CreateCampaignFromPlaybookResult,
  ExperimentRecord,
  PlaybookRecord,
} from "@/lib/types"

const PLAYBOOK_PATHS = [
  "/",
  "/playbooks",
  "/campaigns",
  "/campaign-board",
  "/tasks",
  "/search",
  "/backups",
  "/experiments",
  "/assets",
]

function revalidatePlaybookRoutes() {
  for (const path of PLAYBOOK_PATHS) {
    revalidatePath(path)
  }
}

function wrapPlaybookDbError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("no such table") || message.includes("does not exist")) {
    return new Error(
      `${context} Playbook table is missing. Run \`npm run db:migrate\`, then restart the dev server.`,
    )
  }
  return new Error(`${context} ${message}`)
}

export async function getPlaybooks(): Promise<PlaybookRecord[]> {
  try {
    const rows = await prisma.playbook.findMany({ orderBy: { updatedAt: "desc" } })
    return rows.map(prismaPlaybookToPlaybookRecord)
  } catch (error) {
    throw wrapPlaybookDbError(error, "Failed to load playbooks.")
  }
}

export async function getPlaybookById(id: string): Promise<PlaybookRecord | null> {
  try {
    const row = await prisma.playbook.findUnique({ where: { id } })
    return row ? prismaPlaybookToPlaybookRecord(row) : null
  } catch (error) {
    throw wrapPlaybookDbError(error, "Failed to load playbook.")
  }
}

export async function upsertPlaybook(record: PlaybookRecord): Promise<PlaybookRecord> {
  const normalized = normalizePlaybookRecord(record)
  try {
    const row = await prisma.playbook.upsert({
      where: { id: normalized.id },
      create: playbookToPrismaCreate(normalized),
      update: playbookToPrismaUpdate(normalized),
    })
    revalidatePlaybookRoutes()
    return prismaPlaybookToPlaybookRecord(row)
  } catch (error) {
    throw wrapPlaybookDbError(error, "Could not save playbook.")
  }
}

export async function createPlaybook(
  record: Omit<PlaybookRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<PlaybookRecord> {
  const now = Date.now()
  return upsertPlaybook(
    normalizePlaybookRecord({
      ...record,
      id: record.id ?? createId("playbook"),
      createdAt: now,
      updatedAt: now,
    }),
  )
}

export async function updatePlaybook(record: PlaybookRecord): Promise<PlaybookRecord> {
  return upsertPlaybook({ ...record, updatedAt: Date.now() })
}

export async function deletePlaybook(id: string): Promise<{ ok: boolean; message?: string }> {
  try {
    await prisma.playbook.delete({ where: { id } })
    revalidatePlaybookRoutes()
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not delete playbook.",
    }
  }
}

export async function duplicatePlaybook(id: string): Promise<PlaybookRecord | null> {
  const existing = await getPlaybookById(id)
  if (!existing) return null
  return upsertPlaybook(
    normalizePlaybookRecord({
      ...existing,
      id: createId("playbook"),
      name: `${existing.name || "Playbook"} (copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  )
}

export async function getStarterPlaybooks(): Promise<PlaybookRecord[]> {
  return STARTER_PLAYBOOKS
}

export async function seedStarterPlaybooks(): Promise<{ created: number; skipped: number }> {
  let created = 0
  let skipped = 0
  for (const starter of STARTER_PLAYBOOKS) {
    const existing = await prisma.playbook.findUnique({ where: { id: starter.id } })
    if (existing) {
      skipped += 1
      continue
    }
    await upsertPlaybook(starter)
    created += 1
  }
  return { created, skipped }
}

export async function importPlaybooks(records: PlaybookRecord[]): Promise<number> {
  let count = 0
  for (const record of records) {
    await upsertPlaybook(normalizePlaybookRecord(record))
    count += 1
  }
  return count
}

function mergePresetIntoCampaign(
  campaign: CampaignRecord,
  presetValues: Record<string, unknown>,
): CampaignRecord {
  const next = { ...campaign }
  const stringFields = [
    "campaignType",
    "status",
    "priority",
    "artistName",
    "songTitle",
    "productName",
    "niche",
    "primaryGoal",
    "targetAudience",
    "description",
    "notes",
  ] as const
  for (const key of stringFields) {
    const value = presetValues[key]
    if (typeof value === "string" && value.trim() && !String(next[key] ?? "").trim()) {
      next[key] = value.trim()
    }
  }
  return next
}

/** Create a campaign from a playbook template with optional tasks, checklist, experiments, assets. */
export async function createCampaignFromPlaybook(
  input: CreateCampaignFromPlaybookInput,
): Promise<CreateCampaignFromPlaybookResult> {
  const warnings: string[] = []
  const playbook = await getPlaybookById(input.playbookId)
  if (!playbook) {
    return { success: false, message: "Playbook not found." }
  }

  const defaults = playbook.defaultCampaignFields
  const campaignId = createId("campaign")
  const now = Date.now()

  let campaign = normalizeCampaignRecord({
    ...emptyCampaignRecord(campaignId),
    campaignName: input.campaignName.trim(),
    campaignType: defaults.campaignType ?? playbook.targetCampaignType ?? "Music Release",
    status: defaults.status ?? "Planning",
    priority: defaults.priority ?? "Medium",
    artistName: input.artistName?.trim() ?? "",
    songTitle: input.songTitle?.trim() ?? "",
    productName: input.productName?.trim() ?? "",
    niche: defaults.niche ?? "",
    primaryGoal: defaults.primaryGoal ?? "",
    targetAudience: defaults.targetAudience ?? "",
    description: defaults.description ?? "",
    launchDate: input.launchDate?.trim() ?? "",
    notes: [defaults.notes, defaults.launchTimelineNotes, buildPlaybookReferenceNote(playbook)]
      .filter(Boolean)
      .join("\n\n"),
    createdAt: now,
    updatedAt: now,
  })

  const presetId =
    input.presetId?.trim() ||
    (input.options.applyRecommendedPreset ? playbook.recommendedPresetId : "")
  if (presetId) {
    try {
      const preset = await getPresetById(presetId)
      if (preset && preset.presetType === "Campaign") {
        campaign = mergePresetIntoCampaign(campaign, preset.values)
      } else if (!preset) {
        warnings.push("Recommended preset was not found — campaign created without preset.")
      }
    } catch {
      warnings.push("Could not load preset — campaign created without preset merge.")
    }
  }

  const linkedRecords: CampaignLinkedRecord[] = [...campaign.linkedRecords]

  if (input.options.linkRecommendedWorkflow && playbook.recommendedWorkflowId) {
    linkedRecords.push(
      normalizeLinkedRecord({
        id: playbook.recommendedWorkflowId,
        type: "workflow",
        title: playbook.recommendedWorkflowName || "Recommended workflow",
        href: `/workflows?recordId=${encodeURIComponent(playbook.recommendedWorkflowId)}`,
        notes: "Linked from playbook",
      })!,
    )
  }

  if (input.options.createTasks && playbook.taskTemplate.length > 0) {
    campaign = {
      ...campaign,
      tasks: tasksFromPlaybookTemplate(
        playbook.taskTemplate,
        campaign.launchDate,
        createId,
      ),
    }
  }

  if (input.options.createPublishingChecklist) {
    campaign = {
      ...campaign,
      publishingChecklist: publishingChecklistFromPlaybookTemplate(
        playbook.publishingChecklistTemplate,
        campaign.campaignType,
        campaign.launchDate,
      ),
    }
  }

  campaign = { ...campaign, linkedRecords }

  try {
    const saved = await upsertCampaign(campaign)

    if (input.options.createExperimentIdeas && playbook.experimentTemplate.length > 0) {
      for (const template of playbook.experimentTemplate) {
        const experiment: ExperimentRecord = {
          id: createId("experiment"),
          campaignId: saved.id,
          campaignName: saved.campaignName,
          experimentName: template.experimentName,
          experimentType: template.experimentType,
          status: "Idea",
          platform: template.platform ?? "",
          hypothesis: template.hypothesis ?? "",
          variantA: template.variantA ?? "",
          variantB: template.variantB ?? "",
          variantC: template.variantC ?? "",
          winner: "",
          resultSummary: "",
          metricFocus: template.metricFocus ?? "",
          startDate: "",
          endDate: "",
          notes: template.notes ?? "",
          whatWorked: "",
          whatDidNotWork: "",
          nextTestIdea: "",
          relatedAnalyticsNotes: "",
          variantAMetric: "",
          variantBMetric: "",
          variantCMetric: "",
          analyticsRecordId: "",
          analyticsRecordName: "",
          confidenceNotes: "",
          learningSummary: "",
          createdAt: now,
          updatedAt: now,
        }
        await createExperiment(experiment)
      }
    }

    if (input.options.createPlaceholderAssets && playbook.assetChecklist.length > 0) {
      for (const asset of playbook.assetChecklist) {
        await createAsset({
          assetName: asset.title,
          assetType: asset.assetType,
          status: "Draft",
          campaignId: saved.id,
          campaignName: saved.campaignName,
          artistName: saved.artistName,
          songTitle: saved.songTitle,
          productName: saved.productName,
          platform: "",
          filePath: "",
          fileUrl: "",
          externalUrl: "",
          sourceTool: "",
          sourcePromptRunId: "",
          sourcePromptName: "",
          sourceRecordType: "",
          sourceRecordId: "",
          experimentId: "",
          analyticsRecordId: "",
          versionLabel: "v1",
          tags: [],
          description: asset.notes ?? "Placeholder asset from playbook.",
          usageNotes: asset.required ? "Required asset from playbook." : "",
          rightsNotes: "",
          notes: `Created from playbook: ${playbook.name}`,
        })
      }
    }

    revalidatePlaybookRoutes()
    return {
      success: true,
      message: `Campaign "${saved.campaignName}" created from playbook.`,
      campaignId: saved.id,
      warnings: warnings.length ? warnings : undefined,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create campaign."
    return { success: false, message, warnings }
  }
}
