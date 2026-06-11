export type PatternConfidence = "low" | "medium" | "high"

export type PatternType =
  | "youtube-title"
  | "thumbnail"
  | "campaign-readiness"
  | "artist-project"
  | "product-merch"
  | "experiment"
  | "learning-gap"
  | "repeated-issue"

export type PatternCategory =
  | "YouTube"
  | "Thumbnail"
  | "Campaign"
  | "Artist"
  | "Product"
  | "Experiment"
  | "Learning"
  | "Quality"
  | "Operations"

export interface PatternEvidence {
  label: string
  value: string
  href?: string
  sourceType?: string
  sourceId?: string
}

export interface PatternAction {
  id: string
  label: string
  actionType: "create-learning" | "create-experiment" | "navigate" | "playbook"
  href?: string
}

export interface PatternRelatedRecord {
  sourceType: string
  sourceId: string
  title: string
  href: string
}

export interface DetectedPattern {
  id: string
  title: string
  patternType: PatternType
  category: PatternCategory
  confidence: PatternConfidence
  score: number
  summary: string
  evidence: PatternEvidence[]
  recommendation: string
  actions: PatternAction[]
  relatedRecords: PatternRelatedRecord[]
  campaignId?: string
  campaignName?: string
  artistName?: string
  platform?: string
  metricName?: string
  metricValue?: number
  earlySignal?: boolean
}

export interface PatternDetectInput {
  campaignId?: string
  artistName?: string
  platform?: string
  patternType?: PatternType
  analyticsRecordId?: string
  youtubeVideoId?: string
  minConfidence?: PatternConfidence
  limit?: number
}

export interface PatternDetectResponse {
  patterns: DetectedPattern[]
  scannedAt: number
  summary: PatternDetectSummary
}

export interface PatternDetectSummary {
  total: number
  highConfidence: number
  mediumConfidence: number
  lowConfidence: number
  earlySignals: number
  learningOpportunities: number
  repeatedIssues: number
  bestPattern?: DetectedPattern
  biggestGap?: DetectedPattern
}
