/**
 * Data Health — read-only scan types and report builder.
 */

import { buildRecordHref } from "@/lib/data/related-records"
import { normalizeSourceRecordType } from "@/lib/quality-prefill"
import { extractPlaybookIdFromNotes } from "@/lib/playbooks"
import { isValidJsonString } from "@/lib/safe-json"
import {
  experimentHasInvalidDateRange,
  hasReviewPhaseWithoutLaunch,
  isLaunchReadyWithoutDate,
} from "@/lib/data/calendar-events"
import {
  hasIncompletePhaseItems,
  isPublishedCampaignStatus,
  isReadyToPublishCampaignStatus,
} from "@/lib/data/publishing-checklist"
import { isValidExternalUrl } from "@/lib/data/external-links"
import { filterAssetsForCampaign } from "@/lib/assets"
import {
  buildMissingAssetRepair,
  buildRemoveBrokenLinkRepair,
} from "@/lib/data/data-health-repairs"
import { getModuleFieldKeys } from "@/lib/ai-output/field-mapping"
import {
  getTemplateModuleSlug,
  isAIGenerationTemplate,
  templateHasOutputFormatInstructions,
} from "@/lib/ai-templates/utils"
import { AI_GENERATION_TEMPLATE_CATEGORY } from "@/lib/ai-templates/constants"
import type { AIOutputModuleType } from "@/lib/ai-output/types"
import type {
  AnalyticsRecord,
  AssetRecord,
  ExperimentRecord,
  ArtistRecord,
  CampaignLinkedRecordType,
  CampaignRecord,
  EmailCampaignRecord,
  MerchIdea,
  MockupPromptRecord,
  PresetRecord,
  PlaybookRecord,
  ProductListing,
  Prompt,
  PromptRun,
  LearningRecord,
  ExternalLinkRecord,
  QualityReviewRecord,
  ReleasePlan,
  SocialRepurposingRecord,
  Workflow,
  WorkflowRun,
  YouTubePackage,
  YouTubeThumbnailRecord,
  YouTubeVideoRecord,
  YouTubeConnectionStatusSummary,
  WorkspaceSettingsRecord,
} from "@/lib/types"

export type DataHealthSeverity = "critical" | "warning" | "info"

export type DataHealthCategory =
  | "broken-links"
  | "missing-assets"
  | "duplicates"
  | "incomplete-records"
  | "data-issues"

export type DataHealthRepair =
  | {
      kind: "remove-broken-link"
      campaignId: string
      linkedRecordId: string
      linkedRecordType: CampaignLinkedRecordType
    }
  | {
      kind: "create-asset"
      label: string
      href: string
    }

export interface DataHealthIssue {
  id: string
  severity: DataHealthSeverity
  category: DataHealthCategory
  title: string
  description: string
  sourceType: string
  sourceId: string
  sourceTitle: string
  href: string
  suggestedAction: string
  relatedHref?: string
  repair?: DataHealthRepair
}

export interface DataHealthSummary {
  totalIssues: number
  critical: number
  warnings: number
  info: number
  brokenLinks: number
  missingAssets: number
  duplicates: number
  incompleteRecords: number
  dataIssues: number
}

export interface DataHealthReport {
  scannedAt: number
  totalRecords: number
  summary: DataHealthSummary
  issues: DataHealthIssue[]
  /** Set when the overall scan could not complete. */
  scanError?: string | null
}

export interface DataHealthJsonField {
  sourceType: string
  sourceId: string
  sourceTitle: string
  fieldName: string
  raw: string
  expected: "array" | "object"
}

export interface DataHealthScanInput {
  campaigns: CampaignRecord[]
  artists: ArtistRecord[]
  youtubePackages: YouTubePackage[]
  youtubeThumbnails: YouTubeThumbnailRecord[]
  releasePlans: ReleasePlan[]
  socialRepurposing: SocialRepurposingRecord[]
  emailCampaigns: EmailCampaignRecord[]
  merchIdeas: MerchIdea[]
  productListings: ProductListing[]
  mockupPrompts: MockupPromptRecord[]
  analyticsRecords: AnalyticsRecord[]
  experiments: ExperimentRecord[]
  presets: PresetRecord[]
  playbooks: PlaybookRecord[]
  prompts: Prompt[]
  promptRuns: PromptRun[]
  workflows: Workflow[]
  workflowRuns: WorkflowRun[]
  workspaceSettings: WorkspaceSettingsRecord | null
  assets: AssetRecord[]
  qualityReviews: QualityReviewRecord[]
  learnings: LearningRecord[]
  externalLinks: ExternalLinkRecord[]
  youtubeVideos: YouTubeVideoRecord[]
  youtubeConnection: YouTubeConnectionStatusSummary | null
  jsonFields: DataHealthJsonField[]
  /** Server-resolved: preferred AI provider has API key configured. */
  aiProviderConfigured?: boolean
}

const MUSIC_CAMPAIGN_TYPES = new Set([
  "music release",
  "youtube video",
  "artist campaign",
  "label campaign",
  "content campaign",
  "social campaign",
])

const COMMERCE_CAMPAIGN_TYPES = new Set([
  "merch drop",
  "product launch",
  "digital product launch",
])

const MUSIC_EXPECTED_LINKS: CampaignLinkedRecordType[] = [
  "release-plan",
  "youtube-package",
  "youtube-thumbnail",
  "social-repurposing",
  "email-campaign",
  "analytics",
  "artist",
]

const COMMERCE_EXPECTED_LINKS: CampaignLinkedRecordType[] = [
  "merch-idea",
  "product-listing",
  "mockup-prompt",
  "social-repurposing",
  "email-campaign",
  "analytics",
]

const LINK_TYPE_LABELS: Record<CampaignLinkedRecordType, string> = {
  "release-plan": "Release Plan",
  "youtube-package": "YouTube Package",
  "youtube-thumbnail": "YouTube Thumbnail",
  "social-repurposing": "Social Repurposing",
  "merch-idea": "Merch Idea",
  "product-listing": "Product Listing",
  "mockup-prompt": "Mockup Prompt",
  "email-campaign": "Email Campaign",
  analytics: "Analytics Record",
  artist: "Artist Profile",
  workflow: "Workflow",
  "workflow-run": "Workflow Run",
  "prompt-run": "Prompt Run",
}

const HREF_PATH_TO_LINK_TYPE: Record<string, CampaignLinkedRecordType | "campaign"> = {
  "/youtube-packaging": "youtube-package",
  "/youtube-thumbnails": "youtube-thumbnail",
  "/release-planner": "release-plan",
  "/social-repurposing": "social-repurposing",
  "/email-campaigns": "email-campaign",
  "/merch-ideas": "merch-idea",
  "/product-listings": "product-listing",
  "/mockup-prompts": "mockup-prompt",
  "/analytics": "analytics",
  "/artist-crm": "artist",
  "/campaigns": "campaign",
}

type RecordIdSets = Record<CampaignLinkedRecordType | "campaign", Set<string>>

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase()
}

function hasText(value: string | undefined | null): boolean {
  return norm(value).length > 0
}

function issueId(parts: string[]): string {
  return parts.join(":")
}

function pushIssue(issues: DataHealthIssue[], issue: DataHealthIssue): void {
  issues.push(issue)
}

function parseInternalHref(
  href: string,
): { type: CampaignLinkedRecordType | "campaign"; id: string } | null {
  const trimmed = href.trim()
  if (!trimmed || trimmed === "/") return null

  try {
    const url = trimmed.startsWith("http")
      ? new URL(trimmed)
      : new URL(trimmed, "http://creatorops.local")
    const path = url.pathname.replace(/\/$/, "") || "/"
    const recordId = url.searchParams.get("recordId")
    const campaignId = url.searchParams.get("campaignId")

    if (path === "/campaigns" && campaignId) {
      return { type: "campaign", id: campaignId }
    }

    if (recordId) {
      const type = HREF_PATH_TO_LINK_TYPE[path]
      if (type && type !== "campaign") {
        return { type, id: recordId }
      }
    }

    return null
  } catch {
    return null
  }
}

function buildRecordIdSets(input: DataHealthScanInput): RecordIdSets {
  return {
    campaign: new Set(input.campaigns.map((r) => r.id)),
    "release-plan": new Set(input.releasePlans.map((r) => r.id)),
    "youtube-package": new Set(input.youtubePackages.map((r) => r.id)),
    "youtube-thumbnail": new Set(input.youtubeThumbnails.map((r) => r.id)),
    "social-repurposing": new Set(input.socialRepurposing.map((r) => r.id)),
    "merch-idea": new Set(input.merchIdeas.map((r) => r.id)),
    "product-listing": new Set(input.productListings.map((r) => r.id)),
    "mockup-prompt": new Set(input.mockupPrompts.map((r) => r.id)),
    "email-campaign": new Set(input.emailCampaigns.map((r) => r.id)),
    analytics: new Set(input.analyticsRecords.map((r) => r.id)),
    artist: new Set(input.artists.map((r) => r.id)),
    workflow: new Set(input.workflows.map((r) => r.id)),
    "workflow-run": new Set(input.workflowRuns.map((r) => r.id)),
    "prompt-run": new Set(input.promptRuns.map((r) => r.id)),
  }
}

function campaignHref(campaignId: string): string {
  return `/campaigns?campaignId=${encodeURIComponent(campaignId)}`
}

function promptRunHref(runId: string): string {
  return `/runner?recordId=${encodeURIComponent(runId)}`
}

function isMusicCampaign(campaignType: string): boolean {
  return MUSIC_CAMPAIGN_TYPES.has(norm(campaignType))
}

function isCommerceCampaign(campaignType: string): boolean {
  return COMMERCE_CAMPAIGN_TYPES.has(norm(campaignType))
}

function expectedLinksForCampaign(campaign: CampaignRecord): CampaignLinkedRecordType[] {
  if (isMusicCampaign(campaign.campaignType)) return MUSIC_EXPECTED_LINKS
  if (isCommerceCampaign(campaign.campaignType)) return COMMERCE_EXPECTED_LINKS
  return []
}

function recordExists(
  sets: RecordIdSets,
  type: CampaignLinkedRecordType | "campaign",
  id: string,
): boolean {
  if (!id) return false
  return sets[type]?.has(id) ?? false
}

function canonicalHref(
  type: CampaignLinkedRecordType | "campaign",
  id: string,
): string {
  if (type === "campaign") return campaignHref(id)
  return buildRecordHref(type, id)
}

