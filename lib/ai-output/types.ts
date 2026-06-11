import type { PromptRunModuleType } from "@/lib/types"

/** Modules with structured final-field parsing support. */
export type AIOutputModuleType = Extract<
  PromptRunModuleType,
  | "YouTube Packaging"
  | "YouTube Thumbnail"
  | "Release Plan"
  | "Social Repurposing"
  | "Email Campaign"
  | "Merch Idea"
  | "Product Listing"
  | "Mockup Prompt"
>

export const AI_OUTPUT_MODULE_TYPES: AIOutputModuleType[] = [
  "YouTube Packaging",
  "YouTube Thumbnail",
  "Release Plan",
  "Social Repurposing",
  "Email Campaign",
  "Merch Idea",
  "Product Listing",
  "Mockup Prompt",
]

export type ParseConfidence = "low" | "medium" | "high"

export interface ModuleFieldDefinition {
  key: string
  label: string
  aliases?: string[]
}

export interface ParseAIOutputInput {
  moduleType: AIOutputModuleType
  aiResponse: string
  existingValues?: Record<string, string>
}

export interface ParseAIOutputResult {
  success: boolean
  parsedFields: Record<string, string>
  confidence: ParseConfidence
  warnings: string[]
  unmatchedSections: string[]
  error?: string
}

export interface FieldConflict {
  key: string
  label: string
  existingValue: string
  parsedValue: string
}
