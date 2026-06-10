/**
 * Load source record content for quality review draft generation.
 */

import { getAnalyticsRecords } from "@/lib/actions/analytics-records"
import { getAssets } from "@/lib/actions/assets"
import { getCampaigns } from "@/lib/actions/campaigns"
import { getEmailCampaignRecords } from "@/lib/actions/email-campaigns"
import { getExperimentById } from "@/lib/actions/experiments"
import { getMerchIdeas } from "@/lib/actions/merch-ideas"
import { getMockupPromptRecords } from "@/lib/actions/mockup-prompts"
import { getProductListings } from "@/lib/actions/product-listings"
import { getPromptRuns } from "@/lib/actions/prompt-runs"
import { getPrompts } from "@/lib/actions/prompts"
import { getSocialRepurposingRecords } from "@/lib/actions/social-repurposing"
import { getYouTubePackages } from "@/lib/actions/youtube-packages"
import { getYouTubeThumbnails } from "@/lib/actions/youtube-thumbnails"
import type {
  EmailCampaignRecord,
  ExperimentRecord,
  MerchIdea,
  MockupPromptRecord,
  ProductListing,
  Prompt,
  PromptRun,
  SocialRepurposingRecord,
  YouTubePackage,
  YouTubeThumbnailRecord,
} from "@/lib/types"

export interface QualitySourceContext {
  found: boolean
  warning?: string
  title?: string
  textFields: Record<string, string>
  meta?: Record<string, string | number | boolean>
}

function field(value: string | undefined | null): string {
  return (value ?? "").trim()
}

function findById<T extends { id: string }>(rows: T[], id: string): T | null {
  return rows.find((row) => row.id === id) ?? null
}

