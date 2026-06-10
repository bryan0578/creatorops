import { parseJsonStringArray, safeJsonParse } from "@/lib/safe-json"
import {
  QUALITY_READINESS_LABELS,
  QUALITY_REVIEW_STATUSES,
  QUALITY_REVIEW_TYPES,
  type QualityReviewFormValues,
  type QualityReviewRecord,
  type QualityScoreBreakdown,
} from "@/lib/types"
import { emptyScoreBreakdown, getRubricForReviewType } from "@/lib/quality/rubrics"

export {
  QUALITY_READINESS_LABELS,
  QUALITY_REVIEW_STATUSES,
  QUALITY_REVIEW_TYPES,
} from "@/lib/types"

export function parseQualityReviewTags(raw: string | string[] | undefined | null): string[] {
  if (Array.isArray(raw)) return raw.map((tag) => String(tag).trim()).filter(Boolean)
  return parseJsonStringArray(raw ?? "[]", [])
}

export function tagsFromInput(input: string): string[] {
  const trimmed = input.trim()
  if (!trimmed) return []
  if (trimmed.startsWith("[")) return parseQualityReviewTags(trimmed)
  return trimmed
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export function formatQualityReviewTags(tags: string[]): string {
  return tags.filter(Boolean).join(", ")
}

function pickReviewType(value: string | undefined): string {
  const trimmed = (value ?? "").trim()
  if (QUALITY_REVIEW_TYPES.includes(trimmed as (typeof QUALITY_REVIEW_TYPES)[number])) {
    return trimmed
  }
  return "Other"
}

function pickReviewStatus(value: string | undefined): string {
  const trimmed = (value ?? "").trim()
  if (QUALITY_REVIEW_STATUSES.includes(trimmed as (typeof QUALITY_REVIEW_STATUSES)[number])) {
    return trimmed
  }
  return "Draft"
}

function pickReadinessLabel(value: string | undefined): string {
  const trimmed = (value ?? "").trim()
  if (QUALITY_READINESS_LABELS.includes(trimmed as (typeof QUALITY_READINESS_LABELS)[number])) {
    return trimmed
  }
  return ""
}

export function parseScoreBreakdown(
  raw: unknown,
  reviewType = "Other",
): QualityScoreBreakdown {
  const fallback = emptyScoreBreakdown(reviewType)
  const parsed = safeJsonParse<Partial<QualityScoreBreakdown>>(raw, fallback)

  if (!parsed || typeof parsed !== "object") {
    return { rubricVersion: fallback.rubricVersion, criteria: fallback.criteria }
  }

  const rubric = getRubricForReviewType(reviewType)
  const criteriaInput = Array.isArray(parsed.criteria) ? parsed.criteria : []
  const criteriaMap = new Map(criteriaInput.map((item) => [item.key, item]))

  const criteria = rubric.criteria.map((criterion) => {
    const existing = criteriaMap.get(criterion.key)
    const score = Math.max(
      0,
      Math.min(criterion.maxScore, Number(existing?.score ?? 0) || 0),
    )
    return {
      key: criterion.key,
      label: criterion.label,
      description: criterion.description,
      maxScore: criterion.maxScore,
      guidance: criterion.guidance,
      score,
      notes: String(existing?.notes ?? "").trim(),
      whyNotes: String(existing?.whyNotes ?? "").trim(),
    }
  })

  return {
    rubricVersion: String(parsed.rubricVersion ?? rubric.version),
    criteria,
  }
}

export function calculateOverallScore(breakdown: QualityScoreBreakdown): number {
  if (!breakdown.criteria.length) return 0
  const totalMax = breakdown.criteria.reduce((sum, item) => sum + item.maxScore, 0)
  if (totalMax <= 0) return 0
  const totalScore = breakdown.criteria.reduce((sum, item) => sum + item.score, 0)
  return Math.round((totalScore / totalMax) * 100)
}

export function readinessLabelFromScore(
  overallScore: number,
  reviewType: string,
): string {
  if (overallScore <= 39) return "Needs work"
  if (overallScore <= 64) return "Solid draft"
  if (overallScore <= 79) return "Strong"
  if (
    reviewType === "Thumbnail" ||
    reviewType === "Thumbnail Text" ||
    reviewType === "Experiment Variant" ||
    reviewType === "YouTube Title"
  ) {
    return "Test-worthy"
  }
  return "Ready to publish"
}

export function normalizeQualityReviewRecord(
  input: Partial<QualityReviewRecord> & { id: string },
): QualityReviewRecord {
  const reviewType = pickReviewType(input.reviewType)
  const tags = parseQualityReviewTags(input.tags as string | string[] | undefined)
  const scoreBreakdown = parseScoreBreakdown(input.scoreBreakdown, reviewType)
  const overallScore =
    typeof input.overallScore === "number" && input.overallScore >= 0
      ? Math.min(100, Math.round(input.overallScore))
      : calculateOverallScore(scoreBreakdown)
  const now = Date.now()

  return {
    id: input.id,
    reviewName: (input.reviewName ?? "").trim(),
    reviewType,
    status: pickReviewStatus(input.status),
    campaignId: (input.campaignId ?? "").trim(),
    campaignName: (input.campaignName ?? "").trim(),
    artistName: (input.artistName ?? "").trim(),
    songTitle: (input.songTitle ?? "").trim(),
    productName: (input.productName ?? "").trim(),
    sourceRecordType: (input.sourceRecordType ?? "").trim(),
    sourceRecordId: (input.sourceRecordId ?? "").trim(),
    sourcePromptRunId: (input.sourcePromptRunId ?? "").trim(),
    sourceExperimentId: (input.sourceExperimentId ?? "").trim(),
    platform: (input.platform ?? "").trim(),
    rubricVersion: (input.rubricVersion ?? scoreBreakdown.rubricVersion).trim(),
    overallScore,
    scoreBreakdown,
    strengths: (input.strengths ?? "").trim(),
    weaknesses: (input.weaknesses ?? "").trim(),
    improvementIdeas: (input.improvementIdeas ?? "").trim(),
    recommendedActions: (input.recommendedActions ?? "").trim(),
    readinessLabel:
      pickReadinessLabel(input.readinessLabel) ||
      readinessLabelFromScore(overallScore, reviewType),
    reviewerNotes: (input.reviewerNotes ?? "").trim(),
    tags,
    createdAt: typeof input.createdAt === "number" ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === "number" ? input.updatedAt : now,
  }
}

export function emptyQualityReviewForm(reviewType = "Other"): QualityReviewFormValues {
  const breakdown = emptyScoreBreakdown(reviewType)
  return {
    reviewName: "",
    reviewType,
    status: "Draft",
    campaignId: "",
    campaignName: "",
    artistName: "",
    songTitle: "",
    productName: "",
    sourceRecordType: "",
    sourceRecordId: "",
    sourcePromptRunId: "",
    sourceExperimentId: "",
    platform: "",
    rubricVersion: breakdown.rubricVersion,
    overallScore: 0,
    scoreBreakdown: breakdown,
    strengths: "",
    weaknesses: "",
    improvementIdeas: "",
    recommendedActions: "",
    readinessLabel: "",
    reviewerNotes: "",
    tags: "",
  }
}

export function qualityReviewFormFromRecord(record: QualityReviewRecord): QualityReviewFormValues {
  return {
    reviewName: record.reviewName,
    reviewType: record.reviewType,
    status: record.status,
    campaignId: record.campaignId,
    campaignName: record.campaignName,
    artistName: record.artistName,
    songTitle: record.songTitle,
    productName: record.productName,
    sourceRecordType: record.sourceRecordType,
    sourceRecordId: record.sourceRecordId,
    sourcePromptRunId: record.sourcePromptRunId,
    sourceExperimentId: record.sourceExperimentId,
    platform: record.platform,
    rubricVersion: record.rubricVersion,
    overallScore: record.overallScore,
    scoreBreakdown: record.scoreBreakdown,
    strengths: record.strengths,
    weaknesses: record.weaknesses,
    improvementIdeas: record.improvementIdeas,
    recommendedActions: record.recommendedActions,
    readinessLabel: record.readinessLabel,
    reviewerNotes: record.reviewerNotes,
    tags: formatQualityReviewTags(record.tags),
  }
}

export function recordFromQualityReviewForm(
  form: QualityReviewFormValues,
  id: string,
  timestamps?: { createdAt?: number; updatedAt?: number },
): QualityReviewRecord {
  const breakdown = parseScoreBreakdown(form.scoreBreakdown, form.reviewType)
  const overallScore = calculateOverallScore(breakdown)
  return normalizeQualityReviewRecord({
    id,
    reviewName: form.reviewName,
    reviewType: form.reviewType,
    status: form.status,
    campaignId: form.campaignId,
    campaignName: form.campaignName,
    artistName: form.artistName,
    songTitle: form.songTitle,
    productName: form.productName,
    sourceRecordType: form.sourceRecordType,
    sourceRecordId: form.sourceRecordId,
    sourcePromptRunId: form.sourcePromptRunId,
    sourceExperimentId: form.sourceExperimentId,
    platform: form.platform,
    rubricVersion: form.rubricVersion || breakdown.rubricVersion,
    overallScore,
    scoreBreakdown: breakdown,
    strengths: form.strengths,
    weaknesses: form.weaknesses,
    improvementIdeas: form.improvementIdeas,
    recommendedActions: form.recommendedActions,
    readinessLabel:
      form.readinessLabel || readinessLabelFromScore(overallScore, form.reviewType),
    reviewerNotes: form.reviewerNotes,
    tags: tagsFromInput(form.tags),
    createdAt: timestamps?.createdAt,
    updatedAt: timestamps?.updatedAt ?? Date.now(),
  })
}

export function filterQualityReviewsForCampaign(
  reviews: QualityReviewRecord[],
  campaignId: string,
  campaignName?: string,
): QualityReviewRecord[] {
  const id = campaignId.trim()
  const name = (campaignName ?? "").trim().toLowerCase()
  return reviews.filter((review) => {
    if (id && review.campaignId === id) return true
    if (name && review.campaignName.trim().toLowerCase() === name) return true
    return false
  })
}

export function filterQualityReviewsForSource(
  reviews: QualityReviewRecord[],
  sourceRecordType: string,
  sourceRecordId: string,
): QualityReviewRecord[] {
  const type = sourceRecordType.trim()
  const id = sourceRecordId.trim()
  if (!type || !id) return []
  return reviews.filter(
    (review) => review.sourceRecordType === type && review.sourceRecordId === id,
  )
}

export function scoreColorClass(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400"
  if (score >= 65) return "text-sky-600 dark:text-sky-400"
  if (score >= 40) return "text-amber-600 dark:text-amber-400"
  return "text-rose-600 dark:text-rose-400"
}
