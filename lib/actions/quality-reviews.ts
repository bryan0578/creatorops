"use server"

import { revalidatePath } from "next/cache"

import {
  prismaQualityReviewToRecord,
  qualityReviewToPrismaCreate,
  qualityReviewToPrismaUpdate,
} from "@/lib/data/quality-reviews"
import {
  calculateOverallScore,
  filterQualityReviewsForCampaign,
  normalizeQualityReviewRecord,
  readinessLabelFromScore,
} from "@/lib/quality-reviews"
import { loadQualitySourceContext } from "@/lib/quality/source-loader"
import { scoreReviewDraft } from "@/lib/quality/scoring"
import { emptyScoreBreakdown } from "@/lib/quality/rubrics"
import { prisma } from "@/lib/prisma"
import { createId } from "@/lib/storage"
import type {
  GenerateQualityReviewDraftInput,
  QualityReviewRecord,
} from "@/lib/types"

const QUALITY_PATHS = [
  "/",
  "/quality",
  "/campaigns",
  "/search",
  "/backups",
  "/automation",
  "/youtube-packaging",
  "/youtube-thumbnails",
  "/social-repurposing",
  "/email-campaigns",
  "/merch-ideas",
  "/product-listings",
  "/mockup-prompts",
  "/prompt-runner",
  "/experiments",
  "/assets",
]

function revalidateQualityRoutes() {
  for (const path of QUALITY_PATHS) {
    revalidatePath(path)
  }
}

function wrapQualityDbError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("no such table") || message.includes("does not exist")) {
    return new Error(
      `${context} QualityReview table is missing. Run \`npm run db:migrate\`, then restart the dev server.`,
    )
  }
  return new Error(`${context} ${message}`)
}

/** Load all quality reviews from SQLite. */
export async function getQualityReviews(): Promise<QualityReviewRecord[]> {
  try {
    const rows = await prisma.qualityReview.findMany({ orderBy: { updatedAt: "desc" } })
    return rows.map(prismaQualityReviewToRecord)
  } catch (error) {
    throw wrapQualityDbError(error, "Failed to load quality reviews.")
  }
}

/** Load a single quality review by id. */
export async function getQualityReviewById(id: string): Promise<QualityReviewRecord | null> {
  try {
    const row = await prisma.qualityReview.findUnique({ where: { id } })
    return row ? prismaQualityReviewToRecord(row) : null
  } catch (error) {
    throw wrapQualityDbError(error, "Failed to load quality review.")
  }
}

/** Create or update a quality review record. */
export async function upsertQualityReview(record: QualityReviewRecord): Promise<QualityReviewRecord> {
  const normalized = normalizeQualityReviewRecord(record)
  try {
    const row = await prisma.qualityReview.upsert({
      where: { id: normalized.id },
      create: qualityReviewToPrismaCreate(normalized),
      update: qualityReviewToPrismaUpdate(normalized),
    })
    revalidateQualityRoutes()
    return prismaQualityReviewToRecord(row)
  } catch (error) {
    throw wrapQualityDbError(error, "Could not save quality review.")
  }
}

/** Create a new quality review record. */
export async function createQualityReview(
  record: Omit<QualityReviewRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<QualityReviewRecord> {
  const now = Date.now()
  return upsertQualityReview(
    normalizeQualityReviewRecord({
      ...record,
      id: record.id ?? createId("quality"),
      createdAt: now,
      updatedAt: now,
    }),
  )
}

/** Update an existing quality review. */
export async function updateQualityReview(record: QualityReviewRecord): Promise<QualityReviewRecord> {
  return upsertQualityReview({ ...record, updatedAt: Date.now() })
}

/** Delete a quality review by id. */
export async function deleteQualityReview(
  id: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    await prisma.qualityReview.delete({ where: { id } })
    revalidateQualityRoutes()
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      message: wrapQualityDbError(error, "Could not delete quality review.").message,
    }
  }
}

