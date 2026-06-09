/**
 * Shared data-access mappers and normalizers for Prisma-backed modules.
 *
 * All current CreatorOps modules now persist via Prisma + SQLite (see lib/actions/*).
 * lib/storage.ts localStorage helpers remain for rollback, JSON export, and one-time migration.
 */

export {
  normalizeEmailCampaignRecord,
  prismaEmailCampaignToEmailCampaignRecord,
  emailCampaignToPrismaCreate,
  emailCampaignToPrismaUpdate,
} from "@/lib/data/email-campaigns"

export {
  normalizeMockupPromptRecord,
  prismaMockupPromptToMockupPromptRecord,
  mockupPromptToPrismaCreate,
  mockupPromptToPrismaUpdate,
} from "@/lib/data/mockup-prompts"

export {
  normalizeAnalyticsRecord,
  prismaAnalyticsRecordToAnalyticsRecord,
  analyticsRecordToPrismaCreate,
  analyticsRecordToPrismaUpdate,
} from "@/lib/data/analytics-records"

export {
  normalizeSocialRepurposingRecord,
  prismaSocialRepurposingToSocialRepurposingRecord,
  socialRepurposingToPrismaCreate,
  socialRepurposingToPrismaUpdate,
} from "@/lib/data/social-repurposing"

export {
  normalizeProductListing,
  prismaProductListingToProductListing,
  productListingToPrismaCreate,
  productListingToPrismaUpdate,
} from "@/lib/data/product-listings"

export {
  normalizeMerchIdea,
  prismaMerchIdeaToMerchIdea,
  merchIdeaToPrismaCreate,
  merchIdeaToPrismaUpdate,
} from "@/lib/data/merch-ideas"

export {
  normalizeArtistRecord,
  prismaArtistToArtistRecord,
  artistToPrismaCreate,
  artistToPrismaUpdate,
  artistRelationsToNestedCreate,
  releasesToPrismaCreate,
  productsToPrismaCreate,
  campaignsToPrismaCreate,
} from "@/lib/data/artists"

export {
  normalizeReleasePlan,
  prismaReleasePlanToReleasePlan,
  releasePlanToPrismaCreate,
  releasePlanToPrismaUpdate,
} from "@/lib/data/release-plans"

export {
  normalizeYouTubeThumbnailRecord,
  prismaYouTubeThumbnailToRecord,
  youtubeThumbnailToPrismaCreate,
  youtubeThumbnailToPrismaUpdate,
} from "@/lib/data/youtube-thumbnails"

export {
  normalizeYouTubePackage,
  prismaYouTubePackageToYouTubePackage,
  youtubePackageToPrismaCreate,
  youtubePackageToPrismaUpdate,
} from "@/lib/data/youtube-packages"

export {
  normalizeStepRun,
  normalizeWorkflowRun,
  prismaWorkflowRunToWorkflowRun,
  stepRunsToNestedCreate,
  stepRunsToPrismaCreate,
  workflowRunToPrismaCreate,
  workflowRunToPrismaUpdate,
} from "@/lib/data/workflow-runs"

export {
  normalizePromptRun,
  parseJsonRecord,
  prismaPromptRunToPromptRun,
  promptRunToPrismaCreate,
  promptRunToPrismaUpdate,
  stringifyJsonRecord,
} from "@/lib/data/prompt-runs"

export {
  normalizePrompt,
  parseJsonStringArray,
  prismaPromptToPrompt,
  promptToPrismaCreate,
  promptToPrismaUpdate,
  stringifyJsonArray,
} from "@/lib/data/prompts"

export {
  normalizeWorkflow,
  normalizeWorkflowStep,
  prismaWorkflowToWorkflow,
  stepsToNestedCreate,
  stepsToPrismaCreate,
  workflowToPrismaCreate,
  workflowToPrismaUpdate,
} from "@/lib/data/workflows"

export {
  normalizeCampaignRecord,
  prismaCampaignToCampaignRecord,
  campaignToPrismaCreate,
  campaignToPrismaUpdate,
} from "@/lib/data/campaigns"