export async function loadQualitySourceContext(input: {
  reviewType: string
  sourceRecordType?: string
  sourceRecordId?: string
  sourcePromptRunId?: string
  sourceExperimentId?: string
  campaignId?: string
}): Promise<QualitySourceContext> {
  const sourceType = field(input.sourceRecordType)
  const sourceId = field(input.sourceRecordId)
  const promptRunId = field(input.sourcePromptRunId)
  const experimentId = field(input.sourceExperimentId)

  try {
    if (promptRunId) {
      const runs = await getPromptRuns()
      const run = findById(runs, promptRunId)
      if (!run) {
        return { found: false, warning: "Prompt run not found.", textFields: {} }
      }
      return buildPromptRunContext(run, input.reviewType)
    }

    if (experimentId) {
      const experiment = await getExperimentById(experimentId)
      if (!experiment) {
        return { found: false, warning: "Experiment not found.", textFields: {} }
      }
      return buildExperimentContext(experiment)
    }

    if (!sourceType || !sourceId) {
      if (input.reviewType === "Campaign Readiness" && input.campaignId) {
        return buildCampaignReadinessContext(input.campaignId)
      }
      return { found: false, textFields: {} }
    }

    switch (sourceType) {
      case "YouTubePackage":
      case "youtube-package": {
        const rows = await getYouTubePackages()
        const record = findById(rows, sourceId)
        if (!record) {
          return { found: false, warning: "YouTube package not found.", textFields: {} }
        }
        return buildYouTubePackageContext(record, input.reviewType)
      }
      case "youtube-thumbnail":
      case "YouTubeThumbnail": {
        const rows = await getYouTubeThumbnails()
        const record = findById(rows, sourceId)
        if (!record) {
          return { found: false, warning: "YouTube thumbnail not found.", textFields: {} }
        }
        return buildYouTubeThumbnailContext(record, input.reviewType)
      }
      case "social-repurposing":
      case "SocialRepurposing": {
        const rows = await getSocialRepurposingRecords()
        const record = findById(rows, sourceId)
        if (!record) {
          return { found: false, warning: "Social repurposing record not found.", textFields: {} }
        }
        return buildSocialContext(record)
      }
      case "email-campaign":
      case "EmailCampaign": {
        const rows = await getEmailCampaignRecords()
        const record = findById(rows, sourceId)
        if (!record) {
          return { found: false, warning: "Email campaign not found.", textFields: {} }
        }
        return buildEmailContext(record, input.reviewType)
      }
      case "merch-idea":
      case "MerchIdea": {
        const rows = await getMerchIdeas()
        const record = findById(rows, sourceId)
        if (!record) {
          return { found: false, warning: "Merch idea not found.", textFields: {} }
        }
        return buildMerchContext(record)
      }
      case "product-listing":
      case "ProductListing": {
        const rows = await getProductListings()
        const record = findById(rows, sourceId)
        if (!record) {
          return { found: false, warning: "Product listing not found.", textFields: {} }
        }
        return buildProductListingContext(record)
      }
      case "mockup-prompt":
      case "MockupPrompt": {
        const rows = await getMockupPromptRecords()
        const record = findById(rows, sourceId)
        if (!record) {
          return { found: false, warning: "Mockup prompt not found.", textFields: {} }
        }
        return buildMockupPromptContext(record)
      }
      case "asset":
      case "Asset": {
        const rows = await getAssets()
        const record = findById(rows, sourceId)
        if (!record) {
          return { found: false, warning: "Asset not found.", textFields: {} }
        }
        return {
          found: true,
          title: record.assetName,
          textFields: {
            assetName: record.assetName,
            description: record.description,
            usageNotes: record.usageNotes,
            notes: record.notes,
          },
          meta: { assetType: record.assetType, status: record.status },
        }
      }
      default:
        return {
          found: false,
          warning: `Unknown source record type: ${sourceType}`,
          textFields: {},
        }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load source record."
    return { found: false, warning: message, textFields: {} }
  }
}

function buildYouTubePackageContext(
  record: YouTubePackage,
  reviewType: string,
): QualitySourceContext {
  const textFields = {
    title: field(record.finalTitle),
    description: field(record.finalDescription),
    tags: field(record.finalTags),
    hashtags: field(record.finalHashtags),
    pinnedComment: field(record.finalPinnedComment),
    thumbnailText: field(record.finalThumbnailText),
    shortsCaption: field(record.finalShortsCaption),
    communityPost: field(record.finalCommunityPost),
    targetListener: field(record.targetListener),
    keywords: field(record.keywords),
  }

  if (reviewType === "YouTube Title") {
    return {
      found: true,
      title: record.finalTitle || record.trackTitle,
      textFields: { title: textFields.title, keywords: textFields.keywords },
      meta: { targetListener: textFields.targetListener },
    }
  }

  return {
    found: true,
    title: record.finalTitle || record.trackTitle,
    textFields,
    meta: {
      artistName: field(record.artistName),
      targetListener: textFields.targetListener,
    },
  }
}

function buildYouTubeThumbnailContext(
  record: YouTubeThumbnailRecord,
  reviewType: string,
): QualitySourceContext {
  const textFields = {
    thumbnailText: field(record.finalTextOverlay || record.textOverlay),
    imagePrompt: field(record.finalImagePrompt),
    conceptNotes: field(record.finalConcept),
    styleNotes: field(record.brandingNotes || record.colorDirection),
    composition: field(record.finalComposition),
  }

  if (reviewType === "Thumbnail Prompt") {
    return {
      found: true,
      title: record.videoTitle || record.trackTitle,
      textFields,
    }
  }

  if (reviewType === "Thumbnail Text") {
    return {
      found: true,
      title: textFields.thumbnailText || record.trackTitle,
      textFields: { thumbnailText: textFields.thumbnailText },
    }
  }

  return {
    found: true,
    title: textFields.thumbnailText || record.trackTitle,
    textFields,
  }
}

function buildSocialContext(record: SocialRepurposingRecord): QualitySourceContext {
  const caption =
    field(record.finalTikTokCaption) ||
    field(record.finalInstagramCaption) ||
    field(record.finalXPost) ||
    field(record.finalCoreMessage)
  return {
    found: true,
    title: record.campaignName || record.platforms,
    textFields: {
      hook: field(record.finalCoreMessage),
      caption,
      hashtags: field(record.finalHashtags),
      cta: field(record.finalCTA || record.callToAction),
      platform: field(record.platforms),
    },
  }
}

function buildEmailContext(
  record: EmailCampaignRecord,
  reviewType: string,
): QualitySourceContext {
  const textFields = {
    subject: field(record.finalSubjectLine),
    preview: field(record.finalPreviewText),
    body: field(record.finalEmailBody),
    cta: field(record.finalCTA || record.callToAction),
  }

  if (reviewType === "Email Subject") {
    return {
      found: true,
      title: textFields.subject,
      textFields: { subject: textFields.subject, preview: textFields.preview },
    }
  }

  return {
    found: true,
    title: textFields.subject || record.campaignName,
    textFields,
  }
}

function buildMerchContext(record: MerchIdea): QualitySourceContext {
  return {
    found: true,
    title: record.selectedProductTitle || record.selectedConceptName,
    textFields: {
      slogan: field(record.selectedSlogan),
      concept: field(record.selectedDesignDirection),
      description: field(record.selectedProductDescription),
      bullets: field(record.selectedTags),
      targetBuyer: field(record.audience),
    },
  }
}

function buildProductListingContext(record: ProductListing): QualitySourceContext {
  return {
    found: true,
    title: record.finalTitle,
    textFields: {
      title: field(record.finalTitle),
      description: field(record.finalLongDescription || record.finalShortDescription),
      bullets: field(record.finalBulletPoints),
      keywords: field(record.primaryKeyword || record.secondaryKeywords),
      targetBuyer: field(record.audience),
    },
  }
}

function buildMockupPromptContext(record: MockupPromptRecord): QualitySourceContext {
  return {
    found: true,
    title: record.projectName || record.mockupType,
    textFields: {
      imagePrompt: field(record.finalImagePrompt),
      negativePrompt: field(record.finalNegativePrompt),
      styleNotes: field(record.visualStyle || record.brandNotes),
      placementNotes: field(record.finalTextPlacement || record.finalLayoutNotes),
    },
  }
}

async function buildPromptRunContext(
  run: PromptRun,
  reviewType: string,
): Promise<QualitySourceContext> {
  const prompts = await getPrompts()
  const prompt = findById(prompts, run.promptId)
  return {
    found: true,
    title: run.promptName || prompt?.name,
    textFields: {
      promptText: field(run.completedPrompt || prompt?.promptText),
      output: field(run.aiResponse),
      moduleType: field(run.moduleType),
    },
    meta: { reviewType },
  }
}

function buildExperimentContext(experiment: ExperimentRecord): QualitySourceContext {
  return {
    found: true,
    title: experiment.experimentName,
    textFields: {
      hypothesis: field(experiment.hypothesis),
      variantA: field(experiment.variantA),
      variantB: field(experiment.variantB),
      notes: field(experiment.notes),
    },
    meta: { experimentType: experiment.experimentType },
  }
}

async function buildCampaignReadinessContext(campaignId: string): Promise<QualitySourceContext> {
  const campaigns = await getCampaigns()
  const campaign = findById(campaigns, campaignId)
  if (!campaign) {
    return { found: false, warning: "Campaign not found.", textFields: {} }
  }

  const [assets, analytics] = await Promise.all([getAssets(), getAnalyticsRecords()])
  const campaignAssets = assets.filter(
    (asset) => asset.campaignId === campaignId || asset.campaignName === campaign.campaignName,
  )
  const campaignAnalytics = analytics.filter(
    (row) => row.campaignId === campaignId || row.campaignName === campaign.campaignName,
  )

  return {
    found: true,
    title: campaign.campaignName,
    textFields: {
      status: field(campaign.status),
      launchDate: field(campaign.launchDate),
      notes: field(campaign.notes),
    },
    meta: {
      assetCount: campaignAssets.length,
      analyticsCount: campaignAnalytics.length,
      linkedRecordCount: campaign.linkedRecords?.length ?? 0,
    },
  }
}

export async function loadPromptForQualityReview(promptId: string): Promise<Prompt | null> {
  const prompts = await getPrompts()
  return findById(prompts, promptId)
}
