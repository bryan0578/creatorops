import type { MerchIdea, MerchIdeaFormValues, Prompt } from "@/lib/types"
import {
  buildCompletedPrompt,
  mergePromptVariables,
} from "@/lib/prompt-variables"

export const MERCH_IDEA_PROMPT_ID = "p-merch-idea"
export const MERCH_IDEA_PROMPT_NAME = "Merch Idea Generator"

export const FALLBACK_MERCH_IDEA_TEMPLATE = `You are a merch and ecommerce product strategist for creators, artists, and niche brands.

Generate creative merch product concepts based on the following:

Niche: {{niche}}
Audience: {{audience}}
Product type: {{productType}}
Tone: {{tone}}
Noun: {{noun}}
Verb: {{verb}}
Design style: {{designStyle}}
Store type: {{storeType}}
Primary goal: {{primaryGoal}}

Additional notes: {{notes}}

Generate:
1. Five distinct merch concept names
2. A catchy slogan for each concept
3. Design direction notes (colors, typography, imagery)
4. Product title and description for the store listing
5. Relevant tags for search and discovery
6. Mockup ideas for product photography or mockups
7. A social media caption to promote the product

Make concepts specific to the niche and audience. Vary humor level based on tone.`

export interface MerchIdeaSelectedConcept {
  selectedConceptName: string
  selectedSlogan: string
  selectedDesignDirection: string
  selectedProductTitle: string
  selectedProductDescription: string
  selectedTags: string
  selectedMockupIdea: string
  selectedSocialCaption: string
}

export function emptyMerchIdeaForm(): MerchIdeaFormValues {
  return {
    niche: "",
    audience: "",
    productType: "T-shirt",
    tone: "",
    noun: "",
    verb: "",
    designStyle: "",
    storeType: "Fourthwall",
    primaryGoal: "",
    notes: "",
  }
}

export function emptySelectedConceptFields(): MerchIdeaSelectedConcept {
  return {
    selectedConceptName: "",
    selectedSlogan: "",
    selectedDesignDirection: "",
    selectedProductTitle: "",
    selectedProductDescription: "",
    selectedTags: "",
    selectedMockupIdea: "",
    selectedSocialCaption: "",
  }
}

export function normalizeMerchIdea(
  idea: Partial<MerchIdea> & Pick<MerchIdea, "id">,
): MerchIdea {
  const form = emptyMerchIdeaForm()
  const selected = emptySelectedConceptFields()
  return {
    id: idea.id,
    niche: idea.niche ?? form.niche,
    audience: idea.audience ?? form.audience,
    productType: idea.productType ?? form.productType,
    tone: idea.tone ?? form.tone,
    noun: idea.noun ?? form.noun,
    verb: idea.verb ?? form.verb,
    designStyle: idea.designStyle ?? form.designStyle,
    storeType: idea.storeType ?? form.storeType,
    primaryGoal: idea.primaryGoal ?? form.primaryGoal,
    completedPrompt: idea.completedPrompt ?? "",
    aiResponse: idea.aiResponse ?? "",
    selectedConceptName: idea.selectedConceptName ?? selected.selectedConceptName,
    selectedSlogan: idea.selectedSlogan ?? selected.selectedSlogan,
    selectedDesignDirection:
      idea.selectedDesignDirection ?? selected.selectedDesignDirection,
    selectedProductTitle: idea.selectedProductTitle ?? selected.selectedProductTitle,
    selectedProductDescription:
      idea.selectedProductDescription ?? selected.selectedProductDescription,
    selectedTags: idea.selectedTags ?? selected.selectedTags,
    selectedMockupIdea: idea.selectedMockupIdea ?? selected.selectedMockupIdea,
    selectedSocialCaption:
      idea.selectedSocialCaption ?? selected.selectedSocialCaption,
    notes: idea.notes ?? form.notes,
    createdAt: idea.createdAt ?? Date.now(),
    updatedAt: idea.updatedAt ?? Date.now(),
  }
}

export function getMerchIdeaTemplate(prompts: Prompt[]): string {
  const saved = prompts.find(
    (p) =>
      p.id === MERCH_IDEA_PROMPT_ID || p.name === MERCH_IDEA_PROMPT_NAME,
  )
  if (saved?.promptText) return saved.promptText
  return FALLBACK_MERCH_IDEA_TEMPLATE
}

export function formValuesToRecord(
  form: MerchIdeaFormValues,
): Record<string, string> {
  return { ...form }
}

export function buildMerchIdeaCompletedPrompt(
  template: string,
  form: MerchIdeaFormValues,
): string {
  const values = formValuesToRecord(form)
  const variables = mergePromptVariables(Object.keys(values), template)
  return buildCompletedPrompt(template, values, variables)
}

export function buildSelectedConceptText(
  concept: MerchIdeaSelectedConcept,
): string {
  const sections: { label: string; value: string }[] = [
    { label: "Concept Name", value: concept.selectedConceptName },
    { label: "Slogan", value: concept.selectedSlogan },
    { label: "Design Direction", value: concept.selectedDesignDirection },
    { label: "Product Title", value: concept.selectedProductTitle },
    { label: "Product Description", value: concept.selectedProductDescription },
    { label: "Tags", value: concept.selectedTags },
    { label: "Mockup Idea", value: concept.selectedMockupIdea },
    { label: "Social Caption", value: concept.selectedSocialCaption },
  ]

  return sections
    .filter((section) => section.value.trim())
    .map((section) => `${section.label}:\n${section.value.trim()}`)
    .join("\n\n")
}

export function selectedConceptFromMerchIdea(
  idea: Pick<MerchIdea, keyof MerchIdeaSelectedConcept>,
): MerchIdeaSelectedConcept {
  return {
    selectedConceptName: idea.selectedConceptName ?? "",
    selectedSlogan: idea.selectedSlogan ?? "",
    selectedDesignDirection: idea.selectedDesignDirection ?? "",
    selectedProductTitle: idea.selectedProductTitle ?? "",
    selectedProductDescription: idea.selectedProductDescription ?? "",
    selectedTags: idea.selectedTags ?? "",
    selectedMockupIdea: idea.selectedMockupIdea ?? "",
    selectedSocialCaption: idea.selectedSocialCaption ?? "",
  }
}
