import type { CampaignLinkableStoreSlice } from "@/lib/campaigns"
import {
  buildLaunchDashboardData,
  type CampaignRelatedRecordsBundle,
  resolveCampaignRelatedRecords,
} from "@/lib/campaign-launch-dashboard"
import {
  DEFAULT_CAMPAIGN_PACK_TEMPLATE_ID,
  getCampaignPackTemplate,
  type CampaignPackSectionKey,
  type CampaignPackTemplateId,
} from "@/lib/data/campaign-pack-templates"
import { formatPublishingChecklistMarkdown } from "@/lib/data/publishing-checklist"
import type {
  AnalyticsRecord,
  ArtistRecord,
  CampaignLinkedRecord,
  CampaignLinkedRecordType,
  CampaignRecord,
  CampaignTask,
  EmailCampaignRecord,
  MerchIdea,
  MockupPromptRecord,
  ProductListing,
  ReleasePlan,
  SocialRepurposingRecord,
  YouTubePackage,
  YouTubeThumbnailRecord,
} from "@/lib/types"

export type { CampaignRelatedRecordsBundle }

export interface CampaignExportMissingAsset {
  key: string
  label: string
  suggestedAction?: string
}

export interface CampaignExportSectionContext {
  campaign: CampaignRecord
  relatedRecords: CampaignRelatedRecordsBundle
  missingAssets: CampaignExportMissingAsset[]
  readinessLabel: string
  taskProgress: string
  healthNotes: string
  generatedAt: Date
  templateId: CampaignPackTemplateId
  templateName: string
}

export interface CampaignExportPackResult {
  campaign: CampaignRecord
  templateId: CampaignPackTemplateId
  templateName: string
  relatedRecords: CampaignRelatedRecordsBundle
  missingAssets: CampaignExportMissingAsset[]
  markdown: string
  generatedAt: string
}

function mdValue(value: string | number | undefined | null, fallback = "Not provided."): string {
  if (value === undefined || value === null) return fallback
  const text = String(value).trim()
  return text || fallback
}

function mdBullet(label: string, value: string | number | undefined | null): string {
  return `- ${label}: ${mdValue(value)}`
}

function mdMultiline(label: string, value: string | undefined | null): string {
  const text = (value ?? "").trim()
  if (!text) return `- ${label}: Not provided.`
  return `- ${label}:\n\n${text}\n`
}

function mdCopySection(heading: string, value: string | undefined | null): string {
  const text = (value ?? "").trim()
  if (!text) return `### ${heading}\n\nNot provided.\n`
  return `### ${heading}\n\n${text}\n`
}

