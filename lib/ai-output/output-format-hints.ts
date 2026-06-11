import { getModuleFieldDefinitions } from "@/lib/ai-output/field-mapping"
import type { AIOutputModuleType } from "@/lib/ai-output/types"

/** Parser-friendly output instructions appended to AI generation prompts. */
export function buildParserFriendlyOutputHint(moduleType: AIOutputModuleType): string {
  const fields = getModuleFieldDefinitions(moduleType)
  const labelLines = fields.map((field) => `${field.label}:`)

  return [
    "Return your answer using these exact field labels (one labeled section per field):",
    "",
    ...labelLines,
    "",
    "Plain JSON with matching keys is also accepted. Use multiline values where helpful.",
    "Do not wrap the entire response in a single code block unless using JSON.",
  ].join("\n")
}

export function isParserFriendlyModule(moduleType: string): moduleType is AIOutputModuleType {
  return getModuleFieldDefinitions(moduleType as AIOutputModuleType).length > 0
}
