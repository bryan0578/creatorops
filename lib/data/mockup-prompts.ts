import { normalizeMockupPromptRecord } from "@/lib/mockup-prompts"
import type { MockupPromptRecord } from "@/lib/types"
import type { MockupPrompt as PrismaMockupPrompt } from "@/lib/generated/prisma/client"

/**
 * Shared mockup prompt data layer — maps between app types and Prisma rows.
 */

export { normalizeMockupPromptRecord } from "@/lib/mockup-prompts"

export function mockupPromptToPrismaCreate(record: MockupPromptRecord) {
  const normalized = normalizeMockupPromptRecord(record)
  return {
    id: normalized.id,
    projectName: normalized.projectName,
    mockupType: normalized.mockupType,
    productType: normalized.productType,
    niche: normalized.niche,
    audience: normalized.audience,
    designConcept: normalized.designConcept,
    visualStyle: normalized.visualStyle,
    colors: normalized.colors,
    setting: normalized.setting,
    modelDescription: normalized.modelDescription,
    cameraAngle: normalized.cameraAngle,
    lighting: normalized.lighting,
    mood: normalized.mood,
    platformUse: normalized.platformUse,
    aspectRatio: normalized.aspectRatio,
    textToInclude: normalized.textToInclude,
    textToAvoid: normalized.textToAvoid,
    brandNotes: normalized.brandNotes,
    completedPrompt: normalized.completedPrompt,
    aiResponse: normalized.aiResponse,
    finalImagePrompt: normalized.finalImagePrompt,
    finalNegativePrompt: normalized.finalNegativePrompt,
    finalLayoutNotes: normalized.finalLayoutNotes,
    finalTextPlacement: normalized.finalTextPlacement,
    finalUsageNotes: normalized.finalUsageNotes,
    notes: normalized.notes,
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function mockupPromptToPrismaUpdate(record: MockupPromptRecord) {
  const normalized = normalizeMockupPromptRecord(record)
  return {
    projectName: normalized.projectName,
    mockupType: normalized.mockupType,
    productType: normalized.productType,
    niche: normalized.niche,
    audience: normalized.audience,
    designConcept: normalized.designConcept,
    visualStyle: normalized.visualStyle,
    colors: normalized.colors,
    setting: normalized.setting,
    modelDescription: normalized.modelDescription,
    cameraAngle: normalized.cameraAngle,
    lighting: normalized.lighting,
    mood: normalized.mood,
    platformUse: normalized.platformUse,
    aspectRatio: normalized.aspectRatio,
    textToInclude: normalized.textToInclude,
    textToAvoid: normalized.textToAvoid,
    brandNotes: normalized.brandNotes,
    completedPrompt: normalized.completedPrompt,
    aiResponse: normalized.aiResponse,
    finalImagePrompt: normalized.finalImagePrompt,
    finalNegativePrompt: normalized.finalNegativePrompt,
    finalLayoutNotes: normalized.finalLayoutNotes,
    finalTextPlacement: normalized.finalTextPlacement,
    finalUsageNotes: normalized.finalUsageNotes,
    notes: normalized.notes,
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function prismaMockupPromptToMockupPromptRecord(
  row: PrismaMockupPrompt,
): MockupPromptRecord {
  return normalizeMockupPromptRecord({
    id: row.id,
    projectName: row.projectName,
    mockupType: row.mockupType,
    productType: row.productType,
    niche: row.niche,
    audience: row.audience,
    designConcept: row.designConcept,
    visualStyle: row.visualStyle,
    colors: row.colors,
    setting: row.setting,
    modelDescription: row.modelDescription,
    cameraAngle: row.cameraAngle,
    lighting: row.lighting,
    mood: row.mood,
    platformUse: row.platformUse,
    aspectRatio: row.aspectRatio,
    textToInclude: row.textToInclude,
    textToAvoid: row.textToAvoid,
    brandNotes: row.brandNotes,
    completedPrompt: row.completedPrompt,
    aiResponse: row.aiResponse,
    finalImagePrompt: row.finalImagePrompt,
    finalNegativePrompt: row.finalNegativePrompt,
    finalLayoutNotes: row.finalLayoutNotes,
    finalTextPlacement: row.finalTextPlacement,
    finalUsageNotes: row.finalUsageNotes,
    notes: row.notes,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}
