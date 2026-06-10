import { emptyAssetForm } from "@/lib/assets"
import type { CampaignPrefillContext } from "@/lib/campaign-prefill"
import type {
  AssetFormValues,
  MockupPromptRecord,
  PromptRun,
  PromptRunModuleType,
  YouTubeThumbnailRecord,
} from "@/lib/types"

function applyCampaignContext(
  form: AssetFormValues,
  context?: CampaignPrefillContext,
): AssetFormValues {
  if (!context?.campaignId && !context?.campaignName) return form
  return {
    ...form,
    campaignId: context.campaignId ?? form.campaignId,
    campaignName: context.campaignName ?? form.campaignName,
  }
}

function mockupTypeToAssetType(mockupType: string): string {
  const lower = mockupType.trim().toLowerCase()
  if (lower.includes("thumbnail")) return "YouTube Thumbnail"
  if (lower.includes("merch")) return "Merch Mockup"
  if (lower.includes("product")) return "Product Mockup"
  if (lower.includes("social")) return "Social Graphic"
  if (lower.includes("email")) return "Email Graphic"
  if (lower.includes("logo")) return "Logo"
  return "Visual Concept"
}

function moduleTypeToAssetType(moduleType: PromptRunModuleType | ""): string {
  switch (moduleType) {
    case "YouTube Thumbnail":
      return "YouTube Thumbnail"
    case "Mockup Prompt":
      return "Product Mockup"
    case "Merch Idea":
      return "Merch Mockup"
    case "Product Listing":
      return "Product Image"
    case "Social Repurposing":
      return "Social Graphic"
    case "Email Campaign":
      return "Email Graphic"
    case "YouTube Packaging":
      return "Video File"
    case "Release Plan":
      return "Cover Art"
    case "Analytics":
      return "Reference Image"
    default:
      return "Other"
  }
}

export function buildAssetFromYouTubeThumbnail(
  record: YouTubeThumbnailRecord,
  campaignContext?: CampaignPrefillContext,
): AssetFormValues {
  const assetName =
    [record.artistName, record.videoTitle || record.trackTitle]
      .filter(Boolean)
      .join(" — ") || "YouTube thumbnail"

  const description = [
    record.visualTheme ? `Theme: ${record.visualTheme}` : "",
    record.hookAngle ? `Hook: ${record.hookAngle}` : "",
    record.mainSubject ? `Subject: ${record.mainSubject}` : "",
    record.finalConcept ? `Concept: ${record.finalConcept}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  const usageNotes = [
    record.finalImagePrompt ? `Image prompt: ${record.finalImagePrompt}` : "",
    record.finalComposition ? `Composition: ${record.finalComposition}` : "",
    record.brandingNotes ? `Branding: ${record.brandingNotes}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")

  const tags = [record.contentFormat, record.videoType, record.genre, record.mood]
    .filter(Boolean)
    .join(", ")

  return applyCampaignContext(
    {
      ...emptyAssetForm(),
      assetName,
      assetType: "YouTube Thumbnail",
      status: "Draft",
      artistName: record.artistName,
      songTitle: record.trackTitle,
      platform: "YouTube",
      sourceRecordType: "youtube-thumbnail",
      sourceRecordId: record.id,
      description,
      usageNotes,
      tags,
      notes: record.notes,
    },
    campaignContext,
  )
}

export function buildAssetFromMockupPrompt(
  record: MockupPromptRecord,
  campaignContext?: CampaignPrefillContext,
): AssetFormValues {
  const assetName = record.projectName || record.mockupType || "Mockup asset"

  const description = [
    record.designConcept ? `Concept: ${record.designConcept}` : "",
    record.visualStyle ? `Style: ${record.visualStyle}` : "",
    record.colors ? `Colors: ${record.colors}` : "",
    record.setting ? `Setting: ${record.setting}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  const usageNotes = [
    record.finalImagePrompt ? `Image prompt: ${record.finalImagePrompt}` : "",
    record.finalUsageNotes ? record.finalUsageNotes : "",
    record.finalLayoutNotes ? `Layout: ${record.finalLayoutNotes}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")

  const tags = [record.niche, record.mockupType, record.productType, record.platformUse]
    .filter(Boolean)
    .join(", ")

  return applyCampaignContext(
    {
      ...emptyAssetForm(),
      assetName,
      assetType: mockupTypeToAssetType(record.mockupType),
      status: "Draft",
      productName: record.productType,
      platform: record.platformUse,
      sourceRecordType: "mockup-prompt",
      sourceRecordId: record.id,
      description,
      usageNotes,
      tags,
      notes: record.notes,
    },
    campaignContext,
  )
}

export function buildAssetFromPromptRun(run: PromptRun): AssetFormValues {
  return {
    ...emptyAssetForm(),
    assetName: run.promptName || `${run.moduleType || "Prompt"} run`,
    assetType: moduleTypeToAssetType(run.moduleType),
    status: "Draft",
    campaignId: run.campaignId,
    campaignName: run.campaignName,
    sourcePromptRunId: run.id,
    sourcePromptName: run.promptName,
    sourceRecordType: run.outputRecordType,
    sourceRecordId: run.outputRecordId,
    experimentId: run.experimentId,
    description: run.completedPrompt.slice(0, 2000),
    usageNotes: run.aiResponse.slice(0, 2000),
    tags: run.tags.join(", "),
    notes: run.notes,
  }
}
