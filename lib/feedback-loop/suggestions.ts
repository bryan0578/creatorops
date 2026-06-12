import { buildDetectedPatterns } from "@/lib/patterns/detectors"
import type { PatternDetectionDataset } from "@/lib/patterns/detectors"
import { buildQualityPerformanceInsights } from "@/lib/quality-performance/detectors"
import type { QualityPerformanceDataset } from "@/lib/quality-performance/correlation"
import { evidenceItem, relatedRecord } from "@/lib/feedback-loop/evidence"
import {
  buildSuggestionId,
  confidenceFromSignal,
  findExistingLearning,
  safeEngagementRate,
  scoreFromSignal,
} from "@/lib/feedback-loop/scoring"
import type {
  FeedbackAction,
  FeedbackLoopInput,
  FeedbackLoopSummary,
  FeedbackSuggestion,
  FeedbackSuggestionType,
} from "@/lib/feedback-loop/types"
import { isPublishedCampaignStatus } from "@/lib/data/publishing-checklist"
import type {
  AnalyticsRecord,
  CampaignRecord,
  ExperimentRecord,
  LearningRecord,
  QualityReviewRecord,
} from "@/lib/types"

export interface FeedbackLoopDataset extends PatternDetectionDataset, QualityPerformanceDataset {
  learnings: LearningRecord[]
  externalLinks: import("@/lib/types").ExternalLinkRecord[]
}

function defaultActions(suggestion: Pick<FeedbackSuggestion, "id" | "sourceType" | "sourceId" | "campaignId">): FeedbackAction[] {
  const actions: FeedbackAction[] = [
    { id: `${suggestion.id}:learning`, label: "Create Learning", actionType: "create-learning" },
  ]
  if (suggestion.sourceType === "analytics" || suggestion.sourceType === "pattern") {
    actions.push({ id: `${suggestion.id}:experiment`, label: "Create Experiment", actionType: "create-experiment" })
  }
  actions.push(
    {
      id: `${suggestion.id}:source`,
      label: "Open Source",
      actionType: "navigate",
      href: recordHrefForSource(suggestion.sourceType, suggestion.sourceId),
    },
    {
      id: `${suggestion.id}:playbook`,
      label: "Recommend Playbook Update",
      actionType: "playbook",
      href: "/playbooks",
    },
  )
  if (suggestion.campaignId) {
    actions.push({
      id: `${suggestion.id}:campaign`,
      label: "Open Campaign",
      actionType: "navigate",
      href: `/campaigns?campaignId=${encodeURIComponent(suggestion.campaignId)}`,
    })
  }
  return actions
}

function recordHrefForSource(sourceType: string, sourceId: string): string {
  switch (sourceType) {
    case "analytics":
      return `/analytics?recordId=${encodeURIComponent(sourceId)}`
    case "experiment":
      return `/experiments?recordId=${encodeURIComponent(sourceId)}`
    case "quality-review":
      return `/quality?recordId=${encodeURIComponent(sourceId)}`
    case "campaign":
      return `/campaigns?campaignId=${encodeURIComponent(sourceId)}`
    case "pattern":
      return `/patterns`
    case "quality-performance":
      return `/quality-performance`
    case "learning":
      return `/learnings?recordId=${encodeURIComponent(sourceId)}`
    default:
      return "/feedback-loop"
  }
}

function buildSuggestion(
  partial: Omit<FeedbackSuggestion, "recommendedActions"> & { recommendedActions?: FeedbackAction[] },
): FeedbackSuggestion {
  return {
    ...partial,
    recommendedActions: partial.recommendedActions ?? defaultActions(partial),
  }
}

function analyticsCategory(record: AnalyticsRecord): string {
  if (record.views >= 1000 || record.likes >= 50) return "Insight"
  if (record.whatDidNotWork?.trim()) return "Risk"
  if (record.views === 0 && !record.notes?.trim()) return "Opportunity"
  return record.views > 0 ? "Insight" : "Opportunity"
}

