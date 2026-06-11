import {
  buildMatchedQualityPerformanceRecords,
  computeDatasetPerformanceBaseline,
  filterMatches,
  type QualityPerformanceDataset,
} from "@/lib/quality-performance/correlation"
import { evidenceItem, relatedRecord } from "@/lib/quality-performance/evidence"
import {
  average,
  buildInsightId,
  confidenceFromSample,
  isEarlySignal,
  isHighQuality,
  isLowQuality,
  meetsMinConfidence,
  qualityBucket,
  scoreFromInsight,
  titleSimilarity,
} from "@/lib/quality-performance/scoring"
import type {
  MatchedQualityPerformanceRecord,
  QualityPerformanceAction,
  QualityPerformanceAnalyzeInput,
  QualityPerformanceCategory,
  QualityPerformanceInsight,
  QualityPerformanceSummary,
} from "@/lib/quality-performance/types"
import type { LearningRecord } from "@/lib/types"

function categoryFromReviewType(reviewType: string): QualityPerformanceCategory {
  const type = reviewType.toLowerCase()
  if (type.includes("thumbnail")) return "Thumbnail"
  if (type.includes("youtube")) return "YouTube"
  if (type.includes("campaign")) return "Campaign"
  if (type.includes("product") || type.includes("merch")) return "Product"
  if (type.includes("social")) return "Social"
  if (type.includes("email")) return "Email"
  if (type.includes("prompt")) return "Prompt"
  return "Operations"
}

function defaultActions(insight: Pick<QualityPerformanceInsight, "id" | "insightType">): QualityPerformanceAction[] {
  return [
    { id: `${insight.id}:learning`, label: "Create Learning", actionType: "create-learning" },
    { id: `${insight.id}:experiment`, label: "Create Experiment", actionType: "create-experiment" },
    {
      id: `${insight.id}:quality`,
      label: "Open Quality Review",
      actionType: "navigate",
      href: "/quality",
    },
    {
      id: `${insight.id}:patterns`,
      label: "Open Pattern Detection",
      actionType: "navigate",
      href: "/patterns",
    },
    {
      id: `${insight.id}:playbook`,
      label: "Suggest Playbook Update",
      actionType: "playbook",
      href: "/playbooks",
    },
  ]
}

function buildInsight(
  partial: Omit<QualityPerformanceInsight, "actions"> & { actions?: QualityPerformanceAction[] },
): QualityPerformanceInsight {
  return {
    ...partial,
    actions: partial.actions ?? defaultActions(partial),
  }
}


function repeatedCriteriaTerms(
  matches: MatchedQualityPerformanceRecord[],
  mode: "low" | "high",
): Array<{ label: string; count: number; avgScore: number }> {
  const map = new Map<string, { count: number; total: number }>()
  for (const match of matches) {
    const criteria = match.qualityReview.scoreBreakdown?.criteria ?? []
    for (const item of criteria) {
      if (!item?.label) continue
      const ratio = item.maxScore > 0 ? item.score / item.maxScore : 0
      const isLow = ratio < 0.6
      const isHigh = ratio >= 0.85
      if (mode === "low" && !isLow) continue
      if (mode === "high" && !isHigh) continue
      const key = item.label.trim()
      const existing = map.get(key) ?? { count: 0, total: 0 }
      existing.count += 1
      existing.total += item.score
      map.set(key, existing)
    }
  }
  return [...map.entries()]
    .map(([label, data]) => ({
      label,
      count: data.count,
      avgScore: data.count > 0 ? data.total / data.count : 0,
    }))
    .filter((item) => item.count >= 2)
    .sort((a, b) => b.count - a.count)
}

function hasLearningForMatch(
  match: MatchedQualityPerformanceRecord,
  learnings: LearningRecord[],
): boolean {
  const reviewId = match.qualityReview.id
  const analyticsId = match.analytics?.id
  return learnings.some(
    (learning) =>
      learning.qualityReviewId === reviewId ||
      (analyticsId && learning.analyticsRecordId === analyticsId) ||
      (learning.sourceType === "quality-review" && learning.sourceId === reviewId),
  )
}