function scanBrokenLinks(
  input: DataHealthScanInput,
  sets: RecordIdSets,
  issues: DataHealthIssue[],
): void {
  for (const campaign of input.campaigns) {
    for (const linked of campaign.linkedRecords) {
      const linkType = linked.type
      const exists = recordExists(sets, linkType, linked.id)
      const campaignTitle = campaign.campaignName || "Untitled campaign"

      if (!exists) {
        pushIssue(issues, {
          id: issueId(["broken", campaign.id, linked.id, linkType]),
          severity: "critical",
          category: "broken-links",
          title: "Broken campaign link",
          description: `Campaign "${campaignTitle}" links to missing ${LINK_TYPE_LABELS[linkType] ?? linkType} "${linked.title || linked.id}".`,
          sourceType: "campaign",
          sourceId: campaign.id,
          sourceTitle: campaignTitle,
          href: campaignHref(campaign.id),
          suggestedAction: "Open campaign and remove or replace the broken link.",
          relatedHref: linked.href || canonicalHref(linkType, linked.id),
          repair: buildRemoveBrokenLinkRepair(campaign.id, linked.id, linkType),
        })
      }

      const parsed = parseInternalHref(linked.href)
      if (parsed) {
        if (!recordExists(sets, parsed.type, parsed.id)) {
          pushIssue(issues, {
            id: issueId(["broken-href", campaign.id, linked.id, parsed.id]),
            severity: "critical",
            category: "broken-links",
            title: "Broken href target",
            description: `Linked record href points to missing ${parsed.type} (${parsed.id}) in campaign "${campaignTitle}".`,
            sourceType: "campaign",
            sourceId: campaign.id,
            sourceTitle: campaignTitle,
            href: campaignHref(campaign.id),
            suggestedAction: "Open campaign and update the linked record href.",
            relatedHref: linked.href,
            repair: buildRemoveBrokenLinkRepair(campaign.id, linked.id, linkType),
          })
        } else if (parsed.id !== linked.id) {
          pushIssue(issues, {
            id: issueId(["href-mismatch", campaign.id, linked.id, parsed.id]),
            severity: "info",
            category: "broken-links",
            title: "Href ID mismatch",
            description: `Linked record id "${linked.id}" does not match href recordId "${parsed.id}" in campaign "${campaignTitle}".`,
            sourceType: "campaign",
            sourceId: campaign.id,
            sourceTitle: campaignTitle,
            href: campaignHref(campaign.id),
            suggestedAction: "Open campaign and align the link id with the href.",
            relatedHref: linked.href,
          })
        }
      }

      if (exists && linked.href.trim() && linked.href !== "/") {
        const expected = canonicalHref(linkType, linked.id)
        const parsedHref = parseInternalHref(linked.href)
        if (
          parsedHref &&
          parsedHref.id === linked.id &&
          linked.href !== expected &&
          !linked.href.includes(expected.split("?")[1] ?? "")
        ) {
          pushIssue(issues, {
            id: issueId(["stale-href", campaign.id, linked.id]),
            severity: "info",
            category: "broken-links",
            title: "Non-canonical href",
            description: `Linked record href "${linked.href}" differs from canonical "${expected}".`,
            sourceType: "campaign",
            sourceId: campaign.id,
            sourceTitle: campaignTitle,
            href: campaignHref(campaign.id),
            suggestedAction: "Open campaign and update href to the canonical record URL.",
            relatedHref: linked.href,
          })
        }
      }
    }

    for (const task of campaign.tasks) {
      if (!task.relatedRecordType || !task.relatedRecordId) continue
      const taskType = task.relatedRecordType
      if (!recordExists(sets, taskType, task.relatedRecordId)) {
        pushIssue(issues, {
          id: issueId(["broken-task", campaign.id, task.id, task.relatedRecordId]),
          severity: "critical",
          category: "broken-links",
          title: "Broken task reference",
          description: `Task "${task.title || "Untitled"}" references missing ${LINK_TYPE_LABELS[taskType] ?? taskType}.`,
          sourceType: "campaign",
          sourceId: campaign.id,
          sourceTitle: campaign.campaignName || "Untitled campaign",
          href: campaignHref(campaign.id),
          suggestedAction: "Open campaign and update or clear the task reference.",
        })
      }
    }
  }

  for (const artist of input.artists) {
    for (const release of artist.releases) {
      const refs: { field: string; type: CampaignLinkedRecordType; id: string }[] = [
        { field: "thumbnailRecordId", type: "youtube-thumbnail", id: release.thumbnailRecordId },
        {
          field: "youtubePackagingRecordId",
          type: "youtube-package",
          id: release.youtubePackagingRecordId,
        },
        { field: "releasePlanRecordId", type: "release-plan", id: release.releasePlanRecordId },
        { field: "analyticsRecordId", type: "analytics", id: release.analyticsRecordId },
      ]
      for (const ref of refs) {
        if (!hasText(ref.id)) continue
        if (!recordExists(sets, ref.type, ref.id)) {
          pushIssue(issues, {
            id: issueId(["broken-artist-ref", artist.id, release.id, ref.field]),
            severity: "critical",
            category: "broken-links",
            title: "Broken artist release link",
            description: `Artist "${artist.artistName || "Untitled"}" release "${release.songTitle || "Untitled"}" has invalid ${ref.field}.`,
            sourceType: "artist",
            sourceId: artist.id,
            sourceTitle: artist.artistName || "Untitled artist",
            href: buildRecordHref("artist", artist.id),
            suggestedAction: "Open artist profile and clear or replace the broken release link.",
          })
        }
      }
    }
  }
}

function scanMissingAssets(
  input: DataHealthScanInput,
  issues: DataHealthIssue[],
): void {
  for (const campaign of input.campaigns) {
    const expected = expectedLinksForCampaign(campaign)
    if (!expected.length) continue

    const linkedTypes = new Set(campaign.linkedRecords.map((r) => r.type))
    const campaignTitle = campaign.campaignName || "Untitled campaign"

    for (const type of expected) {
      if (!linkedTypes.has(type)) {
        const repair = buildMissingAssetRepair(campaign, type)
        pushIssue(issues, {
          id: issueId(["missing-asset", campaign.id, type]),
          severity: "warning",
          category: "missing-assets",
          title: `Missing ${LINK_TYPE_LABELS[type]}`,
          description: `${isMusicCampaign(campaign.campaignType) ? "Music" : "Commerce"} campaign "${campaignTitle}" has no linked ${LINK_TYPE_LABELS[type]}.`,
          sourceType: "campaign",
          sourceId: campaign.id,
          sourceTitle: campaignTitle,
          href: campaignHref(campaign.id),
          suggestedAction: `Create or link a ${LINK_TYPE_LABELS[type]} from Campaign Builder.`,
          repair,
        })
      }
    }
  }
}

function scanDuplicates(input: DataHealthScanInput, issues: DataHealthIssue[]): void {
  function reportDuplicateGroup(
    category: string,
    key: string,
    label: string,
    items: { id: string; title: string; href: string; sourceType: string }[],
  ) {
    if (items.length < 2 || !hasText(key)) return
    for (const item of items) {
      pushIssue(issues, {
        id: issueId(["duplicate", category, key, item.id]),
        severity: "warning",
        category: "duplicates",
        title: `Possible duplicate ${label}`,
        description: `"${item.title}" matches ${items.length} records with the same ${label.toLowerCase()}.`,
        sourceType: item.sourceType,
        sourceId: item.id,
        sourceTitle: item.title,
        href: item.href,
        suggestedAction: "Review duplicates and merge or archive extras if needed.",
      })
    }
  }

  groupByKey(
    input.campaigns,
    (c) => norm(c.campaignName),
    (c) => ({
      id: c.id,
      title: c.campaignName || "Untitled campaign",
      href: campaignHref(c.id),
      sourceType: "campaign",
    }),
  ).forEach((items, key) => reportDuplicateGroup("campaign", key, "campaign name", items))

  groupByKey(
    input.artists,
    (a) => norm(a.artistName),
    (a) => ({
      id: a.id,
      title: a.artistName || "Untitled artist",
      href: buildRecordHref("artist", a.id),
      sourceType: "artist",
    }),
  ).forEach((items, key) => reportDuplicateGroup("artist", key, "artist name", items))

  groupByKey(
    input.youtubePackages,
    (r) => `${norm(r.artistName)}|${norm(r.trackTitle)}`,
    (r) => ({
      id: r.id,
      title: `${r.artistName || "Artist"} — ${r.trackTitle || "Track"}`,
      href: buildRecordHref("youtube-package", r.id),
      sourceType: "youtube-package",
    }),
  ).forEach((items, key) =>
    reportDuplicateGroup("youtube-package", key, "artist + track", items),
  )

  groupByKey(
    input.youtubeThumbnails,
    (r) => `${norm(r.artistName)}|${norm(r.trackTitle)}`,
    (r) => ({
      id: r.id,
      title: `${r.artistName || "Artist"} — ${r.trackTitle || "Track"}`,
      href: buildRecordHref("youtube-thumbnail", r.id),
      sourceType: "youtube-thumbnail",
    }),
  ).forEach((items, key) =>
    reportDuplicateGroup("youtube-thumbnail", key, "artist + track", items),
  )

  groupByKey(
    input.releasePlans,
    (r) => `${norm(r.artistName)}|${norm(r.songTitle)}`,
    (r) => ({
      id: r.id,
      title: `${r.artistName || "Artist"} — ${r.songTitle || "Song"}`,
      href: buildRecordHref("release-plan", r.id),
      sourceType: "release-plan",
    }),
  ).forEach((items, key) =>
    reportDuplicateGroup("release-plan", key, "artist + song", items),
  )

  groupByKey(
    input.productListings,
    (r) =>
      hasText(r.finalTitle)
        ? norm(r.finalTitle)
        : `${norm(r.productType)}|${norm(r.niche)}|${norm(r.designConcept)}`,
    (r) => ({
      id: r.id,
      title: r.finalTitle || r.productType || "Product listing",
      href: buildRecordHref("product-listing", r.id),
      sourceType: "product-listing",
    }),
  ).forEach((items, key) => reportDuplicateGroup("product-listing", key, "listing", items))

  groupByKey(
    input.merchIdeas,
    (r) =>
      hasText(r.selectedProductTitle)
        ? norm(r.selectedProductTitle)
        : `${norm(r.niche)}|${norm(r.productType)}`,
    (r) => ({
      id: r.id,
      title: r.selectedProductTitle || r.productType || "Merch idea",
      href: buildRecordHref("merch-idea", r.id),
      sourceType: "merch-idea",
    }),
  ).forEach((items, key) => reportDuplicateGroup("merch-idea", key, "merch idea", items))

  groupByKey(
    input.presets,
    (r) => norm(r.name),
    (r) => ({
      id: r.id,
      title: r.name || "Untitled preset",
      href: `/presets?presetId=${encodeURIComponent(r.id)}`,
      sourceType: "preset",
    }),
  ).forEach((items, key) => reportDuplicateGroup("preset", key, "preset name", items))

  groupByKey(
    input.analyticsRecords,
    (r) => `${norm(r.itemName)}|${norm(r.platform)}`,
    (r) => ({
      id: r.id,
      title: r.itemName || "Analytics record",
      href: buildRecordHref("analytics", r.id),
      sourceType: "analytics",
    }),
  ).forEach((items, key) =>
    reportDuplicateGroup("analytics", key, "item + platform", items),
  )
}

function groupByKey<T, R>(
  items: T[],
  keyFn: (item: T) => string,
  mapFn: (item: T) => R,
): Map<string, R[]> {
  const map = new Map<string, R[]>()
  for (const item of items) {
    const key = keyFn(item)
    if (!hasText(key)) continue
    const mapped = mapFn(item)
    const group = map.get(key) ?? []
    group.push(mapped)
    map.set(key, group)
  }
  return map
}

