/**
 * Related record discovery — heuristic matching across CreatorOps modules.
 */

import type { CampaignLinkableStoreSlice } from "@/lib/campaigns"
import type {
  AnalyticsRecord,
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

export const RELATED_RECORDS_LIMIT_PER_TYPE = 5

export type RelatedRecordCategory =
  | "Planning"
  | "YouTube"
  | "Commerce"
  | "Marketing"
  | "Analytics"
  | "Operations"

export type RelatedRecordType =
  | "campaign"
  | "release-plan"
  | "youtube-package"
  | "youtube-thumbnail"
  | "social-repurposing"
  | "merch-idea"
  | "product-listing"
  | "mockup-prompt"
  | "email-campaign"
  | "analytics"
  | "experiment"
  | "artist"

export type RelatedModuleContext =
  | "youtube-packaging"
  | "youtube-thumbnail"
  | "release-plan"
  | "social-repurposing"
  | "email-campaign"
  | "analytics"
  | "merch-idea"
  | "product-listing"
  | "mockup-prompt"
  | "artist-crm"
  | "campaign"

export interface GetRelatedRecordsInput {
  currentType: RelatedModuleContext
  currentId?: string | null
  campaignId?: string | null
  campaignName?: string
  artistName?: string
  songTitle?: string
  trackTitle?: string
  productName?: string
  niche?: string
  relatedCampaign?: string
  itemName?: string
  titleUsed?: string
  productOrReleaseName?: string
  selectedProductTitle?: string
  selectedConceptName?: string
  projectName?: string
  designConcept?: string
  finalTitle?: string
  contentType?: string
  mockupType?: string
}

export interface RelatedRecordItem {
  id: string
  type: RelatedRecordType
  title: string
  subtitle: string
  href: string
  relationshipReason: string
  category: RelatedRecordCategory
  updatedAt: number
  isLinked?: boolean
  canLinkToCampaign?: boolean
}

export const RELATED_TYPE_LABELS: Record<RelatedRecordType, string> = {
  campaign: "Campaign",
  "release-plan": "Release Plan",
  "youtube-package": "YouTube Package",
  "youtube-thumbnail": "YouTube Thumbnail",
  "social-repurposing": "Social Repurposing",
  "merch-idea": "Merch Idea",
  "product-listing": "Product Listing",
  "mockup-prompt": "Mockup Prompt",
  "email-campaign": "Email Campaign",
  analytics: "Analytics",
  experiment: "Experiment",
  artist: "Artist",
}

export const CAMPAIGN_LINK_TYPE_GROUPS: {
  id: string
  label: string
  category: RelatedRecordCategory
  types: RelatedRecordType[]
  quickActionModule?: string
}[] = [
  {
    id: "planning",
    label: "Planning",
    category: "Planning",
    types: ["release-plan"],
    quickActionModule: "release-planner",
  },
  {
    id: "youtube",
    label: "YouTube",
    category: "YouTube",
    types: ["youtube-package", "youtube-thumbnail"],
    quickActionModule: "youtube-packaging",
  },
  {
    id: "commerce",
    label: "Commerce",
    category: "Commerce",
    types: ["merch-idea", "product-listing", "mockup-prompt"],
    quickActionModule: "merch-ideas",
  },
  {
    id: "marketing",
    label: "Marketing",
    category: "Marketing",
    types: ["social-repurposing", "email-campaign"],
    quickActionModule: "social-repurposing",
  },
  {
    id: "analytics",
    label: "Analytics",
    category: "Analytics",
    types: ["analytics"],
    quickActionModule: "analytics",
  },
  {
    id: "operations",
    label: "Operations",
    category: "Operations",
    types: ["artist", "campaign"],
    quickActionModule: "artist-crm",
  },
]

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase()
}

function hasText(value: string | undefined | null): boolean {
  return norm(value).length > 0
}

function matches(a: string | undefined | null, b: string | undefined | null): boolean {
  const na = norm(a)
  const nb = norm(b)
  return Boolean(na && nb && na === nb)
}

function fuzzyContains(haystack: string | undefined | null, needle: string | undefined | null): boolean {
  const n = norm(needle)
  const h = norm(haystack)
  return Boolean(n && h && h.includes(n))
}

