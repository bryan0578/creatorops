export type AIProviderId = "openai" | "anthropic" | "google" | "local" | "manual"

export const AI_PROVIDER_IDS: AIProviderId[] = [
  "openai",
  "anthropic",
  "google",
  "local",
  "manual",
]

export const AI_PROVIDER_LABELS: Record<AIProviderId, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic (placeholder)",
  google: "Google Gemini (placeholder)",
  local: "Local model (placeholder)",
  manual: "Manual (copy/paste only)",
}

export interface AIProviderConfig {
  id: AIProviderId
  configured: boolean
  model: string
  baseUrl?: string
}

export interface AIGenerateTextInput {
  provider?: string
  model?: string
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxTokens?: number
}

export interface AIGenerateTextResult {
  text: string
  provider: AIProviderId
  model: string
}

export interface AIProviderStatus {
  enabled: boolean
  configured: boolean
  provider: AIProviderId
  model: string
  availableProviders: AIProviderId[]
  setupMessage?: string
}

export interface GenerateAITextInput {
  provider?: string
  model?: string
  moduleType: string
  campaignId?: string
  campaignName?: string
  promptId?: string
  promptName?: string
  promptText: string
  systemPrompt?: string
  contextBlocks?: string[]
  temperature?: number
  maxTokens?: number
  savePromptRun?: boolean
  includeCampaignContext?: boolean
  includeLearnings?: boolean
  includeQualityNotes?: boolean
  outputRecordType?: string
  outputRecordId?: string
  inputValues?: Record<string, string>
  experimentId?: string
  notes?: string
}

export interface GenerateAITextResult {
  success: boolean
  text?: string
  provider?: string
  model?: string
  promptRunId?: string
  assembledPrompt?: string
  systemPrompt?: string
  error?: string
}
