import type { AnalyticsRecord, ExperimentRecord } from "@/lib/types"
import { normalizeAnalyticsRecord } from "@/lib/analytics-tracker"
import { normalizeExperimentRecord } from "@/lib/experiments"

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase()
}

function matches(a: string | undefined | null, b: string | undefined | null): boolean {
  const na = norm(a)
  const nb = norm(b)
  return Boolean(na && nb && na === nb)
}

function contains(haystack: string, needle: string | undefined | null): boolean {
  const n = norm(needle)
  return Boolean(n && haystack.includes(n))
}

/** Score analytics records for linking to an experiment (higher = better match). */
export function matchAnalyticsRecordsForExperiment(
  experiment: ExperimentRecord,
  analyticsRecords: AnalyticsRecord[],
): AnalyticsRecord[] {
  const scored = analyticsRecords
    .map((record) => {
      let score = 0
      if (
        experiment.analyticsRecordId &&
        record.id === experiment.analyticsRecordId
      ) {
        score += 100
      }
      if (matches(record.relatedCampaign, experiment.campaignName)) score += 40
      if (matches(record.platform, experiment.platform)) score += 10
      const haystack = [
        record.itemName,
        record.titleUsed,
        record.thumbnailText,
        record.relatedSong,
        record.relatedArtist,
      ]
        .join(" ")
        .toLowerCase()
      if (contains(haystack, experiment.variantA)) score += 8
      if (contains(haystack, experiment.variantB)) score += 8
      if (contains(haystack, experiment.variantC)) score += 8
      if (contains(haystack, experiment.experimentName)) score += 5
      return { record, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.record.updatedAt - a.record.updatedAt)

  return scored.map((item) => item.record)
}

export function buildExperimentAnalyticsLink(
  experiment: ExperimentRecord,
  analytics: AnalyticsRecord,
): { experiment: ExperimentRecord; analytics: AnalyticsRecord } {
  const analyticsTitle =
    analytics.itemName.trim() ||
    analytics.titleUsed.trim() ||
    "Analytics record"
  const experimentTitle =
    experiment.experimentName.trim() || "Experiment"

  return {
    experiment: normalizeExperimentRecord({
      ...experiment,
      analyticsRecordId: analytics.id,
      analyticsRecordName: analyticsTitle,
    }),
    analytics: normalizeAnalyticsRecord({
      ...analytics,
      experimentId: experiment.id,
      experimentName: experimentTitle,
    }),
  }
}

export function clearExperimentAnalyticsLink(
  experiment: ExperimentRecord,
  analytics?: AnalyticsRecord | null,
): { experiment: ExperimentRecord; analytics?: AnalyticsRecord } {
  const clearedExperiment = normalizeExperimentRecord({
    ...experiment,
    analyticsRecordId: "",
    analyticsRecordName: "",
  })
  if (!analytics) {
    return { experiment: clearedExperiment }
  }
  return {
    experiment: clearedExperiment,
    analytics: normalizeAnalyticsRecord({
      ...analytics,
      experimentId: "",
      experimentName: "",
    }),
  }
}
