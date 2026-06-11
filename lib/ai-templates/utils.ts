import type { Prompt, PromptRunModuleType } from "@/lib/types"
import {
  AI_GENERATION_TEMPLATE_CATEGORY,
  AI_TEMPLATE_TAG,
  TEMPLATE_SLUG_TO_MODULE_TYPE,
  type AITemplateModuleSlug,
} from "@/lib/ai-templates/constants"

export function isAIGenerationTemplate(prompt: Pick<Prompt, "category" | "tags">): boolean {
  return (
    prompt.category === AI_GENERATION_TEMPLATE_CATEGORY ||
    prompt.tags.includes(AI_TEMPLATE_TAG)
  )
}

export function getTemplateModuleSlug(
  prompt: Pick<Prompt, "tags">,
): AITemplateModuleSlug | null {
  const tag = prompt.tags.find((item) => item.startsWith("module:"))
  if (!tag) return null
  return tag.replace("module:", "") as AITemplateModuleSlug
}

export function getTemplateModeTags(prompt: Pick<Prompt, "tags">): string[] {
  return prompt.tags
    .filter((tag) => tag.startsWith("mode:"))
    .map((tag) => tag.replace("mode:", ""))
}

export function filterTemplatesForModule(
  prompts: Prompt[],
  moduleSlug: string,
): Prompt[] {
  return prompts
    .filter(isAIGenerationTemplate)
    .filter((prompt) => prompt.tags.includes(`module:${moduleSlug}`))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function findDefaultTemplate(
  prompts: Prompt[],
  moduleSlug: string,
  defaultName?: string,
): Prompt | null {
  const scoped = filterTemplatesForModule(prompts, moduleSlug)
  if (defaultName) {
    const match = scoped.find((prompt) => prompt.name === defaultName)
    if (match) return match
  }
  return scoped[0] ?? null
}

export function templateHasOutputFormatInstructions(
  prompt: Pick<Prompt, "outputFormat">,
): boolean {
  const text = prompt.outputFormat.trim().toLowerCase()
  return text.includes("final") || text.includes("selected") || text.length > 40
}

export function getTemplateModuleType(
  prompt: Pick<Prompt, "tags">,
): PromptRunModuleType | null {
  const slug = getTemplateModuleSlug(prompt)
  if (!slug) return null
  return TEMPLATE_SLUG_TO_MODULE_TYPE[slug] ?? null
}
