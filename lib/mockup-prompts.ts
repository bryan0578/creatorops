import type {
  MockupPromptFormValues,
  MockupPromptRecord,
  Prompt,
} from "@/lib/types"
import {
  buildCompletedPrompt,
  mergePromptVariables,
} from "@/lib/prompt-variables"

export const MOCKUP_PROMPT_GENERATOR_ID = "p-mockup-prompt"
export const MOCKUP_PROMPT_GENERATOR_NAME = "Mockup Prompt Generator"

export const FALLBACK_MOCKUP_PROMPT_TEMPLATE = `You are an expert image prompt engineer for merch mockups, digital products, artist visuals, YouTube thumbnails, product ads, and ecommerce creatives.

Create image generation prompts based on the following project details:

Project name: {{projectName}}
Mockup type: {{mockupType}}
Product type: {{productType}}
Niche: {{niche}}
Audience: {{audience}}
Design concept: {{designConcept}}
Visual style: {{visualStyle}}
Colors: {{colors}}
Setting: {{setting}}
Model description: {{modelDescription}}
Camera angle: {{cameraAngle}}
Lighting: {{lighting}}
Mood: {{mood}}
Platform use: {{platformUse}}
Aspect ratio: {{aspectRatio}}
Text to include: {{textToInclude}}
Text to avoid: {{textToAvoid}}
Brand notes: {{brandNotes}}

Additional notes: {{notes}}

Generate:
1. One polished, detailed image generation prompt ready for Midjourney, DALL-E, or similar
2. One simpler, shorter prompt version
3. One premium ecommerce version optimized for product listings
4. One social media ad version optimized for the target platform
5. A negative prompt / avoid list
6. Layout notes (composition, framing, focal points)
7. Text placement notes (where text should appear, size, hierarchy)
8. Mockup usage recommendations (which version to use where)

Match visual style and mood to the niche and audience. Respect aspect ratio and platform constraints.`

export interface MockupPromptFinalFields {
  finalImagePrompt: string
  finalNegativePrompt: string
  finalLayoutNotes: string
  finalTextPlacement: string
  finalUsageNotes: string
}

export function emptyMockupPromptForm(): MockupPromptFormValues {
  return {
    projectName: "",
    mockupType: "T-Shirt Mockup",
    productType: "",
    niche: "",
    audience: "",
    designConcept: "",
    visualStyle: "",
    colors: "",
    setting: "",
    modelDescription: "",
    cameraAngle: "",
    lighting: "",
    mood: "",
    platformUse: "Fourthwall",
    aspectRatio: "1:1 Square",
    textToInclude: "",
    textToAvoid: "",
    brandNotes: "",
    notes: "",
  }
}

export function emptyFinalMockupPromptFields(): MockupPromptFinalFields {
  return {
    finalImagePrompt: "",
    finalNegativePrompt: "",
    finalLayoutNotes: "",
    finalTextPlacement: "",
    finalUsageNotes: "",
  }
}

export function normalizeMockupPromptRecord(
  record: Partial<MockupPromptRecord> & Pick<MockupPromptRecord, "id">,
): MockupPromptRecord {
  const form = emptyMockupPromptForm()
  const finals = emptyFinalMockupPromptFields()
  return {
    id: record.id,
    projectName: record.projectName ?? form.projectName,
    mockupType: record.mockupType ?? form.mockupType,
    productType: record.productType ?? form.productType,
    niche: record.niche ?? form.niche,
    audience: record.audience ?? form.audience,
    designConcept: record.designConcept ?? form.designConcept,
    visualStyle: record.visualStyle ?? form.visualStyle,
    colors: record.colors ?? form.colors,
    setting: record.setting ?? form.setting,
    modelDescription: record.modelDescription ?? form.modelDescription,
    cameraAngle: record.cameraAngle ?? form.cameraAngle,
    lighting: record.lighting ?? form.lighting,
    mood: record.mood ?? form.mood,
    platformUse: record.platformUse ?? form.platformUse,
    aspectRatio: record.aspectRatio ?? form.aspectRatio,
    textToInclude: record.textToInclude ?? form.textToInclude,
    textToAvoid: record.textToAvoid ?? form.textToAvoid,
    brandNotes: record.brandNotes ?? form.brandNotes,
    completedPrompt: record.completedPrompt ?? "",
    aiResponse: record.aiResponse ?? "",
    finalImagePrompt: record.finalImagePrompt ?? finals.finalImagePrompt,
    finalNegativePrompt: record.finalNegativePrompt ?? finals.finalNegativePrompt,
    finalLayoutNotes: record.finalLayoutNotes ?? finals.finalLayoutNotes,
    finalTextPlacement: record.finalTextPlacement ?? finals.finalTextPlacement,
    finalUsageNotes: record.finalUsageNotes ?? finals.finalUsageNotes,
    notes: record.notes ?? form.notes,
    createdAt: record.createdAt ?? Date.now(),
    updatedAt: record.updatedAt ?? Date.now(),
  }
}

export function getMockupPromptTemplate(prompts: Prompt[]): string {
  const saved = prompts.find(
    (p) =>
      p.id === MOCKUP_PROMPT_GENERATOR_ID ||
      p.name === MOCKUP_PROMPT_GENERATOR_NAME,
  )
  if (saved?.promptText) return saved.promptText
  return FALLBACK_MOCKUP_PROMPT_TEMPLATE
}

export function formValuesToRecord(
  form: MockupPromptFormValues,
): Record<string, string> {
  return { ...form }
}

export function buildMockupPromptCompletedPrompt(
  template: string,
  form: MockupPromptFormValues,
): string {
  const values = formValuesToRecord(form)
  const variables = mergePromptVariables(Object.keys(values), template)
  return buildCompletedPrompt(template, values, variables)
}

export function buildFinalMockupPromptText(
  meta: Pick<MockupPromptRecord, "projectName" | "mockupType">,
  fields: MockupPromptFinalFields,
): string {
  const sections: { label: string; value: string }[] = [
    { label: "Project", value: meta.projectName },
    { label: "Mockup Type", value: meta.mockupType },
    { label: "Image Prompt", value: fields.finalImagePrompt },
    { label: "Negative Prompt / Avoid", value: fields.finalNegativePrompt },
    { label: "Layout Notes", value: fields.finalLayoutNotes },
    { label: "Text Placement", value: fields.finalTextPlacement },
    { label: "Usage Notes", value: fields.finalUsageNotes },
  ]

  return sections
    .filter((section) => section.value.trim())
    .map((section) => `${section.label}:\n${section.value.trim()}`)
    .join("\n\n")
}

export function finalFieldsFromMockupRecord(
  record: Pick<MockupPromptRecord, keyof MockupPromptFinalFields>,
): MockupPromptFinalFields {
  return {
    finalImagePrompt: record.finalImagePrompt ?? "",
    finalNegativePrompt: record.finalNegativePrompt ?? "",
    finalLayoutNotes: record.finalLayoutNotes ?? "",
    finalTextPlacement: record.finalTextPlacement ?? "",
    finalUsageNotes: record.finalUsageNotes ?? "",
  }
}
