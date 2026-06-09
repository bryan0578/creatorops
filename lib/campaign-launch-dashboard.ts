/**
 * Campaign Launch Dashboard — readiness scoring, asset matching, and health warnings.
 */

import { buildMissingAssetRepair } from "@/lib/data/data-health-repairs"
import { buildRecordHref } from "@/lib/data/related-records"
import type { CampaignLinkableStoreSlice } from "@/lib/campaigns"
import type {
  CampaignLinkedRecord,
  CampaignLinkedRecordType,
  CampaignRecord,
  CampaignTask,
} from "@/lib/types"

export type LaunchReadinessLabel =
  | "Needs setup"
  | "In progress"
  | "Almost ready"
  | "Assets ready"
  | "Launch ready"

export type LaunchAssetKey =
  | "campaign-overview"
  | CampaignLinkedRecordType

export interface LaunchAssetItem {
  key: LaunchAssetKey
  label: string
  type?: CampaignLinkedRecordType
  completed: boolean
  title?: string
  href?: string
  createHref?: string
  createLabel?: string
  formallyLinked: boolean
  inferredMatch: boolean
}

export interface LaunchReadiness {
  score: number
  completed: number
  total: number
  label: LaunchReadinessLabel
  assets: LaunchAssetItem[]
}

export interface LaunchTaskProgress {
  total: number
  completed: number
  percent: number
  nextTasks: CampaignTask[]
}

export interface LaunchHealthWarning {
  id: string
  severity: "critical" | "warning"
  title: string
  description: string
}

export interface LaunchNextAction {
  id: string
  label: string
  href: string
  kind: "create" | "task" | "navigation"
}

