export type QualityPerformanceConfidence = "low" | "medium" | "high"

export type QualityPerformanceInsightType =
  | "quality-score-performance"
  | "high-quality-low-performance"
  | "low-quality-high-performance"
  | "repeated-weakness"
  | "repeated-strength"
  | "review-coverage-gap"
  | "learning-gap"
  | "experiment-opportunity"
  | "playbook-opportunity"

export type QualityPerformanceCategory =
  | "YouTube"
  | "Thumbnail"
  | "Campaign"
  | "Product"
  | "Social"
  | "Email"
  | "Prompt"
  | "Operations"

export interface QualityPerformanceEvidence {
  label: string
  value: string
  href?: string
  sourceType?: string
  sourceId?: string
}

export interface QualityPerformanceAction {
  id: string
  label: string
  actionType: "create-learning" | "create-experiment" | "navigate" | "playbook"
  href?: string
}

export interface QualityPerformanceRelatedRecord {
  sourceType: string
  sourceId: string
  title: string
  href: string
}

export interface QualityPerformanceInsight {
  id: string
  title: string
  insightType: QualityPerformanceInsightType
  category: QualityPerformanceCategory
  confidence: QualityPerformanceConfidence
  score: number
  sampleSize: number
  qualityScore?: number
  performanceMetric?: string
  performanceValue?: number
  summary: string
  evidence: QualityPerformanceEvidence[]
  recommendation: string
  actions: QualityPerformanceAction[]
  relatedRecords: QualityPerformanceRelatedRecord[]
  campaignId?: string
  campaignName?: string
  artistName?: string
  platform?: string
  reviewType?: string
  earlySignal?: boolean
}

export interface MatchedQualityPerformanceRecord {
  id: string
  qualityReview: import("@/lib/types").QualityReviewRecord
  analytics?: import("@/lib/types").AnalyticsRecord
  youtubeVideo?: import("@/lib/types").YouTubeVideoRecord
  campaign?: import("@/lib/types").CampaignRecord
  matchMethod: string
  views: number
  likes: number
  comments: number
  engagement: number
  engagementRate: number
  ctr: number
  performanceMetric: string
  performanceValue: number
}

export interface QualityPerformanceAnalyzeInput {
  campaignId?: string
  artistName?: string
  platform?: string
  reviewType?: string
  sourceRecordType?: string
  qualityReviewId?: string
  analyticsRecordId?: string
  youtubeVideoId?: string
  minConfidence?: QualityPerformanceConfidence
  limit?: number
}

export interface QualityPerformanceAnalyzeResponse {
  insights: QualityPerformanceInsight[]
  matchedPairs: MatchedQualityPerformanceRecord[]
  scannedAt: number
  summary: QualityPerformanceSummary
}

export interface QualityPerformanceSummary {
  matchedRecords: number
  averageQualityScore: number
  averagePerformance: number
  highConfidence: number
  earlySignals: number
  outliers: number
  learningGaps: number
  experimentOpportunities: number
  strongestSignal?: QualityPerformanceInsight
  topOutlier?: QualityPerformanceInsight
}
