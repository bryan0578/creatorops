import type { CampaignLinkableStoreSlice } from "@/lib/campaigns"
import {
  buildLaunchDashboardData,
  resolveCampaignRelatedRecords,
} from "@/lib/campaign-launch-dashboard"
import type {
  AnalyticsRecord,
  ArtistRecord,
  CampaignLinkedRecord,
  CampaignRecord,
  EmailCampaignRecord,
  MerchIdea,
  MockupPromptRecord,
  ProductListing,
  ReleasePlan,
  SocialRepurposingRecord,
  WorkspaceSettingsRecord,
  YouTubePackage,
  YouTubeThumbnailRecord,
} from "@/lib/types"
import type { CampaignExportMissingAsset } from "@/lib/data/campaign-export-pack"

export interface CampaignContextBundle {
  campaign: CampaignRecord
  workspaceSettings: WorkspaceSettingsRecord | null
  artistProfile: ArtistRecord | null
  releasePlan: ReleasePlan | null
  youtubePackage: YouTubePackage | null
  youtubeThumbnail: YouTubeThumbnailRecord | null
  socialRepurposing: SocialRepurposingRecord | null
  emailCampaign: EmailCampaignRecord | null
  merchIdea: MerchIdea | null
  productListing: ProductListing | null
  mockupPrompt: MockupPromptRecord | null
  analyticsRecord: AnalyticsRecord | null
  linkedRecords: CampaignLinkedRecord[]
  missingAssets: CampaignExportMissingAsset[]
}

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase()
}

function matches(a: string | undefined | null, b: string | undefined | null): boolean {
  const na = norm(a)
  const nb = norm(b)
  return Boolean(na && nb && na === nb)
}

/** Resolve campaign id from URL, form names, or heuristic field matching. */
export function resolveCampaignIdForContext(input: {
  urlCampaignId?: string | null
  urlCampaignName?: string | null
  formCampaignName?: string | null
  relatedCampaignName?: string | null
  artistName?: string | null
  songTitle?: string | null
  productName?: string | null
  niche?: string | null
  campaigns: CampaignRecord[]
}): string | null {
  const { campaigns } = input
  const urlId = input.urlCampaignId?.trim()
  if (urlId && campaigns.some((campaign) => campaign.id === urlId)) {
    return urlId
  }

  const nameCandidates = [
    input.formCampaignName,
    input.urlCampaignName,
    input.relatedCampaignName,
  ]
    .map((value) => (value ?? "").trim())
    .filter(Boolean)

  for (const name of nameCandidates) {
    const match = campaigns.find((campaign) => matches(campaign.campaignName, name))
    if (match) return match.id
  }

  const artist = input.artistName?.trim()
  const song = input.songTitle?.trim()
  if (artist && song) {
    const match = campaigns.find(
      (campaign) => matches(campaign.artistName, artist) && matches(campaign.songTitle, song),
    )
    if (match) return match.id
  }

  const product = input.productName?.trim()
  const niche = input.niche?.trim()
  if (product && niche) {
    const match = campaigns.find(
      (campaign) => matches(campaign.productName, product) && matches(campaign.niche, niche),
    )
    if (match) return match.id
  }

  if (artist) {
    const match = campaigns.find(
      (campaign) =>
        matches(campaign.artistName, artist) &&
        song &&
        matches(campaign.songTitle, song),
    )
    if (match) return match.id
  }

  return urlId || null
}

export function shouldShowCampaignContextButton(input: {
  urlCampaignId?: string | null
  formCampaignName?: string | null
  relatedCampaignName?: string | null
  artistName?: string | null
  songTitle?: string | null
  productName?: string | null
  niche?: string | null
  campaigns: CampaignRecord[]
}): boolean {
  if (input.urlCampaignId?.trim()) return true
  if (input.formCampaignName?.trim()) return true
  if (input.relatedCampaignName?.trim()) return true
  return resolveCampaignIdForContext(input) != null
}

export function buildCampaignContext(
  campaign: CampaignRecord,
  store: CampaignLinkableStoreSlice,
  workspaceSettings: WorkspaceSettingsRecord | null,
): CampaignContextBundle {
  const related = resolveCampaignRelatedRecords(campaign, store)
  const dashboard = buildLaunchDashboardData(campaign, store)

  const missingAssets = dashboard.readiness.assets
    .filter((asset) => !asset.completed)
    .map((asset) => ({
      key: asset.key,
      label: asset.label,
      suggestedAction: asset.createLabel,
    }))

  return {
    campaign,
    workspaceSettings,
    artistProfile: related.artist,
    releasePlan: related.releasePlan,
    youtubePackage: related.youtubePackage,
    youtubeThumbnail: related.youtubeThumbnail,
    socialRepurposing: related.socialRepurposing,
    emailCampaign: related.emailCampaign,
    merchIdea: related.merchIdea,
    productListing: related.productListing,
    mockupPrompt: related.mockupPrompt,
    analyticsRecord: related.analytics,
    linkedRecords: campaign.linkedRecords,
    missingAssets,
  }
}