export interface LaunchDashboardData {
  readiness: LaunchReadiness
  taskProgress: LaunchTaskProgress
  linkedGroupCounts: { id: string; label: string; count: number }[]
  healthWarnings: LaunchHealthWarning[]
  nextActions: LaunchNextAction[]
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

const ASSET_LABELS: Record<LaunchAssetKey, string> = {
  "campaign-overview": "Campaign Overview",
  artist: "Artist Profile",
  "release-plan": "Release Plan",
  "youtube-package": "YouTube Package",
  "youtube-thumbnail": "YouTube Thumbnail",
  "social-repurposing": "Social Repurposing",
  "email-campaign": "Email Campaign",
  analytics: "Analytics Record",
  "merch-idea": "Merch Idea",
  "product-listing": "Product Listing",
  "mockup-prompt": "Mockup Prompt",
  workflow: "Workflow",
  "workflow-run": "Workflow Run",
  "prompt-run": "Prompt Run",
}

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

function fuzzyContains(
  haystack: string | undefined | null,
  needle: string | undefined | null,
): boolean {
  const n = norm(needle)
  const h = norm(haystack)
  return Boolean(n && h && h.includes(n))
}

export function isMusicLaunchCampaign(campaignType: string): boolean {
  return MUSIC_CAMPAIGN_TYPES.has(norm(campaignType))
}

export function isCommerceLaunchCampaign(campaignType: string): boolean {
  return COMMERCE_CAMPAIGN_TYPES.has(norm(campaignType))
}

export function getRequiredLaunchAssetKeys(
  campaignType: string,
): LaunchAssetKey[] {
  if (isMusicLaunchCampaign(campaignType)) {
    return [
      "artist",
      "release-plan",
      "youtube-package",
      "youtube-thumbnail",
      "social-repurposing",
      "email-campaign",
      "analytics",
    ]
  }
  if (isCommerceLaunchCampaign(campaignType)) {
    return [
      "campaign-overview",
      "merch-idea",
      "product-listing",
      "mockup-prompt",
      "social-repurposing",
      "email-campaign",
      "analytics",
    ]
  }
  return []
}

function baseAssetReadinessLabel(score: number): LaunchReadinessLabel {
  if (score >= 71) return "Almost ready"
  if (score >= 31) return "In progress"
  return "Needs setup"
}

/** Asset readiness label; Launch ready requires tasks complete too. */
export function resolveAssetReadinessLabel(
  assetScore: number,
  taskPercent: number,
): LaunchReadinessLabel {
  if (assetScore >= 100) {
    return taskPercent >= 100 ? "Launch ready" : "Assets ready"
  }
  return baseAssetReadinessLabel(assetScore)
}

function recordExistsInStore(
  type: CampaignLinkedRecordType,
  id: string,
  store: CampaignLinkableStoreSlice,
): boolean {
  switch (type) {
    case "release-plan":
      return store.releasePlans.some((r) => r.id === id)
    case "youtube-package":
      return store.youtubePackages.some((r) => r.id === id)
    case "youtube-thumbnail":
      return store.youtubeThumbnailRecords.some((r) => r.id === id)
    case "social-repurposing":
      return store.socialRepurposingRecords.some((r) => r.id === id)
    case "merch-idea":
      return store.merchIdeas.some((r) => r.id === id)
    case "product-listing":
      return store.productListings.some((r) => r.id === id)
    case "mockup-prompt":
      return store.mockupPromptRecords.some((r) => r.id === id)
    case "email-campaign":
      return store.emailCampaignRecords.some((r) => r.id === id)
    case "analytics":
      return store.analyticsRecords.some((r) => r.id === id)
    case "artist":
      return store.artistRecords.some((r) => r.id === id)
    case "workflow":
      return store.workflows.some((r) => r.id === id)
    case "workflow-run":
      return store.workflowRuns.some((r) => r.id === id)
    case "prompt-run":
      return store.runs.some((r) => r.id === id)
    default:
      return false
  }
}

function findFormalLink(
  campaign: CampaignRecord,
  type: CampaignLinkedRecordType,
): CampaignLinkedRecord | undefined {
  return campaign.linkedRecords.find((record) => record.type === type)
}

function findInferredMatch(
  campaign: CampaignRecord,
  type: CampaignLinkedRecordType,
  store: CampaignLinkableStoreSlice,
  usedIds: Set<string>,
): { id: string; title: string; href: string } | undefined {
  const linkedIds = new Set(
    campaign.linkedRecords.map((record) => `${record.type}:${record.id}`),
  )

  const accept = (recordType: CampaignLinkedRecordType, id: string, title: string) => {
    const key = `${recordType}:${id}`
    if (linkedIds.has(key) || usedIds.has(key)) return undefined
    usedIds.add(key)
    return { id, title, href: buildRecordHref(recordType, id) }
  }

  const { artistName, songTitle, productName, niche, campaignName } = campaign

  switch (type) {
    case "artist": {
      const match = store.artistRecords.find((r) => matches(r.artistName, artistName))
      return match
        ? accept("artist", match.id, match.artistName || "Artist")
        : undefined
    }
    case "release-plan": {
      const match = store.releasePlans.find(
        (r) =>
          matches(r.artistName, artistName) &&
          (matches(r.songTitle, songTitle) || fuzzyContains(r.songTitle, songTitle)),
      )
      return match
        ? accept(
            "release-plan",
            match.id,
            [match.artistName, match.songTitle].filter(Boolean).join(" — ") ||
              "Release plan",
          )
        : undefined
    }
    case "youtube-package": {
      const match = store.youtubePackages.find(
        (r) =>
          matches(r.artistName, artistName) &&
          (matches(r.trackTitle, songTitle) || fuzzyContains(r.trackTitle, songTitle)),
      )
      return match
        ? accept(
            "youtube-package",
            match.id,
            [match.artistName, match.trackTitle].filter(Boolean).join(" — ") ||
              "YouTube package",
          )
        : undefined
    }
    case "youtube-thumbnail": {
      const match = store.youtubeThumbnailRecords.find(
        (r) =>
          matches(r.artistName, artistName) &&
          (matches(r.trackTitle, songTitle) ||
            matches(r.videoTitle, songTitle) ||
            fuzzyContains(r.trackTitle, songTitle)),
      )
      return match
        ? accept(
            "youtube-thumbnail",
            match.id,
            [match.artistName, match.videoTitle || match.trackTitle]
              .filter(Boolean)
              .join(" — ") || "YouTube thumbnail",
          )
        : undefined
    }
    case "social-repurposing": {
      const match = store.socialRepurposingRecords.find(
        (r) =>
          matches(r.campaignName, campaignName) ||
          (matches(r.campaignName, songTitle) && hasText(songTitle)) ||
          fuzzyContains(r.sourceContent, campaignName),
      )
      return match
        ? accept("social-repurposing", match.id, match.campaignName || "Social content")
        : undefined
    }
    case "email-campaign": {
      const match = store.emailCampaignRecords.find(
        (r) =>
          matches(r.campaignName, campaignName) ||
          matches(r.productOrReleaseName, songTitle) ||
          matches(r.productOrReleaseName, productName),
      )
      return match
        ? accept("email-campaign", match.id, match.campaignName || "Email campaign")
        : undefined
    }
    case "analytics": {
      const match = store.analyticsRecords.find(
        (r) =>
          matches(r.relatedCampaign, campaignName) ||
          (matches(r.relatedArtist, artistName) &&
            (matches(r.relatedSong, songTitle) || !hasText(songTitle))) ||
          matches(r.itemName, campaignName),
      )
      return match
        ? accept("analytics", match.id, match.itemName || "Analytics record")
        : undefined
    }
    case "merch-idea": {
      const match = store.merchIdeas.find(
        (r) =>
          matches(r.niche, niche) ||
          fuzzyContains(r.selectedProductTitle, productName) ||
          fuzzyContains(r.selectedConceptName, productName),
      )
      return match
        ? accept(
            "merch-idea",
            match.id,
            match.selectedProductTitle || match.selectedConceptName || "Merch idea",
          )
        : undefined
    }
    case "product-listing": {
      const match = store.productListings.find(
        (r) =>
          matches(r.niche, niche) ||
          fuzzyContains(r.finalTitle, productName) ||
          fuzzyContains(r.designConcept, productName),
      )
      return match
        ? accept(
            "product-listing",
            match.id,
            match.finalTitle || match.designConcept || "Product listing",
          )
        : undefined
    }
    case "mockup-prompt": {
      const match = store.mockupPromptRecords.find(
        (r) =>
          matches(r.projectName, campaignName) ||
          fuzzyContains(r.designConcept, productName) ||
          matches(r.niche, niche),
      )
      return match
        ? accept(
            "mockup-prompt",
            match.id,
            match.projectName || match.mockupType || "Mockup prompt",
          )
        : undefined
    }
    default:
      return undefined
  }
}

function isCampaignOverviewComplete(campaign: CampaignRecord): boolean {
  return (
    hasText(campaign.campaignName) &&
    hasText(campaign.campaignType) &&
    hasText(campaign.primaryGoal) &&
    (hasText(campaign.productName) || hasText(campaign.niche))
  )
}

function resolveLaunchAsset(
  key: LaunchAssetKey,
  campaign: CampaignRecord,
  store: CampaignLinkableStoreSlice,
  usedIds: Set<string>,
): LaunchAssetItem {
  const label = ASSET_LABELS[key]

  if (key === "campaign-overview") {
    const completed = isCampaignOverviewComplete(campaign)
    return {
      key,
      label,
      completed,
      title: completed ? campaign.campaignName : undefined,
      href: completed ? `/campaigns?campaignId=${encodeURIComponent(campaign.id)}` : undefined,
      formallyLinked: true,
      inferredMatch: false,
    }
  }

  const type = key as CampaignLinkedRecordType
  const formal = findFormalLink(campaign, type)
  const repair = buildMissingAssetRepair(campaign, type)

  if (formal) {
    const exists = recordExistsInStore(type, formal.id, store)
    const href =
      formal.href && formal.href !== "/"
        ? formal.href
        : buildRecordHref(type, formal.id)
    return {
      key,
      label,
      type,
      completed: exists,
      title: formal.title || label,
      href: exists ? href : undefined,
      createHref: repair?.kind === "create-asset" ? repair.href : undefined,
      createLabel: repair?.kind === "create-asset" ? repair.label : undefined,
      formallyLinked: true,
      inferredMatch: false,
    }
  }

  const inferred = findInferredMatch(campaign, type, store, usedIds)
  if (inferred) {
    return {
      key,
      label,
      type,
      completed: true,
      title: inferred.title,
      href: inferred.href,
      formallyLinked: false,
      inferredMatch: true,
    }
  }

  return {
    key,
    label,
    type,
    completed: false,
    createHref: repair?.kind === "create-asset" ? repair.href : undefined,
    createLabel: repair?.kind === "create-asset" ? repair.label : undefined,
    formallyLinked: false,
    inferredMatch: false,
  }
}

export function buildLaunchReadiness(
  campaign: CampaignRecord,
  store: CampaignLinkableStoreSlice,
): LaunchReadiness {
  const requiredKeys = getRequiredLaunchAssetKeys(campaign.campaignType)
  const usedIds = new Set<string>()
  const assets = requiredKeys.map((key) =>
    resolveLaunchAsset(key, campaign, store, usedIds),
  )

  const total = assets.length
  const completed = assets.filter((asset) => asset.completed).length
  const score = total === 0 ? 0 : Math.round((completed / total) * 100)

  return {
    score,
    completed,
    total,
    label: baseAssetReadinessLabel(score),
    assets,
  }
}

export function buildLaunchTaskProgress(tasks: CampaignTask[]): LaunchTaskProgress {
  const total = tasks.length
  const completed = tasks.filter((task) => task.status === "Done").length
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)
  const nextTasks = tasks
    .filter((task) => task.status !== "Done")
    .sort((a, b) => a.order - b.order)
    .slice(0, 3)