function formatGeneratedAt(date: Date): string {
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function formatLaunchDate(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return "Not provided."
  const parsed = Date.parse(trimmed)
  if (Number.isNaN(parsed)) return trimmed
  return new Date(parsed).toLocaleDateString(undefined, { dateStyle: "medium" })
}

function formatArtistPlatformLinks(artist: ArtistRecord): string {
  const entries = [
    artist.youtubeChannel ? `YouTube: ${artist.youtubeChannel}` : "",
    artist.spotifyLink ? `Spotify: ${artist.spotifyLink}` : "",
    artist.appleMusicLink ? `Apple Music: ${artist.appleMusicLink}` : "",
    artist.amazonMusicLink ? `Amazon Music: ${artist.amazonMusicLink}` : "",
    artist.websiteLink ? `Website: ${artist.websiteLink}` : "",
    artist.merchStoreLink ? `Merch Store: ${artist.merchStoreLink}` : "",
    artist.socialLinks ? `Social: ${artist.socialLinks}` : "",
  ].filter(Boolean)

  return entries.length ? entries.join("\n") : "Not provided."
}

function formatTasksSection(tasks: CampaignTask[]): string {
  if (!tasks.length) return "No tasks defined.\n"

  return (
    [...tasks]
      .sort((a, b) => a.order - b.order)
      .map((task) => {
        const done = task.status === "Done" || task.status === "Skipped"
        const due = task.dueDate.trim() ? ` (due: ${task.dueDate})` : ""
        const title = task.title.trim() || "Untitled task"
        return `- [${done ? "x" : " "}] ${title}${due}`
      })
      .join("\n") + "\n"
  )
}

function formatLinkedRecordsSection(records: CampaignLinkedRecord[]): string {
  if (!records.length) return "No linked records.\n"

  return (
    records
      .map((record) => {
        const lines = [
          `- Type: ${mdValue(record.type)}`,
          `  Title: ${mdValue(record.title)}`,
          `  Href: ${mdValue(record.href)}`,
        ]
        if (record.notes.trim()) {
          lines.push(`  Notes: ${record.notes.trim()}`)
        }
        return lines.join("\n")
      })
      .join("\n\n") + "\n"
  )
}

function formatLinkedRecordsByTypes(
  records: CampaignLinkedRecord[],
  types: CampaignLinkedRecordType[],
): string {
  const filtered = records.filter((record) => types.includes(record.type))
  if (!filtered.length) {
    return `No ${types.join(" / ")} records linked.\n`
  }
  return formatLinkedRecordsSection(filtered)
}

function formatMissingAssetsSection(missingAssets: CampaignExportMissingAsset[]): string {
  if (!missingAssets.length) {
    return "All required assets are present.\n"
  }

  return (
    missingAssets
      .map((asset) => {
        const action = asset.suggestedAction?.trim()
        return action ? `- ${asset.label} — ${action}` : `- ${asset.label}`
      })
      .join("\n") + "\n"
  )
}

function filterMissingAssets(
  missingAssets: CampaignExportMissingAsset[],
  keys: string[],
): CampaignExportMissingAsset[] {
  const keySet = new Set(keys)
  return missingAssets.filter((asset) => keySet.has(asset.key))
}

const DEFAULT_ANALYTICS_CHECKLIST = [
  "Record 24-hour views",
  "Record 24-hour CTR",
  "Record 24-hour likes/comments",
  "Record 7-day views",
  "Record 7-day CTR",
  "Record 30-day performance",
  "Note what worked",
  "Note what to improve",
]

const ANALYTICS_24H_CHECKLIST = [
  "Record views at 24 hours",
  "Record CTR at 24 hours",
  "Record likes and comments at 24 hours",
  "Capture top traffic sources",
  "Note early audience retention",
]

const ANALYTICS_7D_CHECKLIST = [
  "Record 7-day views",
  "Record 7-day CTR",
  "Compare performance vs. first 24 hours",
  "Review comments and community response",
  "Identify best-performing distribution channel",
]

const ANALYTICS_30D_CHECKLIST = [
  "Record 30-day views and engagement",
  "Review long-tail traffic patterns",
  "Assess conversion to streams/sales",
  "Document sustained vs. spike performance",
  "Plan follow-up content or resend",
]

function formatChecklist(heading: string, items: string[]): string {
  const lines = [`## ${heading}`, ""]
  for (const item of items) {
    lines.push(`- [ ] ${item}`)
  }
  lines.push("")
  return lines.join("\n")
}

function sectionArtist(artist: ArtistRecord | null): string {
  if (!artist) {
    return "## Artist / Brand Context\n\nNo linked artist profile found.\n"
  }

  return [
    "## Artist / Brand Context",
    "",
    mdBullet("Artist Name", artist.artistName),
    mdBullet("Artist Type", artist.artistType),
    mdBullet("Genre", artist.genre),
    mdBullet("Sub-genres", artist.subGenres),
    mdBullet("Mood", artist.mood),
    mdMultiline("Brand Description", artist.brandDescription),
    mdMultiline("Visual Identity", artist.visualIdentity),
    mdBullet("Target Audience", artist.targetAudience),
    mdBullet("Content Style", artist.contentStyle),
    mdMultiline("Platform Links", formatArtistPlatformLinks(artist)),
    "",
  ].join("\n")
}

function sectionReleasePlan(plan: ReleasePlan | null): string {
  if (!plan) {
    return "## Release Plan\n\nNo release plan linked yet.\n"
  }

  return [
    "## Release Plan",
    "",
    mdMultiline("Strategy Summary", plan.finalStrategySummary),
    mdMultiline("Target Listener", plan.finalTargetListener),
    mdMultiline("Pre-Release Plan", plan.finalPreReleasePlan),
    mdMultiline("Release Day Checklist", plan.finalReleaseDayChecklist),
    mdMultiline("Post-Release Plan", plan.finalPostReleasePlan),
    mdMultiline("Short-Form Ideas", plan.finalShortFormIdeas),
    mdMultiline("Merch Tie-Ins", plan.finalMerchTieIns),
    mdMultiline("Priority Tasks", plan.finalPriorityTasks),
    mdMultiline("Checklist", plan.finalChecklist),
    "",
  ].join("\n")
}

function sectionYouTubePackage(pkg: YouTubePackage | null): string {
  if (!pkg) {
    return "## YouTube Upload Package\n\nNo YouTube package linked yet.\n"
  }

  return [
    "## YouTube Upload Package",
    "",
    mdCopySection("Title", pkg.finalTitle),
    mdCopySection("Description", pkg.finalDescription),
    mdCopySection("Tags", pkg.finalTags),
    mdCopySection("Hashtags", pkg.finalHashtags),
    mdCopySection("Pinned Comment", pkg.finalPinnedComment),
    mdCopySection("Thumbnail Text", pkg.finalThumbnailText),
    mdCopySection("Shorts Caption", pkg.finalShortsCaption),
    mdCopySection("Community Post", pkg.finalCommunityPost),
    mdBullet("Streaming Link", pkg.streamingLink),
    mdMultiline("Notes", pkg.notes),
    "",
  ].join("\n")
}

function sectionYouTubePackageSummary(pkg: YouTubePackage | null): string {
  if (!pkg) {
    return "## YouTube Upload Package Summary\n\nNo YouTube package linked yet.\n"
  }

  return [
    "## YouTube Upload Package Summary",
    "",
    mdBullet("Title", pkg.finalTitle),
    mdMultiline("Description", pkg.finalDescription),
    mdBullet("Tags", pkg.finalTags),
    mdBullet("Hashtags", pkg.finalHashtags),
    "",
  ].join("\n")
}

function sectionThumbnail(thumbnail: YouTubeThumbnailRecord | null): string {
  if (!thumbnail) {
    return "## Thumbnail Package\n\nNo YouTube thumbnail linked yet.\n"
  }

  return [
    "## Thumbnail Package",
    "",
    mdMultiline("Final Concept", thumbnail.finalConcept),
    mdMultiline("Final Text Overlay", thumbnail.finalTextOverlay),
    mdMultiline("Final Composition", thumbnail.finalComposition),
    mdMultiline("Final Color Direction", thumbnail.finalColorDirection),
    mdMultiline("Final Image Prompt", thumbnail.finalImagePrompt),
    mdMultiline("Final Alt Variation", thumbnail.finalAltVariation),
    mdMultiline("Final Shorts Version", thumbnail.finalShortsVersion),
    "",
  ].join("\n")
}

function sectionThumbnailTextConcept(
  thumbnail: YouTubeThumbnailRecord | null,
  youtubePackage: YouTubePackage | null,
): string {
  const concept = thumbnail?.finalConcept?.trim() || thumbnail?.finalTextOverlay?.trim()
  const ytText = youtubePackage?.finalThumbnailText?.trim()

  if (!concept && !ytText) {
    return "## Thumbnail Text / Concept\n\nNo thumbnail concept or text linked yet.\n"
  }

  const lines = ["## Thumbnail Text / Concept", ""]
  if (concept) lines.push(mdMultiline("Concept", concept))
  if (ytText) lines.push(mdMultiline("Thumbnail Text", ytText))
  lines.push("")
  return lines.join("\n")
}

function sectionSocial(social: SocialRepurposingRecord | null): string {
  if (!social) {
    return "## Social Repurposing Package\n\nNo social repurposing record linked yet.\n"
  }

  return [
    "## Social Repurposing Package",
    "",
    mdMultiline("Core Message", social.finalCoreMessage),
    mdMultiline("TikTok Caption", social.finalTikTokCaption),
    mdMultiline("Instagram Caption", social.finalInstagramCaption),
    mdMultiline("X Post", social.finalXPost),
    mdMultiline("YouTube Shorts Idea", social.finalYouTubeShortsIdea),
    mdMultiline("YouTube Community Post", social.finalYouTubeCommunityPost),
    mdMultiline("Email Snippet", social.finalEmailSnippet),
    mdMultiline("Hashtags", social.finalHashtags),
    mdBullet("CTA", social.finalCTA),
    "",
  ].join("\n")
}

function sectionEmail(email: EmailCampaignRecord | null): string {
  if (!email) {
    return "## Email Campaign\n\nNo email campaign linked yet.\n"
  }

  return [
    "## Email Campaign",
    "",
    mdMultiline("Subject Line", email.finalSubjectLine),
    mdMultiline("Preview Text", email.finalPreviewText),
    mdMultiline("Email Body", email.finalEmailBody),
    mdBullet("CTA", email.finalCTA),
    mdMultiline("Follow-Up Email", email.finalFollowUpEmail),
    mdMultiline("Resend Subject", email.finalResendSubject),
    mdMultiline("Resend Body", email.finalResendBody),
    "",
  ].join("\n")
}

function sectionMerch(merch: MerchIdea | null): string {
  if (!merch) {
    return "## Merch Idea\n\nNo merch idea linked yet.\n"
  }

  return [
    "## Merch Idea",
    "",
    mdBullet("Selected Concept Name", merch.selectedConceptName),
    mdBullet("Slogan", merch.selectedSlogan),
    mdMultiline("Design Direction", merch.selectedDesignDirection),
    mdBullet("Product Title", merch.selectedProductTitle),
    mdMultiline("Product Description", merch.selectedProductDescription),
    mdBullet("Tags", merch.selectedTags),
    mdMultiline("Mockup Idea", merch.selectedMockupIdea),
    mdMultiline("Social Caption", merch.selectedSocialCaption),
    "",
  ].join("\n")
}

function sectionProductListing(listing: ProductListing | null): string {
  if (!listing) {
    return "## Product Listing\n\nNo product listing linked yet.\n"
  }

  return [
    "## Product Listing",
    "",
    mdBullet("Final Title", listing.finalTitle),
    mdMultiline("Short Description", listing.finalShortDescription),
    mdMultiline("Long Description", listing.finalLongDescription),
    mdMultiline("Bullet Points", listing.finalBulletPoints),
    mdBullet("Tags", listing.finalTags),
    mdBullet("Collection", listing.finalCollection),
    mdBullet("CTA", listing.finalCTA),
    mdMultiline("Social Caption", listing.finalSocialCaption),
    mdBullet("Email Subject", listing.finalEmailSubject),
    "",
  ].join("\n")
}

function sectionMockup(mockup: MockupPromptRecord | null): string {
  if (!mockup) {
    return "## Mockup Prompt\n\nNo mockup prompt linked yet.\n"
  }

  return [
    "## Mockup Prompt",
    "",
    mdMultiline("Final Image Prompt", mockup.finalImagePrompt),
    mdMultiline("Negative Prompt", mockup.finalNegativePrompt),
    mdMultiline("Layout Notes", mockup.finalLayoutNotes),
    mdMultiline("Text Placement", mockup.finalTextPlacement),
    mdMultiline("Usage Notes", mockup.finalUsageNotes),
    "",
  ].join("\n")
}

function sectionAnalytics(analytics: AnalyticsRecord | null): string {
  const lines = ["## Analytics Tracking Checklist", ""]

  if (analytics) {
    lines.push(
      mdBullet("Item Name", analytics.itemName),
      mdBullet("Item Type", analytics.itemType),
      mdBullet("Platform", analytics.platform),
      mdBullet("Related Campaign", analytics.relatedCampaign),
      mdBullet("Related Artist", analytics.relatedArtist),
      mdBullet("Related Song", analytics.relatedSong),
      mdBullet("Title Used", analytics.titleUsed),
      mdBullet("Thumbnail Text", analytics.thumbnailText),
      mdBullet("Tags Used", analytics.tagsUsed),
      mdBullet("CTA", analytics.callToAction),
      "",
      "**Current Metrics**",
      "",
      mdBullet("Views", analytics.views),
      mdBullet("Impressions", analytics.impressions),
      mdBullet("Clicks", analytics.clicks),
      mdBullet("Click-Through Rate", analytics.clickThroughRate),
      mdBullet("Likes", analytics.likes),
      mdBullet("Comments", analytics.comments),
      mdBullet("Shares", analytics.shares),
      mdBullet("Saves", analytics.saves),
      mdBullet("Subscribers Gained", analytics.subscribersGained),
      mdBullet("Watch Time (hours)", analytics.watchTimeHours),
      mdBullet("Revenue", analytics.revenue),
      mdBullet("Sales", analytics.sales),
      mdBullet("Conversion Rate", analytics.conversionRate),
      mdMultiline("What Worked", analytics.whatWorked),
      mdMultiline("What Did Not Work", analytics.whatDidNotWork),
      mdMultiline("Improvement Ideas", analytics.improvementIdeas),
      "",
    )
  } else {
    lines.push("No analytics record linked yet.", "")
  }

  lines.push("**Default Checklist**", "")
  for (const item of DEFAULT_ANALYTICS_CHECKLIST) {
    lines.push(`- [ ] ${item}`)
  }
  lines.push("")

  return lines.join("\n")
}

function sectionAnalyticsRecord(analytics: AnalyticsRecord | null): string {
  if (!analytics) {
    return "## Analytics Record\n\nNo analytics record linked yet.\n"
  }

  return [
    "## Analytics Record",
    "",
    mdBullet("Item Name", analytics.itemName),
    mdBullet("Item Type", analytics.itemType),
    mdBullet("Platform", analytics.platform),
    mdBullet("Related Campaign", analytics.relatedCampaign),
    mdBullet("Related Artist", analytics.relatedArtist),
    mdBullet("Related Song", analytics.relatedSong),
    mdBullet("Title Used", analytics.titleUsed),
    mdBullet("Thumbnail Text", analytics.thumbnailText),
    mdBullet("Tags Used", analytics.tagsUsed),
    mdBullet("CTA", analytics.callToAction),
    "",
  ].join("\n")
}

function sectionAnalyticsCurrentMetrics(analytics: AnalyticsRecord | null): string {
  if (!analytics) {
    return "## Current Metrics\n\nNo analytics record linked yet.\n"
  }

  return [
    "## Current Metrics",
    "",
    mdBullet("Views", analytics.views),
    mdBullet("Impressions", analytics.impressions),
    mdBullet("Clicks", analytics.clicks),
    mdBullet("Click-Through Rate", analytics.clickThroughRate),
    mdBullet("Likes", analytics.likes),
    mdBullet("Comments", analytics.comments),
    mdBullet("Shares", analytics.shares),
    mdBullet("Saves", analytics.saves),
    mdBullet("Subscribers Gained", analytics.subscribersGained),
    mdBullet("Watch Time (hours)", analytics.watchTimeHours),
    mdBullet("Revenue", analytics.revenue),
    mdBullet("Sales", analytics.sales),
    mdBullet("Conversion Rate", analytics.conversionRate),
    "",
  ].join("\n")
}

function sectionArtistField(
  heading: string,
  artist: ArtistRecord | null,
  field: keyof ArtistRecord,
  multiline = false,
): string {
  if (!artist) {
    return `## ${heading}\n\nNo linked artist profile found.\n`
  }
  const value = artist[field]
  if (typeof value !== "string") {
    return `## ${heading}\n\nNot provided.\n`
  }
  return multiline
    ? [`## ${heading}`, "", mdMultiline(heading, value), ""].join("\n")
    : [`## ${heading}`, "", mdBullet(heading, value), ""].join("\n")
}

function sectionEmailRelatedLink(
  campaign: CampaignRecord,
  youtubePackage: YouTubePackage | null,
  productListing: ProductListing | null,
): string {
  const lines = ["## Related Product / Release Link", ""]
  const streaming = youtubePackage?.streamingLink?.trim()
  const product = campaign.productName.trim() || productListing?.finalTitle?.trim()
  const song = campaign.songTitle.trim()

  if (streaming) lines.push(mdBullet("Streaming Link", streaming))
  if (song) lines.push(mdBullet("Release / Song", song))
  if (product) lines.push(mdBullet("Product", product))
  if (lines.length === 2) {
    lines.push("No related product or release link provided.")
  }
  lines.push("")
  return lines.join("\n")
}

function sectionCommerceStoreDetails(
  listing: ProductListing | null,
  merch: MerchIdea | null,
  artist: ArtistRecord | null,
): string {
  const lines = ["## Store / Product Details", ""]
  if (listing) {
    lines.push(
      mdBullet("Product Title", listing.finalTitle),
      mdMultiline("Short Description", listing.finalShortDescription),
      mdBullet("Collection", listing.finalCollection),
      mdBullet("CTA", listing.finalCTA),
    )
  } else if (merch) {
    lines.push(
      mdBullet("Product Title", merch.selectedProductTitle),
      mdMultiline("Product Description", merch.selectedProductDescription),
      mdBullet("Tags", merch.selectedTags),
    )
  } else {
    lines.push("No product listing or merch idea linked yet.")
  }
  if (artist?.merchStoreLink?.trim()) {
    lines.push(mdBullet("Merch Store", artist.merchStoreLink))
  }
  lines.push("")
  return lines.join("\n")
}

function sectionMerchSocialCaption(
  merch: MerchIdea | null,
  listing: ProductListing | null,
): string {
  const caption =
    listing?.finalSocialCaption?.trim() || merch?.selectedSocialCaption?.trim()
  const text = caption?.trim()
  if (!text) return "## Social Caption\n\nNot provided.\n"
  return `## Social Caption\n\n${text}\n`
}

function sectionMerchEmailSubject(
  listing: ProductListing | null,
  email: EmailCampaignRecord | null,
): string {
  const subject =
    listing?.finalEmailSubject?.trim() || email?.finalSubjectLine?.trim()
  const text = subject?.trim()
  if (!text) return "## Email Subject\n\nNot provided.\n"
  return `## Email Subject\n\n${text}\n`
}

function youtubeFieldSection(
  heading: string,
  pkg: YouTubePackage | null,
  field: keyof YouTubePackage,
): string {
  if (!pkg) {
    return `## ${heading}\n\nNo YouTube package linked yet.\n`
  }
  const value = pkg[field]
  if (typeof value !== "string") {
    return `## ${heading}\n\nNot provided.\n`
  }
  return [`## ${heading}`, "", mdMultiline(heading, value), ""].join("\n")
}

function socialFieldSection(
  heading: string,
  social: SocialRepurposingRecord | null,
  field: keyof SocialRepurposingRecord,
): string {
  if (!social) {
    return `## ${heading}\n\nNo social repurposing record linked yet.\n`
  }
  const value = social[field]
  if (typeof value !== "string") {
    return `## ${heading}\n\nNot provided.\n`
  }
  return [`## ${heading}`, "", mdMultiline(heading, value), ""].join("\n")
}

function emailFieldSection(
  heading: string,
  email: EmailCampaignRecord | null,
  field: keyof EmailCampaignRecord,
): string {
  if (!email) {
    return `## ${heading}\n\nNo email campaign linked yet.\n`
  }
  const value = email[field]
  if (typeof value !== "string") {
    return `## ${heading}\n\nNot provided.\n`
  }
  return [`## ${heading}`, "", mdMultiline(heading, value), ""].join("\n")
}

export function renderCampaignSummary(ctx: CampaignExportSectionContext): string {
  const { campaign } = ctx
  return [
    "## Campaign Summary",
    "",
    mdBullet("Campaign Type", campaign.campaignType),
    mdBullet("Status", campaign.status),
    mdBullet("Priority", campaign.priority),
    mdBullet("Artist", campaign.artistName),
    mdBullet("Song", campaign.songTitle),
    mdBullet("Product", campaign.productName),
    mdBullet("Niche", campaign.niche),
    mdBullet("Launch Date", formatLaunchDate(campaign.launchDate)),
    mdBullet("Primary Goal", campaign.primaryGoal),
    mdBullet("Target Audience", campaign.targetAudience),
    "",
  ].join("\n")
}

export function renderReadinessSummary(ctx: CampaignExportSectionContext): string {
  const missingSummary =
    ctx.missingAssets.length > 0
      ? ctx.missingAssets.map((asset) => asset.label).join(", ")
      : "None"

  return [
    "## Readiness Summary",
    "",
    mdBullet("Asset Readiness", ctx.readinessLabel),
    mdBullet("Task Progress", ctx.taskProgress),
    mdBullet("Missing Assets", missingSummary),
    mdMultiline("Data Health Notes", ctx.healthNotes),
    "",
  ].join("\n")
}

export function renderArtistContext(ctx: CampaignExportSectionContext): string {
  return sectionArtist(ctx.relatedRecords.artist)
}

export function renderReleasePlan(ctx: CampaignExportSectionContext): string {
  return sectionReleasePlan(ctx.relatedRecords.releasePlan)
}

export function renderYouTubePackage(ctx: CampaignExportSectionContext): string {
  return sectionYouTubePackage(ctx.relatedRecords.youtubePackage)
}

export function renderThumbnailPackage(ctx: CampaignExportSectionContext): string {
  return sectionThumbnail(ctx.relatedRecords.youtubeThumbnail)
}

export function renderSocialPackage(ctx: CampaignExportSectionContext): string {
  return sectionSocial(ctx.relatedRecords.socialRepurposing)
}

export function renderEmailCampaign(ctx: CampaignExportSectionContext): string {
  return sectionEmail(ctx.relatedRecords.emailCampaign)
}

export function renderMerchIdea(ctx: CampaignExportSectionContext): string {
  return sectionMerch(ctx.relatedRecords.merchIdea)
}

export function renderProductListing(ctx: CampaignExportSectionContext): string {
  return sectionProductListing(ctx.relatedRecords.productListing)
}

export function renderMockupPrompt(ctx: CampaignExportSectionContext): string {
  return sectionMockup(ctx.relatedRecords.mockupPrompt)
}

export function renderAnalyticsChecklist(ctx: CampaignExportSectionContext): string {
  return sectionAnalytics(ctx.relatedRecords.analytics)
}

export function renderLaunchTasks(ctx: CampaignExportSectionContext): string {
  return ["## Launch Task Checklist", "", formatTasksSection(ctx.campaign.tasks)].join("\n")
}

export function renderPublishingChecklist(ctx: CampaignExportSectionContext): string {
  return formatPublishingChecklistMarkdown({
    campaignName: ctx.campaign.campaignName,
    campaignType: ctx.campaign.campaignType,
    publishingChecklist: ctx.campaign.publishingChecklist,
  })
}

export function renderMissingAssets(ctx: CampaignExportSectionContext): string {
  return [
    "## Missing Assets / Next Actions",
    "",
    formatMissingAssetsSection(ctx.missingAssets),
  ].join("\n")
}

export function renderLinkedRecords(ctx: CampaignExportSectionContext): string {
  return [
    "## Linked Records",
    "",
    formatLinkedRecordsSection(ctx.campaign.linkedRecords),
  ].join("\n")
}

const YOUTUBE_MISSING_KEYS = ["youtube-package", "youtube-thumbnail"]
const SOCIAL_MISSING_KEYS = ["social-repurposing"]
const COMMERCE_MISSING_KEYS = ["merch-idea", "product-listing", "mockup-prompt"]

function renderPackSection(
  key: CampaignPackSectionKey,
  ctx: CampaignExportSectionContext,
): string {
  const { relatedRecords, campaign, missingAssets } = ctx

  switch (key) {
    case "campaign-summary":
      return renderCampaignSummary(ctx)
    case "readiness-summary":
      return renderReadinessSummary(ctx)
    case "artist-context":
      return renderArtistContext(ctx)
    case "release-plan":
      return renderReleasePlan(ctx)
    case "youtube-package":
      return renderYouTubePackage(ctx)
    case "youtube-package-summary":
      return sectionYouTubePackageSummary(relatedRecords.youtubePackage)
    case "thumbnail-package":
      return renderThumbnailPackage(ctx)
    case "thumbnail-text-concept":
      return sectionThumbnailTextConcept(
        relatedRecords.youtubeThumbnail,
        relatedRecords.youtubePackage,
      )
    case "youtube-shorts-caption":
      return youtubeFieldSection("Shorts Caption", relatedRecords.youtubePackage, "finalShortsCaption")
    case "youtube-community-post":
      return youtubeFieldSection(
        "Community Post",
        relatedRecords.youtubePackage,
        "finalCommunityPost",
      )
    case "youtube-pinned-comment":
      return youtubeFieldSection(
        "Pinned Comment",
        relatedRecords.youtubePackage,
        "finalPinnedComment",
      )
    case "youtube-tags-hashtags":
      return [
        "## Tags / Hashtags",
        "",
        mdMultiline("Tags", relatedRecords.youtubePackage?.finalTags),
        mdMultiline("Hashtags", relatedRecords.youtubePackage?.finalHashtags),
        "",
      ].join("\n")
    case "social-package":
      return renderSocialPackage(ctx)
    case "social-shorts-ideas":
      return socialFieldSection(
        "Shorts Ideas",
        relatedRecords.socialRepurposing,
        "finalYouTubeShortsIdea",
      )
    case "social-tiktok-caption":
      return socialFieldSection(
        "TikTok Caption",
        relatedRecords.socialRepurposing,
        "finalTikTokCaption",
      )
    case "social-instagram-caption":
      return socialFieldSection(
        "Instagram Caption",
        relatedRecords.socialRepurposing,
        "finalInstagramCaption",
      )
    case "social-x-post":
      return socialFieldSection("X Post", relatedRecords.socialRepurposing, "finalXPost")
    case "social-youtube-community":
      return socialFieldSection(
        "YouTube Community Post",
        relatedRecords.socialRepurposing,
        "finalYouTubeCommunityPost",
      )
    case "social-email-snippet":
      return socialFieldSection(
        "Email Snippet",
        relatedRecords.socialRepurposing,
        "finalEmailSnippet",
      )
    case "social-hashtags":
      return socialFieldSection("Hashtags", relatedRecords.socialRepurposing, "finalHashtags")
    case "social-cta":
      return [
        "## CTA",
        "",
        mdBullet("CTA", relatedRecords.socialRepurposing?.finalCTA),
        "",
      ].join("\n")
    case "email-campaign":
      return renderEmailCampaign(ctx)
    case "email-subject-line":
      return emailFieldSection(
        "Subject Line",
        relatedRecords.emailCampaign,
        "finalSubjectLine",
      )
    case "email-preview-text":
      return emailFieldSection(
        "Preview Text",
        relatedRecords.emailCampaign,
        "finalPreviewText",
      )
    case "email-body":
      return emailFieldSection("Email Body", relatedRecords.emailCampaign, "finalEmailBody")
    case "email-cta":
      return [
        "## CTA",
        "",
        mdBullet("CTA", relatedRecords.emailCampaign?.finalCTA),
        "",
      ].join("\n")
    case "email-follow-up":
      return emailFieldSection(
        "Follow-Up Email",
        relatedRecords.emailCampaign,
        "finalFollowUpEmail",
      )
    case "email-resend-subject":
      return emailFieldSection(
        "Resend Subject",
        relatedRecords.emailCampaign,
        "finalResendSubject",
      )
    case "email-resend-body":
      return emailFieldSection("Resend Body", relatedRecords.emailCampaign, "finalResendBody")
    case "email-related-link":
      return sectionEmailRelatedLink(
        campaign,
        relatedRecords.youtubePackage,
        relatedRecords.productListing,
      )
    case "merch-idea":
      return renderMerchIdea(ctx)
    case "product-listing":
      return renderProductListing(ctx)
    case "mockup-prompt":
      return renderMockupPrompt(ctx)
    case "merch-social-caption":
      return sectionMerchSocialCaption(relatedRecords.merchIdea, relatedRecords.productListing)
    case "merch-email-subject":
      return sectionMerchEmailSubject(relatedRecords.productListing, relatedRecords.emailCampaign)
    case "commerce-store-details":
      return sectionCommerceStoreDetails(
        relatedRecords.productListing,
        relatedRecords.merchIdea,
        relatedRecords.artist,
      )
    case "analytics-checklist":
      return renderAnalyticsChecklist(ctx)
    case "analytics-record":
      return sectionAnalyticsRecord(relatedRecords.analytics)
    case "analytics-current-metrics":
      return sectionAnalyticsCurrentMetrics(relatedRecords.analytics)
    case "analytics-24h-checklist":
      return formatChecklist("24-hour Review Checklist", ANALYTICS_24H_CHECKLIST)
    case "analytics-7d-checklist":
      return formatChecklist("7-day Review Checklist", ANALYTICS_7D_CHECKLIST)
    case "analytics-30d-checklist":
      return formatChecklist("30-day Review Checklist", ANALYTICS_30D_CHECKLIST)
    case "analytics-what-worked":
      return [
        "## What Worked",
        "",
        (relatedRecords.analytics?.whatWorked ?? "").trim() || "Not provided.",
        "",
      ].join("\n")
    case "analytics-what-to-improve":
      return [
        "## What To Improve",
        "",
        (
          relatedRecords.analytics?.improvementIdeas ??
          relatedRecords.analytics?.whatDidNotWork ??
          ""
        ).trim() || "Not provided.",
        "",
      ].join("\n")
    case "analytics-next-actions":
      return [
        "## Next Actions",
        "",
        formatMissingAssetsSection(missingAssets),
      ].join("\n")
    case "artist-visual-identity":
      return sectionArtistField(
        "Visual Identity",
        relatedRecords.artist,
        "visualIdentity",
        true,
      )
    case "artist-target-audience":
      return sectionArtistField(
        "Target Audience",
        relatedRecords.artist,
        "targetAudience",
      )
    case "artist-content-style":
      return sectionArtistField("Content Style", relatedRecords.artist, "contentStyle")
    case "artist-platform-links":
      return relatedRecords.artist
        ? [
            "## Platform Links",
            "",
            formatArtistPlatformLinks(relatedRecords.artist),
            "",
          ].join("\n")
        : "## Platform Links\n\nNo linked artist profile found.\n"
    case "artist-related-campaigns":
      return [
        "## Related Campaigns",
        "",
        mdBullet("Current Campaign", campaign.campaignName),
        formatLinkedRecordsByTypes(campaign.linkedRecords, ["workflow", "workflow-run", "prompt-run"]),
      ].join("\n")
    case "artist-related-releases":
      return [
        "## Related Releases",
        "",
        formatLinkedRecordsByTypes(campaign.linkedRecords, ["release-plan"]),
      ].join("\n")
    case "artist-related-youtube":
      return [
        "## Related YouTube Assets",
        "",
        formatLinkedRecordsByTypes(campaign.linkedRecords, [
          "youtube-package",
          "youtube-thumbnail",
        ]),
      ].join("\n")
    case "artist-related-merch":
      return [
        "## Related Merch / Product Assets",
        "",
        formatLinkedRecordsByTypes(campaign.linkedRecords, [
          "merch-idea",
          "product-listing",
          "mockup-prompt",
        ]),
      ].join("\n")
    case "launch-tasks":
      return renderLaunchTasks(ctx)
    case "publishing-checklist":
      return renderPublishingChecklist(ctx)
    case "missing-assets":
      return renderMissingAssets(ctx)
    case "missing-youtube-assets":
      return [
        "## Missing YouTube Assets",
        "",
        formatMissingAssetsSection(filterMissingAssets(missingAssets, YOUTUBE_MISSING_KEYS)),
      ].join("\n")
    case "missing-social-assets":
      return [
        "## Missing Social Assets",
        "",
        formatMissingAssetsSection(filterMissingAssets(missingAssets, SOCIAL_MISSING_KEYS)),
      ].join("\n")
    case "missing-commerce-assets":
      return [
        "## Missing Commerce Assets",
        "",
        formatMissingAssetsSection(filterMissingAssets(missingAssets, COMMERCE_MISSING_KEYS)),
      ].join("\n")
    case "linked-records":
      return renderLinkedRecords(ctx)
    default:
      return ""
  }
}

function renderPackTitle(ctx: CampaignExportSectionContext): string {
  const name = mdValue(ctx.campaign.campaignName, "Untitled Campaign")
  if (ctx.templateId === "full-release-pack") {
    return `# Campaign Export Pack: ${name}`
  }
  return `# ${ctx.templateName}: ${name}`
}

export function generateCampaignExportMarkdown(ctx: CampaignExportSectionContext): string {
  const template = getCampaignPackTemplate(ctx.templateId)
  const sections = [
    renderPackTitle(ctx),
    "",
    `Generated: ${formatGeneratedAt(ctx.generatedAt)}`,
    "",
    ...template.sections.map((key) => renderPackSection(key, ctx)),
  ]

  return sections.join("\n").trim() + "\n"
}

/** @deprecated Use generateCampaignExportMarkdown with CampaignExportSectionContext */
export function generateCampaignExportMarkdownLegacy(input: {
  campaign: CampaignRecord
  relatedRecords: CampaignRelatedRecordsBundle
  missingAssets: CampaignExportMissingAsset[]
  readinessLabel: string
  assetScore: string
  taskProgress: string
  healthNotes: string
  generatedAt: Date
}): string {
  return generateCampaignExportMarkdown({
    campaign: input.campaign,
    relatedRecords: input.relatedRecords,
    missingAssets: input.missingAssets,
    readinessLabel: input.readinessLabel,
    taskProgress: input.taskProgress,
    healthNotes: input.healthNotes,
    generatedAt: input.generatedAt,
    templateId: DEFAULT_CAMPAIGN_PACK_TEMPLATE_ID,
    templateName: "Full Release Pack",
  })
}

export function campaignExportPackFilename(
  campaignName: string,
  templateSlug = "full-release-pack",
  date = new Date(),
): string {
  const slug =
    campaignName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "campaign"
  const stamp = date.toISOString().slice(0, 10)
  return `creatorops-${slug}-${templateSlug}-${stamp}.md`
}

export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^\s*[-*+]\s+\[[ x]\]\s+/gm, "- ")
    .replace(/^\s*[-*+]\s+/gm, "- ")
    .trim()
}

