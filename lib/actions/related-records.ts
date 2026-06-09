"use server"

import { getAnalyticsRecords } from "@/lib/actions/analytics-records"
import { getCampaigns } from "@/lib/actions/campaigns"
import { getEmailCampaignRecords } from "@/lib/actions/email-campaigns"
import { getMerchIdeas } from "@/lib/actions/merch-ideas"
import { getMockupPromptRecords } from "@/lib/actions/mockup-prompts"
import { getProductListings } from "@/lib/actions/product-listings"
import { getReleasePlans } from "@/lib/actions/release-plans"
import { getSocialRepurposingRecords } from "@/lib/actions/social-repurposing"
import { getYouTubePackages } from "@/lib/actions/youtube-packages"
import { getYouTubeThumbnails } from "@/lib/actions/youtube-thumbnails"
import {
  getRelatedRecordsFromStore,
  type GetRelatedRecordsInput,
  type RelatedRecordItem,
} from "@/lib/data/related-records"

export async function getRelatedRecords(
  input: GetRelatedRecordsInput,
): Promise<RelatedRecordItem[]> {
  const [
    campaigns,
    releasePlans,
    youtubePackages,
    youtubeThumbnailRecords,
    socialRepurposingRecords,
    merchIdeas,
    productListings,
    mockupPromptRecords,
    emailCampaignRecords,
    analyticsRecords,
  ] = await Promise.all([
    getCampaigns(),
    getReleasePlans(),
    getYouTubePackages(),
    getYouTubeThumbnails(),
    getSocialRepurposingRecords(),
    getMerchIdeas(),
    getProductListings(),
    getMockupPromptRecords(),
    getEmailCampaignRecords(),
    getAnalyticsRecords(),
  ])

  return getRelatedRecordsFromStore(
    {
      campaigns,
      releasePlans,
      youtubePackages,
      youtubeThumbnailRecords,
      socialRepurposingRecords,
      merchIdeas,
      productListings,
      mockupPromptRecords,
      emailCampaignRecords,
      analyticsRecords,
      artistRecords: [],
      workflows: [],
      workflowRuns: [],
      runs: [],
    },
    input,
  )
}
