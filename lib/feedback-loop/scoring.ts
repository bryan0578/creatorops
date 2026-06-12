import type { FeedbackConfidence } from "@/lib/feedback-loop/types"
import type { LearningRecord } from "@/lib/types"

export function normalizeFeedbackText(value: string | undefined | null): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function titleSimilarity(a: string, b: string): number {
  const na = normalizeFeedbackText(a)
  const nb = normalizeFeedbackText(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.85
  const aTokens = new Set(na.split(" ").filter((t) => t.length > 2))
  const bTokens = new Set(nb.split(" ").filter((t) => t.length > 2))
  if (aTokens.size === 0 || bTokens.size === 0) return 0
  let overlap = 0
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1
  }
  return overlap / Math.max(aTokens.size, bTokens.size)
}

export function confidenceFromSignal(input: {
  recordCount?: number
  strongMetric?: boolean
  completedExperiment?: boolean
  patternConfidence?: FeedbackConfidence
  qualityScore?: number
}): FeedbackConfidence {
  const { recordCount = 1, strongMetric = false, completedExperiment = false, patternConfidence, qualityScore = 0 } = input
  if (patternConfidence === "high" || recordCount >= 3 || completedExperiment || (strongMetric && recordCount >= 2)) {
    return "high"
  }
  if (patternConfidence === "medium" || recordCount >= 2 || strongMetric || qualityScore >= 75) {
    return "medium"
  }
  return "low"
}

export function scoreFromSignal(input: {
  recordCount?: number
  metricStrength?: number
  base?: number
}): number {
  const base = input.base ?? 30
  const countBonus = Math.min(40, (input.recordCount ?? 1) * 12)
  const metricBonus = Math.min(30, (input.metricStrength ?? 0) * 0.5)
  return Math.min(100, Math.round(base + countBonus + metricBonus))
}

export function buildSuggestionId(parts: string[]): string {
  return parts.filter(Boolean).join(":")
}

export function findExistingLearning(
  learnings: LearningRecord[],
  input: {
    sourceType?: string
    sourceId?: string
    analyticsRecordId?: string
    experimentId?: string
    qualityReviewId?: string
    title?: string
    campaignId?: string
    learningType?: string
  },
): LearningRecord | null {
  const sourceType = input.sourceType?.trim()
  const sourceId = input.sourceId?.trim()

  for (const learning of learnings) {
    if (sourceType && sourceId && learning.sourceType === sourceType && learning.sourceId === sourceId) {
      return learning
    }
    if (input.analyticsRecordId && learning.analyticsRecordId === input.analyticsRecordId) return learning
    if (input.experimentId && learning.experimentId === input.experimentId) return learning
    if (input.qualityReviewId && learning.qualityReviewId === input.qualityReviewId) return learning
    if (
      input.learningType &&
      learning.learningType === input.learningType &&
      input.campaignId &&
      learning.campaignId === input.campaignId
    ) {
      return learning
    }
    if (input.title && titleSimilarity(learning.title, input.title) >= 0.9) return learning
  }
  return null
}

export function safeEngagementRate(likes: number, comments: number, views: number): number {
  if (!Number.isFinite(views) || views <= 0) return 0
  return ((likes + comments) / views) * 100
}