function songOrTrack(input: GetRelatedRecordsInput): string {
  return input.songTitle || input.trackTitle || ""
}

export function buildRecordHref(type: RelatedRecordType, id: string): string {
  switch (type) {
    case "campaign":
      return `/campaigns?campaignId=${encodeURIComponent(id)}`
    case "youtube-package":
      return `/youtube-packaging?recordId=${encodeURIComponent(id)}`
    case "youtube-thumbnail":
      return `/youtube-thumbnails?recordId=${encodeURIComponent(id)}`
    case "release-plan":
      return `/release-planner?recordId=${encodeURIComponent(id)}`
    case "social-repurposing":
      return `/social-repurposing?recordId=${encodeURIComponent(id)}`
    case "merch-idea":
      return `/merch-ideas?recordId=${encodeURIComponent(id)}`
    case "product-listing":
      return `/product-listings?recordId=${encodeURIComponent(id)}`
    case "mockup-prompt":
      return `/mockup-prompts?recordId=${encodeURIComponent(id)}`
    case "email-campaign":
      return `/email-campaigns?recordId=${encodeURIComponent(id)}`
    case "analytics":
      return `/analytics?recordId=${encodeURIComponent(id)}`
    case "experiment":
      return `/experiments?recordId=${encodeURIComponent(id)}`
    case "artist":
      return `/artist-crm?recordId=${encodeURIComponent(id)}`
    default:
      return "/"
  }
}

function categoryForType(type: RelatedRecordType): RelatedRecordCategory {
  for (const group of CAMPAIGN_LINK_TYPE_GROUPS) {
    if (group.types.includes(type)) return group.category
  }
  return "Operations"
}

function makeItem(
  type: RelatedRecordType,
  id: string,
  title: string,
  subtitle: string,
  relationshipReason: string,
  updatedAt: number,
  extras?: Partial<RelatedRecordItem>,
): RelatedRecordItem {
  return {
    id,
    type,
    title: title || "Untitled",
    subtitle,
    href: buildRecordHref(type, id),
    relationshipReason,
    category: categoryForType(type),
    updatedAt,
    ...extras,
  }
}

function isCurrentRecord(
  input: GetRelatedRecordsInput,
  type: RelatedRecordType,
  id: string,
): boolean {
  if (!input.currentId) return false
  const typeMap: Partial<Record<RelatedModuleContext, RelatedRecordType>> = {
    "youtube-packaging": "youtube-package",
    "youtube-thumbnail": "youtube-thumbnail",
    "release-plan": "release-plan",
    "social-repurposing": "social-repurposing",
    "email-campaign": "email-campaign",
    analytics: "analytics",
    "merch-idea": "merch-idea",
    "product-listing": "product-listing",
    "mockup-prompt": "mockup-prompt",
    "artist-crm": "artist",
    campaign: "campaign",
  }
  return typeMap[input.currentType] === type && input.currentId === id
}