  return { total, completed, percent, nextTasks }
}

export function buildLaunchLinkedGroupCounts(
  linkedRecords: CampaignLinkedRecord[],
): { id: string; label: string; count: number }[] {
  const groups = [
    { id: "planning", label: "Planning", types: ["release-plan"] as CampaignLinkedRecordType[] },
    {
      id: "youtube",
      label: "YouTube",
      types: ["youtube-package", "youtube-thumbnail"] as CampaignLinkedRecordType[],
    },
    {
      id: "commerce",
      label: "Commerce",
      types: ["merch-idea", "product-listing", "mockup-prompt"] as CampaignLinkedRecordType[],
    },
    {
      id: "marketing",
      label: "Marketing",
      types: ["social-repurposing", "email-campaign"] as CampaignLinkedRecordType[],
    },
    { id: "analytics", label: "Analytics", types: ["analytics"] as CampaignLinkedRecordType[] },
    {
      id: "operations",
      label: "Operations",
      types: ["artist", "workflow", "workflow-run", "prompt-run"] as CampaignLinkedRecordType[],
    },
  ]

  return groups.map((group) => ({
    id: group.id,
    label: group.label,
    count: linkedRecords.filter((record) => group.types.includes(record.type)).length,
  }))
}

export function buildCampaignHealthWarnings(
  campaign: CampaignRecord,
  store: CampaignLinkableStoreSlice,
): LaunchHealthWarning[] {
  const warnings: LaunchHealthWarning[] = []

  for (const linked of campaign.linkedRecords) {
    if (!recordExistsInStore(linked.type, linked.id, store)) {
      warnings.push({
        id: `broken:${linked.type}:${linked.id}`,
        severity: "critical",
        title: "Broken linked record",
        description: `Missing ${ASSET_LABELS[linked.type] ?? linked.type}: ${linked.title || linked.id}`,
      })
    }
  }

  const readiness = buildLaunchReadiness(campaign, store)
  for (const asset of readiness.assets) {
    if (!asset.completed && asset.type) {
      warnings.push({
        id: `missing:${asset.type}`,
        severity: "warning",
        title: `Missing ${asset.label}`,
        description: `No linked or matching ${asset.label.toLowerCase()} found for this campaign.`,
      })
    }
  }

  const missingFields: string[] = []
  if (!hasText(campaign.campaignName)) missingFields.push("campaign name")
  if (!hasText(campaign.campaignType)) missingFields.push("campaign type")
  if (!hasText(campaign.status)) missingFields.push("status")
  if (!hasText(campaign.primaryGoal)) missingFields.push("primary goal")
  if (isMusicLaunchCampaign(campaign.campaignType) && !hasText(campaign.artistName)) {
    missingFields.push("artist name")
  }
  if (isCommerceLaunchCampaign(campaign.campaignType) && !hasText(campaign.productName)) {
    missingFields.push("product name")
  }

  if (missingFields.length) {
    warnings.push({
      id: "incomplete:campaign",
      severity: "warning",
      title: "Incomplete campaign overview",
      description: `Missing: ${missingFields.join(", ")}.`,
    })
  }

  return warnings.slice(0, 8)
}