function scanIncompleteRecords(
  input: DataHealthScanInput,
  issues: DataHealthIssue[],
): void {
  function flagMissing(
    sourceType: string,
    sourceId: string,
    sourceTitle: string,
    href: string,
    missingFields: string[],
  ) {
    if (!missingFields.length) return
    pushIssue(issues, {
      id: issueId(["incomplete", sourceType, sourceId, missingFields.join("-")]),
      severity: "warning",
      category: "incomplete-records",
      title: "Incomplete record",
      description: `Missing: ${missingFields.join(", ")}.`,
      sourceType,
      sourceId,
      sourceTitle,
      href,
      suggestedAction: "Open the record and fill in the missing fields.",
    })
  }

  for (const campaign of input.campaigns) {
    const missing: string[] = []
    if (!hasText(campaign.campaignName)) missing.push("campaignName")
    if (!hasText(campaign.campaignType)) missing.push("campaignType")
    if (!hasText(campaign.status)) missing.push("status")
    if (!hasText(campaign.primaryGoal)) missing.push("primaryGoal")
    if (isMusicCampaign(campaign.campaignType) && !hasText(campaign.artistName)) {
      missing.push("artistName")
    }
    if (isCommerceCampaign(campaign.campaignType) && !hasText(campaign.productName)) {
      missing.push("productName")
    }
    flagMissing(
      "campaign",
      campaign.id,
      campaign.campaignName || "Untitled campaign",
      campaignHref(campaign.id),
      missing,
    )
  }

  for (const artist of input.artists) {
    flagMissing(
      "artist",
      artist.id,
      artist.artistName || "Untitled artist",
      buildRecordHref("artist", artist.id),
      [
        !hasText(artist.artistName) ? "artistName" : "",
        !hasText(artist.genre) ? "genre" : "",
        !hasText(artist.brandDescription) ? "brandDescription" : "",
        !hasText(artist.targetAudience) ? "targetAudience" : "",
      ].filter(Boolean),
    )
  }

  for (const pkg of input.youtubePackages) {
    flagMissing(
      "youtube-package",
      pkg.id,
      pkg.trackTitle || "YouTube package",
      buildRecordHref("youtube-package", pkg.id),
      [
        !hasText(pkg.trackTitle) ? "trackTitle" : "",
        !hasText(pkg.artistName) ? "artistName" : "",
        !hasText(pkg.finalTitle) ? "finalTitle" : "",
        !hasText(pkg.finalDescription) ? "finalDescription" : "",
        !hasText(pkg.finalTags) ? "finalTags" : "",
      ].filter(Boolean),
    )
  }

  for (const thumb of input.youtubeThumbnails) {
    flagMissing(
      "youtube-thumbnail",
      thumb.id,
      thumb.trackTitle || "YouTube thumbnail",
      buildRecordHref("youtube-thumbnail", thumb.id),
      [
        !hasText(thumb.trackTitle) ? "trackTitle" : "",
        !hasText(thumb.artistName) ? "artistName" : "",
        !hasText(thumb.finalImagePrompt) ? "finalImagePrompt" : "",
        !hasText(thumb.finalTextOverlay) ? "finalTextOverlay" : "",
      ].filter(Boolean),
    )
  }

  for (const plan of input.releasePlans) {
    flagMissing(
      "release-plan",
      plan.id,
      plan.songTitle || "Release plan",
      buildRecordHref("release-plan", plan.id),
      [
        !hasText(plan.artistName) ? "artistName" : "",
        !hasText(plan.songTitle) ? "songTitle" : "",
        !hasText(plan.primaryGoal) ? "primaryGoal" : "",
        !hasText(plan.finalStrategySummary) ? "finalStrategySummary" : "",
      ].filter(Boolean),
    )
  }

  for (const social of input.socialRepurposing) {
    flagMissing(
      "social-repurposing",
      social.id,
      social.campaignName || "Social repurposing",
      buildRecordHref("social-repurposing", social.id),
      [
        !hasText(social.campaignName) ? "campaignName" : "",
        !hasText(social.sourceContent) ? "sourceContent" : "",
        !hasText(social.finalCoreMessage) ? "finalCoreMessage" : "",
      ].filter(Boolean),
    )
  }

  for (const email of input.emailCampaigns) {
    flagMissing(
      "email-campaign",
      email.id,
      email.campaignName || "Email campaign",
      buildRecordHref("email-campaign", email.id),
      [
        !hasText(email.campaignName) ? "campaignName" : "",
        !hasText(email.finalSubjectLine) ? "finalSubjectLine" : "",
        !hasText(email.finalEmailBody) ? "finalEmailBody" : "",
      ].filter(Boolean),
    )
  }

  for (const merch of input.merchIdeas) {
    flagMissing(
      "merch-idea",
      merch.id,
      merch.selectedProductTitle || "Merch idea",
      buildRecordHref("merch-idea", merch.id),
      [
        !hasText(merch.niche) ? "niche" : "",
        !hasText(merch.productType) ? "productType" : "",
        !hasText(merch.selectedConceptName) ? "selectedConceptName" : "",
        !hasText(merch.selectedProductTitle) ? "selectedProductTitle" : "",
      ].filter(Boolean),
    )
  }

  for (const listing of input.productListings) {
    flagMissing(
      "product-listing",
      listing.id,
      listing.finalTitle || "Product listing",
      buildRecordHref("product-listing", listing.id),
      [
        !hasText(listing.productType) ? "productType" : "",
        !hasText(listing.finalTitle) ? "finalTitle" : "",
        !hasText(listing.finalLongDescription) ? "finalLongDescription" : "",
        !hasText(listing.finalTags) ? "finalTags" : "",
      ].filter(Boolean),
    )
  }

  for (const mockup of input.mockupPrompts) {
    flagMissing(
      "mockup-prompt",
      mockup.id,
      mockup.projectName || "Mockup prompt",
      buildRecordHref("mockup-prompt", mockup.id),
      [
        !hasText(mockup.projectName) ? "projectName" : "",
        !hasText(mockup.productType) ? "productType" : "",
        !hasText(mockup.finalImagePrompt) ? "finalImagePrompt" : "",
      ].filter(Boolean),
    )
  }

  for (const record of input.analyticsRecords) {
    flagMissing(
      "analytics",
      record.id,
      record.itemName || "Analytics record",
      buildRecordHref("analytics", record.id),
      [
        !hasText(record.itemName) ? "itemName" : "",
        !hasText(record.itemType) ? "itemType" : "",
        !hasText(record.platform) ? "platform" : "",
        !hasText(record.relatedCampaign) &&
        !hasText(record.relatedArtist) &&
        !hasText(record.relatedSong)
          ? "relatedCampaign or relatedArtist/relatedSong"
          : "",
      ].filter(Boolean),
    )
  }

  for (const experiment of input.experiments) {
    flagMissing(
      "experiment",
      experiment.id,
      experiment.experimentName || "Experiment",
      buildRecordHref("experiment", experiment.id),
      [
        !hasText(experiment.experimentName) ? "experimentName" : "",
        !hasText(experiment.experimentType) ? "experimentType" : "",
        !hasText(experiment.hypothesis) ? "hypothesis" : "",
        !hasText(experiment.variantA) ? "variantA" : "",
        !hasText(experiment.variantB) ? "variantB" : "",
        !hasText(experiment.metricFocus) ? "metricFocus" : "",
      ].filter(Boolean),
    )
  }

  if (input.workspaceSettings) {
    const ws = input.workspaceSettings
    flagMissing(
      "workspace-settings",
      ws.id,
      ws.workspaceName || "Workspace settings",
      "/settings",
      [
        !hasText(ws.workspaceName) ? "workspaceName" : "",
        !hasText(ws.labelName) ? "labelName" : "",
        !hasText(ws.defaultYouTubeChannel) ? "defaultYouTubeChannel" : "",
        !hasText(ws.defaultStoreName) ? "defaultStoreName" : "",
      ].filter(Boolean),
    )
  }
}

function scanPublishingChecklistWarnings(
  input: DataHealthScanInput,
  issues: DataHealthIssue[],
): void {
  for (const campaign of input.campaigns) {
    const title = campaign.campaignName || "Untitled campaign"
    const checklist = campaign.publishingChecklist
    const href = `${campaignHref(campaign.id)}&tab=publishing-checklist`

    if (
      isPublishedCampaignStatus(campaign.status) &&
      checklist.items.length === 0
    ) {
      pushIssue(issues, {
        id: issueId(["pub-checklist-missing", campaign.id]),
        severity: "warning",
        category: "missing-assets",
        title: "Published campaign missing publishing checklist",
        description: `Campaign "${title}" is published but has no publishing checklist.`,
        sourceType: "campaign",
        sourceId: campaign.id,
        sourceTitle: title,
        href,
        suggestedAction: "Generate a publishing checklist in Campaign Builder.",
      })
    }

    if (
      isPublishedCampaignStatus(campaign.status) &&
      checklist.items.length > 0 &&
      hasIncompletePhaseItems(checklist, "Publishing")
    ) {
      pushIssue(issues, {
        id: issueId(["pub-checklist-publishing", campaign.id]),
        severity: "warning",
        category: "incomplete-records",
        title: "Incomplete Publishing phase checklist",
        description: `Campaign "${title}" is published but Publishing phase items remain incomplete.`,
        sourceType: "campaign",
        sourceId: campaign.id,
        sourceTitle: title,
        href,
        suggestedAction: "Complete Publishing phase items in the publishing checklist.",
      })
    }

    if (
      isReadyToPublishCampaignStatus(campaign.status) &&
      checklist.items.length > 0 &&
      hasIncompletePhaseItems(checklist, "Pre-Publish")
    ) {
      pushIssue(issues, {
        id: issueId(["pub-checklist-prepublish", campaign.id]),
        severity: "warning",
        category: "incomplete-records",
        title: "Pre-Publish checklist incomplete",
        description: `Campaign "${title}" is ready to publish but Pre-Publish checklist items remain incomplete.`,
        sourceType: "campaign",
        sourceId: campaign.id,
        sourceTitle: title,
        href,
        suggestedAction: "Complete Pre-Publish checklist items before launch.",
      })
    }
  }
}

