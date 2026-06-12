"use server"

import { revalidatePath } from "next/cache"

import { upsertCampaign } from "@/lib/actions/campaigns"
import { upsertReleasePlan } from "@/lib/actions/release-plans"
import { createQualityReview } from "@/lib/actions/quality-reviews"
import { upsertPromptRun } from "@/lib/actions/prompt-runs"
import {
  normalizeSongConcept,
  prismaSongConceptToRecord,
  songConceptToPrismaCreate,
  songConceptToPrismaUpdate,
} from "@/lib/data/song-concepts"
import { normalizeCampaignRecord } from "@/lib/campaigns"
import { normalizeReleasePlan } from "@/lib/data/release-plans"
import { prisma } from "@/lib/prisma"
import { createId } from "@/lib/storage"
import type { SongConceptRecord } from "@/lib/artist-universe/types"

const PATHS = [
  "/",
  "/song-vault",
  "/story-arcs",
  "/release-planner",
  "/campaigns",
  "/runner",
  "/quality",
  "/search",
  "/backups",
]

function revalidate() {
  for (const path of PATHS) revalidatePath(path)
}

function wrapDbError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("no such table") || message.includes("does not exist")) {
    return new Error(`${context} SongConcept table is missing. Run npm run db:migrate.`)
  }
  return new Error(`${context} ${message}`)
}

export async function getSongConcepts(): Promise<SongConceptRecord[]> {
  try {
    const rows = await prisma.songConcept.findMany({ orderBy: { updatedAt: "desc" } })
    return rows.map(prismaSongConceptToRecord)
  } catch (error) {
    throw wrapDbError(error, "Failed to load song concepts.")
  }
}

export async function getSongConceptById(id: string): Promise<SongConceptRecord | null> {
  try {
    const row = await prisma.songConcept.findUnique({ where: { id: id.trim() } })
    return row ? prismaSongConceptToRecord(row) : null
  } catch {
    return null
  }
}

export async function getSongConceptsForArtist(artistName: string): Promise<SongConceptRecord[]> {
  const name = artistName.trim()
  if (!name) return []
  try {
    const rows = await prisma.songConcept.findMany({
      where: { artistName: name },
      orderBy: { updatedAt: "desc" },
    })
    return rows.map(prismaSongConceptToRecord)
  } catch {
    return []
  }
}

