import { filterLearningsForCampaign, filterReusableLearnings } from "@/lib/learnings"
import type { LearningRecord } from "@/lib/types"

const FEEDBACK_LOOP_CONTEXT_TAGS = new Set([
  "feedback-loop",
  "pattern-engine",
  "quality-performance",
  "ai-context",
])

/** Prioritize learnings for compact AI prompt context (top 5–10). */
export function prioritizeLearningsForAIContext(
  learnings: LearningRecord[],
  input: {
    campaignId?: string
    campaignName?: string
    artistName?: string
    platform?: string
    moduleType?: string
    limit?: number
  } = {},
): LearningRecord[] {
  const limit = input.limit ?? 8
  const campaignId = input.campaignId?.trim()
  const campaignScoped = campaignId
    ? filterLearningsForCampaign(learnings, campaignId, input.campaignName)
    : learnings

  const scored = campaignScoped
    .filter((learning) => learning.status === "Active" || learning.status === "Validated")
    .map((learning) => {
      let score = 0
      if (learning.campaignId && campaignId && learning.campaignId === campaignId) score += 40
      if (input.artistName && learning.artistName?.toLowerCase() === input.artistName.toLowerCase()) {
        score += 25
      }
      if (input.platform && learning.platform?.toLowerCase() === input.platform.toLowerCase()) {
        score += 20
      }
      if (learning.confidence === "High") score += 15
      else if (learning.confidence === "Medium") score += 8
      if (learning.impact === "High") score += 12
      if (learning.tags.some((tag) => FEEDBACK_LOOP_CONTEXT_TAGS.has(tag.toLowerCase()))) {
        score += 10
      }
      if (input.moduleType && learning.learningType.toLowerCase().includes(input.moduleType.toLowerCase())) {
        score += 10
      }
      score += Math.min(10, Math.floor((Date.now() - learning.updatedAt) / -86400000))
      return { learning, score }
    })
    .sort((a, b) => b.score - a.score)

  const top = scored.slice(0, limit).map((item) => item.learning)
  if (top.length >= limit) return top

  const reusable = filterReusableLearnings(learnings, {
    campaignId,
    campaignName: input.campaignName,
    artistName: input.artistName,
    platform: input.platform,
    limit: limit - top.length,
  }).filter((learning) => !top.some((item) => item.id === learning.id))

  return [...top, ...reusable].slice(0, limit)
}

export function formatFeedbackLoopLearningsBlock(learnings: LearningRecord[]): string {
  if (learnings.length === 0) return ""
  const lines = ["REUSABLE LEARNINGS (Feedback Loop)", ""]
  for (const learning of learnings) {
    lines.push(
      `- ${learning.title} (${learning.learningType}, ${learning.confidence} confidence)`,
      `  Insight: ${learning.insight.trim().slice(0, 240)}`,
    )
    if (learning.recommendation?.trim()) {
      lines.push(`  Recommendation: ${learning.recommendation.trim().slice(0, 180)}`)
    }
    if (learning.evidence?.trim()) {
      lines.push(`  Evidence: ${learning.evidence.trim().slice(0, 160)}`)
    }
    lines.push("")
  }
  return lines.join("\n").trim()
}

export function formatFeedbackSuggestionsBlock(
  suggestions: Array<{ title: string; summary: string; suggestionType: string }>,
): string {
  if (suggestions.length === 0) return ""
  const lines = ["LEARNING FEEDBACK OPPORTUNITIES", ""]
  for (const suggestion of suggestions.slice(0, 5)) {
    lines.push(`- [${suggestion.suggestionType}] ${suggestion.title}: ${suggestion.summary}`)
  }
  return lines.join("\n").trim()
}
