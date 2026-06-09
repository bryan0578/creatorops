import { normalizeCampaignRecord } from "@/lib/campaigns"
import type {
  AnalyticsRecord,
  CampaignFormValues,
  CampaignLinkedRecordType,
  CampaignRecord,
  EmailCampaignRecord,
  MerchIdea,
  MockupPromptRecord,
  ProductListing,
  ReleasePlan,
  SocialRepurposingRecord,
  YouTubePackage,
  YouTubeThumbnailRecord,
} from "@/lib/types"

export type CampaignQuickActionModule =
  | "release-planner"
  | "youtube-packaging"
  | "youtube-thumbnails"
  | "social-repurposing"
  | "merch-ideas"
  | "product-listings"
  | "mockup-prompts"
  | "email-campaigns"
  | "analytics"

export interface CampaignPrefillContext {
  campaignId: string | null
  campaignName: string | null
}

export function parseCampaignPrefillContext(
  searchParams: Pick<URLSearchParams, "get">,
): CampaignPrefillContext {
  return {
    campaignId: searchParams.get("campaignId"),
    campaignName: searchParams.get("campaignName"),
  }
}

export function getCampaignBackHref(campaignId: string): string {
  return `/campaigns?campaignId=${encodeURIComponent(campaignId)}`
}

export function shouldSkipCampaignUrlPrefill(
  editingId: string | null,
): boolean {
  return editingId != null
}

export function campaignPrefillToastMessage(campaignName: string | null): string {
  return campaignName
    ? `Prefilled from campaign: ${campaignName}`
    : "Prefilled from campaign"
}

function appendCommonCampaignParams(
  params: URLSearchParams,
  form: CampaignFormValues,
  campaignId: string,
) {
  params.set("campaignId", campaignId)
  if (form.campaignName) params.set("campaignName", form.campaignName)
  if (form.campaignType) params.set("campaignType", form.campaignType)
  if (form.artistName) params.set("artistName", form.artistName)
  if (form.songTitle) params.set("songTitle", form.songTitle)
  if (form.productName) params.set("productName", form.productName)
  if (form.niche) params.set("niche", form.niche)
  if (form.primaryGoal) params.set("primaryGoal", form.primaryGoal)
  if (form.targetAudience) params.set("targetAudience", form.targetAudience)
  if (form.startDate) params.set("startDate", form.startDate)
  if (form.launchDate) params.set("launchDate", form.launchDate)
  if (form.endDate) params.set("endDate", form.endDate)
  if (form.description) params.set("description", form.description)
}