function detectQualityScorePerformanceSignals(
  matches: MatchedQualityPerformanceRecord[],
): QualityPerformanceInsight[] {
  const insights: QualityPerformanceInsight[] = []
  const withPerformance = matches.filter((match) => match.performanceValue > 0)
  if (withPerformance.length < 2) return insights

  const highGroup = withPerformance.filter((match) => isHighQuality(match.qualityReview.overallScore))
  const lowGroup = withPerformance.filter((match) => isLowQuality(match.qualityReview.overallScore))
  if (highGroup.length === 0 || lowGroup.length === 0) return insights

  const highAvg = average(highGroup.map((match) => match.performanceValue))
  const lowAvg = average(lowGroup.map((match) => match.performanceValue))
  if (highAvg <= lowAvg) return insights

  const metricGap =
    lowAvg > 0 ? ((highAvg - lowAvg) / lowAvg) * 100 : highAvg > 0 ? 100 : 0
  const sampleSize = highGroup.length + lowGroup.length
  const confidence = confidenceFromSample({ sampleSize, metricGap })
  const earlySignal = isEarlySignal(sampleSize, confidence)
  const metric = highGroup[0]?.performanceMetric ?? "views"

  insights.push(
    buildInsight({
      id: buildInsightId(["quality-score-performance", metric]),
      title: `Higher quality scores associated with stronger ${metric}`,
      insightType: "quality-score-performance",
      category: categoryFromReviewType(highGroup[0]?.qualityReview.reviewType ?? ""),
      confidence,
      score: scoreFromInsight({ sampleSize, metricGap }),
      sampleSize,
      qualityScore: average(highGroup.map((match) => match.qualityReview.overallScore)),
      performanceMetric: metric,
      performanceValue: highAvg,
      summary: earlySignal
        ? `Early signal: records scoring 75+ average ${Math.round(highAvg)} ${metric} vs ${Math.round(lowAvg)} for lower-scoring records (${sampleSize} matched).`
        : `Records with quality scores 75+ average ${Math.round(highAvg)} ${metric}, compared with ${Math.round(lowAvg)} for scores below 60 (${sampleSize} matched records).`,
      evidence: [
        evidenceItem("High-quality group", `${highGroup.length} records`, "quality-review"),
        evidenceItem("Low-quality group", `${lowGroup.length} records`, "quality-review"),
        evidenceItem(`Avg ${metric} (high quality)`, String(Math.round(highAvg))),
        evidenceItem(`Avg ${metric} (low quality)`, String(Math.round(lowAvg))),
      ],
      recommendation: earlySignal
        ? "Validate with more reviews and analytics before changing your launch playbook."
        : "Prioritize the rubric criteria that high-scoring records share and capture a learning from this signal.",
      earlySignal,
    }),
  )

  return insights
}

