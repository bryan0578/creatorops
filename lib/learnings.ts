import { parseJsonStringArray } from "@/lib/safe-json"
import {
  LEARNING_CATEGORIES,
  LEARNING_CONFIDENCE_LEVELS,
  LEARNING_IMPACT_LEVELS,
  LEARNING_STATUSES,
  LEARNING_TYPES,
  type GetReusableLearningsInput,
  type LearningFormValues,
  type LearningRecord,
} from "@/lib/types"

export {
  LEARNING_CATEGORIES,
  LEARNING_CONFIDENCE_LEVELS,
  LEARNING_IMPACT_LEVELS,
  LEARNING_STATUSES,
  LEARNING_TYPES,
} from "@/lib/types"

export function parseLearningTags(raw: string | string[] | undefined | null): string[] {
  if (Array.isArray(raw)) return raw.map((tag) => String(tag).trim()).filter(Boolean)
  return parseJsonStringArray(raw ?? "[]", [])
}

export function formatLearningTags(tags: string[]): string {
  return tags.filter(Boolean).join(", ")
}

export function tagsFromInput(input: string): string[] {
  const trimmed = input.trim()
  if (!trimmed) return []
  if (trimmed.startsWith("[")) return parseLearningTags(trimmed)
  return trimmed
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function pickOption<T extends string>(value: string | undefined, options: readonly T[], fallback: T): T {
  const trimmed = (value ?? "").trim()
  if (options.includes(trimmed as T)) return trimmed as T
  return fallback
}

export function emptyLearningForm(learningType = "Other"): LearningFormValues {
  return {
    title: "",
    learningType: pickOption(learningType, LEARNING_TYPES, "Other"),
    category: "",
    confidence: "Medium",
    impact: "Unknown",
    status: "Active",
    campaignId: "",
    campaignName: "",
    artistName: "",
    songTitle: "",
    productName: "",
    platform: "",
    sourceType: "",
    sourceId: "",
    analyticsRecordId: "",
    experimentId: "",
    qualityReviewId: "",
    assetId: "",
    promptRunId: "",
    playbookId: "",
    insight: "",
    evidence: "",
    recommendation: "",
    repeatWhen: "",
    avoidWhen: "",
    tags: "",
    notes: "",
  }
}

export function normalizeLearningRecord(
  input: Partial<LearningRecord> & { id: string },
): LearningRecord {
  const tags = Array.isArray(input.tags)
    ? input.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : parseLearningTags(input.tags as string | undefined)

  return {
    id: input.id,
    title: (input.title ?? "").trim(),
    learningType: pickOption(input.learningType, LEARNING_TYPES, "Other"),
    category: (() => {
      const trimmed = (input.category ?? "").trim()
      return LEARNING_CATEGORIES.includes(trimmed as (typeof LEARNING_CATEGORIES)[number])
        ? trimmed
        : trimmed
    })(),
    confidence: pickOption(input.confidence, LEARNING_CONFIDENCE_LEVELS, "Medium"),
    impact: pickOption(input.impact, LEARNING_IMPACT_LEVELS, "Unknown"),
    status: pickOption(input.status, LEARNING_STATUSES, "Active"),
    campaignId: (input.campaignId ?? "").trim(),
    campaignName: (input.campaignName ?? "").trim(),
    artistName: (input.artistName ?? "").trim(),
    songTitle: (input.songTitle ?? "").trim(),
    productName: (input.productName ?? "").trim(),
    platform: (input.platform ?? "").trim(),
    sourceType: (input.sourceType ?? "").trim(),
    sourceId: (input.sourceId ?? "").trim(),
    analyticsRecordId: (input.analyticsRecordId ?? "").trim(),
    experimentId: (input.experimentId ?? "").trim(),
    qualityReviewId: (input.qualityReviewId ?? "").trim(),
    assetId: (input.assetId ?? "").trim(),
    promptRunId: (input.promptRunId ?? "").trim(),
    playbookId: (input.playbookId ?? "").trim(),
    insight: (input.insight ?? "").trim(),
    evidence: (input.evidence ?? "").trim(),
    recommendation: (input.recommendation ?? "").trim(),
    repeatWhen: (input.repeatWhen ?? "").trim(),
    avoidWhen: (input.avoidWhen ?? "").trim(),
    tags,
    notes: (input.notes ?? "").trim(),
    createdAt: input.createdAt ?? Date.now(),
    updatedAt: input.updatedAt ?? Date.now(),
  }
}

export function learningFormFromRecord(record: LearningRecord): LearningFormValues {
  const normalized = normalizeLearningRecord(record)
  return {
    ...normalized,
    tags: formatLearningTags(normalized.tags),
  }
}

export function recordFromLearningForm(
  form: LearningFormValues,
  id: string,
  timestamps?: { createdAt?: number; updatedAt?: number },
): LearningRecord {
  return normalizeLearningRecord({
    ...form,
    id,
    tags: tagsFromInput(form.tags),
    createdAt: timestamps?.createdAt,
    updatedAt: timestamps?.updatedAt ?? Date.now(),
  })
}

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase()
}

