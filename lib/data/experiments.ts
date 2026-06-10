import { normalizeExperimentRecord } from "@/lib/experiments"
import type { ExperimentRecord } from "@/lib/types"
import type { Experiment as PrismaExperiment } from "@/lib/generated/prisma/client"

export { normalizeExperimentRecord } from "@/lib/experiments"

export function experimentToPrismaCreate(record: ExperimentRecord) {
  const normalized = normalizeExperimentRecord(record)
  return {
    id: normalized.id,
    campaignId: normalized.campaignId,
    campaignName: normalized.campaignName,
    experimentName: normalized.experimentName,
    experimentType: normalized.experimentType,
    status: normalized.status,
    platform: normalized.platform,
    hypothesis: normalized.hypothesis,
    variantA: normalized.variantA,
    variantB: normalized.variantB,
    variantC: normalized.variantC,
    winner: normalized.winner,
    resultSummary: normalized.resultSummary,
    metricFocus: normalized.metricFocus,
    startDate: normalized.startDate,
    endDate: normalized.endDate,
    notes: normalized.notes,
    whatWorked: normalized.whatWorked,
    whatDidNotWork: normalized.whatDidNotWork,
    nextTestIdea: normalized.nextTestIdea,
    relatedAnalyticsNotes: normalized.relatedAnalyticsNotes,
    variantAMetric: normalized.variantAMetric,
    variantBMetric: normalized.variantBMetric,
    variantCMetric: normalized.variantCMetric,
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function experimentToPrismaUpdate(record: ExperimentRecord) {
  const normalized = normalizeExperimentRecord(record)
  return {
    campaignId: normalized.campaignId,
    campaignName: normalized.campaignName,
    experimentName: normalized.experimentName,
    experimentType: normalized.experimentType,
    status: normalized.status,
    platform: normalized.platform,
    hypothesis: normalized.hypothesis,
    variantA: normalized.variantA,
    variantB: normalized.variantB,
    variantC: normalized.variantC,
    winner: normalized.winner,
    resultSummary: normalized.resultSummary,
    metricFocus: normalized.metricFocus,
    startDate: normalized.startDate,
    endDate: normalized.endDate,
    notes: normalized.notes,
    whatWorked: normalized.whatWorked,
    whatDidNotWork: normalized.whatDidNotWork,
    nextTestIdea: normalized.nextTestIdea,
    relatedAnalyticsNotes: normalized.relatedAnalyticsNotes,
    variantAMetric: normalized.variantAMetric,
    variantBMetric: normalized.variantBMetric,
    variantCMetric: normalized.variantCMetric,
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function prismaExperimentToExperimentRecord(
  row: PrismaExperiment,
): ExperimentRecord {
  return normalizeExperimentRecord({
    id: row.id,
    campaignId: row.campaignId,
    campaignName: row.campaignName,
    experimentName: row.experimentName,
    experimentType: row.experimentType,
    status: row.status,
    platform: row.platform,
    hypothesis: row.hypothesis,
    variantA: row.variantA,
    variantB: row.variantB,
    variantC: row.variantC,
    winner: row.winner,
    resultSummary: row.resultSummary,
    metricFocus: row.metricFocus,
    startDate: row.startDate,
    endDate: row.endDate,
    notes: row.notes,
    whatWorked: row.whatWorked,
    whatDidNotWork: row.whatDidNotWork,
    nextTestIdea: row.nextTestIdea,
    relatedAnalyticsNotes: row.relatedAnalyticsNotes,
    variantAMetric: row.variantAMetric,
    variantBMetric: row.variantBMetric,
    variantCMetric: row.variantCMetric,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}
