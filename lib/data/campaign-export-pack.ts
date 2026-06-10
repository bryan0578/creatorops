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
import { filterExperimentsForCampaign } from "@/lib/experiments"
import { filterAssetsForCampaign } from "@/lib/assets"
import { filterLearningsForCampaign } from "@/lib/learnings"
import {
  filterQualityReviewsForCampaign,
  filterQualityReviewsForSource,
} from "@/lib/quality-reviews"
import type {
  AnalyticsRecord,
  AssetRecord,
  ArtistRecord,
  CampaignLinkedRecord,
  CampaignLinkedRecordType,
  CampaignRecord,
  CampaignTask,
  EmailCampaignRecord,
  ExperimentRecord,
  MerchIdea,
  MockupPromptRecord,
  ProductListing,
  LearningRecord,
  QualityReviewRecord,
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
  qualityReviews: QualityReviewRecord[]
  learnings: LearningRecord[]
  experiments: ExperimentRecord[]
  assets: AssetRecord[]
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

function sectionExperimentsOverview(experiments: ExperimentRecord[]): string {
  const lines = ["## Experiments", ""]
  if (experiments.length === 0) {
    lines.push("No experiments linked to this campaign yet.", "")
    return lines.join("\n")
  }
  for (const experiment of experiments) {
    lines.push(
      `### ${experiment.experimentName || "Untitled experiment"}`,
      "",
      mdBullet("Type", experiment.experimentType),
      mdBullet("Status", experiment.status),
      mdBullet("Platform", experiment.platform),
      mdBullet("Metric focus", experiment.metricFocus),
      mdBullet("Hypothesis", experiment.hypothesis),
      mdBullet("Variant A", experiment.variantA),
      mdBullet("Variant B", experiment.variantB),
      mdBullet("Variant C", experiment.variantC),
      mdBullet("Linked analytics", experiment.analyticsRecordName),
      "",
    )
  }
  return lines.join("\n")
}

function sectionExperimentWinnersLearnings(experiments: ExperimentRecord[]): string {
  const winners = experiments.filter(
    (experiment) =>
      experiment.status === "Winner Chosen" ||
      (experiment.winner && experiment.winner !== "Inconclusive"),
  )
  const lines = ["## Experiment Winners & Learnings", ""]
  if (winners.length === 0) {
    lines.push("No winners chosen yet.", "")
    return lines.join("\n")
  }
  for (const experiment of winners) {
    lines.push(
      `### ${experiment.experimentName}`,
      "",
      mdBullet("Winner", experiment.winner),
      mdMultiline("Learning summary", experiment.learningSummary),
      mdMultiline("Confidence notes", experiment.confidenceNotes),
      mdMultiline("Next experiment idea", experiment.nextTestIdea),
      "",
    )
  }
  return lines.join("\n")
}

function sectionExperimentAnalyticsLinked(
  experiments: ExperimentRecord[],
  analytics: AnalyticsRecord | null,
): string {
  const linked = experiments.filter((experiment) => experiment.analyticsRecordId)
  const lines = ["## Linked Experiments", ""]
  if (linked.length === 0) {
    lines.push("No experiments linked to analytics records.", "")
    return lines.join("\n")
  }
  for (const experiment of linked) {
    const matchesAnalytics =
      analytics && experiment.analyticsRecordId === analytics.id
    lines.push(
      `### ${experiment.experimentName}`,
      "",
      mdBullet("Status", experiment.status),
      mdBullet("Metric focus", experiment.metricFocus),
      mdBullet("Analytics record", experiment.analyticsRecordName),
      matchesAnalytics ? mdBullet("Link", "Matches campaign analytics record") : "",
      "",
    )
  }
  return lines.join("\n")
}

function sectionExperimentVariantResults(experiments: ExperimentRecord[]): string {
  const lines = ["## Experiment Variant Performance", ""]
  const withResults = experiments.filter(
    (experiment) =>
      experiment.variantAMetric ||
      experiment.variantBMetric ||
      experiment.variantCMetric ||
      experiment.winner ||
      experiment.learningSummary,
  )
  if (withResults.length === 0) {
    lines.push("No variant performance data recorded yet.", "")
    return lines.join("\n")
  }
  for (const experiment of withResults) {
    lines.push(
      `### ${experiment.experimentName}`,
      "",
      mdBullet("Variant A metric", experiment.variantAMetric),
      mdBullet("Variant B metric", experiment.variantBMetric),
      mdBullet("Variant C metric", experiment.variantCMetric),
      mdBullet("Winning variant", experiment.winner),
      mdMultiline("Learning summary", experiment.learningSummary),
      mdMultiline("Next experiment idea", experiment.nextTestIdea),
      mdMultiline("Confidence notes", experiment.confidenceNotes),
      "",
    )
  }
  return lines.join("\n")
}

function sectionYouTubeTitleThumbnailExperiments(
  experiments: ExperimentRecord[],
): string {
  const active = experiments.filter(
    (experiment) =>
      experiment.platform === "YouTube" &&
      ["YouTube Title", "Thumbnail", "Thumbnail Text"].includes(
        experiment.experimentType,
      ) &&
      experiment.status !== "Archived" &&
      experiment.status !== "Winner Chosen",
  )
  const lines = ["## Active YouTube Title / Thumbnail Experiments", ""]
  if (active.length === 0) {
    lines.push("No active YouTube title or thumbnail experiments.", "")
    return lines.join("\n")
  }
  for (const experiment of active) {
    lines.push(
      `### ${experiment.experimentName}`,
      "",
      mdBullet("Type", experiment.experimentType),
      mdBullet("Status", experiment.status),
      mdBullet("Variant A", experiment.variantA),
      mdBullet("Variant B", experiment.variantB),
      mdBullet("Variant C", experiment.variantC),
      mdBullet("Metric focus", experiment.metricFocus),
      "",
    )
  }
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

const READY_ASSET_STATUSES = new Set(["Ready", "Used", "Published"])

function formatAssetLibrarySection(
  assets: AssetRecord[],
  heading: string,
): string {
  const readyAssets = assets.filter((asset) => READY_ASSET_STATUSES.has(asset.status))
  if (readyAssets.length === 0) {
    return `## ${heading}\n\nNo ready assets found for this section.\n`
  }

  const lines = readyAssets.map((asset) => {
    const location =
      asset.fileUrl || asset.filePath || asset.externalUrl || "No file path or URL on record."
    const usage = asset.usageNotes?.trim()
    return [
      `### ${mdValue(asset.assetName, "Untitled asset")}`,
      "",
      mdBullet("Type", asset.assetType),
      mdBullet("Status", asset.status),
      mdBullet("Platform", asset.platform),
      mdBullet("Version", asset.versionLabel),
      mdBullet("Location", location),
      usage ? mdMultiline("Usage notes", usage) : "",
    ]
      .filter(Boolean)
      .join("\n")
  })

  return [`## ${heading}`, "", ...lines, ""].join("\n")
}

export function renderAssetLibrary(ctx: CampaignExportSectionContext): string {
  return formatAssetLibrarySection(ctx.assets, "Asset Library")
}

export function renderAssetLibraryYouTube(ctx: CampaignExportSectionContext): string {
  const youtubeTypes = new Set(["YouTube Thumbnail", "Shorts Cover", "Video File"])
  return formatAssetLibrarySection(
    ctx.assets.filter((asset) => youtubeTypes.has(asset.assetType)),
    "YouTube / Video Assets",
  )
}

export function renderAssetLibraryMerch(ctx: CampaignExportSectionContext): string {
  const merchTypes = new Set(["Merch Mockup", "Product Image", "Product Mockup"])
  return formatAssetLibrarySection(
    ctx.assets.filter((asset) => merchTypes.has(asset.assetType)),
    "Merch / Product Assets",
  )
}

const YOUTUBE_MISSING_KEYS = ["youtube-package", "youtube-thumbnail"]
const SOCIAL_MISSING_KEYS = ["social-repurposing"]
const COMMERCE_MISSING_KEYS = ["merch-idea", "product-listing", "mockup-prompt"]

function latestReviewOfType(
  reviews: QualityReviewRecord[],
  reviewType: string,
): QualityReviewRecord | null {
  const matches = reviews.filter((review) => review.reviewType === reviewType)
  if (!matches.length) return null
  return [...matches].sort((a, b) => b.updatedAt - a.updatedAt)[0]
}

function latestReviewForSource(
  reviews: QualityReviewRecord[],
  sourceType: string,
  sourceId: string | undefined | null,
): QualityReviewRecord | null {
  if (!sourceId) return null
  const matches = filterQualityReviewsForSource(reviews, sourceType, sourceId)
  if (!matches.length) return null
  return [...matches].sort((a, b) => b.updatedAt - a.updatedAt)[0]
}

function lowestScoringReview(
  reviews: QualityReviewRecord[],
): QualityReviewRecord | null {
  const scored = reviews.filter((review) => review.overallScore > 0)
  if (!scored.length) return null
  return [...scored].sort((a, b) => a.overallScore - b.overallScore)[0]
}

function formatQualityReviewDetail(review: QualityReviewRecord): string[] {
  return [
    mdBullet("Review name", review.reviewName),
    mdBullet("Review type", review.reviewType),
    mdBullet("Overall score", `${review.overallScore}/100`),
    mdBullet("Readiness label", review.readinessLabel || review.status),
    mdMultiline("Strengths", review.strengths),
    mdMultiline("Weaknesses", review.weaknesses),
    mdMultiline("Recommended actions", review.recommendedActions),
    "",
  ]
}

function formatQualityReviewSubsection(
  heading: string,
  review: QualityReviewRecord | null,
): string {
  if (!review) {
    return `### ${heading}\n\nNot available.\n`
  }
  return [`### ${heading}`, "", ...formatQualityReviewDetail(review)].join("\n")
}

function sectionQualityReviewEmpty(heading: string): string {
  return `## ${heading}\n\nNo quality reviews linked yet.\n`
}

function sectionCampaignLearnings(learnings: LearningRecord[]): string {
  const lines = ["## Campaign Learnings", ""]
  if (learnings.length === 0) {
    lines.push("No learnings captured for this campaign yet.", "")
    return lines.join("\n")
  }

  const highImpactWins = learnings.filter(
    (l) => l.category === "Win" && (l.impact === "High" || l.impact === "Medium"),
  )
  const warnings = learnings.filter(
    (l) => l.category === "Warning" || l.category === "Avoid",
  )
  const tactics = learnings.filter(
    (l) => l.category === "Repeatable Tactic" || l.category === "Pattern",
  )

  if (highImpactWins.length > 0) {
    lines.push("### High Impact Wins", "")
    for (const learning of highImpactWins) {
      lines.push(
        `#### ${learning.title}`,
        "",
        mdBullet("Type", learning.learningType),
        mdMultiline("Insight", learning.insight),
        mdMultiline("Recommendation", learning.recommendation),
        "",
      )
    }
  }

  if (warnings.length > 0) {
    lines.push("### Warnings & Avoid Notes", "")
    for (const learning of warnings) {
      lines.push(
        `#### ${learning.title}`,
        "",
        mdMultiline("Insight", learning.insight),
        mdMultiline("Avoid when", learning.avoidWhen),
        "",
      )
    }
  }

  if (tactics.length > 0) {
    lines.push("### Repeatable Tactics", "")
    for (const learning of tactics) {
      lines.push(
        `#### ${learning.title}`,
        "",
        mdMultiline("Recommendation", learning.recommendation),
        mdMultiline("Repeat when", learning.repeatWhen),
        "",
      )
    }
  }

  const other = learnings.filter(
    (l) =>
      !highImpactWins.includes(l) && !warnings.includes(l) && !tactics.includes(l),
  )
  if (other.length > 0) {
    lines.push("### Other Learnings", "")
    for (const learning of other) {
      lines.push(
        `#### ${learning.title}`,
        "",
        mdBullet("Type", learning.learningType),
        mdBullet("Category", learning.category),
        mdMultiline("Insight", learning.insight),
        mdMultiline("Recommendation", learning.recommendation),
        "",
      )
    }
  }

  return lines.join("\n")
}

function sectionAnalyticsReviewLearnings(
  learnings: LearningRecord[],
  experiments: ExperimentRecord[],
): string {
  const lines = ["## Campaign Learnings", ""]
  const analyticsLearnings = learnings.filter(
    (l) =>
      l.learningType === "Analytics Review" ||
      l.learningType === "Experiment Result" ||
      l.learningType === "Quality Review" ||
      Boolean(l.analyticsRecordId || l.experimentId || l.qualityReviewId),
  )

  if (analyticsLearnings.length === 0) {
    lines.push("No learnings from analytics, experiments, or quality reviews yet.", "")
  } else {
    for (const learning of analyticsLearnings) {
      lines.push(
        `### ${learning.title}`,
        "",
        mdBullet("Type", learning.learningType),
        mdBullet("Category", learning.category),
        mdMultiline("Insight", learning.insight),
        mdMultiline("Evidence", learning.evidence),
        mdMultiline("Recommendation", learning.recommendation),
        "",
      )
    }
  }

  const nextIdeas = experiments
    .map((e) => e.nextTestIdea?.trim())
    .filter(Boolean)
  if (nextIdeas.length > 0) {
    lines.push("### Next Experiment Ideas", "")
    for (const idea of nextIdeas) {
      lines.push(`- ${idea}`)
    }
    lines.push("")
  }

  const futureRecs = learnings
    .map((l) => l.recommendation?.trim())
    .filter(Boolean)
    .slice(0, 8)
  if (futureRecs.length > 0) {
    lines.push("### Future Campaign Recommendations", "")
    for (const rec of futureRecs) {
      lines.push(`- ${rec}`)
    }
    lines.push("")
  }

  return lines.join("\n")
}

function sectionQualityReviewSummary(reviews: QualityReviewRecord[]): string {
  if (!reviews.length) {
    return sectionQualityReviewEmpty("Quality Review Summary")
  }

  const readiness = latestReviewOfType(reviews, "Campaign Readiness")
  const youtubePackage =
    latestReviewOfType(reviews, "YouTube Package") ??
    latestReviewForSource(
      reviews,
      "youtube-package",
      reviews.find((r) => r.sourceRecordType === "youtube-package")?.sourceRecordId,
    )
  const thumbnail =
    latestReviewOfType(reviews, "Thumbnail") ??
    latestReviewForSource(
      reviews,
      "youtube-thumbnail",
      reviews.find((r) => r.sourceRecordType === "youtube-thumbnail")?.sourceRecordId,
    )
  const lowest = lowestScoringReview(reviews)

  const lines = ["## Quality Review Summary", ""]

  lines.push(formatQualityReviewSubsection("Latest Campaign Readiness Review", readiness))
  lines.push(formatQualityReviewSubsection("Latest YouTube Package Review", youtubePackage))
  lines.push(formatQualityReviewSubsection("Latest Thumbnail Review", thumbnail))

  if (lowest) {
    lines.push(
      "### Lowest Scoring Linked Review",
      "",
      ...formatQualityReviewDetail(lowest),
    )
  }

  return lines.join("\n")
}

function sectionQualityReviewYouTube(
  reviews: QualityReviewRecord[],
  relatedRecords: CampaignRelatedRecordsBundle,
): string {
  if (!reviews.length) {
    return sectionQualityReviewEmpty("Quality Review Notes")
  }

  const youtubeReview =
    latestReviewForSource(
      reviews,
      "youtube-package",
      relatedRecords.youtubePackage?.id,
    ) ?? latestReviewOfType(reviews, "YouTube Package")
  const thumbnailReview =
    latestReviewForSource(
      reviews,
      "youtube-thumbnail",
      relatedRecords.youtubeThumbnail?.id,
    ) ?? latestReviewOfType(reviews, "Thumbnail")

  if (!youtubeReview && !thumbnailReview) {
    return sectionQualityReviewEmpty("Quality Review Notes")
  }

  const lines = ["## Quality Review Notes", ""]
  lines.push(formatQualityReviewSubsection("YouTube Package Review", youtubeReview))
  lines.push(formatQualityReviewSubsection("Thumbnail Review", thumbnailReview))

  const titleRec =
    youtubeReview?.recommendedActions?.trim() ||
    youtubeReview?.improvementIdeas?.trim()
  const thumbnailRec =
    thumbnailReview?.recommendedActions?.trim() ||
    thumbnailReview?.improvementIdeas?.trim()

  if (titleRec || thumbnailRec) {
    lines.push("### Title / Thumbnail Recommendations", "")
    if (titleRec) lines.push(mdMultiline("YouTube package", titleRec))
    if (thumbnailRec) lines.push(mdMultiline("Thumbnail", thumbnailRec))
    lines.push("")
  }

  return lines.join("\n")
}

function sectionQualityReviewMerch(
  reviews: QualityReviewRecord[],
  relatedRecords: CampaignRelatedRecordsBundle,
): string {
  if (!reviews.length) {
    return sectionQualityReviewEmpty("Quality Review Notes")
  }

  const merchReview =
    latestReviewForSource(reviews, "merch-idea", relatedRecords.merchIdea?.id) ??
    latestReviewOfType(reviews, "Merch Concept")
  const listingReview =
    latestReviewForSource(
      reviews,
      "product-listing",
      relatedRecords.productListing?.id,
    ) ?? latestReviewOfType(reviews, "Product Listing")
  const mockupReview =
    latestReviewForSource(reviews, "mockup-prompt", relatedRecords.mockupPrompt?.id) ??
    latestReviewOfType(reviews, "Mockup Prompt")

  if (!merchReview && !listingReview && !mockupReview) {
    return sectionQualityReviewEmpty("Quality Review Notes")
  }

  const lines = ["## Quality Review Notes", ""]
  if (merchReview) {
    lines.push(formatQualityReviewSubsection("Merch Concept Review", merchReview))
  }
  if (listingReview) {
    lines.push(formatQualityReviewSubsection("Product Listing Review", listingReview))
  }
  lines.push(formatQualityReviewSubsection("Mockup Prompt Review", mockupReview))
  return lines.join("\n")
}

function sectionQualityReviewAnalytics(reviews: QualityReviewRecord[]): string {
  if (!reviews.length) {
    return sectionQualityReviewEmpty("Quality Review Notes")
  }

  const readiness = latestReviewOfType(reviews, "Campaign Readiness")
  const lowScoring = [...reviews]
    .filter((review) => review.overallScore > 0 && review.overallScore < 70)
    .sort((a, b) => a.overallScore - b.overallScore)

  const lines = ["## Quality Review Notes", ""]

  if (readiness && readiness.overallScore > 0) {
    lines.push(
      "### Quality Score at Publish",
      "",
      mdBullet("Campaign readiness score", `${readiness.overallScore}/100`),
      mdBullet("Readiness label", readiness.readinessLabel || readiness.status),
      mdMultiline("Recommended actions", readiness.recommendedActions),
      "",
    )
  } else {
    lines.push("### Quality Score at Publish", "", "No campaign readiness review on file.", "")
  }

  if (lowScoring.length > 0) {
    lines.push("### Low-Scoring Items to Compare Against Performance", "")
    for (const review of lowScoring) {
      lines.push(
        `#### ${review.reviewName || review.reviewType}`,
        "",
        mdBullet("Score", `${review.overallScore}/100`),
        mdBullet("Type", review.reviewType),
        mdMultiline("Weaknesses", review.weaknesses),
        mdMultiline("Recommended actions", review.recommendedActions),
        "",
      )
    }
  } else {
    lines.push(
      "### Low-Scoring Items to Compare Against Performance",
      "",
      "No low-scoring quality reviews linked to this campaign.",
      "",
    )
  }

  return lines.join("\n")
}

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
    case "experiments-overview":
      return sectionExperimentsOverview(ctx.experiments)
    case "experiment-winners-learnings":
      return sectionExperimentWinnersLearnings(ctx.experiments)
    case "experiment-analytics-linked":
      return sectionExperimentAnalyticsLinked(
        ctx.experiments,
        relatedRecords.analytics,
      )
    case "experiment-variant-results":
      return sectionExperimentVariantResults(ctx.experiments)
    case "youtube-title-thumbnail-experiments":
      return sectionYouTubeTitleThumbnailExperiments(ctx.experiments)
    case "asset-library":
      return renderAssetLibrary(ctx)
    case "asset-library-youtube":
      return renderAssetLibraryYouTube(ctx)
    case "asset-library-merch":
      return renderAssetLibraryMerch(ctx)
    case "quality-review-summary":
      return sectionQualityReviewSummary(ctx.qualityReviews)
    case "quality-review-youtube":
      return sectionQualityReviewYouTube(ctx.qualityReviews, relatedRecords)
    case "quality-review-merch":
      return sectionQualityReviewMerch(ctx.qualityReviews, relatedRecords)
    case "quality-review-analytics":
      return sectionQualityReviewAnalytics(ctx.qualityReviews)
    case "campaign-learnings":
      return sectionCampaignLearnings(ctx.learnings)
    case "analytics-review-learnings":
      return sectionAnalyticsReviewLearnings(ctx.learnings, ctx.experiments)
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
    qualityReviews: [],
    learnings: [],
    experiments: [],
    assets: [],
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
    experiments?: ExperimentRecord[]
    assets?: AssetRecord[]
    qualityReviews?: QualityReviewRecord[]
    learnings?: LearningRecord[]
  },
): CampaignExportPackResult {
  const template = getCampaignPackTemplate(options?.templateId)
  const generatedAt = options?.generatedAt ?? new Date()
  const relatedRecords = resolveCampaignRelatedRecords(campaign, store)
  const campaignExperiments = filterExperimentsForCampaign(
    options?.experiments ?? [],
    campaign.id,
    campaign.campaignName,
  )
  const campaignAssets = filterAssetsForCampaign(
    options?.assets ?? [],
    campaign.id,
    campaign.campaignName,
  )
  const dashboard = buildLaunchDashboardData(campaign, store)
  const qualityReviews = filterQualityReviewsForCampaign(
    options?.qualityReviews ?? [],
    campaign.id,
    campaign.campaignName,
  )
  const learnings = filterLearningsForCampaign(
    options?.learnings ?? [],
    campaign.id,
    campaign.campaignName,
  )

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
    qualityReviews,
    learnings,
    experiments: campaignExperiments,
    assets: campaignAssets,
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