function detectOutliers(
  matches: MatchedQualityPerformanceRecord[],
  baseline: { avgViews: number; avgEngagement: number; avgQuality: number },
): QualityPerformanceInsight[] {
  const insights: QualityPerformanceInsight[] = []

  for (const match of matches) {
    const review = match.qualityReview
    const score = review.overallScore
    const perf = match.performanceValue
    const metric = match.performanceMetric
    const baselinePerf =
      metric === "engagement" || metric === "engagementRate"
        ? baseline.avgEngagement
        : baseline.avgViews

    const highQuality = isHighQuality(score)
    const lowQuality = isLowQuality(score)
    const strongPerf = baselinePerf > 0 ? perf >= baselinePerf * 1.15 : perf > 0 && score >= 75
    const weakPerf = baselinePerf > 0 ? perf > 0 && perf < baselinePerf * 0.6 : perf === 0 && score >= 75

    if (highQuality && weakPerf) {
      const sampleSize = 1
      const confidence = confidenceFromSample({ sampleSize })
      insights.push(
        buildInsight({
          id: buildInsightId(["high-quality-low-performance", review.id]),
          title: `${review.reviewName || "Review"} scored high but underperformed`,
          insightType: "high-quality-low-performance",
          category: categoryFromReviewType(review.reviewType),
          confidence,
          score: scoreFromInsight({ sampleSize, metricGap: 20 }),
          sampleSize,
          qualityScore: score,
          performanceMetric: metric,
          performanceValue: perf,
          summary: `"${review.reviewName}" scored ${score} (${qualityBucket(score)}) but ${metric} is ${Math.round(perf)}. Distribution, timing, or audience fit may be the issue rather than packaging quality.`,
          evidence: [
            evidenceItem("Quality score", String(score), "quality-review", review.id),
            evidenceItem(metric, String(Math.round(perf)), "analytics", match.analytics?.id),
            evidenceItem("Match method", match.matchMethod),
          ],
          recommendation:
            "Review distribution, publish timing, and promotion channels. Consider an experiment on reach rather than creative quality.",
          campaignId: review.campaignId,
          campaignName: review.campaignName,
          artistName: review.artistName,
          platform: review.platform,
          reviewType: review.reviewType,
          earlySignal: true,
          relatedRecords: [
            relatedRecord("quality-review", review.id, review.reviewName || "Quality review"),
            ...(match.analytics
              ? [relatedRecord("analytics", match.analytics.id, match.analytics.itemName || "Analytics")]
              : []),
          ],
        }),
      )
    }

    if (lowQuality && strongPerf) {
      const sampleSize = 1
      insights.push(
        buildInsight({
          id: buildInsightId(["low-quality-high-performance", review.id]),
          title: `${review.reviewName || "Review"} performed well despite lower quality score`,
          insightType: "low-quality-high-performance",
          category: categoryFromReviewType(review.reviewType),
          confidence: confidenceFromSample({ sampleSize }),
          score: scoreFromInsight({ sampleSize, metricGap: 15 }),
          sampleSize,
          qualityScore: score,
          performanceMetric: metric,
          performanceValue: perf,
          summary: `"${review.reviewName}" scored ${score} but ${metric} is ${Math.round(perf)}. Review for hidden strengths worth repeating.`,
          evidence: [
            evidenceItem("Quality score", String(score), "quality-review", review.id),
            evidenceItem(metric, String(Math.round(perf)), "analytics", match.analytics?.id),
            evidenceItem("Strengths noted", review.strengths?.slice(0, 80) || "—"),
          ],
          recommendation:
            "Capture what may have worked despite the lower rubric score and validate with a follow-up quality review.",
          campaignId: review.campaignId,
          campaignName: review.campaignName,
          artistName: review.artistName,
          platform: review.platform,
          reviewType: review.reviewType,
          earlySignal: true,
          relatedRecords: [
            relatedRecord("quality-review", review.id, review.reviewName || "Quality review"),
            ...(match.analytics
              ? [relatedRecord("analytics", match.analytics.id, match.analytics.itemName || "Analytics")]
              : []),
          ],
        }),
      )
    }
  }

  return insights
}

