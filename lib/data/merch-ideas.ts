import { normalizeMerchIdea } from "@/lib/merch-ideas"
import type { MerchIdea } from "@/lib/types"
import type { MerchIdea as PrismaMerchIdea } from "@/lib/generated/prisma/client"

/**
 * Shared merch idea data layer — maps between app types and Prisma rows.
 */

export { normalizeMerchIdea } from "@/lib/merch-ideas"

export function merchIdeaToPrismaCreate(idea: MerchIdea) {
  const normalized = normalizeMerchIdea(idea)
  return {
    id: normalized.id,
    niche: normalized.niche,
    audience: normalized.audience,
    productType: normalized.productType,
    tone: normalized.tone,
    noun: normalized.noun,
    verb: normalized.verb,
    designStyle: normalized.designStyle,
    storeType: normalized.storeType,
    primaryGoal: normalized.primaryGoal,
    completedPrompt: normalized.completedPrompt,
    aiResponse: normalized.aiResponse,
    selectedConceptName: normalized.selectedConceptName,
    selectedSlogan: normalized.selectedSlogan,
    selectedDesignDirection: normalized.selectedDesignDirection,
    selectedProductTitle: normalized.selectedProductTitle,
    selectedProductDescription: normalized.selectedProductDescription,
    selectedTags: normalized.selectedTags,
    selectedMockupIdea: normalized.selectedMockupIdea,
    selectedSocialCaption: normalized.selectedSocialCaption,
    notes: normalized.notes,
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function merchIdeaToPrismaUpdate(idea: MerchIdea) {
  const normalized = normalizeMerchIdea(idea)
  return {
    niche: normalized.niche,
    audience: normalized.audience,
    productType: normalized.productType,
    tone: normalized.tone,
    noun: normalized.noun,
    verb: normalized.verb,
    designStyle: normalized.designStyle,
    storeType: normalized.storeType,
    primaryGoal: normalized.primaryGoal,
    completedPrompt: normalized.completedPrompt,
    aiResponse: normalized.aiResponse,
    selectedConceptName: normalized.selectedConceptName,
    selectedSlogan: normalized.selectedSlogan,
    selectedDesignDirection: normalized.selectedDesignDirection,
    selectedProductTitle: normalized.selectedProductTitle,
    selectedProductDescription: normalized.selectedProductDescription,
    selectedTags: normalized.selectedTags,
    selectedMockupIdea: normalized.selectedMockupIdea,
    selectedSocialCaption: normalized.selectedSocialCaption,
    notes: normalized.notes,
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function prismaMerchIdeaToMerchIdea(row: PrismaMerchIdea): MerchIdea {
  return normalizeMerchIdea({
    id: row.id,
    niche: row.niche,
    audience: row.audience,
    productType: row.productType,
    tone: row.tone,
    noun: row.noun,
    verb: row.verb,
    designStyle: row.designStyle,
    storeType: row.storeType,
    primaryGoal: row.primaryGoal,
    completedPrompt: row.completedPrompt,
    aiResponse: row.aiResponse,
    selectedConceptName: row.selectedConceptName,
    selectedSlogan: row.selectedSlogan,
    selectedDesignDirection: row.selectedDesignDirection,
    selectedProductTitle: row.selectedProductTitle,
    selectedProductDescription: row.selectedProductDescription,
    selectedTags: row.selectedTags,
    selectedMockupIdea: row.selectedMockupIdea,
    selectedSocialCaption: row.selectedSocialCaption,
    notes: row.notes,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}
