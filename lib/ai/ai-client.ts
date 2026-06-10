import { generateAnthropicText, isAnthropicConfigured } from "@/lib/ai/providers/anthropic"
import {
  generateOpenAIText,
  getOpenAIDefaultModel,
  isOpenAIConfigured,
} from "@/lib/ai/providers/openai"
import type {
  AIProviderConfig,
  AIProviderId,
  AIProviderStatus,
  AIGenerateTextInput,
  AIGenerateTextResult,
} from "@/lib/ai/types"

export function getProviderConfig(providerId: AIProviderId): AIProviderConfig {
  switch (providerId) {
    case "openai":
      return {
        id: "openai",
        configured: isOpenAIConfigured(),
        model: getOpenAIDefaultModel(),
        baseUrl: process.env.OPENAI_BASE_URL?.trim(),
      }
    case "anthropic":
      return {
        id: "anthropic",
        configured: isAnthropicConfigured(),
        model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514",
      }
    case "google":
      return {
        id: "google",
        configured: Boolean(process.env.GOOGLE_API_KEY?.trim()),
        model: process.env.GOOGLE_MODEL?.trim() || "gemini-2.0-flash",
      }
    case "local":
      return { id: "local", configured: false, model: "local" }
    case "manual":
    default:
      return { id: "manual", configured: true, model: "manual" }
  }
}

export function listAvailableProviders(): AIProviderId[] {
  const available: AIProviderId[] = []
  if (isOpenAIConfigured()) available.push("openai")
  if (isAnthropicConfigured()) available.push("anthropic")
  if (process.env.GOOGLE_API_KEY?.trim()) available.push("google")
  return available
}

export function resolveProviderStatus(input: {
  enabled: boolean
  preferredProvider: string
  preferredModel: string
}): AIProviderStatus {
  const available = listAvailableProviders()
  const preferred = (input.preferredProvider?.trim() || "openai") as AIProviderId
  const provider =
    preferred !== "manual" && available.includes(preferred)
      ? preferred
      : available[0] ?? "manual"
  const config = getProviderConfig(provider)
  const model = input.preferredModel?.trim() || config.model

  if (!input.enabled) {
    return {
      enabled: false,
      configured: available.length > 0,
      provider,
      model,
      availableProviders: available,
      setupMessage: "AI generation is disabled in Workspace Settings.",
    }
  }

  if (provider === "manual" || !config.configured) {
    return {
      enabled: true,
      configured: false,
      provider,
      model,
      availableProviders: available,
      setupMessage:
        "AI provider not configured. Add OPENAI_API_KEY to .env.local and restart the dev server.",
    }
  }

  return {
    enabled: true,
    configured: true,
    provider,
    model,
    availableProviders: available,
  }
}

export async function generateAITextWithProvider(
  providerId: AIProviderId,
  input: AIGenerateTextInput,
): Promise<AIGenerateTextResult> {
  switch (providerId) {
    case "openai":
      return generateOpenAIText(input)
    case "anthropic":
      return generateAnthropicText(input)
    case "google":
      throw new Error("Google Gemini provider is not implemented yet.")
    case "local":
      throw new Error("Local model provider is not implemented yet.")
    case "manual":
    default:
      throw new Error("Manual mode does not support server-side generation.")
  }
}
