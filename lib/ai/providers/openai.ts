import type { AIGenerateTextInput, AIGenerateTextResult } from "@/lib/ai/types"

const DEFAULT_MODEL = "gpt-4.1-mini"
const DEFAULT_BASE_URL = "https://api.openai.com/v1"

function resolveOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL
  const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "")
  return { apiKey, model, baseUrl }
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

export function getOpenAIDefaultModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL
}

export async function generateOpenAIText(
  input: AIGenerateTextInput,
): Promise<AIGenerateTextResult> {
  const { apiKey, model: envModel, baseUrl } = resolveOpenAIConfig()
  if (!apiKey) {
    throw new Error("OpenAI API key is not configured. Add OPENAI_API_KEY to .env.local.")
  }

  const model = input.model?.trim() || envModel
  const temperature = input.temperature ?? 0.7
  const maxTokens = input.maxTokens ?? 2048

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000)

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt },
        ],
      }),
      signal: controller.signal,
    })

    const payload = (await response.json()) as {
      error?: { message?: string; type?: string }
      choices?: Array<{ message?: { content?: string } }>
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit reached. Wait a moment and try again.")
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error("Invalid API key. Check OPENAI_API_KEY in .env.local.")
      }
      throw new Error(`AI request failed (${response.status}). Try again later.`)
    }

    const text = payload.choices?.[0]?.message?.content?.trim() ?? ""
    if (!text) {
      throw new Error("No output returned from the AI provider.")
    }

    return { text, provider: "openai", model }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("AI generation timed out. Try again with a shorter prompt.")
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