function detectRepeatedCriteria(
  matches: MatchedQualityPerformanceRecord[],
  mode: "low" | "high",
): QualityPerformanceInsight[] {
  const perfSorted =
    mode === "low"
      ? [...matches].sort((a, b) => a.performanceValue - b.performanceValue)
      : [...matches].sort((a, b) => b.performanceValue - a.performanceValue)
  const subset = perfSorted.slice(0, Math.max(3, Math.ceil(matches.length * 0.4)))
  const repeated = repeatedCriteriaTerms(subset, mode)
  const insights: QualityPerformanceInsight[] = []

  for (const item of repeated.slice(0, 3)) {
    const sampleSize = item.count
    const confidence = confidenceFromSample({ sampleSize, repeatedCount: item.count })
    const earlySignal = isEarlySignal(sampleSize, confidence)
    insights.push(
      buildInsight({
        id: buildInsightId([
          mode === "low" ? "repeated-weakness" : "repeated-strength",
          item.label,
        ]),
        title:
          mode === "low"
            ? `Repeated weakness: ${item.label}`
            : `Repeated strength: ${item.label}`,
        insightType: mode === "low" ? "repeated-weakness" : "repeated-strength",
        category: "Operations",
        confidence,
        score: scoreFromInsight({ sampleSize, metricGap: mode === "low" ? 12 : 8 }),
        sampleSize,
        qualityScore: item.avgScore,
        summary:
          mode === "low"
            ? `${item.count} lower-performing matched records repeatedly score low on "${item.label}".`
            : `${item.count} stronger-performing matched records repeatedly score high on "${item.label}".`,
        evidence: [
          evidenceItem("Criterion", item.label),
          evidenceItem("Occurrences", String(item.count)),
          evidenceItem("Average criterion score", String(Math.round(item.avgScore))),
        ],
        recommendation:
          mode === "low"
            ? `Address "${item.label}" in your next review cycle or run an experiment to improve this area.`
            : `Add "${item.label}" guidance to your playbook and reuse in future launches.`,
        earlySignal,
      }),
    )
  }

  return insights
}

function detectGaps(
  dataset: QualityPerformanceDataset,
  matches: MatchedQualityPerformanceRecord[],
  learnings: LearningRecord[],
): QualityPerformanceInsight[] {
  const insights: QualityPerformanceInsight[] = []
  const reviewedIds = new Set(matches.map((match) => match.qualityReview.id))

  for (const analytics of dataset.analyticsRecords) {
    if (analytics.views <= 0 && analytics.likes <= 0) continue
    const hasReview = dataset.qualityReviews.some(
      (review) =>
        review.sourceRecordId === analytics.id ||
        titleSimilarity(review.songTitle, analytics.relatedSong) >= 0.6 ||
        titleSimilarity(review.reviewName, analytics.itemName) >= 0.5,
    )
    if (!hasReview) {
      insights.push(
        buildInsight({
          id: buildInsightId(["review-coverage-gap", analytics.id]),
          title: `High-performing record missing quality review: ${analytics.itemName || "Analytics"}`,
          insightType: "review-coverage-gap",
          category: "YouTube",
          confidence: confidenceFromSample({ sampleSize: 1 }),
          score: scoreFromInsight({ sampleSize: 1, metricGap: 10 }),
          sampleSize: 1,
          performanceMetric: "views",
          performanceValue: analytics.views,
          summary: `"${analytics.itemName}" has performance data (${analytics.views} views) but no matched quality review.`,
          evidence: [
            evidenceItem("Views", String(analytics.views), "analytics", analytics.id),
            evidenceItem("Platform", analytics.platform || "—"),
          ],
          recommendation: "Create a quality review for this record to compare rubric scores against performance.",
          earlySignal: true,
          relatedRecords: [
            relatedRecord("analytics", analytics.id, analytics.itemName || "Analytics record"),
          ],
        }),
      )
    }
  }

  for (const match of matches) {
    if (hasLearningForMatch(match, learnings)) continue
    if (match.performanceValue <= 0 && match.views <= 0) continue
    const review = match.qualityReview
    insights.push(
      buildInsight({
        id: buildInsightId(["learning-gap", review.id]),
        title: `Quality/performance pair has no learning: ${review.reviewName || "Review"}`,
        insightType: "learning-gap",
        category: categoryFromReviewType(review.reviewType),
        confidence: confidenceFromSample({ sampleSize: 1 }),
        score: scoreFromInsight({ sampleSize: 1 }),
        sampleSize: 1,
        qualityScore: review.overallScore,
        performanceMetric: match.performanceMetric,
        performanceValue: match.performanceValue,
        summary: `"${review.reviewName}" is matched to performance data but has no linked learning yet.`,
        evidence: [
          evidenceItem("Quality score", String(review.overallScore), "quality-review", review.id),
          evidenceItem(match.performanceMetric, String(Math.round(match.performanceValue))),
        ],
        recommendation: "Create a learning from this quality/performance signal while context is fresh.",
        campaignId: review.campaignId,
        campaignName: review.campaignName,
        reviewType: review.reviewType,
        earlySignal: true,
        relatedRecords: [
          relatedRecord("quality-review", review.id, review.reviewName || "Quality review"),
          ...(match.analytics
            ? [relatedRecord("analytics", match.analytics.id, match.analytics.itemName || "Analytics")]
            : []),
        ],
      }),
    )
  }

  for (const review of dataset.qualityReviews) {
    if (reviewedIds.has(review.id)) continue
    if (review.overallScore <= 0) continue
    insights.push(
      buildInsight({
        id: buildInsightId(["review-no-performance", review.id]),
        title: `Quality review has no linked performance: ${review.reviewName || "Review"}`,
        insightType: "review-coverage-gap",
        category: categoryFromReviewType(review.reviewType),
        confidence: confidenceFromSample({ sampleSize: 1 }),
        score: scoreFromInsight({ sampleSize: 1 }),
        sampleSize: 1,
        qualityScore: review.overallScore,
        summary: `"${review.reviewName}" (${review.overallScore}/100) has no matched analytics or video performance yet.`,
        evidence: [
          evidenceItem("Quality score", String(review.overallScore), "quality-review", review.id),
          evidenceItem("Review type", review.reviewType),
        ],
        recommendation: "Sync analytics or import YouTube stats to compare this review against real performance.",
        campaignId: review.campaignId,
        reviewType: review.reviewType,
        earlySignal: true,
        relatedRecords: [
          relatedRecord("quality-review", review.id, review.reviewName || "Quality review"),
        ],
      }),
    )
  }

  return insights
}

