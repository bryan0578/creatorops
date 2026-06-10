import { normalizeQualityReviewRecord, parseScoreBreakdown } from "@/lib/quality-reviews"
import type { QualityReviewRecord } from "@/lib/types"
import type { QualityReview as PrismaQualityReview } from "@/lib/generated/prisma/client"

export { normalizeQualityReviewRecord } from "@/lib/quality-reviews"

export function qualityReviewToPrismaCreate(record: QualityReviewRecord) {
  const normalized = normalizeQualityReviewRecord(record)
  return {
    id: normalized.id,
    reviewName: normalized.reviewName,
    reviewType: normalized.reviewType,
    status: normalized.status,
    campaignId: normalized.campaignId,
    campaignName: normalized.campaignName,
    artistName: normalized.artistName,
    songTitle: normalized.songTitle,
    productName: normalized.productName,
    sourceRecordType: normalized.sourceRecordType,
    sourceRecordId: normalized.sourceRecordId,
    sourcePromptRunId: normalized.sourcePromptRunId,
    sourceExperimentId: normalized.sourceExperimentId,
    platform: normalized.platform,
    rubricVersion: normalized.rubricVersion,
    overallScore: normalized.overallScore,
    scoreBreakdown: JSON.stringify(normalized.scoreBreakdown),
    strengths: normalized.strengths,
    weaknesses: normalized.weaknesses,
    improvementIdeas: normalized.improvementIdeas,
    recommendedActions: normalized.recommendedActions,
    readinessLabel: normalized.readinessLabel,
    reviewerNotes: normalized.reviewerNotes,
    tags: JSON.stringify(normalized.tags),
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function qualityReviewToPrismaUpdate(record: QualityReviewRecord) {
  const normalized = normalizeQualityReviewRecord(record)
  return {
    reviewName: normalized.reviewName,
    reviewType: normalized.reviewType,
    status: normalized.status,
    campaignId: normalized.campaignId,
    campaignName: normalized.campaignName,
    artistName: normalized.artistName,
    songTitle: normalized.songTitle,
    productName: normalized.productName,
    sourceRecordType: normalized.sourceRecordType,
    sourceRecordId: normalized.sourceRecordId,
    sourcePromptRunId: normalized.sourcePromptRunId,
    sourceExperimentId: normalized.sourceExperimentId,
    platform: normalized.platform,
    rubricVersion: normalized.rubricVersion,
    overallScore: normalized.overallScore,
    scoreBreakdown: JSON.stringify(normalized.scoreBreakdown),
    strengths: normalized.strengths,
    weaknesses: normalized.weaknesses,
    improvementIdeas: normalized.improvementIdeas,
    recommendedActions: normalized.recommendedActions,
    readinessLabel: normalized.readinessLabel,
    reviewerNotes: normalized.reviewerNotes,
    tags: JSON.stringify(normalized.tags),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function prismaQualityReviewToRecord(row: PrismaQualityReview): QualityReviewRecord {
  return normalizeQualityReviewRecord({
    id: row.id,
    reviewName: row.reviewName,
    reviewType: row.reviewType,
    status: row.status,
    campaignId: row.campaignId,
    campaignName: row.campaignName,
    artistName: row.artistName,
    songTitle: row.songTitle,
    productName: row.productName,
    sourceRecordType: row.sourceRecordType,
    sourceRecordId: row.sourceRecordId,
    sourcePromptRunId: row.sourcePromptRunId,
    sourceExperimentId: row.sourceExperimentId,
    platform: row.platform,
    rubricVersion: row.rubricVersion,
    overallScore: row.overallScore,
    scoreBreakdown: parseScoreBreakdown(row.scoreBreakdown, row.reviewType),
    strengths: row.strengths,
    weaknesses: row.weaknesses,
    improvementIdeas: row.improvementIdeas,
    recommendedActions: row.recommendedActions,
    readinessLabel: row.readinessLabel,
    reviewerNotes: row.reviewerNotes,
    tags: row.tags,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}
