export type FeedbackConfidence = "low" | "medium" | "high"

export type FeedbackSuggestionType =
  | "analytics-to-learning"
  | "experiment-to-learning"
  | "pattern-to-learning"
  | "quality-performance-to-learning"
  | "quality-review-to-learning"
  | "campaign-retrospective"
  | "playbook-update"
  | "ai-context"

export interface FeedbackEvidence {
  label: string
  value: string
  href?: string
  sourceType?: string
  sourceId?: string
}

export interface FeedbackRecommendedLearning {
  title: string
  learningType: string
  category: string
  insight: string
  evidence: string
  recommendation: string
  tags: string[]
}

export interface FeedbackAction {
  id: string
  label: string
  actionType: "create-learning" | "create-experiment" | "navigate" | "playbook" | "copy"
  href?: string
}

export interface FeedbackRelatedRecord {
  sourceType: string
  sourceId: string
  title: string
  href: string
}

export interface FeedbackSuggestion {
  id: string
  title: string
  suggestionType: FeedbackSuggestionType
  confidence: FeedbackConfidence
  score: number
  sourceType: string
  sourceId: string
  sourceName: string
  campaignId?: string
  campaignName?: string
  artistName?: string
  platform?: string
  summary: string
  evidence: FeedbackEvidence[]
  recommendedLearning: FeedbackRecommendedLearning
  recommendedActions: FeedbackAction[]
  relatedRecords: FeedbackRelatedRecord[]
  supportsExperiment?: boolean
  experimentHypothesis?: string
  playbookArea?: string
  existingLearningId?: string
}

export interface FeedbackLoopInput {
  campaignId?: string
  artistName?: string
  platform?: string
  sourceType?: string
  suggestionType?: FeedbackSuggestionType
  analyticsRecordId?: string
  experimentId?: string
  qualityReviewId?: string
  youtubeVideoId?: string
  minConfidence?: FeedbackConfidence
  limit?: number
}

export interface FeedbackLoopSummary {
  totalSuggestions: number
  highConfidence: number
  campaignsNeedingRetrospective: number
  experimentsNeedingLearning: number
  patternsNeedingLearning: number
  qualityInsightsNeedingLearning: number
  playbookOpportunities: number
  aiContextOpportunities: number
  topSuggestions: FeedbackSuggestion[]
}

export interface FeedbackLoopResponse {
  suggestions: FeedbackSuggestion[]
  scannedAt: number
  summary: FeedbackLoopSummary
}

export interface CampaignFeedbackSummary {
  campaignId: string
  campaignName: string
  suggestionCount: number
  retrospectiveNeeded: boolean
  experimentsNeedingLearning: number
  analyticsNeedingLearning: number
  qualityInsightsNeedingLearning: number
  topSuggestions: FeedbackSuggestion[]
}