function detectExperimentAndPlaybookOpportunities(
  matches: MatchedQualityPerformanceRecord[],
): QualityPerformanceInsight[] {
  const insights: QualityPerformanceInsight[] = []
  const repeatedStrengths = repeatedCriteriaTerms(matches, "high")

  for (const item of repeatedStrengths.slice(0, 2)) {
    const sampleSize = item.count
    const confidence = confidenceFromSample({ sampleSize, repeatedCount: item.count })
    insights.push(
      buildInsight({
        id: buildInsightId(["experiment-opportunity", item.label]),
        title: `Experiment opportunity: test ${item.label}`,
        insightType: "experiment-opportunity",
        category: "Thumbnail",
        confidence,
        score: scoreFromInsight({ sampleSize }),
        sampleSize,
        qualityScore: item.avgScore,
        summary: `"${item.label}" appears in stronger-performing matched records. A controlled test could validate impact.`,
        evidence: [
          evidenceItem("Criterion", item.label),
          evidenceItem("Supporting records", String(item.count)),
        ],
        recommendation: `Create a ${item.label.toLowerCase().includes("thumbnail") ? "thumbnail" : "packaging"} experiment to validate this signal.`,
        earlySignal: isEarlySignal(sampleSize, confidence),
      }),
    )
  }

  if (repeatedStrengths.length >= 2) {
    const sampleSize = repeatedStrengths.reduce((sum, item) => sum + item.count, 0)
    insights.push(
      buildInsight({
        id: buildInsightId(["playbook-opportunity", "shared-criteria"]),
        title: "Winning records share repeated quality criteria",
        insightType: "playbook-opportunity",
        category: "Campaign",
        confidence: confidenceFromSample({ sampleSize, repeatedCount: repeatedStrengths.length }),
        score: scoreFromInsight({ sampleSize }),
        sampleSize,
        summary: `Top matched records repeatedly score high on: ${repeatedStrengths
          .slice(0, 3)
          .map((item) => item.label)
          .join(", ")}.`,
        evidence: repeatedStrengths.slice(0, 3).map((item) =>
          evidenceItem(item.label, `${item.count} occurrences`),
        ),
        recommendation: "Add these criteria to your launch playbook as explicit pre-publish checks.",
        earlySignal: sampleSize < 3,
      }),
    )
  }

  return insights
}