function dedupeAndLimit(items: RelatedRecordItem[]): RelatedRecordItem[] {
  const seen = new Set<string>()
  const out: RelatedRecordItem[] = []
  for (const item of items.sort((a, b) => b.updatedAt - a.updatedAt)) {
    const key = `${item.type}:${item.id}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

function limitByType(items: RelatedRecordItem[], limit = RELATED_RECORDS_LIMIT_PER_TYPE) {
  const counts = new Map<RelatedRecordType, number>()
  return items.filter((item) => {
    const count = counts.get(item.type) ?? 0
    if (count >= limit) return false
    counts.set(item.type, count + 1)
    return true
  })
}

function findCampaignById(
  campaigns: CampaignRecord[],
  campaignId?: string | null,
): CampaignRecord | undefined {
  if (!campaignId) return undefined
  return campaigns.find((c) => c.id === campaignId)
}

function findCampaignByName(
  campaigns: CampaignRecord[],
  name?: string,
): CampaignRecord | undefined {
  if (!hasText(name)) return undefined
  return campaigns.find((c) => matches(c.campaignName, name))
}

function isFormallyLinked(
  campaign: CampaignRecord | undefined,
  type: RelatedRecordType,
  id: string,
): boolean {
  if (!campaign) return false
  return campaign.linkedRecords.some((r) => r.type === type && r.id === id)
}

function addCampaignLinks(
  items: RelatedRecordItem[],
  input: GetRelatedRecordsInput,
  campaigns: CampaignRecord[],
): RelatedRecordItem[] {
  const out = [...items]
  const campaign =
    findCampaignById(campaigns, input.campaignId) ??
    findCampaignByName(campaigns, input.campaignName ?? input.relatedCampaign)

  if (campaign && !isCurrentRecord(input, "campaign", campaign.id)) {
    out.unshift(
      makeItem(
        "campaign",
        campaign.id,
        campaign.campaignName || "Untitled campaign",
        [campaign.campaignType, campaign.status].filter(Boolean).join(" · "),
        input.campaignId ? "Active campaign context" : "Matching campaign name",
        campaign.updatedAt,
        { isLinked: isFormallyLinked(campaign, "campaign", campaign.id) },
      ),
    )
  }

  if (input.campaignId && input.currentId && input.currentType !== "campaign") {
    const active = findCampaignById(campaigns, input.campaignId)
    const linkType = {
      "youtube-packaging": "youtube-package",
      "youtube-thumbnail": "youtube-thumbnail",
      "release-plan": "release-plan",
      "social-repurposing": "social-repurposing",
      "email-campaign": "email-campaign",
      analytics: "analytics",
      "merch-idea": "merch-idea",
      "product-listing": "product-listing",
      "mockup-prompt": "mockup-prompt",
    }[input.currentType] as RelatedRecordType | undefined

    if (active && linkType && !isFormallyLinked(active, linkType, input.currentId)) {
      const idx = out.findIndex((i) => i.type === "campaign" && i.id === active.id)
      if (idx >= 0) {
        out[idx] = { ...out[idx], canLinkToCampaign: true }
      }
    }
  }

  return out
}

function matchYouTubePackages(
  input: GetRelatedRecordsInput,
  packages: YouTubePackage[],
): RelatedRecordItem[] {
  const artist = input.artistName
  const track = songOrTrack(input)
  return packages
    .filter((pkg) => {
      if (isCurrentRecord(input, "youtube-package", pkg.id)) return false
      if (matches(pkg.artistName, artist) && matches(pkg.trackTitle, track)) return true
      if (matches(pkg.artistName, artist) && hasText(artist) && !hasText(track)) return true
      if (fuzzyContains(input.campaignName, pkg.trackTitle)) return true
      return false
    })
    .map((pkg) =>
      makeItem(
        "youtube-package",
        pkg.id,
        [pkg.artistName, pkg.trackTitle].filter(Boolean).join(" — ") || "YouTube package",
        pkg.channelName || pkg.videoType,
        matches(pkg.artistName, artist) && matches(pkg.trackTitle, track)
          ? "Same artist & track"
          : "Same artist",
        pkg.updatedAt,
      ),
    )
}

function matchThumbnails(
  input: GetRelatedRecordsInput,
  records: YouTubeThumbnailRecord[],
): RelatedRecordItem[] {
  const artist = input.artistName
  const track = songOrTrack(input) || input.titleUsed
  return records
    .filter((r) => {
      if (isCurrentRecord(input, "youtube-thumbnail", r.id)) return false
      if (matches(r.artistName, artist) && matches(r.trackTitle, track)) return true
      if (matches(r.artistName, artist) && hasText(artist)) return true
      if (fuzzyContains(input.titleUsed, r.videoTitle)) return true
      return false
    })
    .map((r) =>
      makeItem(
        "youtube-thumbnail",
        r.id,
        [r.artistName, r.videoTitle || r.trackTitle].filter(Boolean).join(" — ") ||
          "Thumbnail",
        r.contentFormat || r.videoType,
        "Same artist & track",
        r.updatedAt,
      ),
    )
}

function matchReleasePlans(
  input: GetRelatedRecordsInput,
  plans: ReleasePlan[],
): RelatedRecordItem[] {
  const artist = input.artistName
  const song = songOrTrack(input)
  return plans
    .filter((plan) => {
      if (isCurrentRecord(input, "release-plan", plan.id)) return false
      if (matches(plan.artistName, artist) && matches(plan.songTitle, song)) return true
      if (matches(plan.artistName, artist) && hasText(artist) && !hasText(song)) return true
      if (fuzzyContains(input.productOrReleaseName, plan.songTitle)) return true
      return false
    })
    .map((plan) =>
      makeItem(
        "release-plan",
        plan.id,
        [plan.artistName, plan.songTitle].filter(Boolean).join(" — ") || "Release plan",
        plan.releaseDate || plan.primaryGoal,
        "Same artist & song",
        plan.updatedAt,
      ),
    )
}

function matchSocial(
  input: GetRelatedRecordsInput,
  records: SocialRepurposingRecord[],
): RelatedRecordItem[] {
  const name = input.campaignName || input.relatedCampaign
  const track = songOrTrack(input)
  return records
    .filter((r) => {
      if (isCurrentRecord(input, "social-repurposing", r.id)) return false
      if (matches(r.campaignName, name)) return true
      if (fuzzyContains(r.sourceContent, track) && hasText(track)) return true
      if (matches(r.campaignName, input.campaignName)) return true
      return false
    })
    .map((r) =>
      makeItem(
        "social-repurposing",
        r.id,
        r.campaignName || r.contentType || "Social campaign",
        r.businessArea || r.platforms,
        matches(r.campaignName, name) ? "Same campaign name" : "Related content",
        r.updatedAt,
      ),
    )
}

function matchEmail(
  input: GetRelatedRecordsInput,
  records: EmailCampaignRecord[],
): RelatedRecordItem[] {
  const name = input.campaignName || input.relatedCampaign
  const product = input.productOrReleaseName || input.productName || input.finalTitle
  return records
    .filter((r) => {
      if (isCurrentRecord(input, "email-campaign", r.id)) return false
      if (matches(r.campaignName, name)) return true
      if (matches(r.productOrReleaseName, product)) return true
      if (matches(r.productOrReleaseName, songOrTrack(input))) return true
      return false
    })
    .map((r) =>
      makeItem(
        "email-campaign",
        r.id,
        r.campaignName || "Email campaign",
        [r.campaignType, r.productOrReleaseName].filter(Boolean).join(" · "),
        matches(r.campaignName, name) ? "Same campaign name" : "Same product/release",
        r.updatedAt,
      ),
    )
}

function matchAnalytics(
  input: GetRelatedRecordsInput,
  records: AnalyticsRecord[],
): RelatedRecordItem[] {
  const artist = input.artistName
  const song = songOrTrack(input) || input.itemName || input.titleUsed
  const campaign = input.relatedCampaign || input.campaignName
  return records
    .filter((r) => {
      if (isCurrentRecord(input, "analytics", r.id)) return false
      if (matches(r.relatedCampaign, campaign)) return true
      if (matches(r.relatedArtist, artist) && matches(r.relatedSong, song)) return true
      if (matches(r.relatedSong, song) && hasText(song)) return true
      if (matches(r.itemName, input.itemName) && hasText(input.itemName)) return true
      if (matches(r.titleUsed, input.titleUsed) && hasText(input.titleUsed)) return true
      return false
    })
    .map((r) =>
      makeItem(
        "analytics",
        r.id,
        r.itemName || "Analytics record",
        [r.itemType, r.platform].filter(Boolean).join(" · "),
        matches(r.relatedCampaign, campaign)
          ? "Same related campaign"
          : "Same artist/song or title",
        r.updatedAt,
      ),
    )
}

function matchMerch(
  input: GetRelatedRecordsInput,
  ideas: MerchIdea[],
): RelatedRecordItem[] {
  const niche = input.niche
  const product = input.selectedProductTitle || input.productName || input.selectedConceptName
  return ideas
    .filter((idea) => {
      if (isCurrentRecord(input, "merch-idea", idea.id)) return false
      if (matches(idea.niche, niche)) return true
      if (matches(idea.selectedProductTitle, product)) return true
      if (matches(idea.selectedConceptName, input.selectedConceptName)) return true
      if (fuzzyContains(input.campaignName, idea.niche)) return true
      return false
    })
    .map((idea) =>
      makeItem(
        "merch-idea",
        idea.id,
        idea.selectedConceptName || idea.noun || "Merch idea",
        [idea.niche, idea.productType].filter(Boolean).join(" · "),
        "Same niche or product concept",
        idea.updatedAt,
      ),
    )
}

function matchProductListings(
  input: GetRelatedRecordsInput,
  listings: ProductListing[],
): RelatedRecordItem[] {
  const niche = input.niche
  const title =
    input.finalTitle || input.designConcept || input.productName || input.productOrReleaseName
  return listings
    .filter((listing) => {
      if (isCurrentRecord(input, "product-listing", listing.id)) return false
      if (matches(listing.niche, niche)) return true
      if (matches(listing.finalTitle, title)) return true
      if (matches(listing.designConcept, input.designConcept)) return true
      if (matches(listing.finalTitle, input.productOrReleaseName)) return true
      if (fuzzyContains(input.campaignName, listing.finalTitle)) return true
      if (fuzzyContains(input.productName, listing.finalTitle)) return true
      return false
    })
    .map((listing) =>
      makeItem(
        "product-listing",
        listing.id,
        listing.finalTitle || listing.designConcept || "Product listing",
        [listing.niche, listing.productType].filter(Boolean).join(" · "),
        "Same niche or product title",
        listing.updatedAt,
      ),
    )
}

function matchMockups(
  input: GetRelatedRecordsInput,
  records: MockupPromptRecord[],
): RelatedRecordItem[] {
  const niche = input.niche
  const project = input.projectName
  return records
    .filter((r) => {
      if (isCurrentRecord(input, "mockup-prompt", r.id)) return false
      if (matches(r.niche, niche)) return true
      if (matches(r.projectName, project)) return true
      if (fuzzyContains(r.mockupType, "thumbnail") && input.currentType === "youtube-thumbnail")
        return true
      if (matches(r.productType, input.mockupType)) return true
      return false
    })
    .map((r) =>
      makeItem(
        "mockup-prompt",
        r.id,
        r.projectName || r.mockupType || "Mockup prompt",
        [r.niche, r.productType].filter(Boolean).join(" · "),
        "Same niche or project",
        r.updatedAt,
      ),
    )
}

function matchCampaignsByFields(
  input: GetRelatedRecordsInput,
  campaigns: CampaignRecord[],
): RelatedRecordItem[] {
  return campaigns
    .filter((c) => {
      if (isCurrentRecord(input, "campaign", c.id)) return false
      if (input.campaignId && c.id === input.campaignId) return false
      if (matches(c.campaignName, input.campaignName)) return true
      if (matches(c.artistName, input.artistName) && hasText(input.artistName)) return true
      if (matches(c.songTitle, songOrTrack(input)) && hasText(songOrTrack(input))) return true
      if (matches(c.productName, input.productName) && hasText(input.productName)) return true
      if (matches(c.niche, input.niche) && hasText(input.niche)) return true
      return false
    })
    .map((c) =>
      makeItem(
        "campaign",
        c.id,
        c.campaignName || "Untitled campaign",
        [c.campaignType, c.status].filter(Boolean).join(" · "),
        "Matching campaign fields",
        c.updatedAt,
      ),
    )
}

export function getRelatedRecordsFromStore(
  store: CampaignLinkableStoreSlice & {
    campaigns: CampaignRecord[]
    artistRecords: import("@/lib/types").ArtistRecord[]
  },
  input: GetRelatedRecordsInput,
): RelatedRecordItem[] {
  let items: RelatedRecordItem[] = []

  const push = (...groups: RelatedRecordItem[][]) => {
    items.push(...groups.flat())
  }

  switch (input.currentType) {
    case "youtube-packaging":
      push(
        matchThumbnails(input, store.youtubeThumbnailRecords),
        matchReleasePlans(input, store.releasePlans),
        matchSocial(input, store.socialRepurposingRecords),
        matchAnalytics(input, store.analyticsRecords),
      )
      break
    case "youtube-thumbnail":
      push(
        matchYouTubePackages(input, store.youtubePackages),
        matchReleasePlans(input, store.releasePlans),
        matchAnalytics(input, store.analyticsRecords),
      )
      break
    case "release-plan":
      push(
        matchYouTubePackages(input, store.youtubePackages),
        matchThumbnails(input, store.youtubeThumbnailRecords),
        matchSocial(input, store.socialRepurposingRecords),
        matchEmail(input, store.emailCampaignRecords),
        matchAnalytics(input, store.analyticsRecords),
      )
      break
    case "social-repurposing":
      push(
        matchYouTubePackages(input, store.youtubePackages),
        matchReleasePlans(input, store.releasePlans),
        matchProductListings(input, store.productListings),
        matchEmail(input, store.emailCampaignRecords),
      )
      break
    case "email-campaign":
      push(
        matchSocial(input, store.socialRepurposingRecords),
        matchProductListings(input, store.productListings),
        matchReleasePlans(input, store.releasePlans),
      )
      break
    case "analytics":
      push(
        matchYouTubePackages(input, store.youtubePackages),
        matchThumbnails(input, store.youtubeThumbnailRecords),
        matchReleasePlans(input, store.releasePlans),
        matchProductListings(input, store.productListings),
        matchCampaignsByFields(input, store.campaigns),
      )
      break
    case "merch-idea":
      push(
        matchProductListings(input, store.productListings),
        matchMockups(input, store.mockupPromptRecords),
        matchSocial(input, store.socialRepurposingRecords),
        matchCampaignsByFields(input, store.campaigns),
      )
      break
    case "product-listing":
      push(
        matchMerch(input, store.merchIdeas),
        matchMockups(input, store.mockupPromptRecords),
        matchSocial(input, store.socialRepurposingRecords),
        matchEmail(input, store.emailCampaignRecords),
        matchCampaignsByFields(input, store.campaigns),
      )
      break
    case "mockup-prompt":
      push(
        matchMerch(input, store.merchIdeas),
        matchProductListings(input, store.productListings),
        matchThumbnails(input, store.youtubeThumbnailRecords),
        matchCampaignsByFields(input, store.campaigns),
      )
      break
    case "artist-crm":
      push(
        matchCampaignsByFields(input, store.campaigns),
        matchReleasePlans(input, store.releasePlans),
        matchYouTubePackages(input, store.youtubePackages),
        matchThumbnails(input, store.youtubeThumbnailRecords),
        matchAnalytics(input, store.analyticsRecords),
        matchEmail(input, store.emailCampaignRecords),
        matchSocial(input, store.socialRepurposingRecords),
      )
      break
    default:
      break
  }

  items = addCampaignLinks(items, input, store.campaigns)
  return limitByType(dedupeAndLimit(items))
}

export function groupRelatedRecordsByCategory(
  records: RelatedRecordItem[],
): { category: RelatedRecordCategory; items: RelatedRecordItem[] }[] {
  const order: RelatedRecordCategory[] = [
    "Operations",
    "Planning",
    "YouTube",
    "Marketing",
    "Commerce",
    "Analytics",
  ]
  const map = new Map<RelatedRecordCategory, RelatedRecordItem[]>()
  for (const record of records) {
    const list = map.get(record.category) ?? []
    list.push(record)
    map.set(record.category, list)
  }
  return order
    .filter((cat) => (map.get(cat)?.length ?? 0) > 0)
    .map((category) => ({ category, items: map.get(category)! }))
}

export function groupCampaignLinkedRecords(
  records: import("@/lib/types").CampaignLinkedRecord[],
): {
  group: (typeof CAMPAIGN_LINK_TYPE_GROUPS)[number]
  records: import("@/lib/types").CampaignLinkedRecord[]
}[] {
  const assigned = new Set<string>()
  const result: {
    group: (typeof CAMPAIGN_LINK_TYPE_GROUPS)[number]
    records: import("@/lib/types").CampaignLinkedRecord[]
  }[] = []

  for (const group of CAMPAIGN_LINK_TYPE_GROUPS) {
    const matched = records.filter((r) => {
      const key = `${r.type}:${r.id}`
      if (!group.types.includes(r.type as RelatedRecordType)) return false
      assigned.add(key)
      return true
    })
    result.push({ group, records: matched })
  }

  const other = records.filter((r) => !assigned.has(`${r.type}:${r.id}`))
  if (other.length) {
    result.push({
      group: {
        id: "other",
        label: "Other",
        category: "Operations",
        types: [],
      },
      records: other,
    })
  }

  return result
}