function suggestAnalyticsToLearning(
  dataset: FeedbackLoopDataset,
  seen: Set<string>,
): FeedbackSuggestion[] {
  const suggestions: FeedbackSuggestion[] = []

  for (const record of dataset.analyticsRecords) {
    const existing = findExistingLearning(dataset.learnings, {
      sourceType: "analytics",
      sourceId: record.id,
      analyticsRecordId: record.id,
    })
    if (existing) continue

    const hasMetrics = record.views > 0 || record.likes > 0 || record.comments > 0
    const hasNotes = Boolean(record.whatWorked?.trim() || record.whatDidNotWork?.trim() || record.notes?.trim())
    if (!hasMetrics && !hasNotes) continue

    const id = buildSuggestionId(["analytics-to-learning", record.id])
    if (seen.has(id)) continue
    seen.add(id)

    const engagement = safeEngagementRate(record.likes, record.comments, record.views)
    const strongMetric = record.views >= 500 || record.likes >= 25
    const confidence = confidenceFromSignal({ strongMetric, recordCount: hasMetrics ? 1 : 0 })

    suggestions.push(
      buildSuggestion({
        id,
        title: `Create learning from analytics: ${record.itemName || "Analytics record"}`,
        suggestionType: "analytics-to-learning",
        confidence,
        score: scoreFromSignal({ metricStrength: record.views, recordCount: 1 }),
        sourceType: "analytics",
        sourceId: record.id,
        sourceName: record.itemName || "Analytics record",
        campaignId: "",
        campaignName: record.relatedCampaign,
        artistName: record.relatedArtist,
        platform: record.platform,
        summary: hasMetrics
          ? `"${record.itemName}" has performance data (${record.views} views, ${record.likes} likes) but no linked learning yet.`
          : `"${record.itemName}" has review notes but no learning captured yet.`,
        evidence: [
          evidenceItem("Views", String(record.views), "analytics", record.id),
          evidenceItem("Likes", String(record.likes)),
          evidenceItem("Comments", String(record.comments)),
          evidenceItem("Engagement rate", `${Math.round(engagement * 10) / 10}%`),
          evidenceItem("Platform", record.platform || "—"),
        ],
        recommendedLearning: {
          title: `Learning from ${record.itemName || "Analytics"}`,
          learningType: "Analytics Review",
          category: analyticsCategory(record),
          insight: record.whatWorked?.trim() || `Performance snapshot for ${record.itemName || "this record"}.`,
          evidence: [
            `Views: ${record.views}`,
            `Likes: ${record.likes}`,
            `Comments: ${record.comments}`,
            record.titleUsed ? `Title: ${record.titleUsed}` : "",
            record.publishDate ? `Published: ${record.publishDate}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          recommendation:
            record.nextActions?.trim() ||
            record.improvementIdeas?.trim() ||
            "Document what worked and what to repeat or avoid on the next release.",
          tags: ["feedback-loop", "analytics", record.platform?.toLowerCase() ?? "platform"].filter(Boolean),
        },
        relatedRecords: [relatedRecord("analytics", record.id, record.itemName || "Analytics")],
        supportsExperiment: record.views === 0 || Boolean(record.whatDidNotWork?.trim()),
        experimentHypothesis: "Test title or thumbnail variant to improve underperforming analytics record.",
      }),
    )
  }

  return suggestions
}

function suggestExperimentToLearning(
  dataset: FeedbackLoopDataset,
  seen: Set<string>,
): FeedbackSuggestion[] {
  const suggestions: FeedbackSuggestion[] = []
  const completedStatuses = new Set(["Winner Chosen", "Completed", "Done", "Archived"])

  for (const experiment of dataset.experiments) {
    const existing = findExistingLearning(dataset.learnings, {
      sourceType: "experiment",
      sourceId: experiment.id,
      experimentId: experiment.id,
    })
    if (existing) continue

    const isComplete =
      completedStatuses.has(experiment.status) ||
      Boolean(experiment.winner && experiment.winner !== "Inconclusive") ||
      Boolean(experiment.resultSummary?.trim() || experiment.whatWorked?.trim())

    if (!isComplete) continue

    const id = buildSuggestionId(["experiment-to-learning", experiment.id])
    if (seen.has(id)) continue
    seen.add(id)

    const hasWinner = Boolean(experiment.winner && experiment.winner !== "Inconclusive")
    const confidence = confidenceFromSignal({ completedExperiment: true, strongMetric: hasWinner })

    suggestions.push(
      buildSuggestion({
        id,
        title: `Create learning from experiment: ${experiment.experimentName || "Experiment"}`,
        suggestionType: "experiment-to-learning",
        confidence,
        score: scoreFromSignal({ recordCount: 1, metricStrength: hasWinner ? 40 : 20 }),
        sourceType: "experiment",
        sourceId: experiment.id,
        sourceName: experiment.experimentName || "Experiment",
        campaignId: experiment.campaignId,
        campaignName: experiment.campaignName,
        platform: experiment.platform,
        summary: `"${experiment.experimentName}" is complete${hasWinner ? ` with winner: ${experiment.winner}` : ""} but has no linked learning.`,
        evidence: [
          evidenceItem("Status", experiment.status),
          evidenceItem("Hypothesis", experiment.hypothesis?.slice(0, 80) || "—"),
          evidenceItem("Winner", experiment.winner || "—", "experiment", experiment.id),
          evidenceItem("Metric focus", experiment.metricFocus || "—"),
        ],
        recommendedLearning: {
          title: `Learning from ${experiment.experimentName || "Experiment"}`,
          learningType: "Experiment Result",
          category: hasWinner ? "Win" : "Insight",
          insight: experiment.resultSummary?.trim() || experiment.whatWorked?.trim() || experiment.hypothesis,
          evidence: [
            experiment.variantA ? `Variant A: ${experiment.variantA}` : "",
            experiment.variantB ? `Variant B: ${experiment.variantB}` : "",
            experiment.winner ? `Winner: ${experiment.winner}` : "",
            experiment.variantAMetric ? `A metric: ${experiment.variantAMetric}` : "",
            experiment.variantBMetric ? `B metric: ${experiment.variantBMetric}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          recommendation:
            experiment.nextTestIdea?.trim() ||
            experiment.learningSummary?.trim() ||
            "Capture the experiment outcome for future campaigns.",
          tags: ["feedback-loop", "experiment", experiment.experimentType?.toLowerCase() ?? "test"].filter(Boolean),
        },
        relatedRecords: [
          relatedRecord("experiment", experiment.id, experiment.experimentName || "Experiment"),
        ],
        supportsExperiment: false,
      }),
    )
  }

  return suggestions
}

function suggestPatternToLearning(
  dataset: FeedbackLoopDataset,
  seen: Set<string>,
): FeedbackSuggestion[] {
  const patterns = buildDetectedPatterns(dataset, { limit: 40 })
  const suggestions: FeedbackSuggestion[] = []

  for (const pattern of patterns) {
    if (pattern.patternType === "repeated-issue" && pattern.confidence === "low") continue

    const existing = findExistingLearning(dataset.learnings, {
      sourceType: "pattern-engine",
      sourceId: pattern.id,
      title: `Pattern: ${pattern.title}`,
    })
    if (existing) continue

    const id = buildSuggestionId(["pattern-to-learning", pattern.id])
    if (seen.has(id)) continue
    seen.add(id)

    const confidence = confidenceFromSignal({
      patternConfidence: pattern.confidence,
      recordCount: pattern.earlySignal ? 1 : 2,
    })

    suggestions.push(
      buildSuggestion({
        id,
        title: `Convert pattern to learning: ${pattern.title}`,
        suggestionType: "pattern-to-learning",
        confidence,
        score: pattern.score,
        sourceType: "pattern",
        sourceId: pattern.id,
        sourceName: pattern.title,
        campaignId: pattern.campaignId,
        campaignName: pattern.campaignName,
        artistName: pattern.artistName,
        platform: pattern.platform,
        summary: pattern.summary,
        evidence: pattern.evidence.slice(0, 5).map((item) =>
          evidenceItem(item.label, item.value, item.sourceType, item.sourceId),
        ),
        recommendedLearning: {
          title: `Pattern: ${pattern.title}`,
          learningType: "Pattern",
          category: pattern.patternType === "learning-gap" ? "Opportunity" : "Insight",
          insight: pattern.summary,
          evidence: pattern.evidence.map((item) => `${item.label}: ${item.value}`).join("\n"),
          recommendation: pattern.recommendation,
          tags: ["feedback-loop", "pattern-engine", pattern.patternType],
        },
        relatedRecords: pattern.relatedRecords.map((record) =>
          relatedRecord(record.sourceType, record.sourceId, record.title),
        ),
        supportsExperiment: pattern.patternType !== "learning-gap",
        experimentHypothesis: pattern.recommendation,
      }),
    )
  }

  return suggestions
}

function suggestQualityPerformanceToLearning(
  dataset: FeedbackLoopDataset,
  seen: Set<string>,
): FeedbackSuggestion[] {
  const insights = buildQualityPerformanceInsights(dataset, { limit: 30 })
  const suggestions: FeedbackSuggestion[] = []

  for (const insight of insights) {
    const existing = findExistingLearning(dataset.learnings, {
      sourceType: "quality-performance",
      sourceId: insight.id,
      title: `Quality/Performance: ${insight.title}`,
    })
    if (existing) continue

    const id = buildSuggestionId(["quality-performance-to-learning", insight.id])
    if (seen.has(id)) continue
    seen.add(id)

    suggestions.push(
      buildSuggestion({
        id,
        title: `Capture quality/performance insight: ${insight.title}`,
        suggestionType: "quality-performance-to-learning",
        confidence: confidenceFromSignal({
          patternConfidence: insight.confidence,
          recordCount: insight.sampleSize,
          qualityScore: insight.qualityScore,
        }),
        score: insight.score,
        sourceType: "quality-performance",
        sourceId: insight.id,
        sourceName: insight.title,
        campaignId: insight.campaignId,
        campaignName: insight.campaignName,
        artistName: insight.artistName,
        platform: insight.platform,
        summary: insight.summary,
        evidence: insight.evidence.slice(0, 5).map((item) =>
          evidenceItem(item.label, item.value, item.sourceType, item.sourceId),
        ),
        recommendedLearning: {
          title: `Quality/Performance: ${insight.title}`,
          learningType: "Quality Performance",
          category:
            insight.insightType.includes("outlier") || insight.insightType.includes("weakness")
              ? "Risk"
              : "Insight",
          insight: insight.summary,
          evidence: [
            insight.qualityScore !== undefined ? `Quality score: ${insight.qualityScore}` : "",
            insight.performanceMetric
              ? `${insight.performanceMetric}: ${insight.performanceValue ?? "—"}`
              : "",
            `Sample size: ${insight.sampleSize}`,
            ...insight.evidence.map((item) => `${item.label}: ${item.value}`),
          ]
            .filter(Boolean)
            .join("\n"),
          recommendation: insight.recommendation,
          tags: ["feedback-loop", "quality-performance", insight.insightType],
        },
        relatedRecords: insight.relatedRecords.map((record) =>
          relatedRecord(record.sourceType, record.sourceId, record.title),
        ),
        supportsExperiment: insight.insightType === "experiment-opportunity" || insight.insightType === "repeated-weakness",
        experimentHypothesis: insight.recommendation,
      }),
    )
  }

  return suggestions
}

function suggestQualityReviewToLearning(
  dataset: FeedbackLoopDataset,
  seen: Set<string>,
): FeedbackSuggestion[] {
  const suggestions: FeedbackSuggestion[] = []

  for (const review of dataset.qualityReviews) {
    const existing = findExistingLearning(dataset.learnings, {
      sourceType: "quality-review",
      sourceId: review.id,
      qualityReviewId: review.id,
    })
    if (existing) continue

    const isHigh = review.overallScore >= 80
    const isLow = review.overallScore > 0 && review.overallScore < 60
    const hasRecommendation = Boolean(review.recommendedActions?.trim() || review.improvementIdeas?.trim())
    if (!isHigh && !isLow && !hasRecommendation) continue

    const id = buildSuggestionId(["quality-review-to-learning", review.id])
    if (seen.has(id)) continue
    seen.add(id)

    suggestions.push(
      buildSuggestion({
        id,
        title: `Create learning from quality review: ${review.reviewName || review.reviewType}`,
        suggestionType: "quality-review-to-learning",
        confidence: confidenceFromSignal({ qualityScore: review.overallScore, recordCount: 1 }),
        score: scoreFromSignal({ metricStrength: review.overallScore, recordCount: 1 }),
        sourceType: "quality-review",
        sourceId: review.id,
        sourceName: review.reviewName || review.reviewType,
        campaignId: review.campaignId,
        campaignName: review.campaignName,
        artistName: review.artistName,
        platform: review.platform,
        summary: `"${review.reviewName}" scored ${review.overallScore}/100 with actionable review notes but no learning yet.`,
        evidence: [
          evidenceItem("Score", String(review.overallScore), "quality-review", review.id),
          evidenceItem("Type", review.reviewType),
          evidenceItem("Readiness", review.readinessLabel || "—"),
          evidenceItem("Strengths", review.strengths?.slice(0, 60) || "—"),
        ],
        recommendedLearning: {
          title: `Learning from ${review.reviewName || review.reviewType}`,
          learningType: "Quality Review",
          category: isLow ? "Improvement" : isHigh ? "Insight" : "Opportunity",
          insight: review.strengths?.trim() || review.weaknesses?.trim() || review.reviewName,
          evidence: [
            `Overall score: ${review.overallScore}`,
            review.strengths ? `Strengths: ${review.strengths}` : "",
            review.weaknesses ? `Weaknesses: ${review.weaknesses}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          recommendation:
            review.recommendedActions?.trim() ||
            review.improvementIdeas?.trim() ||
            "Apply rubric findings to the next similar asset.",
          tags: ["feedback-loop", "quality-review", review.reviewType.toLowerCase()],
        },
        relatedRecords: [
          relatedRecord("quality-review", review.id, review.reviewName || "Quality review"),
        ],
        supportsExperiment: isLow,
        experimentHypothesis: review.improvementIdeas || review.recommendedActions,
      }),
    )
  }

  return suggestions
}

function campaignHasActivity(campaign: CampaignRecord, dataset: FeedbackLoopDataset): boolean {
  const name = campaign.campaignName?.trim().toLowerCase()
  const hasAnalytics = dataset.analyticsRecords.some(
    (record) => record.relatedCampaign?.toLowerCase() === name,
  )
  const hasExperiments = dataset.experiments.some((exp) => exp.campaignId === campaign.id)
  const hasReviews = dataset.qualityReviews.some((review) => review.campaignId === campaign.id)
  const hasVideos = dataset.youtubeVideos.some((video) => video.campaignId === campaign.id)
  return hasAnalytics || hasExperiments || hasReviews || hasVideos || campaign.linkedRecords.length > 0
}

function suggestCampaignRetrospectives(
  dataset: FeedbackLoopDataset,
  seen: Set<string>,
): FeedbackSuggestion[] {
  const suggestions: FeedbackSuggestion[] = []

  for (const campaign of dataset.campaigns) {
    const existing = findExistingLearning(dataset.learnings, {
      learningType: "Campaign Retrospective",
      campaignId: campaign.id,
      title: `Retrospective: ${campaign.campaignName}`,
    })
    if (existing) continue

    const published = isPublishedCampaignStatus(campaign.status)
    const active = campaignHasActivity(campaign, dataset)
    if (!published && !active) continue

    const id = buildSuggestionId(["campaign-retrospective", campaign.id])
    if (seen.has(id)) continue
    seen.add(id)

    const analyticsCount = dataset.analyticsRecords.filter(
      (record) => record.relatedCampaign?.toLowerCase() === campaign.campaignName?.toLowerCase(),
    ).length
    const experimentCount = dataset.experiments.filter((exp) => exp.campaignId === campaign.id).length
    const reviewCount = dataset.qualityReviews.filter((review) => review.campaignId === campaign.id).length

    suggestions.push(
      buildSuggestion({
        id,
        title: `Campaign retrospective: ${campaign.campaignName || "Untitled"}`,
        suggestionType: "campaign-retrospective",
        confidence: confidenceFromSignal({
          recordCount: analyticsCount + experimentCount + reviewCount,
          strongMetric: published,
        }),
        score: scoreFromSignal({
          recordCount: analyticsCount + experimentCount + reviewCount,
          metricStrength: published ? 30 : 15,
        }),
        sourceType: "campaign",
        sourceId: campaign.id,
        sourceName: campaign.campaignName || "Campaign",
        campaignId: campaign.id,
        campaignName: campaign.campaignName,
        artistName: campaign.artistName,
        platform: "",
        summary: `"${campaign.campaignName}" has launch activity (${analyticsCount} analytics, ${experimentCount} experiments, ${reviewCount} reviews) but no retrospective learning.`,
        evidence: [
          evidenceItem("Status", campaign.status),
          evidenceItem("Analytics records", String(analyticsCount)),
          evidenceItem("Experiments", String(experimentCount)),
          evidenceItem("Quality reviews", String(reviewCount)),
          evidenceItem("Linked records", String(campaign.linkedRecords.length)),
        ],
        recommendedLearning: {
          title: `Retrospective: ${campaign.campaignName || "Campaign"}`,
          learningType: "Campaign Retrospective",
          category: "Retrospective",
          insight: `Post-launch review for ${campaign.campaignName}. Status: ${campaign.status}. Goal: ${campaign.primaryGoal || "—"}.`,
          evidence: [
            `Campaign type: ${campaign.campaignType}`,
            `Launch date: ${campaign.launchDate || "—"}`,
            `Analytics records: ${analyticsCount}`,
            `Experiments: ${experimentCount}`,
            `Quality reviews: ${reviewCount}`,
          ].join("\n"),
          recommendation:
            "Summarize what worked, what underperformed, and which tactics to repeat on the next campaign.",
          tags: ["feedback-loop", "campaign-retrospective", campaign.campaignType?.toLowerCase() ?? "campaign"],
        },
        relatedRecords: [relatedRecord("campaign", campaign.id, campaign.campaignName || "Campaign")],
        supportsExperiment: false,
      }),
    )
  }

  return suggestions
}

function suggestPlaybookUpdates(
  dataset: FeedbackLoopDataset,
  seen: Set<string>,
): FeedbackSuggestion[] {
  const suggestions: FeedbackSuggestion[] = []
  const tagCounts = new Map<string, number>()

  for (const learning of dataset.learnings) {
    for (const tag of learning.tags) {
      const key = tag.trim().toLowerCase()
      if (!key || key === "feedback-loop" || key === "demo") continue
      tagCounts.set(key, (tagCounts.get(key) ?? 0) + 1)
    }
  }

  const patterns = buildDetectedPatterns(dataset, { limit: 20 }).filter(
    (pattern) => pattern.confidence !== "low" && !pattern.earlySignal,
  )

  if (patterns.length >= 2) {
    const theme = patterns[0]?.patternType ?? "pattern"
    const id = buildSuggestionId(["playbook-update", theme])
    if (!seen.has(id)) {
      seen.add(id)
      suggestions.push(
        buildSuggestion({
          id,
          title: "Add winning patterns to launch playbook",
          suggestionType: "playbook-update",
          confidence: "medium",
          score: 55,
          sourceType: "pattern",
          sourceId: theme,
          sourceName: "Pattern cluster",
          summary: `${patterns.length} high-confidence patterns suggest repeatable launch steps worth documenting in a playbook.`,
          evidence: patterns.slice(0, 3).map((pattern) =>
            evidenceItem(pattern.title, pattern.summary.slice(0, 80)),
          ),
          recommendedLearning: {
            title: "Playbook update: repeatable launch patterns",
            learningType: "Campaign Process",
            category: "Insight",
            insight: "Multiple patterns point to the same packaging or quality strengths.",
            evidence: patterns.map((pattern) => pattern.title).join("\n"),
            recommendation: "Open Playbooks and add checklist steps for the repeated winning criteria.",
            tags: ["feedback-loop", "playbook-update"],
          },
          relatedRecords: [],
          playbookArea: "Launch checklist",
          recommendedActions: [
            { id: `${id}:playbook`, label: "Open Playbooks", actionType: "playbook", href: "/playbooks" },
            { id: `${id}:learning`, label: "Create Learning", actionType: "create-learning" },
          ],
        }),
      )
    }
  }

  for (const [tag, count] of [...tagCounts.entries()].filter(([, count]) => count >= 2).slice(0, 3)) {
    const id = buildSuggestionId(["playbook-update", tag])
    if (seen.has(id)) continue
    seen.add(id)

    suggestions.push(
      buildSuggestion({
        id,
        title: `Playbook update opportunity: ${tag}`,
        suggestionType: "playbook-update",
        confidence: confidenceFromSignal({ recordCount: count }),
        score: scoreFromSignal({ recordCount: count }),
        sourceType: "learning",
        sourceId: tag,
        sourceName: tag,
        summary: `${count} learnings reference "${tag}" — consider a repeatable playbook step.`,
        evidence: [evidenceItem("Related learnings", String(count))],
        recommendedLearning: {
          title: `Playbook step: ${tag}`,
          learningType: "Campaign Process",
          category: "Insight",
          insight: `Repeated learnings mention ${tag}.`,
          evidence: `${count} learnings share this tag.`,
          recommendation: `Add a ${tag} checklist item to the relevant playbook.`,
          tags: ["feedback-loop", "playbook-update", tag],
        },
        relatedRecords: [],
        playbookArea: tag,
        recommendedActions: [
          { id: `${id}:playbook`, label: "Open Playbooks", actionType: "playbook", href: "/playbooks" },
          { id: `${id}:copy`, label: "Copy Recommendation", actionType: "copy" },
        ],
      }),
    )
  }

  return suggestions
}

function suggestAIContext(
  dataset: FeedbackLoopDataset,
  seen: Set<string>,
): FeedbackSuggestion[] {
  const suggestions: FeedbackSuggestion[] = []

  const candidates = dataset.learnings.filter(
    (learning) =>
      learning.status === "Active" &&
      (learning.confidence === "High" || learning.impact === "High") &&
      !learning.tags.includes("ai-context-included"),
  )

  for (const learning of candidates.slice(0, 8)) {
    const id = buildSuggestionId(["ai-context", learning.id])
    if (seen.has(id)) continue
    seen.add(id)

    suggestions.push(
      buildSuggestion({
        id,
        title: `Add to AI context: ${learning.title}`,
        suggestionType: "ai-context",
        confidence: learning.confidence === "High" ? "high" : "medium",
        score: scoreFromSignal({
          recordCount: 1,
          metricStrength: learning.impact === "High" ? 35 : 20,
        }),
        sourceType: "learning",
        sourceId: learning.id,
        sourceName: learning.title,
        campaignId: learning.campaignId,
        campaignName: learning.campaignName,
        artistName: learning.artistName,
        platform: learning.platform,
        summary: `"${learning.title}" is high-confidence and reusable in future AI campaign prompts.`,
        evidence: [
          evidenceItem("Type", learning.learningType, "learning", learning.id),
          evidenceItem("Confidence", learning.confidence),
          evidenceItem("Impact", learning.impact),
          evidenceItem("Platform", learning.platform || "—"),
        ],
        recommendedLearning: {
          title: learning.title,
          learningType: learning.learningType,
          category: learning.category,
          insight: learning.insight,
          evidence: learning.evidence,
          recommendation: learning.recommendation || "Include in AI context for matching campaigns.",
          tags: [...learning.tags, "feedback-loop", "ai-context"],
        },
        relatedRecords: [relatedRecord("learning", learning.id, learning.title)],
        recommendedActions: [
          {
            id: `${id}:learning`,
            label: "Open Learning",
            actionType: "navigate",
            href: `/learnings?recordId=${encodeURIComponent(learning.id)}`,
          },
          {
            id: `${id}:copilot`,
            label: "Open Campaign Copilot",
            actionType: "navigate",
            href: learning.campaignId
              ? `/copilot?campaignId=${encodeURIComponent(learning.campaignId)}`
              : "/copilot",
          },
        ],
      }),
    )
  }

  return suggestions
}

export function buildFeedbackSuggestions(
  dataset: FeedbackLoopDataset,
  input: FeedbackLoopInput = {},
): FeedbackSuggestion[] {
  try {
    const seen = new Set<string>()
    let suggestions: FeedbackSuggestion[] = [
      ...suggestAnalyticsToLearning(dataset, seen),
      ...suggestExperimentToLearning(dataset, seen),
      ...suggestPatternToLearning(dataset, seen),
      ...suggestQualityPerformanceToLearning(dataset, seen),
      ...suggestQualityReviewToLearning(dataset, seen),
      ...suggestCampaignRetrospectives(dataset, seen),
      ...suggestPlaybookUpdates(dataset, seen),
      ...suggestAIContext(dataset, seen),
    ]

    if (input.campaignId) {
      suggestions = suggestions.filter(
        (item) => !item.campaignId || item.campaignId === input.campaignId,
      )
    }
    if (input.artistName) {
      const artist = input.artistName.trim().toLowerCase()
      suggestions = suggestions.filter(
        (item) => !item.artistName || item.artistName.toLowerCase() === artist,
      )
    }
    if (input.platform) {
      const platform = input.platform.trim().toLowerCase()
      suggestions = suggestions.filter(
        (item) => !item.platform || item.platform.toLowerCase() === platform,
      )
    }
    if (input.sourceType) {
      suggestions = suggestions.filter((item) => item.sourceType === input.sourceType)
    }
    if (input.suggestionType) {
      suggestions = suggestions.filter((item) => item.suggestionType === input.suggestionType)
    }
    if (input.analyticsRecordId) {
      suggestions = suggestions.filter(
        (item) =>
          item.sourceId === input.analyticsRecordId ||
          item.relatedRecords.some((record) => record.sourceId === input.analyticsRecordId),
      )
    }
    if (input.experimentId) {
      suggestions = suggestions.filter(
        (item) =>
          item.sourceId === input.experimentId ||
          item.relatedRecords.some((record) => record.sourceId === input.experimentId),
      )
    }
    if (input.qualityReviewId) {
      suggestions = suggestions.filter(
        (item) =>
          item.sourceId === input.qualityReviewId ||
          item.relatedRecords.some((record) => record.sourceId === input.qualityReviewId),
      )
    }
    if (input.minConfidence) {
      const order = { low: 0, medium: 1, high: 2 }
      suggestions = suggestions.filter(
        (item) => order[item.confidence] >= order[input.minConfidence!],
      )
    }

    return suggestions.sort((a, b) => b.score - a.score).slice(0, input.limit ?? 80)
  } catch {
    return []
  }
}

export function summarizeFeedbackLoop(
  suggestions: FeedbackSuggestion[],
): FeedbackLoopSummary {
  return {
    totalSuggestions: suggestions.length,
    highConfidence: suggestions.filter((item) => item.confidence === "high").length,
    campaignsNeedingRetrospective: suggestions.filter(
      (item) => item.suggestionType === "campaign-retrospective",
    ).length,
    experimentsNeedingLearning: suggestions.filter(
      (item) => item.suggestionType === "experiment-to-learning",
    ).length,
    patternsNeedingLearning: suggestions.filter(
      (item) => item.suggestionType === "pattern-to-learning",
    ).length,
    qualityInsightsNeedingLearning: suggestions.filter(
      (item) =>
        item.suggestionType === "quality-performance-to-learning" ||
        item.suggestionType === "quality-review-to-learning",
    ).length,
    playbookOpportunities: suggestions.filter((item) => item.suggestionType === "playbook-update")
      .length,
    aiContextOpportunities: suggestions.filter((item) => item.suggestionType === "ai-context")
      .length,
    topSuggestions: [...suggestions].sort((a, b) => b.score - a.score).slice(0, 5),
  }
}

export function suggestionsForTab(
  suggestions: FeedbackSuggestion[],
  tab: string,
): FeedbackSuggestion[] {
  switch (tab) {
    case "learning":
      return suggestions.filter((item) =>
        [
          "analytics-to-learning",
          "experiment-to-learning",
          "pattern-to-learning",
          "quality-performance-to-learning",
          "quality-review-to-learning",
        ].includes(item.suggestionType),
      )
    case "retrospective":
      return suggestions.filter((item) => item.suggestionType === "campaign-retrospective")
    case "experiment":
      return suggestions.filter((item) => item.suggestionType === "experiment-to-learning")
    case "pattern":
      return suggestions.filter((item) => item.suggestionType === "pattern-to-learning")
    case "quality":
      return suggestions.filter(
        (item) =>
          item.suggestionType === "quality-performance-to-learning" ||
          item.suggestionType === "quality-review-to-learning",
      )
    case "playbook":
      return suggestions.filter((item) => item.suggestionType === "playbook-update")
    case "ai-context":
      return suggestions.filter((item) => item.suggestionType === "ai-context")
    default:
      return suggestions
  }
}

export function getCampaignFeedbackSummaryFromSuggestions(
  campaignId: string,
  campaignName: string,
  suggestions: FeedbackSuggestion[],
): import("@/lib/feedback-loop/types").CampaignFeedbackSummary {
  const scoped = suggestions.filter((item) => item.campaignId === campaignId)
  return {
    campaignId,
    campaignName,
    suggestionCount: scoped.length,
    retrospectiveNeeded: scoped.some((item) => item.suggestionType === "campaign-retrospective"),
    experimentsNeedingLearning: scoped.filter(
      (item) => item.suggestionType === "experiment-to-learning",
    ).length,
    analyticsNeedingLearning: scoped.filter(
      (item) => item.suggestionType === "analytics-to-learning",
    ).length,
    qualityInsightsNeedingLearning: scoped.filter(
      (item) =>
        item.suggestionType === "quality-performance-to-learning" ||
        item.suggestionType === "quality-review-to-learning",
    ).length,
    topSuggestions: scoped.slice(0, 3),
  }
}

export type { FeedbackLoopDataset }