/** Duplicate a quality review with a new id. */
export async function duplicateQualityReview(id: string): Promise<QualityReviewRecord | null> {
  const source = await getQualityReviewById(id)
  if (!source) return null
  const { id: _omitId, createdAt: _omitCreated, updatedAt: _omitUpdated, ...rest } = source
  return createQualityReview({
    ...rest,
    reviewName: source.reviewName ? `${source.reviewName} (copy)` : "Copy",
    status: "Draft",
  })
}

export interface GenerateQualityReviewDraftResult {
  success: boolean
  message: string
  record?: Partial<QualityReviewRecord>
  warnings?: string[]
}

/** Generate draft scores using local rubric heuristics only. */
export async function generateQualityReviewDraft(
  input: GenerateQualityReviewDraftInput,
): Promise<GenerateQualityReviewDraftResult> {
  const reviewType = (input.reviewType ?? "Other").trim() || "Other"

  try {
    const source = await loadQualitySourceContext({
      reviewType,
      sourceRecordType: input.sourceRecordType,
      sourceRecordId: input.sourceRecordId,
      sourcePromptRunId: input.sourcePromptRunId,
      sourceExperimentId: input.sourceExperimentId,
      campaignId: input.campaignId,
    })

    const draft = scoreReviewDraft(reviewType, source)
    const overallScore = calculateOverallScore(draft.scoreBreakdown)
    const readinessLabel = readinessLabelFromScore(overallScore, reviewType)

    const reviewName =
      input.reviewName?.trim() ||
      (source.title ? `${source.title} — ${reviewType}` : `${reviewType} Review`)

    const warnings = [...draft.warnings]
    if (!source.found && input.sourceRecordId) {
      warnings.push("Source record could not be loaded — review fields manually.")
    }

    return {
      success: true,
      message: warnings.length
        ? "Draft generated with warnings. Review scores and notes."
        : "Draft scores generated from local rubric heuristics.",
      warnings,
      record: {
        reviewName,
        reviewType,
        campaignId: input.campaignId ?? "",
        campaignName: input.campaignName ?? "",
        artistName: input.artistName ?? "",
        songTitle: input.songTitle ?? "",
        productName: input.productName ?? "",
        sourceRecordType: input.sourceRecordType ?? "",
        sourceRecordId: input.sourceRecordId ?? "",
        sourcePromptRunId: input.sourcePromptRunId ?? "",
        sourceExperimentId: input.sourceExperimentId ?? "",
        platform: input.platform ?? "",
        rubricVersion: draft.scoreBreakdown.rubricVersion,
        overallScore,
        scoreBreakdown: draft.scoreBreakdown,
        strengths: draft.strengths,
        weaknesses: draft.weaknesses,
        improvementIdeas: draft.improvementIdeas,
        recommendedActions: draft.recommendedActions,
        readinessLabel,
        status: "Draft",
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate review draft."
    const breakdown = emptyScoreBreakdown(reviewType)
    return {
      success: false,
      message,
      warnings: [message],
      record: {
        reviewType,
        scoreBreakdown: breakdown,
        overallScore: 0,
        readinessLabel: "Needs work",
      },
    }
  }
}

/** Import quality reviews from JSON (merge by id). */
export async function importQualityReviews(
  rows: QualityReviewRecord[],
): Promise<{ imported: number; updated: number; skipped: number }> {
  let imported = 0
  let updated = 0
  let skipped = 0

  for (const row of rows) {
    if (!row?.id) {
      skipped += 1
      continue
    }
    try {
      const existing = await getQualityReviewById(row.id)
      await upsertQualityReview(
        normalizeQualityReviewRecord({
          ...row,
          updatedAt: Date.now(),
          createdAt: existing?.createdAt ?? row.createdAt ?? Date.now(),
        }),
      )
      if (existing) updated += 1
      else imported += 1
    } catch {
      skipped += 1
    }
  }

  revalidateQualityRoutes()
  return { imported, updated, skipped }
}

/** Quality reviews for a campaign. */
export async function getQualityReviewsForCampaign(
  campaignId: string,
  campaignName?: string,
): Promise<QualityReviewRecord[]> {
  const rows = await getQualityReviews()
  return filterQualityReviewsForCampaign(rows, campaignId, campaignName)
}