export function buildCampaignExportPack(
  campaign: CampaignRecord,
  store: CampaignLinkableStoreSlice,
  options?: {
    templateId?: CampaignPackTemplateId | string
    generatedAt?: Date
  },
): CampaignExportPackResult {
  const template = getCampaignPackTemplate(options?.templateId)
  const generatedAt = options?.generatedAt ?? new Date()
  const relatedRecords = resolveCampaignRelatedRecords(campaign, store)
  const dashboard = buildLaunchDashboardData(campaign, store)

  const missingAssets: CampaignExportMissingAsset[] = dashboard.readiness.assets
    .filter((asset) => !asset.completed)
    .map((asset) => ({
      key: asset.key,
      label: asset.label,
      suggestedAction: asset.createLabel,
    }))

  const healthNotes =
    dashboard.healthWarnings.length > 0
      ? dashboard.healthWarnings
          .map((warning) => `${warning.title}: ${warning.description}`)
          .join("\n")
      : "No data health issues detected."

  const assetScore = `${dashboard.readiness.label} (${dashboard.readiness.completed}/${dashboard.readiness.total} assets)`
  const taskProgress = `${dashboard.taskProgress.percent}% (${dashboard.taskProgress.completed}/${dashboard.taskProgress.total} tasks)`

  const sectionContext: CampaignExportSectionContext = {
    campaign,
    relatedRecords,
    missingAssets,
    readinessLabel: assetScore,
    taskProgress,
    healthNotes,
    generatedAt,
    templateId: template.id,
    templateName: template.name,
  }

  const markdown = generateCampaignExportMarkdown(sectionContext)

  return {
    campaign,
    templateId: template.id,
    templateName: template.name,
    relatedRecords,
    missingAssets,
    markdown,
    generatedAt: generatedAt.toISOString(),
  }
}
