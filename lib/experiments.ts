import type { ExperimentRecord } from "@/lib/types"
import {
  EXPERIMENT_METRIC_FOCUS,
  EXPERIMENT_STATUSES,
  EXPERIMENT_TYPES,
} from "@/lib/types"

function str(value: unknown): string {
  return String(value ?? "").trim()
}

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase()
}

function matches(a: string | undefined | null, b: string | undefined | null): boolean {
  const na = norm(a)
  const nb = norm(b)
  return Boolean(na && nb && na === nb)
}

export function emptyExperimentRecord(id?: string): ExperimentRecord {
  const now = Date.now()
  return {
    id: id ?? "",
    campaignId: "",
    campaignName: "",
    experimentName: "",
    experimentType: "",
    status: "Idea",
    platform: "",
    hypothesis: "",
    variantA: "",
    variantB: "",
    variantC: "",
    winner: "",
    resultSummary: "",
    metricFocus: "",
    startDate: "",
    endDate: "",
    notes: "",
    whatWorked: "",
    whatDidNotWork: "",
    nextTestIdea: "",
    relatedAnalyticsNotes: "",
    variantAMetric: "",
    variantBMetric: "",
    variantCMetric: "",
    createdAt: now,
    updatedAt: now,
  }
}

export function normalizeExperimentRecord(
  record: Partial<ExperimentRecord> & { id: string },
): ExperimentRecord {
  const base = emptyExperimentRecord(record.id)
  const status = str(record.status)
  const experimentType = str(record.experimentType)
  const metricFocus = str(record.metricFocus)

  return {
    ...base,
    ...record,
    id: str(record.id) || base.id,
    campaignId: str(record.campaignId),
    campaignName: str(record.campaignName),
    experimentName: str(record.experimentName),
    experimentType: (EXPERIMENT_TYPES as readonly string[]).includes(experimentType)
      ? experimentType
      : experimentType,
    status: (EXPERIMENT_STATUSES as readonly string[]).includes(status)
      ? status
      : status || "Idea",
    platform: str(record.platform),
    hypothesis: str(record.hypothesis),
    variantA: str(record.variantA),
    variantB: str(record.variantB),
    variantC: str(record.variantC),
    winner: str(record.winner),
    resultSummary: str(record.resultSummary),
    metricFocus: (EXPERIMENT_METRIC_FOCUS as readonly string[]).includes(metricFocus)
      ? metricFocus
      : metricFocus,
    startDate: str(record.startDate),
    endDate: str(record.endDate),
    notes: str(record.notes),
    whatWorked: str(record.whatWorked),
    whatDidNotWork: str(record.whatDidNotWork),
    nextTestIdea: str(record.nextTestIdea),
    relatedAnalyticsNotes: str(record.relatedAnalyticsNotes),
    variantAMetric: str(record.variantAMetric),
    variantBMetric: str(record.variantBMetric),
    variantCMetric: str(record.variantCMetric),
    createdAt: Number(record.createdAt) || base.createdAt,
    updatedAt: Number(record.updatedAt) || base.updatedAt,
  }
}

export function duplicateExperimentRecord(
  record: ExperimentRecord,
  newId: string,
): ExperimentRecord {
  const now = Date.now()
  const copy = normalizeExperimentRecord(record)
  return {
    ...copy,
    id: newId,
    experimentName: copy.experimentName
      ? `${copy.experimentName} (Copy)`
      : "Untitled experiment (Copy)",
    status: copy.status === "Winner Chosen" ? "Idea" : copy.status,
    winner: "",
    resultSummary: "",
    createdAt: now,
    updatedAt: now,
  }
}

export function filterExperimentsForCampaign(
  experiments: ExperimentRecord[],
  campaignId: string,
  campaignName: string,
): ExperimentRecord[] {
  return experiments.filter(
    (experiment) =>
      (campaignId && experiment.campaignId === campaignId) ||
      matches(experiment.campaignName, campaignName),
  )
}

export function filterExperimentsForAnalytics(input: {
  experiments: ExperimentRecord[]
  relatedCampaign?: string
  relatedSong?: string
  titleUsed?: string
  itemName?: string
}): ExperimentRecord[] {
  const { experiments, relatedCampaign, relatedSong, titleUsed, itemName } = input
  return experiments.filter((experiment) => {
    if (relatedCampaign && matches(experiment.campaignName, relatedCampaign)) {
      return true
    }
    const haystack = [
      experiment.experimentName,
      experiment.hypothesis,
      experiment.variantA,
      experiment.variantB,
      experiment.variantC,
      experiment.winner,
    ]
      .join(" ")
      .toLowerCase()

    if (relatedSong && haystack.includes(norm(relatedSong))) return true
    if (titleUsed && haystack.includes(norm(titleUsed))) return true
    if (itemName && haystack.includes(norm(itemName))) return true
    return false
  })
}

export function countRunningExperiments(experiments: ExperimentRecord[]): number {
  return experiments.filter(
    (experiment) => experiment.status === "Running" || experiment.status === "Reviewing",
  ).length
}

export function sortExperiments(
  experiments: ExperimentRecord[],
  direction: "asc" | "desc" = "desc",
): ExperimentRecord[] {
  return [...experiments].sort((a, b) => {
    const delta = a.updatedAt - b.updatedAt
    return direction === "desc" ? -delta : delta
  })
}
