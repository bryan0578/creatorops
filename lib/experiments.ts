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
    analyticsRecordId: "",
    analyticsRecordName: "",
    confidenceNotes: "",
    learningSummary: "",
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
    analyticsRecordId: str(record.analyticsRecordId),
    analyticsRecordName: str(record.analyticsRecordName),
    confidenceNotes: str(record.confidenceNotes),
    learningSummary: str(record.learningSummary),
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
  experimentId?: string
  relatedCampaign?: string
  relatedArtist?: string
  relatedSong?: string
  titleUsed?: string
  itemName?: string
  platform?: string
  analyticsRecordId?: string
}): ExperimentRecord[] {
  const {
    experiments,
    experimentId,
    relatedCampaign,
    relatedArtist,
    relatedSong,
    titleUsed,
    itemName,
    platform,
    analyticsRecordId,
  } = input

  const matched = experiments.filter((experiment) => {
    if (experimentId && experiment.id === experimentId) return true
    if (
      analyticsRecordId &&
      experiment.analyticsRecordId &&
      experiment.analyticsRecordId === analyticsRecordId
    ) {
      return true
    }
    if (relatedCampaign && matches(experiment.campaignName, relatedCampaign)) {
      return true
    }
    if (platform && matches(experiment.platform, platform)) {
      const hasContext =
        relatedCampaign ||
        relatedSong ||
        titleUsed ||
        itemName ||
        relatedArtist
      if (hasContext) return true
    }
    const haystack = [
      experiment.experimentName,
      experiment.hypothesis,
      experiment.variantA,
      experiment.variantB,
      experiment.variantC,
      experiment.winner,
      experiment.learningSummary,
    ]
      .join(" ")
      .toLowerCase()

    if (relatedArtist && haystack.includes(norm(relatedArtist))) return true
    if (relatedSong && haystack.includes(norm(relatedSong))) return true
    if (titleUsed && haystack.includes(norm(titleUsed))) return true
    if (itemName && haystack.includes(norm(itemName))) return true
    return false
  })

  return sortExperiments(matched)
}

export function countRunningExperiments(experiments: ExperimentRecord[]): number {
  return experiments.filter(
    (experiment) => experiment.status === "Running" || experiment.status === "Reviewing",
  ).length
}

export function countWinnerChosenExperiments(experiments: ExperimentRecord[]): number {
  return experiments.filter((experiment) => experiment.status === "Winner Chosen").length
}

export function getExperimentsWithWinners(
  experiments: ExperimentRecord[],
): ExperimentRecord[] {
  return sortExperiments(
    experiments.filter(
      (experiment) =>
        experiment.status === "Winner Chosen" ||
        (experiment.winner.trim() && experiment.winner !== "Inconclusive"),
    ),
  )
}

export function getLatestLearningSummary(
  experiments: ExperimentRecord[],
): string {
  for (const experiment of sortExperiments(experiments)) {
    const summary = experiment.learningSummary.trim()
    if (summary) return summary
  }
  return ""
}

export function applyWinnerChoice(
  record: ExperimentRecord,
  winner: string,
): ExperimentRecord {
  const normalized = normalizeExperimentRecord({ ...record, winner })
  if (
    winner &&
    winner !== "Inconclusive" &&
    normalized.status !== "Archived"
  ) {
    return normalizeExperimentRecord({ ...normalized, status: "Winner Chosen" })
  }
  return normalized
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
