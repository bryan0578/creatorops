import { prismaAnalyticsRecordToAnalyticsRecord } from "@/lib/data/analytics-records"
import { prismaArtistToArtistRecord } from "@/lib/data/artists"
import { prismaEmailCampaignToEmailCampaignRecord } from "@/lib/data/email-campaigns"
import { prismaMerchIdeaToMerchIdea } from "@/lib/data/merch-ideas"
import { prismaMockupPromptToMockupPromptRecord } from "@/lib/data/mockup-prompts"
import { prismaProductListingToProductListing } from "@/lib/data/product-listings"
import { prismaReleasePlanToReleasePlan } from "@/lib/data/release-plans"
import { prismaSocialRepurposingToSocialRepurposingRecord } from "@/lib/data/social-repurposing"
import { prismaYouTubePackageToYouTubePackage } from "@/lib/data/youtube-packages"
import { prismaYouTubeThumbnailToRecord } from "@/lib/data/youtube-thumbnails"
import { prisma } from "@/lib/prisma"
import type { CampaignLinkableStoreSlice } from "@/lib/campaigns"

const artistInclude = {
  releases: { orderBy: { sortOrder: "asc" as const } },
  products: { orderBy: { sortOrder: "asc" as const } },
  campaigns: { orderBy: { sortOrder: "asc" as const } },
}

/** Load all module records used for campaign linking, export, and context. */
export async function loadCampaignLinkableStoreSlice(): Promise<CampaignLinkableStoreSlice> {
  const [
    releasePlans,
    youtubePackages,
    youtubeThumbnailRecords,
    socialRepurposingRecords,
    merchIdeas,
    productListings,
    mockupPromptRecords,
    emailCampaignRecords,
    analyticsRecords,
    artistRecords,
  ] = await Promise.all([
    prisma.releasePlan.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.youTubePackage.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.youTubeThumbnail.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.socialRepurposing.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.merchIdea.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.productListing.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.mockupPrompt.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.emailCampaign.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.analyticsRecord.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.artist.findMany({
      include: artistInclude,
      orderBy: { updatedAt: "desc" },
    }),
  ])

  return {
    releasePlans: releasePlans.map(prismaReleasePlanToReleasePlan),
    youtubePackages: youtubePackages.map(prismaYouTubePackageToYouTubePackage),
    youtubeThumbnailRecords: youtubeThumbnailRecords.map(prismaYouTubeThumbnailToRecord),
    socialRepurposingRecords: socialRepurposingRecords.map(
      prismaSocialRepurposingToSocialRepurposingRecord,
    ),
    merchIdeas: merchIdeas.map(prismaMerchIdeaToMerchIdea),
    productListings: productListings.map(prismaProductListingToProductListing),
    mockupPromptRecords: mockupPromptRecords.map(prismaMockupPromptToMockupPromptRecord),
    emailCampaignRecords: emailCampaignRecords.map(prismaEmailCampaignToEmailCampaignRecord),
    analyticsRecords: analyticsRecords.map(prismaAnalyticsRecordToAnalyticsRecord),
    artistRecords: artistRecords.map(prismaArtistToArtistRecord),
    workflows: [],
    workflowRuns: [],
    runs: [],
  }
}