export function filterLearningsForCampaign(
  learnings: LearningRecord[],
  campaignId: string,
  campaignName?: string,
): LearningRecord[] {
  const id = campaignId.trim()
  const name = norm(campaignName)
  return learnings.filter((learning) => {
    if (id && learning.campaignId === id) return true
    if (name && norm(learning.campaignName) === name) return true
    return false
  })
}

export function filterReusableLearnings(
  learnings: LearningRecord[],
  input: GetReusableLearningsInput = {},
): LearningRecord[] {
  const limit = input.limit ?? 12
  const campaignId = input.campaignId?.trim()
  const campaignName = norm(input.campaignName)
  const artistName = norm(input.artistName)
  const learningType = input.learningType?.trim()
  const platform = norm(input.platform)

  const scored = learnings
    .filter((learning) => learning.status === "Active" || learning.status === "Validated")
    .filter((learning) => {
      if (campaignId && learning.campaignId && learning.campaignId !== campaignId) return false
      if (campaignName && learning.campaignName && norm(learning.campaignName) !== campaignName) {
        return false
      }
      if (artistName && learning.artistName && norm(learning.artistName) !== artistName) {
        return false
      }
      if (learningType && learning.learningType !== learningType) return false
      if (platform && learning.platform && norm(learning.platform) !== platform) return false
      return true
    })
    .map((learning) => {
      let score = 0
      if (learning.confidence === "High") score += 3
      else if (learning.confidence === "Medium") score += 2
      else score += 1
      if (learning.impact === "High") score += 3
      else if (learning.impact === "Medium") score += 2
      else if (learning.impact === "Low") score += 1
      if (learning.category === "Win" || learning.category === "Repeatable Tactic") score += 2
      if (learning.category === "Warning" || learning.category === "Avoid") score += 1
      return { learning, score }
    })
    .sort((a, b) => b.score - a.score || b.learning.updatedAt - a.learning.updatedAt)

  return scored.slice(0, limit).map((item) => item.learning)
}

export const LEARNING_PATTERN_GROUPS = [
  { id: "high-impact-wins", label: "High impact wins", filter: (l: LearningRecord) => l.category === "Win" && (l.impact === "High" || l.impact === "Medium") },
  { id: "repeated-warnings", label: "Repeated warnings", filter: (l: LearningRecord) => l.category === "Warning" || l.category === "Avoid" },
  { id: "thumbnail", label: "Thumbnail learnings", filter: (l: LearningRecord) => ["Thumbnail", "Thumbnail Text"].includes(l.learningType) },
  { id: "youtube-title", label: "YouTube title learnings", filter: (l: LearningRecord) => ["YouTube Title", "YouTube Description", "Pinned Comment"].includes(l.learningType) },
  { id: "social-shorts", label: "Social/Shorts learnings", filter: (l: LearningRecord) => ["Social Caption", "Shorts Hook"].includes(l.learningType) },
  { id: "email", label: "Email learnings", filter: (l: LearningRecord) => l.learningType === "Email Subject" },
  { id: "merch-product", label: "Merch/Product learnings", filter: (l: LearningRecord) => ["Merch Copy", "Product Listing", "Visual Style"].includes(l.learningType) },
  { id: "prompt-pattern", label: "Prompt pattern learnings", filter: (l: LearningRecord) => ["Prompt Pattern", "Playbook Insight", "Quality Review", "Analytics Review", "Experiment Result"].includes(l.learningType) },
] as const

export function learningTypeFromExperimentType(experimentType: string): string {
  const type = experimentType.trim()
  if (type === "YouTube Title") return "YouTube Title"
  if (type === "Thumbnail" || type === "Thumbnail Text") return "Thumbnail Text"
  if (type === "Email Subject") return "Email Subject"
  if (type === "Social Caption") return "Social Caption"
  return "Experiment Result"
}

export function learningTypeFromQualityReviewType(reviewType: string): string {
  const type = reviewType.trim()
  if (type === "YouTube Package" || type === "YouTube Title") return "YouTube Title"
  if (type === "Thumbnail" || type === "Thumbnail Prompt") return "Thumbnail"
  if (type === "Thumbnail Text") return "Thumbnail Text"
  if (type === "Social Caption") return "Social Caption"
  if (type === "Email Campaign" || type === "Email Subject") return "Email Subject"
  if (type === "Merch Concept") return "Merch Copy"
  if (type === "Product Listing") return "Product Listing"
  if (type === "Mockup Prompt") return "Visual Style"
  if (type === "Campaign Readiness") return "Campaign Strategy"
  if (type === "Prompt Quality") return "Prompt Pattern"
  if (type === "Experiment Variant") return "Experiment Result"
  return "Quality Review"
}
