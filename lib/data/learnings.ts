import { normalizeLearningRecord, parseLearningTags } from "@/lib/learnings"
import type { LearningRecord } from "@/lib/types"
import type { Learning as PrismaLearning } from "@/lib/generated/prisma/client"

export { normalizeLearningRecord } from "@/lib/learnings"

export function learningToPrismaCreate(record: LearningRecord) {
  const normalized = normalizeLearningRecord(record)
  return {
    id: normalized.id,
    title: normalized.title,
    learningType: normalized.learningType,
    category: normalized.category,
    confidence: normalized.confidence,
    impact: normalized.impact,
    status: normalized.status,
    campaignId: normalized.campaignId,
    campaignName: normalized.campaignName,
    artistName: normalized.artistName,
    songTitle: normalized.songTitle,
    productName: normalized.productName,
    platform: normalized.platform,
    sourceType: normalized.sourceType,
    sourceId: normalized.sourceId,
    analyticsRecordId: normalized.analyticsRecordId,
    experimentId: normalized.experimentId,
    qualityReviewId: normalized.qualityReviewId,
    assetId: normalized.assetId,
    promptRunId: normalized.promptRunId,
    playbookId: normalized.playbookId,
    insight: normalized.insight,
    evidence: normalized.evidence,
    recommendation: normalized.recommendation,
    repeatWhen: normalized.repeatWhen,
    avoidWhen: normalized.avoidWhen,
    tags: JSON.stringify(normalized.tags),
    notes: normalized.notes,
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function learningToPrismaUpdate(record: LearningRecord) {
  const normalized = normalizeLearningRecord(record)
  return {
    title: normalized.title,
    learningType: normalized.learningType,
    category: normalized.category,
    confidence: normalized.confidence,
    impact: normalized.impact,
    status: normalized.status,
    campaignId: normalized.campaignId,
    campaignName: normalized.campaignName,
    artistName: normalized.artistName,
    songTitle: normalized.songTitle,
    productName: normalized.productName,
    platform: normalized.platform,
    sourceType: normalized.sourceType,
    sourceId: normalized.sourceId,
    analyticsRecordId: normalized.analyticsRecordId,
    experimentId: normalized.experimentId,
    qualityReviewId: normalized.qualityReviewId,
    assetId: normalized.assetId,
    promptRunId: normalized.promptRunId,
    playbookId: normalized.playbookId,
    insight: normalized.insight,
    evidence: normalized.evidence,
    recommendation: normalized.recommendation,
    repeatWhen: normalized.repeatWhen,
    avoidWhen: normalized.avoidWhen,
    tags: JSON.stringify(normalized.tags),
    notes: normalized.notes,
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function prismaLearningToRecord(row: PrismaLearning): LearningRecord {
  return normalizeLearningRecord({
    id: row.id,
    title: row.title,
    learningType: row.learningType,
    category: row.category,
    confidence: row.confidence,
    impact: row.impact,
    status: row.status,
    campaignId: row.campaignId,
    campaignName: row.campaignName,
    artistName: row.artistName,
    songTitle: row.songTitle,
    productName: row.productName,
    platform: row.platform,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    analyticsRecordId: row.analyticsRecordId,
    experimentId: row.experimentId,
    qualityReviewId: row.qualityReviewId,
    assetId: row.assetId,
    promptRunId: row.promptRunId,
    playbookId: row.playbookId,
    insight: row.insight,
    evidence: row.evidence,
    recommendation: row.recommendation,
    repeatWhen: row.repeatWhen,
    avoidWhen: row.avoidWhen,
    tags: parseLearningTags(row.tags),
    notes: row.notes,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}