function scanExperimentAnalyticsWarnings(
  input: DataHealthScanInput,
  sets: RecordIdSets,
  issues: DataHealthIssue[],
): void {
  const campaignsById = new Map(input.campaigns.map((c) => [c.id, c]))
  const experimentIds = new Set(input.experiments.map((e) => e.id))

  for (const experiment of input.experiments) {
    const title = experiment.experimentName || "Experiment"
    const href = buildRecordHref("experiment", experiment.id)

    if (experiment.status === "Running" && !hasText(experiment.metricFocus)) {
      pushIssue(issues, {
        id: issueId(["experiment-metric-focus", experiment.id]),
        severity: "warning",
        category: "incomplete-records",
        title: "Running experiment missing metric focus",
        description: `Experiment "${title}" is running without a metric focus.`,
        sourceType: "experiment",
        sourceId: experiment.id,
        sourceTitle: title,
        href,
        suggestedAction: "Set a metric focus (e.g. CTR) in Experiment Tracker.",
      })
    }

    if (
      experiment.status === "Running" &&
      !hasText(experiment.analyticsRecordId)
    ) {
      const campaign =
        (experiment.campaignId && campaignsById.get(experiment.campaignId)) ||
        input.campaigns.find((c) =>
          c.campaignName.trim().toLowerCase() ===
          experiment.campaignName.trim().toLowerCase(),
        )
      if (campaign && isPublishedCampaignStatus(campaign.status)) {
        pushIssue(issues, {
          id: issueId(["experiment-analytics-missing", experiment.id]),
          severity: "warning",
          category: "missing-assets",
          title: "Running experiment missing analytics link",
          description: `Experiment "${title}" is running but has no linked analytics record while campaign "${campaign.campaignName}" is published or tracking.`,
          sourceType: "experiment",
          sourceId: experiment.id,
          sourceTitle: title,
          href,
          suggestedAction: "Link or create an analytics record for this experiment.",
          relatedHref: campaignHref(campaign.id),
        })
      }
    }

    if (
      experiment.status === "Winner Chosen" &&
      !hasText(experiment.learningSummary)
    ) {
      pushIssue(issues, {
        id: issueId(["experiment-learning", experiment.id]),
        severity: "warning",
        category: "incomplete-records",
        title: "Winner chosen without learning summary",
        description: `Experiment "${title}" has a winner chosen but no learning summary.`,
        sourceType: "experiment",
        sourceId: experiment.id,
        sourceTitle: title,
        href,
        suggestedAction: "Add a learning summary in the Results tab.",
      })
    }

    if (
      hasText(experiment.analyticsRecordId) &&
      !sets.analytics.has(experiment.analyticsRecordId)
    ) {
      pushIssue(issues, {
        id: issueId([
          "experiment-analytics-broken",
          experiment.id,
          experiment.analyticsRecordId,
        ]),
        severity: "warning",
        category: "broken-links",
        title: "Experiment linked to missing analytics record",
        description: `Experiment "${title}" references missing analytics record ${experiment.analyticsRecordId}.`,
        sourceType: "experiment",
        sourceId: experiment.id,
        sourceTitle: title,
        href,
        suggestedAction: "Re-link analytics or clear the broken link.",
      })
    }
  }

  for (const record of input.analyticsRecords) {
    if (!hasText(record.experimentId)) continue
    const title = record.itemName || "Analytics record"
    const href = buildRecordHref("analytics", record.id)
    if (!experimentIds.has(record.experimentId)) {
      pushIssue(issues, {
        id: issueId(["analytics-experiment-broken", record.id, record.experimentId]),
        severity: "warning",
        category: "broken-links",
        title: "Analytics record linked to missing experiment",
        description: `Analytics record "${title}" references missing experiment ${record.experimentId}.`,
        sourceType: "analytics",
        sourceId: record.id,
        sourceTitle: title,
        href,
        suggestedAction: "Re-link experiment or clear the broken link.",
      })
      continue
    }
    const linkedExperiment = input.experiments.find(
      (item) => item.id === record.experimentId,
    )
    if (
      linkedExperiment &&
      linkedExperiment.analyticsRecordId &&
      linkedExperiment.analyticsRecordId !== record.id
    ) {
      pushIssue(issues, {
        id: issueId(["analytics-experiment-mismatch", record.id, record.experimentId]),
        severity: "warning",
        category: "broken-links",
        title: "Analytics / experiment link mismatch",
        description: `Analytics record "${title}" links to experiment "${linkedExperiment.experimentName}" but the experiment points to a different analytics record.`,
        sourceType: "analytics",
        sourceId: record.id,
        sourceTitle: title,
        href,
        suggestedAction: "Re-link from Experiment Tracker or Analytics Tracker.",
        relatedHref: buildRecordHref("experiment", record.experimentId),
      })
    }
  }
}

function scanCalendarWarnings(
  input: DataHealthScanInput,
  issues: DataHealthIssue[],
): void {
  for (const campaign of input.campaigns) {
    const title = campaign.campaignName || "Untitled campaign"
    const href = `${campaignHref(campaign.id)}&tab=overview`

    if (isLaunchReadyWithoutDate(campaign)) {
      pushIssue(issues, {
        id: issueId(["calendar-missing-launch", campaign.id]),
        severity: "warning",
        category: "incomplete-records",
        title: "Campaign missing launch date",
        description: `Campaign "${title}" is ${campaign.status} but has no launch date for calendar planning.`,
        sourceType: "campaign",
        sourceId: campaign.id,
        sourceTitle: title,
        href,
        suggestedAction: "Add a launch date on the campaign overview.",
        relatedHref: "/calendar",
      })
    }

    if (hasReviewPhaseWithoutLaunch(campaign)) {
      pushIssue(issues, {
        id: issueId(["calendar-review-no-launch", campaign.id]),
        severity: "warning",
        category: "incomplete-records",
        title: "Review checklist without launch date",
        description: `Campaign "${title}" has review-phase checklist items but no launch date to schedule reviews.`,
        sourceType: "campaign",
        sourceId: campaign.id,
        sourceTitle: title,
        href: `${campaignHref(campaign.id)}&tab=publishing-checklist`,
        suggestedAction: "Add a launch date or remove review-phase checklist items.",
        relatedHref: "/calendar",
      })
    }
  }

  for (const experiment of input.experiments) {
    if (!experimentHasInvalidDateRange(experiment)) continue
    const title = experiment.experimentName || "Untitled experiment"
    pushIssue(issues, {
      id: issueId(["calendar-experiment-dates", experiment.id]),
      severity: "warning",
      category: "incomplete-records",
      title: "Experiment end date before start date",
      description: `Experiment "${title}" has an end date earlier than its start date.`,
      sourceType: "experiment",
      sourceId: experiment.id,
      sourceTitle: title,
      href: buildRecordHref("experiment", experiment.id),
      suggestedAction: "Correct experiment start and end dates.",
      relatedHref: "/calendar",
    })
  }
}

function scanCampaignBundleExportWarnings(
  input: DataHealthScanInput,
  sets: RecordIdSets,
  issues: DataHealthIssue[],
): void {
  for (const campaign of input.campaigns) {
    const title = campaign.campaignName || "Untitled campaign"
    const href = campaignHref(campaign.id)

    for (const linked of campaign.linkedRecords) {
      if (!recordExists(sets, linked.type, linked.id)) {
        pushIssue(issues, {
          id: issueId(["bundle-export-missing", campaign.id, linked.type, linked.id]),
          severity: "warning",
          category: "missing-assets",
          title: "Campaign bundle export will omit linked record",
          description: `Campaign "${title}" links to missing ${LINK_TYPE_LABELS[linked.type] ?? linked.type}: ${linked.title || linked.id}. Bundle export will flag this as missing.`,
          sourceType: "campaign",
          sourceId: campaign.id,
          sourceTitle: title,
          href,
          suggestedAction:
            "Restore the linked record or remove the broken link before exporting a campaign bundle.",
        })
      }
    }
  }
}

function scanPromptRunLinkWarnings(
  input: DataHealthScanInput,
  sets: RecordIdSets,
  issues: DataHealthIssue[],
): void {
  for (const run of input.promptRuns) {
    const title = run.promptName || "Prompt run"
    const href = promptRunHref(run.id)

    if (run.campaignId && !sets.campaign.has(run.campaignId)) {
      pushIssue(issues, {
        id: issueId(["prompt-run-campaign", run.id, run.campaignId]),
        severity: "warning",
        category: "broken-links",
        title: "Prompt run links to missing campaign",
        description: `Prompt run "${title}" references missing campaign ${run.campaignId}.`,
        sourceType: "prompt-run",
        sourceId: run.id,
        sourceTitle: title,
        href,
        suggestedAction: "Clear the campaign link or restore the campaign.",
        relatedHref: campaignHref(run.campaignId),
      })
    }

    if (run.outputRecordId && run.outputRecordType) {
      const linkType = run.outputRecordType as CampaignLinkedRecordType
      if (!recordExists(sets, linkType, run.outputRecordId)) {
        pushIssue(issues, {
          id: issueId([
            "prompt-run-output",
            run.id,
            run.outputRecordType,
            run.outputRecordId,
          ]),
          severity: "warning",
          category: "broken-links",
          title: "Prompt run links to missing output record",
          description: `Prompt run "${title}" references missing ${LINK_TYPE_LABELS[linkType] ?? run.outputRecordType}.`,
          sourceType: "prompt-run",
          sourceId: run.id,
          sourceTitle: title,
          href,
          suggestedAction: "Clear the output link or restore the linked record.",
          relatedHref: canonicalHref(linkType, run.outputRecordId),
        })
      }
    }

    const isAiRun =
      run.runType === "ai-generation" || run.tags.some((tag) => tag === "ai-generated")
    if (isAiRun && !hasText(run.aiResponse)) {
      pushIssue(issues, {
        id: issueId(["prompt-run-ai-empty", run.id]),
        severity: "warning",
        category: "incomplete-records",
        title: "AI Prompt Run has empty response",
        description: `Prompt run "${title}" was created by AI generation but has no aiResponse text.`,
        sourceType: "prompt-run",
        sourceId: run.id,
        sourceTitle: title,
        href,
        suggestedAction: "Re-run generation or paste the AI output into the run.",
      })
    }
  }
}

function scanAIConfigurationWarnings(
  input: DataHealthScanInput,
  issues: DataHealthIssue[],
): void {
  const ws = input.workspaceSettings
  if (!ws?.aiGenerationEnabled) return

  if (input.aiProviderConfigured === false) {
    pushIssue(issues, {
      id: issueId(["ai-provider-missing"]),
      severity: "warning",
      category: "data-issues",
      title: "AI generation enabled but provider not configured",
      description:
        "Workspace settings enable AI generation, but no provider API key was detected in the environment.",
      sourceType: "workspace-settings",
      sourceId: ws.id,
      sourceTitle: ws.workspaceName || "Workspace settings",
      href: "/settings",
      suggestedAction: "Add OPENAI_API_KEY to .env.local and restart the dev server.",
    })
  }
}

function scanAIGenerationTemplateWarnings(
  input: DataHealthScanInput,
  issues: DataHealthIssue[],
): void {
  const templates = input.prompts.filter(isAIGenerationTemplate)
  if (templates.length === 0) return

  const nameCounts = new Map<string, number>()
  for (const template of templates) {
    if (!getTemplateModuleSlug(template)) {
      pushIssue(issues, {
        id: issueId(["ai-template-missing-module", template.id]),
        severity: "info",
        category: "data-issues",
        title: "AI template missing module tag",
        description: `"${template.name}" is an AI Generation Template without a module:youtube-packaging-style tag.`,
        sourceType: "prompt",
        sourceId: template.id,
        sourceTitle: template.name,
        href: `/prompts?recordId=${encodeURIComponent(template.id)}`,
        suggestedAction: "Add a module tag (e.g. module:youtube-packaging) in Prompt Library.",
      })
    }

    if (!templateHasOutputFormatInstructions(template)) {
      pushIssue(issues, {
        id: issueId(["ai-template-missing-output", template.id]),
        severity: "info",
        category: "data-issues",
        title: "AI template missing output format instructions",
        description: `"${template.name}" has little or no parser-friendly output format guidance.`,
        sourceType: "prompt",
        sourceId: template.id,
        sourceTitle: template.name,
        href: `/prompts?recordId=${encodeURIComponent(template.id)}`,
        suggestedAction: "Add output format labels in the template outputFormat field.",
      })
    }

    nameCounts.set(template.name, (nameCounts.get(template.name) ?? 0) + 1)
  }

  for (const [name, count] of nameCounts) {
    if (count < 2) continue
    const matches = templates.filter((template) => template.name === name)
    for (const template of matches) {
      pushIssue(issues, {
        id: issueId(["ai-template-duplicate-name", template.id, name]),
        severity: "info",
        category: "duplicates",
        title: "Duplicate AI generation template name",
        description: `"${name}" appears ${count} times under ${AI_GENERATION_TEMPLATE_CATEGORY}.`,
        sourceType: "prompt",
        sourceId: template.id,
        sourceTitle: template.name,
        href: `/prompts?recordId=${encodeURIComponent(template.id)}`,
        suggestedAction: "Rename or merge duplicate AI templates in Prompt Library.",
      })
    }
  }
}