export function buildLaunchNextActions(
  campaign: CampaignRecord,
  readiness: LaunchReadiness,
  taskProgress: LaunchTaskProgress,
): LaunchNextAction[] {
  const actions: LaunchNextAction[] = []

  for (const asset of readiness.assets) {
    if (!asset.completed && asset.createHref && asset.createLabel) {
      actions.push({
        id: `create:${asset.key}`,
        label: asset.createLabel,
        href: asset.createHref,
        kind: "create",
      })
    }
  }

  const nextTask = taskProgress.nextTasks[0]
  if (nextTask) {
    actions.push({
      id: `task:${nextTask.id}`,
      label: `Complete task: ${nextTask.title || "Untitled task"}`,
      href: `/campaigns?campaignId=${encodeURIComponent(campaign.id)}`,
      kind: "task",
    })
  }

  actions.push({
    id: "backup",
    label: "Export backup",
    href: "/backups",
    kind: "navigation",
  })

  return actions.slice(0, 8)
}

export function buildLaunchDashboardData(
  campaign: CampaignRecord,
  store: CampaignLinkableStoreSlice,
): LaunchDashboardData {
  const readiness = buildLaunchReadiness(campaign, store)
  const taskProgress = buildLaunchTaskProgress(campaign.tasks)

  return {
    readiness: {
      ...readiness,
      label: resolveAssetReadinessLabel(readiness.score, taskProgress.percent),
    },
    taskProgress,
    linkedGroupCounts: buildLaunchLinkedGroupCounts(campaign.linkedRecords),
    healthWarnings: buildCampaignHealthWarnings(campaign, store),
    nextActions: buildLaunchNextActions(campaign, readiness, taskProgress),
  }
}
