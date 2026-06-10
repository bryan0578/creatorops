import type { CampaignLinkableStoreSlice } from "@/lib/campaigns"
import {
  buildLaunchDashboardData,
  type CampaignRelatedRecordsBundle,
  resolveCampaignRelatedRecords,
} from "@/lib/campaign-launch-dashboard"
import type {
  AnalyticsRecord,
  ArtistRecord,
  CampaignLinkedRecord,
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

export interface CampaignExportPackResult {
  campaign: CampaignRecord
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

  return records
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
}

function formatMissingAssetsSection(missingAssets: CampaignExportMissingAsset[]): string {
  if (!missingAssets.length) {
    return "All required assets are present.\n"
  }

  return (
    missingAssets
      .map((asset) => {
        const action = asset.suggestedAction?.trim()
        return action
          ? `- ${asset.label} — ${action}`
          : `- ${asset.label}`
      })
      .join("\n") + "\n"
  )
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

export function campaignExportPackFilename(
  campaignName: string,
  date = new Date(),
): string {
  const slug =
    campaignName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "campaign"
  const stamp = date.toISOString().slice(0, 10)
  return `creatorops-${slug}-export-pack-${stamp}.md`
}

export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^\s*[-*+]\s+\[[ x]\]\s+/gm, "- ")
    .replace(/^\s*[-*+]\s+/gm, "- ")
    .trim()
}

export function generateCampaignExportMarkdown(input: {
  campaign: CampaignRecord
  relatedRecords: CampaignRelatedRecordsBundle
  missingAssets: CampaignExportMissingAsset[]
  readinessLabel: string
  assetScore: string
  taskProgress: string
  healthNotes: string
  generatedAt: Date
}): string {
  const { campaign, relatedRecords, missingAssets, generatedAt } = input
  const missingSummary =
    missingAssets.length > 0
      ? missingAssets.map((asset) => asset.label).join(", ")
      : "None"

  const sections = [
    `# Campaign Export Pack: ${mdValue(campaign.campaignName, "Untitled Campaign")}`,
    "",
    `Generated: ${formatGeneratedAt(generatedAt)}`,
    "",
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
    "## Readiness Summary",
    "",
    mdBullet("Asset Readiness", input.readinessLabel),
    mdBullet("Task Progress", input.taskProgress),
    mdBullet("Missing Assets", missingSummary),
    mdMultiline("Data Health Notes", input.healthNotes),
    "",
    sectionArtist(relatedRecords.artist),
    sectionReleasePlan(relatedRecords.releasePlan),
    sectionYouTubePackage(relatedRecords.youtubePackage),
    sectionThumbnail(relatedRecords.youtubeThumbnail),
    sectionSocial(relatedRecords.socialRepurposing),
    sectionEmail(relatedRecords.emailCampaign),
    sectionMerch(relatedRecords.merchIdea),
    sectionProductListing(relatedRecords.productListing),
    sectionMockup(relatedRecords.mockupPrompt),
    sectionAnalytics(relatedRecords.analytics),
    "## Launch Task Checklist",
    "",
    formatTasksSection(campaign.tasks),
    "## Missing Assets / Next Actions",
    "",
    formatMissingAssetsSection(missingAssets),
    "## Linked Records",
    "",
    formatLinkedRecordsSection(campaign.linkedRecords),
  ]

  return sections.join("\n").trim() + "\n"
}

export function buildCampaignExportPack(
  campaign: CampaignRecord,
  store: CampaignLinkableStoreSlice,
  generatedAt = new Date(),
): CampaignExportPackResult {
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

  const markdown = generateCampaignExportMarkdown({
    campaign,
    relatedRecords,
    missingAssets,
    readinessLabel: assetScore,
    assetScore,
    taskProgress,
    healthNotes,
    generatedAt,
  })

  return {
    campaign,
    relatedRecords,
    missingAssets,
    markdown,
    generatedAt: generatedAt.toISOString(),
  }
}