export function buildQualityPerformanceInsights(
  dataset: QualityPerformanceDataset & { learnings: LearningRecord[] },
  input: QualityPerformanceAnalyzeInput = {},
): QualityPerformanceInsight[] {
  try {
    const allMatches = buildMatchedQualityPerformanceRecords(dataset)
    const matches = filterMatches(allMatches, input)
    const baseline = computeDatasetPerformanceBaseline(matches)

    let insights: QualityPerformanceInsight[] = [
      ...detectQualityScorePerformanceSignals(matches),
      ...detectOutliers(matches, baseline),
      ...detectRepeatedCriteria(matches, "low"),
      ...detectRepeatedCriteria(matches, "high"),
      ...detectGaps(dataset, matches, dataset.learnings),
      ...detectExperimentAndPlaybookOpportunities(matches),
    ]

    if (input.minConfidence) {
      insights = insights.filter((insight) => meetsMinConfidence(insight.confidence, input.minConfidence))
    }

    if (input.campaignId) {
      insights = insights.filter(
        (insight) => !insight.campaignId || insight.campaignId === input.campaignId,
      )
    }

    return insights
      .sort((a, b) => b.score - a.score)
      .slice(0, input.limit ?? 60)
  } catch {
    return []
  }
}

export function summarizeQualityPerformance(
  insights: QualityPerformanceInsight[],
  matchedPairs: MatchedQualityPerformanceRecord[],
): QualityPerformanceSummary {
  const sorted = [...insights].sort((a, b) => b.score - a.score)
  return {
    matchedRecords: matchedPairs.length,
    averageQualityScore: average(matchedPairs.map((match) => match.qualityReview.overallScore)),
    averagePerformance: average(matchedPairs.map((match) => match.performanceValue)),
    highConfidence: insights.filter((item) => item.confidence === "high").length,
    earlySignals: insights.filter((item) => item.earlySignal).length,
    outliers: insights.filter(
      (item) =>
        item.insightType === "high-quality-low-performance" ||
        item.insightType === "low-quality-high-performance",
    ).length,
    learningGaps: insights.filter((item) => item.insightType === "learning-gap").length,
    experimentOpportunities: insights.filter(
      (item) => item.insightType === "experiment-opportunity",
    ).length,
    strongestSignal: sorted.find(
      (item) =>
        item.insightType === "quality-score-performance" && !item.earlySignal,
    ),
    topOutlier: sorted.find(
      (item) =>
        item.insightType === "high-quality-low-performance" ||
        item.insightType === "low-quality-high-performance",
    ),
  }
}

export function insightsForTab(
  insights: QualityPerformanceInsight[],
  tab: string,
): QualityPerformanceInsight[] {
  switch (tab) {
    case "youtube":
      return insights.filter(
        (item) => item.category === "YouTube" || item.reviewType?.includes("YouTube"),
      )
    case "thumbnail":
      return insights.filter(
        (item) => item.category === "Thumbnail" || item.reviewType?.includes("Thumbnail"),
      )
    case "campaign":
      return insights.filter(
        (item) => item.category === "Campaign" || item.reviewType?.includes("Campaign"),
      )
    case "product":
      return insights.filter((item) => item.category === "Product")
    case "outliers":
      return insights.filter(
        (item) =>
          item.insightType === "high-quality-low-performance" ||
          item.insightType === "low-quality-high-performance",
      )
    case "gaps":
      return insights.filter(
        (item) =>
          item.insightType === "review-coverage-gap" ||
          item.insightType === "learning-gap",
      )
    case "recommendations":
      return insights.filter(
        (item) =>
          item.insightType === "experiment-opportunity" ||
          item.insightType === "playbook-opportunity" ||
          item.insightType === "quality-score-performance",
      )
    default:
      return insights
  }
}

export type { QualityPerformanceDataset }
