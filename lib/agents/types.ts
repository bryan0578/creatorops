export type AgentDomain = "ai-studio" | "campaign-command" | "youtube-studio" | "product-factory" | "analytics-learnings"

export type AgentContextInclude = {
  campaigns?: boolean
  analytics?: boolean
  videos?: boolean
  assets?: boolean
  driveFiles?: boolean
  qualityReviews?: boolean
  learnings?: boolean
  experiments?: boolean
  patterns?: boolean
  qualityPerformance?: boolean
  feedbackLoop?: boolean
  playbooks?: boolean
  prompts?: boolean
  dataHealth?: boolean
  automation?: boolean
}

export interface AgentOutputSection {
  title: string
  content: string
  items?: string[]
}

export interface AgentRecommendedAction {
  label: string
  actionType: string
  href?: string
  payload?: unknown
  requiresConfirmation?: boolean
}

export interface AgentRelatedRecord {
  sourceType: string
  sourceId: string
  title: string
  href: string
}

export interface CreatorAgent {
  id: string
  name: string
  shortName: string
  description: string
  domain: AgentDomain
  iconName: string
  systemPrompt: string
  suggestedUseCases: string[]
  requiredContext: string[]
  optionalContext: string[]
  outputSections: string[]
  recommendedActions: string[]
  defaultInclude: AgentContextInclude
}

export interface AgentRunInput {
  agentId: string
  campaignId?: string
  artistName?: string
  platform?: string
  sourceRecordType?: string
  sourceRecordId?: string
  userGoal?: string
  extraInstructions?: string
  includeData?: AgentContextInclude
  saveRun?: boolean
}

export interface AgentRunResult {
  agentId: string
  agentName: string
  title: string
  summary: string
  sections: AgentOutputSection[]
  recommendedActions: AgentRecommendedAction[]
  relatedRecords: AgentRelatedRecord[]
  rawText?: string
  usedFallback?: boolean
  warnings?: string[]
  promptRunId?: string
  contextPreview?: string
}

export interface AgentContextBundle {
  markdown: string
  relatedRecords: AgentRelatedRecord[]
  warnings: string[]
  missingData: string[]
}

export const DEFAULT_AGENT_INCLUDE: AgentContextInclude = {
  campaigns: true,
  analytics: true,
  videos: true,
  assets: true,
  driveFiles: true,
  qualityReviews: true,
  learnings: true,
  experiments: true,
  patterns: true,
  qualityPerformance: true,
  feedbackLoop: true,
  playbooks: true,
  prompts: true,
}

export type AgentIconName =
  | "Rocket"
  | "Video"
  | "ShoppingBag"
  | "Wand2"
  | "ShieldCheck"
  | "Lightbulb"