function scanCampaignCopilotWarnings(
  input: DataHealthScanInput,
  issues: DataHealthIssue[],
): void {
  for (const campaign of input.campaigns) {
    if (campaign.status !== "Ready to Publish") continue

    const hasCopilot = input.promptRuns.some(
      (run) =>
        run.campaignId === campaign.id &&
        (run.moduleType === "Campaign Copilot" ||
          run.tags.includes("campaign-copilot") ||
          run.runType === "Copilot"),
    )
    if (hasCopilot) continue

    const title = campaign.campaignName || "Untitled campaign"
    pushIssue(issues, {
      id: issueId(["campaign-copilot-missing", campaign.id]),
      severity: "info",
      category: "incomplete-records",
      title: "No Campaign Copilot analysis before publish",
      description: `"${title}" is Ready to Publish but has no saved Copilot run yet.`,
      sourceType: "campaign",
      sourceId: campaign.id,
      sourceTitle: title,
      href: `${campaignHref(campaign.id)}&tab=launch`,
      suggestedAction: "Run Campaign Copilot from the Launch Dashboard when ready.",
      relatedHref: `/copilot?campaignId=${encodeURIComponent(campaign.id)}`,
    })
  }
}

function recordFinalFieldsEmpty(
  record: Record<string, unknown>,
  keys: string[],
): boolean {
  return keys.every((key) => !hasText(String(record[key] ?? "")))
}

function scanAiResponseWithoutFinalFields(
  input: DataHealthScanInput,
  issues: DataHealthIssue[],
): void {
  const checks: Array<{
    module: AIOutputModuleType
    sourceType: string
    records: Array<Record<string, unknown> & { id: string; aiResponse?: string }>
    href: (id: string) => string
    title: (record: Record<string, unknown>) => string
  }> = [
    {
      module: "YouTube Packaging",
      sourceType: "youtube-package",
      records: input.youtubePackages,
      href: (id) => canonicalHref("youtube-package", id),
      title: (r) => String(r.finalTitle || r.trackTitle || "YouTube package"),
    },
    {
      module: "YouTube Thumbnail",
      sourceType: "youtube-thumbnail",
      records: input.youtubeThumbnails,
      href: (id) => canonicalHref("youtube-thumbnail", id),
      title: (r) => String(r.finalConcept || r.trackTitle || "YouTube thumbnail"),
    },
    {
      module: "Release Plan",
      sourceType: "release-plan",
      records: input.releasePlans,
      href: (id) => canonicalHref("release-plan", id),
      title: (r) => String(r.songTitle || r.artistName || "Release plan"),
    },
    {
      module: "Social Repurposing",
      sourceType: "social-repurposing",
      records: input.socialRepurposing,
      href: (id) => canonicalHref("social-repurposing", id),
      title: (r) => String(r.campaignName || r.sourceContent || "Social content"),
    },
    {
      module: "Email Campaign",
      sourceType: "email-campaign",
      records: input.emailCampaigns,
      href: (id) => canonicalHref("email-campaign", id),
      title: (r) => String(r.campaignName || "Email campaign"),
    },
    {
      module: "Merch Idea",
      sourceType: "merch-idea",
      records: input.merchIdeas,
      href: (id) => canonicalHref("merch-idea", id),
      title: (r) => String(r.selectedConceptName || r.niche || "Merch idea"),
    },
    {
      module: "Product Listing",
      sourceType: "product-listing",
      records: input.productListings,
      href: (id) => canonicalHref("product-listing", id),
      title: (r) => String(r.finalTitle || r.niche || "Product listing"),
    },
    {
      module: "Mockup Prompt",
      sourceType: "mockup-prompt",
      records: input.mockupPrompts,
      href: (id) => canonicalHref("mockup-prompt", id),
      title: (r) => String(r.projectName || r.mockupType || "Mockup prompt"),
    },
  ]

  for (const check of checks) {
    const keys = getModuleFieldKeys(check.module)
    for (const record of check.records) {
      if (!hasText(record.aiResponse)) continue
      if (!recordFinalFieldsEmpty(record, keys)) continue
      pushIssue(issues, {
        id: issueId(["ai-response-no-final", check.sourceType, record.id]),
        severity: "info",
        category: "incomplete-records",
        title: "AI response not applied to final fields",
        description: `"${check.title(record)}" has AI response text but no populated final output fields.`,
        sourceType: check.sourceType,
        sourceId: record.id,
        sourceTitle: check.title(record),
        href: check.href(record.id),
        suggestedAction: "Open the record, parse the AI response, and apply to final fields.",
      })
    }
  }
}

function isValidJson(raw: string, expected: "array" | "object"): boolean {
  return isValidJsonString(raw, expected)
}

function scanJsonIssues(input: DataHealthScanInput, issues: DataHealthIssue[]): void {
  for (const field of input.jsonFields) {
    if (isValidJson(field.raw, field.expected)) continue
    pushIssue(issues, {
      id: issueId(["json", field.sourceType, field.sourceId, field.fieldName]),
      severity: "critical",
      category: "data-issues",
      title: "Malformed JSON field",
      description: `${field.sourceTitle} has invalid JSON in "${field.fieldName}".`,
      sourceType: field.sourceType,
      sourceId: field.sourceId,
      sourceTitle: field.sourceTitle,
      href:
        field.sourceType === "workspace-settings"
          ? "/settings"
          : field.sourceType === "preset"
            ? `/presets?presetId=${encodeURIComponent(field.sourceId)}`
            : field.sourceType === "prompt"
              ? `/prompts?promptId=${encodeURIComponent(field.sourceId)}`
              : field.sourceType === "campaign"
                ? campaignHref(field.sourceId)
                : field.sourceType === "quality-review"
                  ? `/quality?recordId=${encodeURIComponent(field.sourceId)}`
                  : field.sourceType === "learning"
                    ? `/learnings?recordId=${encodeURIComponent(field.sourceId)}`
                    : "/backups",
      suggestedAction: "Open Backup Center to export, repair JSON manually, and re-import.",
      relatedHref: "/backups",
    })
  }
}

function buildSummary(issues: DataHealthIssue[]): DataHealthSummary {
  const summary: DataHealthSummary = {
    totalIssues: issues.length,
    critical: 0,
    warnings: 0,
    info: 0,
    brokenLinks: 0,
    missingAssets: 0,
    duplicates: 0,
    incompleteRecords: 0,
    dataIssues: 0,
  }

  for (const issue of issues) {
    if (issue.severity === "critical") summary.critical += 1
    if (issue.severity === "warning") summary.warnings += 1
    if (issue.severity === "info") summary.info += 1
    if (issue.category === "broken-links") summary.brokenLinks += 1
    if (issue.category === "missing-assets") summary.missingAssets += 1
    if (issue.category === "duplicates") summary.duplicates += 1
    if (issue.category === "incomplete-records") summary.incompleteRecords += 1
    if (issue.category === "data-issues") summary.dataIssues += 1
  }

  return summary
}

