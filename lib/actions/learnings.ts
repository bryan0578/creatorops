"use server"

import { revalidatePath } from "next/cache"

import { prismaAnalyticsRecordToAnalyticsRecord } from "@/lib/data/analytics-records"
import { prismaExperimentToExperimentRecord } from "@/lib/data/experiments"
import {
  learningToPrismaCreate,
  learningToPrismaUpdate,
  prismaLearningToRecord,
} from "@/lib/data/learnings"
import { prismaQualityReviewToRecord } from "@/lib/data/quality-reviews"
import {
  filterLearningsForCampaign,
  filterReusableLearnings,
  learningTypeFromExperimentType,
  learningTypeFromQualityReviewType,
  normalizeLearningRecord,
} from "@/lib/learnings"
import { prisma } from "@/lib/prisma"
import { createId } from "@/lib/storage"
import type {
  CreateLearningFromAnalyticsInput,
  CreateLearningFromExperimentInput,
  CreateLearningFromQualityReviewInput,
  GetReusableLearningsInput,
  LearningRecord,
} from "@/lib/types"

const LEARNING_PATHS = [
  "/",
  "/learnings",
  "/campaigns",
  "/analytics",
  "/experiments",
  "/quality",
  "/search",
  "/backups",
  "/automation",
  "/runner",
  "/playbooks",
]

function revalidateLearningRoutes() {
  for (const path of LEARNING_PATHS) {
    revalidatePath(path)
  }
}

function wrapLearningDbError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("no such table") || message.includes("does not exist")) {
    return new Error(
      `${context} Learning table is missing. Run \`npm run db:migrate\`, then restart the dev server.`,
    )
  }
  return new Error(`${context} ${message}`)
}

export async function getLearnings(): Promise<LearningRecord[]> {
  try {
    const rows = await prisma.learning.findMany({ orderBy: { updatedAt: "desc" } })
    return rows.map(prismaLearningToRecord)
  } catch (error) {
    throw wrapLearningDbError(error, "Failed to load learnings.")
  }
}

export async function getLearningById(id: string): Promise<LearningRecord | null> {
  try {
    const row = await prisma.learning.findUnique({ where: { id } })
    return row ? prismaLearningToRecord(row) : null
  } catch (error) {
    throw wrapLearningDbError(error, "Failed to load learning.")
  }
}

export async function upsertLearning(record: LearningRecord): Promise<LearningRecord> {
  const normalized = normalizeLearningRecord(record)
  try {
    const row = await prisma.learning.upsert({
      where: { id: normalized.id },
      create: learningToPrismaCreate(normalized),
      update: learningToPrismaUpdate(normalized),
    })
    revalidateLearningRoutes()
    return prismaLearningToRecord(row)
  } catch (error) {
    throw wrapLearningDbError(error, "Could not save learning.")
  }
}

export async function createLearning(
  record: Omit<LearningRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<LearningRecord> {
  const now = Date.now()
  return upsertLearning(
    normalizeLearningRecord({
      ...record,
      id: record.id ?? createId("learning"),
      createdAt: now,
      updatedAt: now,
    }),
  )
}

export async function updateLearning(record: LearningRecord): Promise<LearningRecord> {
  return upsertLearning({ ...record, updatedAt: Date.now() })
}

export async function deleteLearning(
  id: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    await prisma.learning.delete({ where: { id } })
    revalidateLearningRoutes()
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not delete learning.",
    }
  }
}

export async function duplicateLearning(id: string): Promise<LearningRecord | null> {
  const existing = await getLearningById(id)
  if (!existing) return null
  const now = Date.now()
  return createLearning({
    ...existing,
    title: `${existing.title || "Untitled"} (copy)`,
    status: "Active",
  })
}

export async function importLearnings(
  items: unknown[],
): Promise<{ imported: number; message: string }> {
  if (!Array.isArray(items)) {
    return { imported: 0, message: "Import payload must be an array." }
  }
  let imported = 0
  for (const item of items) {
    if (!item || typeof item !== "object") continue
    const raw = item as Partial<LearningRecord>
    if (!raw.id && !raw.title) continue
    await upsertLearning(
      normalizeLearningRecord({
        ...raw,
        id: raw.id ?? createId("learning"),
        createdAt: raw.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      }),
    )
    imported += 1
  }
  return { imported, message: `Imported ${imported} learning${imported === 1 ? "" : "s"}.` }
}

export async function getLearningsForCampaign(
  campaignId: string,
  campaignName?: string,
): Promise<LearningRecord[]> {
  const rows = await getLearnings()
  return filterLearningsForCampaign(rows, campaignId, campaignName)
}

export async function getReusableLearnings(
  input: GetReusableLearningsInput = {},
): Promise<LearningRecord[]> {
  const rows = await getLearnings()
  return filterReusableLearnings(rows, input)
}