export async function createSongConcept(
  data: Omit<SongConceptRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<SongConceptRecord> {
  const record = normalizeSongConcept({
    ...data,
    id: data.id?.trim() || createId("song-concept"),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  try {
    const row = await prisma.songConcept.create({
      data: songConceptToPrismaCreate(record) as Parameters<
        typeof prisma.songConcept.create
      >[0]["data"],
    })
    revalidate()
    return prismaSongConceptToRecord(row)
  } catch (error) {
    throw wrapDbError(error, "Could not create song concept.")
  }
}

export async function updateSongConcept(
  id: string,
  data: Partial<Omit<SongConceptRecord, "id" | "createdAt">>,
): Promise<SongConceptRecord> {
  const existing = await getSongConceptById(id)
  if (!existing) throw new Error("Song concept not found.")
  const record = normalizeSongConcept({ ...existing, ...data, id, updatedAt: Date.now() })
  try {
    const row = await prisma.songConcept.update({
      where: { id },
      data: songConceptToPrismaUpdate(record),
    })
    revalidate()
    return prismaSongConceptToRecord(row)
  } catch (error) {
    throw wrapDbError(error, "Could not update song concept.")
  }
}

export async function deleteSongConcept(id: string): Promise<void> {
  try {
    await prisma.songConcept.delete({ where: { id: id.trim() } })
    revalidate()
  } catch (error) {
    throw wrapDbError(error, "Could not delete song concept.")
  }
}

export async function convertSongConceptToReleasePlan(id: string): Promise<{ releasePlanId: string }> {
  const concept = await getSongConceptById(id)
  if (!concept) throw new Error("Song concept not found.")
  const planId = concept.releasePlanId || createId("release-plan")
  const now = Date.now()
  await upsertReleasePlan(
    normalizeReleasePlan({
      id: planId,
      artistName: concept.artistName,
      songTitle: concept.songTitle || concept.title,
      genre: concept.genre,
      mood: concept.mood,
      releaseDate: "",
      youtubeChannel: "",
      targetAudience: "",
      visualTheme: concept.visualConcept,
      merchTieIn: concept.productTieIn,
      streamingPlatforms: "",
      primaryGoal: concept.storyRole,
      notes: `Created from song concept: ${concept.title}\n\n${concept.conceptSummary}`,
      completedPrompt: "",
      aiResponse: "",
      finalStrategySummary: concept.conceptSummary,
      finalTargetListener: "",
      finalPreReleasePlan: "",
      finalReleaseDayChecklist: "",
      finalPostReleasePlan: "",
      finalYouTubePackage: concept.youtubeAngle,
      finalShortFormIdeas: "",
      finalSocialCaptions: "",
      finalEmailAnnouncement: "",
      finalMerchTieIns: concept.productTieIn,
      finalPriorityTasks: "",
      finalChecklist: "",
      createdAt: now,
      updatedAt: now,
    }),
  )
  await updateSongConcept(id, { releasePlanId: planId, status: "Planned" })
  return { releasePlanId: planId }
}

export async function convertSongConceptToCampaign(id: string): Promise<{ campaignId: string }> {
  const concept = await getSongConceptById(id)
  if (!concept) throw new Error("Song concept not found.")
  const campaignId = concept.campaignId || createId("campaign")
  const now = Date.now()
  await upsertCampaign(
    normalizeCampaignRecord({
      id: campaignId,
      campaignName: `${concept.artistName} — ${concept.songTitle || concept.title}`,
      campaignType: "Music Release",
      status: "Idea",
      priority: "Medium",
      artistName: concept.artistName,
      songTitle: concept.songTitle || concept.title,
      productName: "",
      niche: concept.genre,
      primaryGoal: concept.storyRole || "Release song",
      targetAudience: "",
      startDate: "",
      launchDate: "",
      endDate: "",
      description: concept.conceptSummary,
      notes: `Created from song concept: ${concept.id}`,
      lessonsLearned: "",
      whatWorked: "",
      whatToImprove: "",
      linkedRecords: [],
      tasks: [],
      publishingChecklist: { version: 1, items: [] },
      createdAt: now,
      updatedAt: now,
    }),
  )
  await updateSongConcept(id, {
    campaignId,
    campaignName: `${concept.artistName} — ${concept.songTitle || concept.title}`,
    status: "Planned",
  })
  return { campaignId }
}

export async function createPromptRunFromSongConcept(id: string): Promise<{ promptRunId: string }> {
  const concept = await getSongConceptById(id)
  if (!concept) throw new Error("Song concept not found.")
  const runId = createId("prompt-run")
  const now = Date.now()
  await upsertPromptRun({
    id: runId,
    promptId: "",
    promptName: "Song Concept — Suno Prompt",
    category: "Music",
    inputValues: {},
    completedPrompt: concept.sunoPrompt || concept.conceptSummary,
    aiResponse: "",
    notes: `From song concept: ${concept.title}`,
    campaignId: concept.campaignId,
    campaignName: concept.campaignName,
    moduleType: "song-concept",
    outputRecordId: concept.id,
    outputRecordType: "song-concept",
    experimentId: "",
    sourcePromptId: "",
    sourcePromptName: "",
    runType: "manual",
    tags: concept.tags,
    createdAt: now,
    updatedAt: now,
  })
  const runIds = [...concept.relatedPromptRunIds, runId]
  await updateSongConcept(id, { relatedPromptRunIds: runIds, status: "Prompting" })
  return { promptRunId: runId }
}

export async function createQualityReviewFromSongConcept(
  id: string,
): Promise<{ qualityReviewId: string }> {
  const concept = await getSongConceptById(id)
  if (!concept) throw new Error("Song concept not found.")
  const review = await createQualityReview({
    reviewName: `Song Concept Readiness — ${concept.songTitle || concept.title}`,
    reviewType: "Song Concept Readiness",
    status: "Draft",
    campaignId: concept.campaignId,
    campaignName: concept.campaignName,
    artistName: concept.artistName,
    songTitle: concept.songTitle || concept.title,
    productName: "",
    sourceRecordType: "song-concept",
    sourceRecordId: concept.id,
    sourcePromptRunId: "",
    sourceExperimentId: "",
    platform: "Music",
    rubricVersion: "",
    overallScore: 0,
    scoreBreakdown: {},
    strengths: concept.hookIdea || "",
    weaknesses: concept.visualConcept ? "" : "Missing visual concept",
    improvementIdeas: "",
    recommendedActions: "Align with artist bible before release",
    readinessLabel: "Not scored",
    reviewerNotes: concept.conceptSummary,
    tags: concept.tags,
  })
  await updateSongConcept(id, { qualityReviewId: review.id })
  return { qualityReviewId: review.id }
}
