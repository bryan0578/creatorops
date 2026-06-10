import type { AIGenerateTextInput, AIGenerateTextResult } from "@/lib/ai/types"

/** Placeholder — Anthropic integration not wired in Phase 1. */
export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim())
}

export function getAnthropicDefaultModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514"
}

export async function generateAnthropicText(
  _input: AIGenerateTextInput,
): Promise<AIGenerateTextResult> {
  if (!isAnthropicConfigured()) {
    throw new Error("Anthropic API key is not configured. Add ANTHROPIC_API_KEY to .env.local.")
  }
  throw new Error("Anthropic provider is not implemented yet. Use OpenAI for now.")
}