export async function createLearningFromAnalytics(
  input: CreateLearningFromAnalyticsInput,
): Promise<{ ok: boolean; record?: LearningRecord; href?: string; message?: string }> {
  const analyticsRecordId = input.analyticsRecordId?.trim()
  if (!analyticsRecordId) {
    return { ok: false, message: "Analytics record id is required." }
  }

  try {
    const row = await prisma.analyticsRecord.findUnique({ where: { id: analyticsRecordId } })
    if (!row) {
      return { ok: false, message: "Analytics record not found." }
    }
    const analytics = prismaAnalyticsRecordToAnalyticsRecord(row)
    const insightParts = [analytics.whatWorked, analytics.whatDidNotWork].filter(Boolean)
    const evidenceParts = [
      analytics.views ? `Views: ${analytics.views}` : "",
      analytics.clickThroughRate ? `CTR: ${analytics.clickThroughRate}` : "",
      analytics.impressions ? `Impressions: ${analytics.impressions}` : "",
      analytics.likes ? `Likes: ${analytics.likes}` : "",
      analytics.comments ? `Comments: ${analytics.comments}` : "",
    ].filter(Boolean)

    const record = await createLearning({
      title: analytics.itemName
        ? `Learning from ${analytics.itemName}`
        : "Learning from Analytics",
      learningType: "Analytics Review",
      category: analytics.whatWorked?.trim() ? "Pattern" : "Opportunity",
      confidence: "Medium",
      impact: "Medium",
      status: "Active",
      campaignId: input.campaignId?.trim() || "",
      campaignName: input.campaignName?.trim() || analytics.relatedCampaign || "",
      artistName: analytics.relatedArtist || "",
      songTitle: analytics.relatedSong || "",
      productName: "",
      platform: analytics.platform || "",
      sourceType: "analytics",
      sourceId: analytics.id,
      analyticsRecordId: analytics.id,
      insight: insightParts.join("\n\n") || analytics.improvementIdeas || "",
      evidence: evidenceParts.join("\n"),
      recommendation: analytics.improvementIdeas || "",
      tags: ["analytics"],
      notes: "",
    })

    return {
      ok: true,
      record,
      href: `/learnings?recordId=${encodeURIComponent(record.id)}`,
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not create learning from analytics.",
    }
  }
}

export async function createLearningFromExperiment(
  input: CreateLearningFromExperimentInput,
): Promise<{ ok: boolean; record?: LearningRecord; href?: string; message?: string }> {
  const experimentId = input.experimentId?.trim()
  if (!experimentId) {
    return { ok: false, message: "Experiment id is required." }
  }

  try {
    const row = await prisma.experiment.findUnique({ where: { id: experimentId } })
    if (!row) {
      return { ok: false, message: "Experiment not found." }
    }
    const experiment = prismaExperimentToExperimentRecord(row)
    const isWinner =
      experiment.status === "Winner Chosen" ||
      Boolean(experiment.winner && experiment.winner !== "Inconclusive")
    const evidenceParts = [
      experiment.variantA ? `Variant A: ${experiment.variantA}` : "",
      experiment.variantB ? `Variant B: ${experiment.variantB}` : "",
      experiment.variantAMetric ? `Variant A metric: ${experiment.variantAMetric}` : "",
      experiment.variantBMetric ? `Variant B metric: ${experiment.variantBMetric}` : "",
      experiment.winner ? `Winner: ${experiment.winner}` : "",
    ].filter(Boolean)

    const record = await createLearning({
      title: experiment.experimentName
        ? `Learning from ${experiment.experimentName}`
        : "Learning from Experiment",
      learningType: learningTypeFromExperimentType(experiment.experimentType),
      category: isWinner ? "Win" : experiment.status === "Running" ? "Hypothesis" : "Pattern",
      confidence: isWinner ? "High" : "Medium",
      impact: isWinner ? "High" : "Medium",
      status: "Active",
      campaignId: input.campaignId?.trim() || experiment.campaignId || "",
      campaignName: input.campaignName?.trim() || experiment.campaignName || "",
      artistName: "",
      songTitle: "",
      productName: "",
      platform: experiment.platform || "",
      sourceType: "experiment",
      sourceId: experiment.id,
      experimentId: experiment.id,
      insight: experiment.learningSummary || experiment.hypothesis || "",
      evidence: evidenceParts.join("\n"),
      recommendation: experiment.nextTestIdea || "",
      tags: ["experiment"],
      notes: experiment.confidenceNotes || "",
    })

    return {
      ok: true,
      record,
      href: `/learnings?recordId=${encodeURIComponent(record.id)}`,
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not create learning from experiment.",
    }
  }
}

export async function createLearningFromQualityReview(
  input: CreateLearningFromQualityReviewInput,
): Promise<{ ok: boolean; record?: LearningRecord; href?: string; message?: string }> {
  const qualityReviewId = input.qualityReviewId?.trim()
  if (!qualityReviewId) {
    return { ok: false, message: "Quality review id is required." }
  }

  try {
    const row = await prisma.qualityReview.findUnique({ where: { id: qualityReviewId } })
    if (!row) {
      return { ok: false, message: "Quality review not found." }
    }
    const review = prismaQualityReviewToRecord(row)
    const lowScore = review.overallScore > 0 && review.overallScore < 60
    const highScore = review.overallScore >= 80
    const insightParts = [review.strengths, review.weaknesses].filter(Boolean)

    const record = await createLearning({
      title: review.reviewName
        ? `Learning from ${review.reviewName}`
        : "Learning from Quality Review",
      learningType: learningTypeFromQualityReviewType(review.reviewType),
      category: lowScore ? "Warning" : highScore ? "Win" : "Opportunity",
      confidence: highScore ? "High" : "Medium",
      impact: review.overallScore >= 70 ? "High" : review.overallScore >= 50 ? "Medium" : "Low",
      status: "Active",
      campaignId: input.campaignId?.trim() || review.campaignId || "",
      campaignName: input.campaignName?.trim() || review.campaignName || "",
      artistName: review.artistName || "",
      songTitle: review.songTitle || "",
      productName: review.productName || "",
      platform: review.platform || "",
      sourceType: "quality-review",
      sourceId: review.id,
      qualityReviewId: review.id,
      insight: insightParts.join("\n\n"),
      evidence: `Score: ${review.overallScore}/100. Readiness: ${review.readinessLabel || review.status}.`,
      recommendation: review.recommendedActions || review.improvementIdeas || "",
      tags: review.tags.length ? review.tags : ["quality-review"],
      notes: "",
    })

    return {
      ok: true,
      record,
      href: `/learnings?recordId=${encodeURIComponent(record.id)}`,
    }
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not create learning from quality review.",
    }
  }
}