/** Build module URL with campaign query params for quick actions. */
export function buildCampaignQuickActionHref(
  module: CampaignQuickActionModule,
  form: CampaignFormValues,
  campaignId: string,
): string {
  const params = new URLSearchParams()
  appendCommonCampaignParams(params, form, campaignId)

  switch (module) {
    case "release-planner":
      if (form.launchDate) params.set("releaseDate", form.launchDate)
      if (form.description) params.set("notes", form.description)
      break
    case "youtube-packaging":
      if (form.songTitle) params.set("trackTitle", form.songTitle)
      if (form.targetAudience) params.set("targetListener", form.targetAudience)
      if (form.launchDate) params.set("releaseDate", form.launchDate)
      if (form.description) params.set("notes", form.description)
      break
    case "youtube-thumbnails":
      if (form.songTitle) params.set("trackTitle", form.songTitle)
      params.set(
        "videoTitle",
        form.songTitle || form.campaignName || "",
      )
      if (form.description) params.set("visualTheme", form.description)
      if (form.primaryGoal) params.set("ctaGoal", form.primaryGoal)
      break
    case "social-repurposing":
      if (form.campaignType) params.set("businessArea", form.campaignType)
      if (form.primaryGoal) params.set("goal", form.primaryGoal)
      if (form.targetAudience) params.set("audience", form.targetAudience)
      if (form.description) params.set("sourceContent", form.description)
      break
    case "merch-ideas":
      if (form.targetAudience) params.set("audience", form.targetAudience)
      if (form.primaryGoal) params.set("primaryGoal", form.primaryGoal)
      if (form.description) params.set("notes", form.description)
      break
    case "product-listings":
      if (form.targetAudience) params.set("audience", form.targetAudience)
      if (form.productName) params.set("designConcept", form.productName)
      if (form.songTitle) params.set("primaryKeyword", form.songTitle)
      if (form.description) params.set("notes", form.description)
      break
    case "mockup-prompts":
      if (form.campaignName) params.set("projectName", form.campaignName)
      if (form.productName) params.set("designConcept", form.productName)
      if (form.targetAudience) params.set("audience", form.targetAudience)
      if (form.description) params.set("notes", form.description)
      break
    case "email-campaigns":
      params.set(
        "productOrReleaseName",
        form.songTitle || form.productName || "",
      )
      if (form.targetAudience) params.set("audience", form.targetAudience)
      if (form.primaryGoal) params.set("callToAction", form.primaryGoal)
      if (form.description) params.set("notes", form.description)
      break
    case "analytics":
      if (form.campaignName) params.set("relatedCampaign", form.campaignName)
      if (form.artistName) params.set("relatedArtist", form.artistName)
      if (form.songTitle) params.set("relatedSong", form.songTitle)
      if (form.campaignName) params.set("itemName", form.campaignName)
      if (form.launchDate) params.set("publishDate", form.launchDate)
      if (form.niche) params.set("niche", form.niche)
      break
  }

  const query = params.toString()
  return `/${module}?${query}`
}

export function youtubePackageLinkTitle(pkg: YouTubePackage): string {
  return (
    [pkg.artistName, pkg.trackTitle].filter(Boolean).join(" — ") ||
    "YouTube package"
  )
}

export function youtubeThumbnailLinkTitle(record: YouTubeThumbnailRecord): string {
  return (
    [record.artistName, record.videoTitle || record.trackTitle]
      .filter(Boolean)
      .join(" — ") || "YouTube thumbnail"
  )
}

export function releasePlanLinkTitle(plan: ReleasePlan): string {
  return (
    [plan.artistName, plan.songTitle].filter(Boolean).join(" — ") ||
    "Release plan"
  )
}

export function socialRepurposingLinkTitle(record: SocialRepurposingRecord): string {
  return record.campaignName || record.contentType || "Social content"
}

export function emailCampaignLinkTitle(record: EmailCampaignRecord): string {
  return record.campaignName || "Email campaign"
}

export function analyticsLinkTitle(record: AnalyticsRecord): string {
  return record.itemName || "Analytics record"
}

export function merchIdeaLinkTitle(idea: MerchIdea): string {
  return idea.selectedConceptName || idea.noun || "Merch idea"
}

export function productListingLinkTitle(listing: ProductListing): string {
  return listing.finalTitle || listing.designConcept || "Product listing"
}

export function mockupPromptLinkTitle(record: MockupPromptRecord): string {
  return record.projectName || record.mockupType || "Mockup prompt"
}

/** Link a newly saved module record back to its parent campaign (no duplicates). */
export async function linkRecordToCampaign(
  campaigns: CampaignRecord[],
  updateCampaign: (record: CampaignRecord) => Promise<void>,
  campaignId: string | null,
  type: CampaignLinkedRecordType,
  recordId: string,
  title: string,
  href: string,
): Promise<boolean> {
  if (!campaignId) return false

  const campaign = campaigns.find((c) => c.id === campaignId)
  if (!campaign) return false

  if (
    campaign.linkedRecords.some((r) => r.type === type && r.id === recordId)
  ) {
    return false
  }

  await updateCampaign(
    normalizeCampaignRecord({
      ...campaign,
      linkedRecords: [
        ...campaign.linkedRecords,
        {
          id: recordId,
          type,
          title,
          href,
          notes: "Created from campaign",
        },
      ],
      updatedAt: Date.now(),
    }),
  )

  return true
}