export function countScannableRecords(input: DataHealthScanInput): number {
  return (
    input.campaigns.length +
    input.artists.length +
    input.youtubePackages.length +
    input.youtubeThumbnails.length +
    input.releasePlans.length +
    input.socialRepurposing.length +
    input.emailCampaigns.length +
    input.merchIdeas.length +
    input.productListings.length +
    input.mockupPrompts.length +
    input.analyticsRecords.length +
    input.experiments.length +
    input.presets.length +
    input.playbooks.length +
    input.prompts.length +
    input.promptRuns.length +
    input.workflows.length +
    input.workflowRuns.length +
    input.assets.length +
    input.qualityReviews.length +
    input.learnings.length +
    input.externalLinks.length +
    (input.workspaceSettings ? 1 : 0)
  )
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function createScannerFailureIssue(scannerName: string, error: unknown): DataHealthIssue {
  return {
    id: issueId(["scanner-failed", scannerName]),
    severity: "critical",
    category: "data-issues",
    title: `${scannerName} scan failed`,
    description: safeErrorMessage(error),
    sourceType: "data-health",
    sourceId: scannerName,
    sourceTitle: "Data Health Scanner",
    href: "/data-health",
    suggestedAction: "Retry the scan or inspect your local database connection.",
  }
}

export function createDataLoadFailureIssue(
  moduleName: string,
  error: unknown,
): DataHealthIssue {
  return {
    id: issueId(["load-failed", moduleName]),
    severity: "critical",
    category: "data-issues",
    title: `${moduleName} load failed`,
    description: safeErrorMessage(error),
    sourceType: "data-health",
    sourceId: moduleName,
    sourceTitle: "Data Health Scanner",
    href: "/data-health",
    suggestedAction: "Check that the module table exists and retry the scan.",
  }
}

export function scanPlaybookWarnings(
  input: DataHealthScanInput,
  sets: RecordIdSets,
  issues: DataHealthIssue[],
): void {
  const playbookIds = new Set(input.playbooks.map((playbook) => playbook.id))
  const presetIds = new Set(input.presets.map((preset) => preset.id))
  const workflowIds = sets.workflow

  for (const playbook of input.playbooks) {
    const title = playbook.name || "Untitled playbook"
    const href = `/playbooks?recordId=${encodeURIComponent(playbook.id)}`

    if (!hasText(playbook.name)) {
      pushIssue(issues, {
        id: issueId(["playbook-missing-name", playbook.id]),
        severity: "warning",
        category: "incomplete-records",
        title: "Playbook missing name",
        description: `Playbook ${playbook.id} has no name.`,
        sourceType: "playbook",
        sourceId: playbook.id,
        sourceTitle: title,
        href,
        suggestedAction: "Add a playbook name in Playbook Builder.",
      })
    }

    if (playbook.recommendedPresetId && !presetIds.has(playbook.recommendedPresetId)) {
      pushIssue(issues, {
        id: issueId(["playbook-missing-preset", playbook.id, playbook.recommendedPresetId]),
        severity: "warning",
        category: "broken-links",
        title: "Playbook references missing preset",
        description: `Playbook "${title}" references preset ${playbook.recommendedPresetId} which was not found.`,
        sourceType: "playbook",
        sourceId: playbook.id,
        sourceTitle: title,
        href,
        suggestedAction: "Update the recommended preset or clear the preset reference.",
      })
    }

    if (
      playbook.recommendedWorkflowId &&
      !workflowIds.has(playbook.recommendedWorkflowId)
    ) {
      pushIssue(issues, {
        id: issueId(["playbook-missing-workflow", playbook.id, playbook.recommendedWorkflowId]),
        severity: "warning",
        category: "broken-links",
        title: "Playbook references missing workflow",
        description: `Playbook "${title}" references workflow ${playbook.recommendedWorkflowId} which was not found.`,
        sourceType: "playbook",
        sourceId: playbook.id,
        sourceTitle: title,
        href,
        suggestedAction: "Update the recommended workflow or clear the workflow reference.",
      })
    }
  }

  for (const campaign of input.campaigns) {
    const playbookId = extractPlaybookIdFromNotes(campaign.notes)
    if (!playbookId || playbookIds.has(playbookId)) continue

    const campaignTitle = campaign.campaignName || "Untitled campaign"
    pushIssue(issues, {
      id: issueId(["campaign-missing-playbook", campaign.id, playbookId]),
      severity: "warning",
      category: "broken-links",
      title: "Campaign references missing playbook",
      description: `Campaign "${campaignTitle}" notes reference playbook ${playbookId} which was not found.`,
      sourceType: "campaign",
      sourceId: campaign.id,
      sourceTitle: campaignTitle,
      href: campaignHref(campaign.id),
      suggestedAction: "Restore the playbook or remove the playbook reference from campaign notes.",
      relatedHref: `/playbooks?recordId=${encodeURIComponent(playbookId)}`,
    })
  }
}

function scanAssetWarnings(
  input: DataHealthScanInput,
  sets: RecordIdSets,
  issues: DataHealthIssue[],
): void {
  const experimentIds = new Set(input.experiments.map((e) => e.id))
  const promptRunIds = new Set(input.promptRuns.map((r) => r.id))
  const sourceTypeToSet: Record<string, Set<string> | undefined> = {
    "release-plan": sets["release-plan"],
    "youtube-package": sets["youtube-package"],
    "youtube-thumbnail": sets["youtube-thumbnail"],
    "social-repurposing": sets["social-repurposing"],
    "merch-idea": sets["merch-idea"],
    "product-listing": sets["product-listing"],
    "mockup-prompt": sets["mockup-prompt"],
    "email-campaign": sets["email-campaign"],
    analytics: sets.analytics,
    artist: sets.artist,
    "prompt-run": sets["prompt-run"],
  }

  for (const asset of input.assets) {
    const title = asset.assetName || "Untitled asset"
    const href = `/assets?recordId=${encodeURIComponent(asset.id)}`

    if (!hasText(asset.assetName)) {
      pushIssue(issues, {
        id: issueId(["asset-missing-name", asset.id]),
        severity: "warning",
        category: "incomplete-records",
        title: "Asset missing name",
        description: `Asset ${asset.id} has no asset name.`,
        sourceType: "asset",
        sourceId: asset.id,
        sourceTitle: title,
        href,
        suggestedAction: "Add an asset name in Asset Library.",
      })
    }

    if (!hasText(asset.assetType)) {
      pushIssue(issues, {
        id: issueId(["asset-missing-type", asset.id]),
        severity: "warning",
        category: "incomplete-records",
        title: "Asset missing type",
        description: `Asset "${title}" has no asset type.`,
        sourceType: "asset",
        sourceId: asset.id,
        sourceTitle: title,
        href,
        suggestedAction: "Set an asset type (e.g. YouTube Thumbnail).",
      })
    }

    if (asset.campaignId && !sets.campaign.has(asset.campaignId)) {
      pushIssue(issues, {
        id: issueId(["asset-missing-campaign", asset.id]),
        severity: "warning",
        category: "broken-links",
        title: "Asset links to missing campaign",
        description: `Asset "${title}" references campaign id ${asset.campaignId} which was not found.`,
        sourceType: "asset",
        sourceId: asset.id,
        sourceTitle: title,
        href,
        suggestedAction: "Clear the campaign link or link to an existing campaign.",
      })
    }

    if (asset.sourcePromptRunId && !promptRunIds.has(asset.sourcePromptRunId)) {
      pushIssue(issues, {
        id: issueId(["asset-missing-prompt-run", asset.id]),
        severity: "warning",
        category: "broken-links",
        title: "Asset links to missing prompt run",
        description: `Asset "${title}" references prompt run ${asset.sourcePromptRunId} which was not found.`,
        sourceType: "asset",
        sourceId: asset.id,
        sourceTitle: title,
        href,
        suggestedAction: "Clear the prompt run link or save the prompt run first.",
        relatedHref: "/runner",
      })
    }

    if (asset.sourceRecordId && asset.sourceRecordType) {
      const sourceSet = sourceTypeToSet[asset.sourceRecordType]
      if (sourceSet && !sourceSet.has(asset.sourceRecordId)) {
        pushIssue(issues, {
          id: issueId(["asset-missing-source-record", asset.id]),
          severity: "warning",
          category: "broken-links",
          title: "Asset links to missing source record",
          description: `Asset "${title}" references ${asset.sourceRecordType} ${asset.sourceRecordId} which was not found.`,
          sourceType: "asset",
          sourceId: asset.id,
          sourceTitle: title,
          href,
          suggestedAction: "Clear the source record link or recreate the source module record.",
        })
      }
    }

    if (asset.experimentId && !experimentIds.has(asset.experimentId)) {
      pushIssue(issues, {
        id: issueId(["asset-missing-experiment", asset.id]),
        severity: "warning",
        category: "broken-links",
        title: "Asset links to missing experiment",
        description: `Asset "${title}" references experiment ${asset.experimentId} which was not found.`,
        sourceType: "asset",
        sourceId: asset.id,
        sourceTitle: title,
        href,
        suggestedAction: "Clear the experiment link or create the experiment record.",
        relatedHref: "/experiments",
      })
    }

    const readyStatuses = new Set(["Ready", "Published"])
    if (
      readyStatuses.has(asset.status) &&
      !hasText(asset.filePath) &&
      !hasText(asset.fileUrl) &&
      !hasText(asset.externalUrl)
    ) {
      pushIssue(issues, {
        id: issueId(["asset-ready-no-location", asset.id]),
        severity: "warning",
        category: "missing-assets",
        title: "Ready asset missing file or URL",
        description: `Asset "${title}" is marked ${asset.status} but has no file path, file URL, or external URL.`,
        sourceType: "asset",
        sourceId: asset.id,
        sourceTitle: title,
        href,
        suggestedAction: "Add a file path, file URL, or external URL in Source & Links.",
      })
    }
  }
}

function safeScan(
  scannerName: string,
  issues: DataHealthIssue[],
  fn: () => void,
): void {
  try {
    fn()
  } catch (error) {
    pushIssue(issues, createScannerFailureIssue(scannerName, error))
  }
}

function hasQualityReviewForSource(
  reviews: QualityReviewRecord[],
  sourceType: string,
  sourceId: string,
): boolean {
  const normType = normalizeSourceRecordType(sourceType)
  return reviews.some(
    (review) =>
      normalizeSourceRecordType(review.sourceRecordType) === normType &&
      review.sourceRecordId === sourceId,
  )
}

function qualityReviewIssue(
  review: QualityReviewRecord,
  idParts: string[],
  partial: Omit<DataHealthIssue, "id" | "sourceType" | "sourceId" | "sourceTitle" | "href">,
): DataHealthIssue {
  const title = review.reviewName || "Untitled review"
  const href = `/quality?recordId=${encodeURIComponent(review.id)}`
  return {
    id: issueId(idParts),
    sourceType: "quality-review",
    sourceId: review.id,
    sourceTitle: title,
    href,
    ...partial,
  }
}

export function scanQualityReviewWarnings(
  input: DataHealthScanInput,
  sets: RecordIdSets,
  issues: DataHealthIssue[],
): DataHealthIssue[] {
  const campaignIds = sets.campaign
  const experimentIds = new Set(input.experiments.map((experiment) => experiment.id))

  for (const review of input.qualityReviews) {
    const title = review.reviewName || "Untitled review"

    if (!hasText(review.reviewName)) {
      issues.push(
        qualityReviewIssue(review, ["quality-review-missing-name", review.id], {
          severity: "warning",
          category: "incomplete-records",
          title: "Quality review missing name",
          description: `Quality review ${review.id} has no review name.`,
          suggestedAction: "Add a review name in Quality Review.",
        }),
      )
    }

    if (!hasText(review.reviewType)) {
      issues.push(
        qualityReviewIssue(review, ["quality-review-missing-type", review.id], {
          severity: "warning",
          category: "incomplete-records",
          title: "Quality review missing type",
          description: `"${title}" has no review type.`,
          suggestedAction: "Select a review type.",
        }),
      )
    }

    if (review.campaignId && !campaignIds.has(review.campaignId)) {
      issues.push(
        qualityReviewIssue(
          review,
          ["quality-review-missing-campaign", review.id, review.campaignId],
          {
            severity: "warning",
            category: "broken-links",
            title: "Quality review linked to missing campaign",
            description: `"${title}" references campaign ${review.campaignId} which was not found.`,
            suggestedAction: "Link to an existing campaign or clear campaignId.",
          },
        ),
      )
    }

    if (review.sourceRecordId && review.sourceRecordType) {
      const sourceType = normalizeSourceRecordType(review.sourceRecordType)
      let sourceMissing = false
      if (sourceType === "experiment") {
        sourceMissing = !experimentIds.has(review.sourceRecordId)
      } else if (sourceType === "prompt-run") {
        sourceMissing = !sets["prompt-run"].has(review.sourceRecordId)
      } else if (sourceType in sets) {
        sourceMissing = !recordExists(
          sets,
          sourceType as CampaignLinkedRecordType,
          review.sourceRecordId,
        )
      }

      if (sourceMissing) {
        issues.push(
          qualityReviewIssue(
            review,
            ["quality-review-missing-source", review.id, review.sourceRecordId],
            {
              severity: "warning",
              category: "broken-links",
              title: "Quality review linked to missing source record",
              description: `"${title}" references missing ${sourceType} ${review.sourceRecordId}.`,
              suggestedAction: "Link to an existing source record or clear the source link.",
            },
          ),
        )
      }
    }

    if (
      review.overallScore === 0 &&
      (review.status === "Reviewed" || review.status === "Ready")
    ) {
      issues.push(
        qualityReviewIssue(review, ["quality-review-zero-reviewed", review.id], {
          severity: "warning",
          category: "incomplete-records",
          title: "Reviewed quality record has zero score",
          description: `"${title}" is marked ${review.status} but overall score is 0.`,
          suggestedAction: "Enter criterion scores or regenerate draft.",
        }),
      )
    }
  }

  for (const campaign of input.campaigns) {
    const campaignTitle = campaign.campaignName || "Campaign"
    const campaignQualityHref = `/quality?campaignId=${encodeURIComponent(campaign.id)}`

    if (campaign.status === "Ready to Publish") {
      const hasReadiness = input.qualityReviews.some(
        (review) =>
          review.reviewType === "Campaign Readiness" &&
          (review.campaignId === campaign.id ||
            norm(review.campaignName) === norm(campaign.campaignName)),
      )
      if (!hasReadiness) {
        issues.push({
          id: issueId(["campaign-ready-no-readiness-review", campaign.id]),
          severity: "warning",
          category: "missing-assets",
          title: "Ready campaign without readiness review",
          description: `"${campaignTitle}" is Ready to Publish but has no Campaign Readiness review.`,
          sourceType: "campaign",
          sourceId: campaign.id,
          sourceTitle: campaignTitle,
          href: campaignHref(campaign.id),
          suggestedAction: "Create a Campaign Readiness quality review.",
          relatedHref: `${campaignQualityHref}&reviewType=${encodeURIComponent("Campaign Readiness")}`,
        })
      }
    }

    if (isPublishedCampaignStatus(campaign.status)) {
      const campaignReviews = input.qualityReviews.filter(
        (review) =>
          review.campaignId === campaign.id ||
          norm(review.campaignName) === norm(campaign.campaignName),
      )
      for (const review of campaignReviews) {
        if (review.overallScore > 0 && review.overallScore < 60) {
          issues.push({
            id: issueId(["published-campaign-low-quality", campaign.id, review.id]),
            severity: "info",
            category: "incomplete-records",
            title: "Published campaign has low quality score",
            description: `"${campaignTitle}" has review "${review.reviewName || review.reviewType}" at ${review.overallScore}/100.`,
            sourceType: "campaign",
            sourceId: campaign.id,
            sourceTitle: campaignTitle,
            href: campaignHref(campaign.id),
            suggestedAction: "Revise the quality review before the next publish cycle.",
            relatedHref: `/quality?recordId=${encodeURIComponent(review.id)}`,
          })
        }
      }
    }

    for (const linked of campaign.linkedRecords) {
      if (linked.type === "youtube-package") {
        if (!hasQualityReviewForSource(input.qualityReviews, linked.type, linked.id)) {
          issues.push({
            id: issueId(["campaign-missing-youtube-package-review", campaign.id, linked.id]),
            severity: "info",
            category: "missing-assets",
            title: "YouTube package without quality review",
            description: `"${campaignTitle}" has a YouTube package without a linked quality review.`,
            sourceType: "campaign",
            sourceId: campaign.id,
            sourceTitle: campaignTitle,
            href: campaignHref(campaign.id),
            suggestedAction: "Review the YouTube package before publishing.",
            relatedHref: `/quality?campaignId=${encodeURIComponent(campaign.id)}&sourceRecordType=youtube-package&sourceRecordId=${encodeURIComponent(linked.id)}&reviewType=${encodeURIComponent("YouTube Package")}`,
          })
        }
      }

      if (linked.type === "youtube-thumbnail") {
        if (!hasQualityReviewForSource(input.qualityReviews, linked.type, linked.id)) {
          issues.push({
            id: issueId(["campaign-missing-youtube-thumbnail-review", campaign.id, linked.id]),
            severity: "info",
            category: "missing-assets",
            title: "YouTube thumbnail without quality review",
            description: `"${campaignTitle}" has a YouTube thumbnail without a linked quality review.`,
            sourceType: "campaign",
            sourceId: campaign.id,
            sourceTitle: campaignTitle,
            href: campaignHref(campaign.id),
            suggestedAction: "Review the thumbnail before publishing.",
            relatedHref: `/quality?campaignId=${encodeURIComponent(campaign.id)}&sourceRecordType=youtube-thumbnail&sourceRecordId=${encodeURIComponent(linked.id)}&reviewType=${encodeURIComponent("Thumbnail")}`,
          })
        }
      }
    }
  }

  return issues
}

export function scanLearningWarnings(
  input: DataHealthScanInput,
  sets: RecordIdSets,
  issues: DataHealthIssue[],
): DataHealthIssue[] {
  const campaignIds = sets.campaign
  const analyticsIds = sets.analytics
  const experimentIds = new Set(input.experiments.map((e) => e.id))
  const qualityReviewIds = new Set(input.qualityReviews.map((r) => r.id))

  for (const learning of input.learnings) {
    const title = learning.title || "Untitled learning"
    const href = `/learnings?recordId=${encodeURIComponent(learning.id)}`

    if (!hasText(learning.title)) {
      issues.push({
        id: issueId(["learning-missing-title", learning.id]),
        severity: "warning",
        category: "incomplete-records",
        title: "Learning missing title",
        description: `Learning ${learning.id} has no title.`,
        sourceType: "learning",
        sourceId: learning.id,
        sourceTitle: title,
        href,
        suggestedAction: "Add a title in Learnings.",
      })
    }

    if (!hasText(learning.insight)) {
      issues.push({
        id: issueId(["learning-missing-insight", learning.id]),
        severity: "warning",
        category: "incomplete-records",
        title: "Learning missing insight",
        description: `"${title}" has no insight text.`,
        sourceType: "learning",
        sourceId: learning.id,
        sourceTitle: title,
        href,
        suggestedAction: "Add the core insight in Learnings.",
      })
    }

    if (learning.campaignId && !campaignIds.has(learning.campaignId)) {
      issues.push({
        id: issueId(["learning-missing-campaign", learning.id, learning.campaignId]),
        severity: "warning",
        category: "broken-links",
        title: "Learning linked to missing campaign",
        description: `"${title}" references campaign ${learning.campaignId} which was not found.`,
        sourceType: "learning",
        sourceId: learning.id,
        sourceTitle: title,
        href,
        suggestedAction: "Link to an existing campaign or clear campaignId.",
      })
    }

    if (learning.analyticsRecordId && !analyticsIds.has(learning.analyticsRecordId)) {
      issues.push({
        id: issueId(["learning-missing-analytics", learning.id, learning.analyticsRecordId]),
        severity: "warning",
        category: "broken-links",
        title: "Learning linked to missing analytics record",
        description: `"${title}" references missing analytics ${learning.analyticsRecordId}.`,
        sourceType: "learning",
        sourceId: learning.id,
        sourceTitle: title,
        href,
        suggestedAction: "Update or clear the analytics link.",
      })
    }

    if (learning.experimentId && !experimentIds.has(learning.experimentId)) {
      issues.push({
        id: issueId(["learning-missing-experiment", learning.id, learning.experimentId]),
        severity: "warning",
        category: "broken-links",
        title: "Learning linked to missing experiment",
        description: `"${title}" references missing experiment ${learning.experimentId}.`,
        sourceType: "learning",
        sourceId: learning.id,
        sourceTitle: title,
        href,
        suggestedAction: "Update or clear the experiment link.",
      })
    }

    if (learning.qualityReviewId && !qualityReviewIds.has(learning.qualityReviewId)) {
      issues.push({
        id: issueId(["learning-missing-quality-review", learning.id, learning.qualityReviewId]),
        severity: "warning",
        category: "broken-links",
        title: "Learning linked to missing quality review",
        description: `"${title}" references missing quality review ${learning.qualityReviewId}.`,
        sourceType: "learning",
        sourceId: learning.id,
        sourceTitle: title,
        href,
        suggestedAction: "Update or clear the quality review link.",
      })
    }

    if (learning.status === "Validated" && learning.confidence === "Low") {
      issues.push({
        id: issueId(["learning-validated-low-confidence", learning.id]),
        severity: "info",
        category: "incomplete-records",
        title: "Validated learning has low confidence",
        description: `"${title}" is Validated but confidence is Low.`,
        sourceType: "learning",
        sourceId: learning.id,
        sourceTitle: title,
        href,
        suggestedAction: "Raise confidence or change status to Needs Validation.",
      })
    }
  }

  return issues
}

function externalLinkSourceExists(
  input: DataHealthScanInput,
  type: string,
  id: string,
): boolean {
  const normalized = normalizeSourceRecordType(type)
  if (!id.trim()) return false
  switch (normalized) {
    case "youtube-package":
      return input.youtubePackages.some((record) => record.id === id)
    case "youtube-thumbnail":
      return input.youtubeThumbnails.some((record) => record.id === id)
    case "release-plan":
      return input.releasePlans.some((record) => record.id === id)
    case "social-repurposing":
      return input.socialRepurposing.some((record) => record.id === id)
    case "email-campaign":
      return input.emailCampaigns.some((record) => record.id === id)
    case "merch-idea":
      return input.merchIdeas.some((record) => record.id === id)
    case "product-listing":
      return input.productListings.some((record) => record.id === id)
    case "mockup-prompt":
      return input.mockupPrompts.some((record) => record.id === id)
    case "prompt-run":
      return input.promptRuns.some((record) => record.id === id)
    case "experiment":
      return input.experiments.some((record) => record.id === id)
    case "asset":
      return input.assets.some((record) => record.id === id)
    case "analytics":
      return input.analyticsRecords.some((record) => record.id === id)
    case "youtubevideo":
    case "YouTubeVideo":
      return input.youtubeVideos.some((record) => record.id === id)
    default:
      return false
  }
}

export function scanExternalLinkWarnings(
  input: DataHealthScanInput,
  sets: RecordIdSets,
  issues: DataHealthIssue[],
): void {
  for (const link of input.externalLinks) {
    const title = link.name || link.url || link.id
    const href = `/integrations?recordId=${encodeURIComponent(link.id)}`

    if (!hasText(link.name)) {
      pushIssue(issues, {
        id: issueId(["external-link", link.id, "missing-name"]),
        severity: "warning",
        category: "incomplete-records",
        title: "External link missing name",
        description: `External link ${link.id} has no display name.`,
        sourceType: "external-link",
        sourceId: link.id,
        sourceTitle: title,
        href,
        suggestedAction: "Add a descriptive name in Integrations.",
      })
    }

    if (!hasText(link.platform)) {
      pushIssue(issues, {
        id: issueId(["external-link", link.id, "missing-platform"]),
        severity: "warning",
        category: "incomplete-records",
        title: "External link missing platform",
        description: `"${title}" has no platform selected.`,
        sourceType: "external-link",
        sourceId: link.id,
        sourceTitle: title,
        href,
        suggestedAction: "Choose a platform in Integrations.",
      })
    }

    if (!hasText(link.url)) {
      pushIssue(issues, {
        id: issueId(["external-link", link.id, "missing-url"]),
        severity: "warning",
        category: "incomplete-records",
        title: "External link missing URL",
        description: `"${title}" has no URL.`,
        sourceType: "external-link",
        sourceId: link.id,
        sourceTitle: title,
        href,
        suggestedAction: "Paste the external URL in Integrations.",
      })
    } else if (!isValidExternalUrl(link.url)) {
      pushIssue(issues, {
        id: issueId(["external-link", link.id, "invalid-url"]),
        severity: "warning",
        category: "data-issues",
        title: "External link URL format invalid",
        description: `"${title}" URL does not look like a valid http(s) link.`,
        sourceType: "external-link",
        sourceId: link.id,
        sourceTitle: title,
        href,
        suggestedAction: "Fix the URL format in Integrations.",
      })
    }

    if (link.campaignId && !recordExists(sets, "campaign", link.campaignId)) {
      pushIssue(issues, {
        id: issueId(["external-link", link.id, "missing-campaign"]),
        severity: "warning",
        category: "broken-links",
        title: "External link references missing campaign",
        description: `"${title}" is linked to campaign ${link.campaignId}, which was not found.`,
        sourceType: "external-link",
        sourceId: link.id,
        sourceTitle: title,
        href,
        suggestedAction: "Clear or update the campaign link in Integrations.",
      })
    }

    if (
      link.sourceRecordType &&
      link.sourceRecordId &&
      !externalLinkSourceExists(input, link.sourceRecordType, link.sourceRecordId)
    ) {
      pushIssue(issues, {
        id: issueId(["external-link", link.id, "missing-source"]),
        severity: "warning",
        category: "broken-links",
        title: "External link references missing source record",
        description: `"${title}" references ${link.sourceRecordType} ${link.sourceRecordId}, which was not found.`,
        sourceType: "external-link",
        sourceId: link.id,
        sourceTitle: title,
        href,
        suggestedAction: "Update the source record link in Integrations.",
      })
    }

    if (link.status === "Broken") {
      pushIssue(issues, {
        id: issueId(["external-link", link.id, "broken-status"]),
        severity: "warning",
        category: "data-issues",
        title: "External link marked broken",
        description: `"${title}" is marked Broken.`,
        sourceType: "external-link",
        sourceId: link.id,
        sourceTitle: title,
        href,
        suggestedAction: "Verify the URL and update status in Integrations.",
      })
    }
  }

  for (const campaign of input.campaigns) {
    if (!isPublishedCampaignStatus(campaign.status)) continue
    const campaignLinks = input.externalLinks.filter(
      (link) =>
        link.campaignId === campaign.id ||
        (link.campaignName &&
          link.campaignName.trim().toLowerCase() ===
            campaign.campaignName.trim().toLowerCase()),
    )
    const hasPublishedVideo = campaignLinks.some(
      (link) => link.platform === "YouTube" && link.linkType === "Published Video",
    )
    const hasImportedYouTubeVideo = input.youtubeVideos.some(
      (video) =>
        video.campaignId === campaign.id ||
        (video.campaignName &&
          video.campaignName.trim().toLowerCase() ===
            campaign.campaignName.trim().toLowerCase()),
    )
    if (!hasPublishedVideo && !hasImportedYouTubeVideo) {
      pushIssue(issues, {
        id: issueId(["campaign", campaign.id, "missing-youtube-video-link"]),
        severity: "warning",
        category: "missing-assets",
        title: "Published campaign missing YouTube video link",
        description: `"${campaign.campaignName}" is published but has no Published Video link or imported YouTube API video.`,
        sourceType: "campaign",
        sourceId: campaign.id,
        sourceTitle: campaign.campaignName,
        href: `/integrations?tab=youtube-api&campaignId=${encodeURIComponent(campaign.id)}`,
        suggestedAction:
          "Import from YouTube API, add a Published Video link, or use CSV import in Integrations.",
      })
    }

    const hasCsvYouTubeLink = campaignLinks.some(
      (link) =>
        link.platform === "YouTube" &&
        link.linkType === "Published Video" &&
        /csv/i.test(link.notes ?? ""),
    )
    if (
      hasCsvYouTubeLink &&
      !hasImportedYouTubeVideo &&
      input.youtubeConnection &&
      !input.youtubeConnection.oauthConnected
    ) {
      pushIssue(issues, {
        id: issueId(["campaign", campaign.id, "youtube-csv-without-api"]),
        severity: "info",
        category: "data-issues",
        title: "YouTube CSV data without API connection",
        description: `"${campaign.campaignName}" has CSV-imported YouTube data but YouTube API is not connected.`,
        sourceType: "campaign",
        sourceId: campaign.id,
        sourceTitle: campaign.campaignName,
        href: `/integrations?tab=youtube-api&campaignId=${encodeURIComponent(campaign.id)}`,
        suggestedAction: "Connect YouTube API to sync live video stats.",
      })
    }

    const campaignAssets = filterAssetsForCampaign(
      input.assets,
      campaign.id,
      campaign.campaignName,
    )
    if (campaignAssets.length === 0) continue
    const hasSourceLink = campaignLinks.some(
      (link) =>
        link.platform === "Google Drive" ||
        link.linkType === "Asset Source" ||
        link.linkType === "Google Drive File" ||
        link.linkType === "Google Drive Folder",
    )
    if (!hasSourceLink) {
      pushIssue(issues, {
        id: issueId(["campaign", campaign.id, "missing-drive-source-link"]),
        severity: "info",
        category: "missing-assets",
        title: "Campaign assets without Google Drive/source link",
        description: `"${campaign.campaignName}" has assets but no Google Drive or asset source external link.`,
        sourceType: "campaign",
        sourceId: campaign.id,
        sourceTitle: campaign.campaignName,
        href: `/integrations?campaignId=${encodeURIComponent(campaign.id)}&platform=${encodeURIComponent("Google Drive")}`,
        suggestedAction: "Add a Google Drive folder or asset source link in Integrations.",
      })
    }
  }
}

function scanYouTubeApiWarnings(
  input: DataHealthScanInput,
  sets: RecordIdSets,
  issues: DataHealthIssue[],
): void {
  const connection = input.youtubeConnection
  const videos = input.youtubeVideos ?? []
  const featureUsed =
    videos.length > 0 ||
    (connection?.connection?.channelId?.trim().length ?? 0) > 0 ||
    connection?.oauthConnected === true

  if (connection?.needsChannelSelection) {
    pushIssue(issues, {
      id: issueId(["youtube-needs-channel"]),
      severity: "warning",
      category: "data-issues",
      title: "YouTube OAuth connected but channel ID missing",
      description:
        "Google OAuth succeeded but no YouTube channel was returned. This can happen with Brand Accounts.",
      sourceType: "integration",
      sourceId: "youtube-api",
      sourceTitle: "YouTube API",
      href: "/integrations?tab=youtube-api",
      suggestedAction: "Enter your channel ID manually or reconnect and select the correct Brand Account.",
    })
  }

  if (connection?.connection?.status === "ChannelIdSaved") {
    pushIssue(issues, {
      id: issueId(["youtube-channel-id-unvalidated"]),
      severity: "warning",
      category: "data-issues",
      title: "YouTube channel ID saved but not validated",
      description:
        "A channel ID was saved locally but could not be validated via OAuth or API key.",
      sourceType: "integration",
      sourceId: "youtube-api",
      sourceTitle: "YouTube API",
      href: "/integrations?tab=youtube-api",
      suggestedAction: "Add YOUTUBE_API_KEY or reconnect YouTube, then save the channel ID again.",
    })
  }

  if (featureUsed && connection && !connection.configured) {
    pushIssue(issues, {
      id: issueId(["youtube-env-missing"]),
      severity: "warning",
      category: "data-issues",
      title: "YouTube API credentials missing",
      description:
        "YouTube integration is in use but YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET is not configured.",
      sourceType: "integration",
      sourceId: "youtube-api",
      sourceTitle: "YouTube API",
      href: "/integrations?tab=settings",
      suggestedAction: "Add YouTube OAuth env vars to .env.local and restart the dev server.",
    })
  }

  if (
    connection &&
    featureUsed &&
    !connection.oauthConnected &&
    !connection.needsChannelSelection
  ) {
    const status = connection.connection?.status ?? "Disconnected"
    pushIssue(issues, {
      id: issueId(["youtube-connection-inactive"]),
      severity: "warning",
      category: "data-issues",
      title: "YouTube connection inactive",
      description: `YouTube integration status is "${status}". Reconnect to sync video stats.`,
      sourceType: "integration",
      sourceId: "youtube-api",
      sourceTitle: connection.connection?.channelTitle || "YouTube",
      href: "/integrations?tab=youtube-api",
      suggestedAction: "Reconnect your YouTube channel in Integrations.",
    })
  }

  if (
    connection?.connection?.tokenExpiry &&
    connection.connection.tokenExpiry < Date.now() &&
    connection.oauthConnected
  ) {
    pushIssue(issues, {
      id: issueId(["youtube-token-expired"]),
      severity: "warning",
      category: "data-issues",
      title: "YouTube access token expired",
      description: "The stored YouTube token has expired. Sync may fail until reconnected or refreshed.",
      sourceType: "integration",
      sourceId: "youtube-api",
      sourceTitle: connection.connection.channelTitle || "YouTube",
      href: "/integrations?tab=youtube-api",
      suggestedAction: "Reconnect YouTube or refresh the connection.",
    })
  }

  const weekMs = 7 * 24 * 60 * 60 * 1000

  for (const video of videos) {
    const href = `/integrations?tab=youtube-api&videoId=${encodeURIComponent(video.id)}`
    const title = video.title || video.youtubeVideoId

    if (!video.externalLinkId) {
      pushIssue(issues, {
        id: issueId(["youtube-video", video.id, "missing-external-link"]),
        severity: "warning",
        category: "incomplete-records",
        title: "Imported YouTube video missing external link",
        description: `"${title}" was imported but has no linked ExternalLink record.`,
        sourceType: "youtube-video",
        sourceId: video.id,
        sourceTitle: title,
        href,
        suggestedAction: "Create an external link from the YouTube API tab.",
      })
    }

    if (!video.analyticsRecordId) {
      pushIssue(issues, {
        id: issueId(["youtube-video", video.id, "missing-analytics"]),
        severity: "info",
        category: "incomplete-records",
        title: "Imported YouTube video missing analytics record",
        description: `"${title}" has no linked Analytics record.`,
        sourceType: "youtube-video",
        sourceId: video.id,
        sourceTitle: title,
        href,
        suggestedAction: "Sync stats or create an analytics record explicitly.",
      })
    }

    if (video.campaignId && !recordExists(sets, "campaign", video.campaignId)) {
      pushIssue(issues, {
        id: issueId(["youtube-video", video.id, "missing-campaign"]),
        severity: "warning",
        category: "broken-links",
        title: "YouTube video linked to missing campaign",
        description: `"${title}" references campaign ${video.campaignId}, which was not found.`,
        sourceType: "youtube-video",
        sourceId: video.id,
        sourceTitle: title,
        href,
        suggestedAction: "Relink the video to an existing campaign or clear the link.",
      })
    }

    if (video.lastSyncedAt && Date.now() - video.lastSyncedAt > weekMs) {
      pushIssue(issues, {
        id: issueId(["youtube-video", video.id, "stats-stale"]),
        severity: "info",
        category: "data-issues",
        title: "YouTube video stats not synced recently",
        description: `"${title}" has not been synced in over 7 days.`,
        sourceType: "youtube-video",
        sourceId: video.id,
        sourceTitle: title,
        href,
        suggestedAction: "Sync YouTube stats from Integrations.",
      })
    }
  }
}

export function buildDataHealthReport(
  input: DataHealthScanInput,
  preflightIssues: DataHealthIssue[] = [],
): DataHealthReport {
  const issues: DataHealthIssue[] = [...preflightIssues]
  const sets = buildRecordIdSets(input)

  safeScan("Broken links", issues, () => scanBrokenLinks(input, sets, issues))
  safeScan("Missing assets", issues, () => scanMissingAssets(input, issues))
  safeScan("Duplicates", issues, () => scanDuplicates(input, issues))
  safeScan("Incomplete records", issues, () =>
    scanIncompleteRecords(input, issues),
  )
  safeScan("Publishing checklist", issues, () =>
    scanPublishingChecklistWarnings(input, issues),
  )
  safeScan("Experiment analytics", issues, () =>
    scanExperimentAnalyticsWarnings(input, sets, issues),
  )
  safeScan("Campaign bundle export", issues, () =>
    scanCampaignBundleExportWarnings(input, sets, issues),
  )
  safeScan("Calendar planning", issues, () => scanCalendarWarnings(input, issues))
  safeScan("Prompt run links", issues, () =>
    scanPromptRunLinkWarnings(input, sets, issues),
  )
  safeScan("AI configuration", issues, () =>
    scanAIConfigurationWarnings(input, issues),
  )
  safeScan("AI generation templates", issues, () =>
    scanAIGenerationTemplateWarnings(input, issues),
  )
  safeScan("Campaign Copilot", issues, () =>
    scanCampaignCopilotWarnings(input, issues),
  )
  safeScan("AI response final fields", issues, () =>
    scanAiResponseWithoutFinalFields(input, issues),
  )
  safeScan("Asset library", issues, () => scanAssetWarnings(input, sets, issues))
  safeScan("Playbooks", issues, () => scanPlaybookWarnings(input, sets, issues))
  safeScan("Quality reviews", issues, () => scanQualityReviewWarnings(input, sets, issues))
  safeScan("Learnings", issues, () => scanLearningWarnings(input, sets, issues))
  safeScan("External links", issues, () =>
    scanExternalLinkWarnings(input, sets, issues),
  )
  safeScan("YouTube API", issues, () =>
    scanYouTubeApiWarnings(input, sets, issues),
  )
  safeScan("JSON / data issues", issues, () => scanJsonIssues(input, issues))

  return {
    scannedAt: Date.now(),
    totalRecords: countScannableRecords(input),
    summary: buildSummary(issues),
    issues,
  }
}

export function createFailedDataHealthReport(error: unknown): DataHealthReport {
  const issue = createScannerFailureIssue("Data health", error)
  return {
    scannedAt: Date.now(),
    totalRecords: 0,
    summary: buildSummary([issue]),
    issues: [issue],
    scanError: safeErrorMessage(error),
  }
}

export const DATA_HEALTH_TAB_CATEGORIES: Record<string, DataHealthCategory | "overview"> = {
  overview: "overview",
  "broken-links": "broken-links",
  "missing-assets": "missing-assets",
  duplicates: "duplicates",
  "incomplete-records": "incomplete-records",
  "data-issues": "data-issues",
}

export function filterIssuesByCategory(
  issues: DataHealthIssue[],
  tab: string,
): DataHealthIssue[] {
  if (tab === "overview") return issues
  const category = DATA_HEALTH_TAB_CATEGORIES[tab]
  if (!category || category === "overview") return issues
  return issues.filter((issue) => issue.category === category)
}
