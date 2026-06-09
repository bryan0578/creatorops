/**
 * Data Health — read-only scan types and report builder.
 */

import { buildRecordHref } from "@/lib/data/related-records"
import type {
  AnalyticsRecord,
  ArtistRecord,
  CampaignLinkedRecordType,
  CampaignRecord,
  EmailCampaignRecord,
  MerchIdea,
  MockupPromptRecord,
  PresetRecord,
  ProductListing,
  Prompt,
  PromptRun,
  ReleasePlan,
  SocialRepurposingRecord,
  Workflow,
  WorkflowRun,
  YouTubePackage,
  YouTubeThumbnailRecord,
  WorkspaceSettingsRecord,
} from "@/lib/types"

export type DataHealthSeverity = "critical" | "warning" | "info"

export type DataHealthCategory =
  | "broken-links"
  | "missing-assets"
  | "duplicates"
  | "incomplete-records"
  | "data-issues"

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
  presets: PresetRecord[]
  prompts: Prompt[]
  promptRuns: PromptRun[]
  workflows: Workflow[]
  workflowRuns: WorkflowRun[]
  workspaceSettings: WorkspaceSettingsRecord | null
  jsonFields: DataHealthJsonField[]
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

function isValidJson(raw: string, expected: "array" | "object"): boolean {
  const trimmed = raw.trim()
  if (!trimmed) return true
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (expected === "array") return Array.isArray(parsed)
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
  } catch {
    return false
  }
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
    input.presets.length +
    input.prompts.length +
    input.promptRuns.length +
    input.workflows.length +
    input.workflowRuns.length +
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
