/**
 * Campaign Bundle — portable JSON export/import for one campaign and linked records.
 */

import { normalizeCampaignRecord } from "@/lib/campaigns"
import { filterAssetsForCampaign, normalizeAssetRecord } from "@/lib/assets"
import { filterLearningsForCampaign, normalizeLearningRecord } from "@/lib/learnings"
import { filterQualityReviewsForCampaign, normalizeQualityReviewRecord } from "@/lib/quality-reviews"
import { normalizeAnalyticsRecord } from "@/lib/analytics-tracker"
import { normalizeArtistRecord } from "@/lib/artist-crm"
import { normalizeEmailCampaignRecord } from "@/lib/email-campaigns"
import {
  EXPORT_RECORD_TYPES,
  resolveCampaignRelatedRecords,
} from "@/lib/campaign-launch-dashboard"
import type { CampaignLinkableStoreSlice } from "@/lib/campaigns"
import { buildRecordHref } from "@/lib/data/related-records"
import { normalizeExperimentRecord } from "@/lib/experiments"
import { filterExperimentsForCampaign } from "@/lib/experiments"
import { normalizeMerchIdea } from "@/lib/merch-ideas"
import { normalizeMockupPromptRecord } from "@/lib/mockup-prompts"
import { normalizePresetRecord } from "@/lib/presets"
import { normalizeProductListing } from "@/lib/product-listings"
import { normalizePromptRun } from "@/lib/data/prompt-runs"
import { normalizeReleasePlan } from "@/lib/release-planner"
import { normalizeSocialRepurposingRecord } from "@/lib/social-repurposing"
import { normalizeWorkflowRun } from "@/lib/data/workflow-runs"
import { normalizeYouTubePackage } from "@/lib/youtube-packaging"
import { normalizeYouTubeThumbnailRecord } from "@/lib/youtube-thumbnails"
import { extractPlaybookIdFromNotes } from "@/lib/playbooks"
import { parseImportJsonText } from "@/lib/safe-json"
import { createId } from "@/lib/storage"
import type {
  AnalyticsRecord,
  AssetRecord,
  ArtistRecord,
  CampaignLinkedRecord,
  CampaignLinkedRecordType,
  CampaignRecord,
  EmailCampaignRecord,
  ExperimentRecord,
  MerchIdea,
  MockupPromptRecord,
  PresetRecord,
  ProductListing,
  PromptRun,
  LearningRecord,
  QualityReviewRecord,
  ReleasePlan,
  SocialRepurposingRecord,
  WorkflowRun,
  YouTubePackage,
  YouTubeThumbnailRecord,
} from "@/lib/types"

export const CAMPAIGN_BUNDLE_TYPE = "creatorops-campaign-bundle"
export const CAMPAIGN_BUNDLE_VERSION = 1
export const SUPPORTED_CAMPAIGN_BUNDLE_VERSIONS = [1] as const

export type CampaignBundleImportMode =
  | "create-copy"
  | "skip-existing"
  | "update-existing"

export interface CampaignBundleSource {
  appName: string
  schemaVersion?: string
}

export interface CampaignBundleLinkedRecords {
  artists: ArtistRecord[]
  releasePlans: ReleasePlan[]
  youtubePackages: YouTubePackage[]
  youtubeThumbnails: YouTubeThumbnailRecord[]
  socialRepurposing: SocialRepurposingRecord[]
  emailCampaigns: EmailCampaignRecord[]
  merchIdeas: MerchIdea[]
  productListings: ProductListing[]
  mockupPrompts: MockupPromptRecord[]
  analyticsRecords: AnalyticsRecord[]
  experiments: ExperimentRecord[]
  promptRuns: PromptRun[]
  workflowRuns: WorkflowRun[]
  presets: PresetRecord[]
  assets: AssetRecord[]
  qualityReviews: QualityReviewRecord[]
  learnings: LearningRecord[]
}

export interface CampaignBundleRelationship {
  recordType: string
  recordId: string
  recordTitle?: string
  source:
    | "formal-link"
    | "inferred"
    | "campaign-field"
    | "experiment"
    | "analytics"
    | "prompt-run"
    | "workflow-run"
}

export interface CampaignBundleMissingRecord {
  type: string
  id?: string
  title?: string
  reason: string
}

export interface CampaignBundle {
  bundleVersion: number
  bundleType: typeof CAMPAIGN_BUNDLE_TYPE
  exportedAt: string
  source: CampaignBundleSource
  campaign: CampaignRecord
  linkedRecords: CampaignBundleLinkedRecords
  relationshipMap: CampaignBundleRelationship[]
  missingRecords: CampaignBundleMissingRecord[]
  warnings: string[]
}

export interface CampaignBundleSummaryCounts {
  campaign: number
  artists: number
  releasePlans: number
  youtubePackages: number
  youtubeThumbnails: number
  socialRepurposing: number
  emailCampaigns: number
  merchIdeas: number
  productListings: number
  mockupPrompts: number
  analyticsRecords: number
  experiments: number
  promptRuns: number
  workflowRuns: number
  presets: number
  assets: number
  qualityReviews: number
  learnings: number
}

export interface CampaignBundleConflict {
  recordType: string
  bundleRecordId: string
  existingRecordId?: string
  matchKey: string
  message: string
}

export interface CampaignBundleImportPlanItem {
  recordType: string
  bundleRecordId: string
  action: "create" | "skip" | "link-existing"
  targetId?: string
  label?: string
}

export interface CampaignBundleImportPreview {
  valid: boolean
  error?: string
  bundleVersion?: number
  campaignName?: string
  exportedAt?: string
  summary: CampaignBundleSummaryCounts
  conflicts: CampaignBundleConflict[]
  warnings: string[]
  missingRecords: CampaignBundleMissingRecord[]
  importPlan: CampaignBundleImportPlanItem[]
}

export interface CampaignBundleReadiness {
  linkedRecordsCount: number
  status: "ready" | "missing" | "warnings"
  statusLabel: string
  warnings: string[]
  missingRecords: CampaignBundleMissingRecord[]
}

export interface CampaignBundleStore extends CampaignLinkableStoreSlice {
  experiments: ExperimentRecord[]
  presets: PresetRecord[]
  assets: AssetRecord[]
  qualityReviews: QualityReviewRecord[]
  learnings: LearningRecord[]
}

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase()
}

function matches(a: string | undefined | null, b: string | undefined | null): boolean {
  const na = norm(a)
  const nb = norm(b)
  return Boolean(na && nb && na === nb)
}

export function emptyCampaignBundleLinkedRecords(): CampaignBundleLinkedRecords {
  return {
    artists: [],
    releasePlans: [],
    youtubePackages: [],
    youtubeThumbnails: [],
    socialRepurposing: [],
    emailCampaigns: [],
    merchIdeas: [],
    productListings: [],
    mockupPrompts: [],
    analyticsRecords: [],
    experiments: [],
    promptRuns: [],
    workflowRuns: [],
    presets: [],
    assets: [],
    qualityReviews: [],
    learnings: [],
  }
}

export function countCampaignBundleLinkedRecords(
  linked: CampaignBundleLinkedRecords,
): CampaignBundleSummaryCounts {
  return {
    campaign: 1,
    artists: linked.artists.length,
    releasePlans: linked.releasePlans.length,
    youtubePackages: linked.youtubePackages.length,
    youtubeThumbnails: linked.youtubeThumbnails.length,
    socialRepurposing: linked.socialRepurposing.length,
    emailCampaigns: linked.emailCampaigns.length,
    merchIdeas: linked.merchIdeas.length,
    productListings: linked.productListings.length,
    mockupPrompts: linked.mockupPrompts.length,
    analyticsRecords: linked.analyticsRecords.length,
    experiments: linked.experiments.length,
    promptRuns: linked.promptRuns.length,
    workflowRuns: linked.workflowRuns.length,
    presets: linked.presets.length,
    assets: linked.assets.length,
    qualityReviews: linked.qualityReviews.length,
    learnings: linked.learnings.length,
  }
}

export function totalLinkedBundleRecords(linked: CampaignBundleLinkedRecords): number {
  const counts = countCampaignBundleLinkedRecords(linked)
  return (
    counts.artists +
    counts.releasePlans +
    counts.youtubePackages +
    counts.youtubeThumbnails +
    counts.socialRepurposing +
    counts.emailCampaigns +
    counts.merchIdeas +
    counts.productListings +
    counts.mockupPrompts +
    counts.analyticsRecords +
    counts.experiments +
    counts.promptRuns +
    counts.workflowRuns +
    counts.presets +
    counts.assets +
    counts.qualityReviews +
    counts.learnings
  )
}

export function campaignBundleFilename(
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
  return `creatorops-campaign-bundle-${slug}-${stamp}.json`
}

function recordExistsInStore(
  type: CampaignLinkedRecordType,
  id: string,
  store: CampaignLinkableStoreSlice,
): boolean {
  switch (type) {
    case "release-plan":
      return store.releasePlans.some((record) => record.id === id)
    case "youtube-package":
      return store.youtubePackages.some((record) => record.id === id)
    case "youtube-thumbnail":
      return store.youtubeThumbnailRecords.some((record) => record.id === id)
    case "social-repurposing":
      return store.socialRepurposingRecords.some((record) => record.id === id)
    case "merch-idea":
      return store.merchIdeas.some((record) => record.id === id)
    case "product-listing":
      return store.productListings.some((record) => record.id === id)
    case "mockup-prompt":
      return store.mockupPromptRecords.some((record) => record.id === id)
    case "email-campaign":
      return store.emailCampaignRecords.some((record) => record.id === id)
    case "analytics":
      return store.analyticsRecords.some((record) => record.id === id)
    case "artist":
      return store.artistRecords.some((record) => record.id === id)
    case "workflow":
      return store.workflows.some((record) => record.id === id)
    case "workflow-run":
      return store.workflowRuns.some((record) => record.id === id)
    case "prompt-run":
      return store.runs.some((record) => record.id === id)
    default:
      return false
  }
}

function linkedRecordHref(type: CampaignLinkedRecordType, id: string): string {
  switch (type) {
    case "workflow":
      return `/workflows?recordId=${encodeURIComponent(id)}`
    case "workflow-run":
      return `/workflow-runner?recordId=${encodeURIComponent(id)}`
    case "prompt-run":
      return `/runner?recordId=${encodeURIComponent(id)}`
    default:
      return buildRecordHref(type as Parameters<typeof buildRecordHref>[0], id)
  }
}

class BundleCollector {
  readonly linkedRecords = emptyCampaignBundleLinkedRecords()
  readonly relationshipMap: CampaignBundleRelationship[] = []
  readonly missingRecords: CampaignBundleMissingRecord[] = []
  readonly warnings: string[] = []
  private readonly seen = new Set<string>()

  private key(type: string, id: string) {
    return `${type}:${id}`
  }

  private track<T extends { id: string }>(
    type: keyof CampaignBundleLinkedRecords,
    record: T | null | undefined,
    meta: Omit<CampaignBundleRelationship, "recordType" | "recordId"> & {
      recordTitle?: string
    },
  ) {
    if (!record?.id) return
    const k = this.key(type, record.id)
    if (this.seen.has(k)) return
    this.seen.add(k)
    const bucket = this.linkedRecords[type] as T[]
    bucket.push(record)
    this.relationshipMap.push({
      recordType: type,
      recordId: record.id,
      recordTitle: meta.recordTitle,
      source: meta.source,
    })
  }

  noteMissing(
    type: string,
    input: { id?: string; title?: string; reason: string },
  ) {
    this.missingRecords.push({
      type,
      id: input.id,
      title: input.title,
      reason: input.reason,
    })
  }

  addWarning(message: string) {
    if (!this.warnings.includes(message)) this.warnings.push(message)
  }

  addFormalLink(
    link: CampaignLinkedRecord,
    store: CampaignBundleStore,
  ) {
    const exists = recordExistsInStore(link.type, link.id, store)
    if (!exists) {
      this.noteMissing(link.type, {
        id: link.id,
        title: link.title,
        reason: "Linked record id not found in local database",
      })
      return
    }

    switch (link.type) {
      case "artist":
        this.track(
          "artists",
          store.artistRecords.find((r) => r.id === link.id) ?? null,
          { source: "formal-link", recordTitle: link.title },
        )
        break
      case "release-plan":
        this.track(
          "releasePlans",
          store.releasePlans.find((r) => r.id === link.id) ?? null,
          { source: "formal-link", recordTitle: link.title },
        )
        break
      case "youtube-package":
        this.track(
          "youtubePackages",
          store.youtubePackages.find((r) => r.id === link.id) ?? null,
          { source: "formal-link", recordTitle: link.title },
        )
        break
      case "youtube-thumbnail":
        this.track(
          "youtubeThumbnails",
          store.youtubeThumbnailRecords.find((r) => r.id === link.id) ?? null,
          { source: "formal-link", recordTitle: link.title },
        )
        break
      case "social-repurposing":
        this.track(
          "socialRepurposing",
          store.socialRepurposingRecords.find((r) => r.id === link.id) ?? null,
          { source: "formal-link", recordTitle: link.title },
        )
        break
      case "email-campaign":
        this.track(
          "emailCampaigns",
          store.emailCampaignRecords.find((r) => r.id === link.id) ?? null,
          { source: "formal-link", recordTitle: link.title },
        )
        break
      case "merch-idea":
        this.track(
          "merchIdeas",
          store.merchIdeas.find((r) => r.id === link.id) ?? null,
          { source: "formal-link", recordTitle: link.title },
        )
        break
      case "product-listing":
        this.track(
          "productListings",
          store.productListings.find((r) => r.id === link.id) ?? null,
          { source: "formal-link", recordTitle: link.title },
        )
        break
      case "mockup-prompt":
        this.track(
          "mockupPrompts",
          store.mockupPromptRecords.find((r) => r.id === link.id) ?? null,
          { source: "formal-link", recordTitle: link.title },
        )
        break
      case "analytics":
        this.track(
          "analyticsRecords",
          store.analyticsRecords.find((r) => r.id === link.id) ?? null,
          { source: "formal-link", recordTitle: link.title },
        )
        break
      case "workflow-run":
        this.track(
          "workflowRuns",
          store.workflowRuns.find((r) => r.id === link.id) ?? null,
          { source: "formal-link", recordTitle: link.title },
        )
        break
      case "prompt-run":
        this.track(
          "promptRuns",
          store.runs.find((r) => r.id === link.id) ?? null,
          { source: "formal-link", recordTitle: link.title },
        )
        break
      default:
        break
    }
  }
}

function collectInferredBundleRecords(
  campaign: CampaignRecord,
  store: CampaignBundleStore,
  collector: BundleCollector,
) {
  const related = resolveCampaignRelatedRecords(campaign, store)
  const pairs: [
    keyof CampaignBundleLinkedRecords,
    { id: string; title: string } | null,
    CampaignBundleRelationship["source"],
  ][] = [
    ["artists", related.artist ? { id: related.artist.id, title: related.artist.artistName } : null, "inferred"],
    ["releasePlans", related.releasePlan ? { id: related.releasePlan.id, title: related.releasePlan.songTitle } : null, "inferred"],
    ["youtubePackages", related.youtubePackage ? { id: related.youtubePackage.id, title: related.youtubePackage.trackTitle } : null, "inferred"],
    ["youtubeThumbnails", related.youtubeThumbnail ? { id: related.youtubeThumbnail.id, title: related.youtubeThumbnail.trackTitle } : null, "inferred"],
    ["socialRepurposing", related.socialRepurposing ? { id: related.socialRepurposing.id, title: related.socialRepurposing.campaignName } : null, "inferred"],
    ["emailCampaigns", related.emailCampaign ? { id: related.emailCampaign.id, title: related.emailCampaign.campaignName } : null, "inferred"],
    ["merchIdeas", related.merchIdea ? { id: related.merchIdea.id, title: related.merchIdea.selectedProductTitle } : null, "inferred"],
    ["productListings", related.productListing ? { id: related.productListing.id, title: related.productListing.finalTitle } : null, "inferred"],
    ["mockupPrompts", related.mockupPrompt ? { id: related.mockupPrompt.id, title: related.mockupPrompt.projectName } : null, "inferred"],
    ["analyticsRecords", related.analytics ? { id: related.analytics.id, title: related.analytics.itemName } : null, "inferred"],
  ]

  for (const [bucket, meta, source] of pairs) {
    if (!meta) continue
    const formal = campaign.linkedRecords.some(
      (link) => link.type === bucketToLinkType(bucket) && link.id === meta.id,
    )
    if (formal) continue

    switch (bucket) {
      case "artists":
        collector.track("artists", related.artist, { source, recordTitle: meta.title })
        break
      case "releasePlans":
        collector.track("releasePlans", related.releasePlan, { source, recordTitle: meta.title })
        break
      case "youtubePackages":
        collector.track("youtubePackages", related.youtubePackage, { source, recordTitle: meta.title })
        break
      case "youtubeThumbnails":
        collector.track("youtubeThumbnails", related.youtubeThumbnail, { source, recordTitle: meta.title })
        break
      case "socialRepurposing":
        collector.track("socialRepurposing", related.socialRepurposing, { source, recordTitle: meta.title })
        break
      case "emailCampaigns":
        collector.track("emailCampaigns", related.emailCampaign, { source, recordTitle: meta.title })
        break
      case "merchIdeas":
        collector.track("merchIdeas", related.merchIdea, { source, recordTitle: meta.title })
        break
      case "productListings":
        collector.track("productListings", related.productListing, { source, recordTitle: meta.title })
        break
      case "mockupPrompts":
        collector.track("mockupPrompts", related.mockupPrompt, { source, recordTitle: meta.title })
        break
      case "analyticsRecords":
        collector.track("analyticsRecords", related.analytics, { source, recordTitle: meta.title })
        break
    }
  }
}

function bucketToLinkType(
  bucket: keyof CampaignBundleLinkedRecords,
): CampaignLinkedRecordType | null {
  switch (bucket) {
    case "artists":
      return "artist"
    case "releasePlans":
      return "release-plan"
    case "youtubePackages":
      return "youtube-package"
    case "youtubeThumbnails":
      return "youtube-thumbnail"
    case "socialRepurposing":
      return "social-repurposing"
    case "emailCampaigns":
      return "email-campaign"
    case "merchIdeas":
      return "merch-idea"
    case "productListings":
      return "product-listing"
    case "mockupPrompts":
      return "mockup-prompt"
    case "analyticsRecords":
      return "analytics"
    default:
      return null
  }
}

function collectCampaignScopedRecords(
  campaign: CampaignRecord,
  store: CampaignBundleStore,
  collector: BundleCollector,
) {
  const experiments = filterExperimentsForCampaign(
    store.experiments,
    campaign.id,
    campaign.campaignName,
  )
  for (const experiment of experiments) {
    collector.track("experiments", experiment, {
      source: "campaign-field",
      recordTitle: experiment.experimentName,
    })
    if (experiment.analyticsRecordId) {
      const analytics = store.analyticsRecords.find(
        (r) => r.id === experiment.analyticsRecordId,
      )
      if (analytics) {
        collector.track("analyticsRecords", analytics, {
          source: "experiment",
          recordTitle: analytics.itemName,
        })
      } else {
        collector.noteMissing("analytics", {
          id: experiment.analyticsRecordId,
          title: experiment.analyticsRecordName,
          reason: "Experiment references missing analytics record",
        })
      }
    }
  }

  for (const run of store.runs) {
    if (
      (campaign.id && run.campaignId === campaign.id) ||
      matches(run.campaignName, campaign.campaignName)
    ) {
      collector.track("promptRuns", run, {
        source: "prompt-run",
        recordTitle: run.promptName,
      })
    }
  }

  for (const analytics of store.analyticsRecords) {
    if (
      matches(analytics.relatedCampaign, campaign.campaignName) ||
      (matches(analytics.relatedArtist, campaign.artistName) &&
        matches(analytics.relatedSong, campaign.songTitle))
    ) {
      collector.track("analyticsRecords", analytics, {
        source: "analytics",
        recordTitle: analytics.itemName,
      })
    }
  }

  const campaignAssets = filterAssetsForCampaign(
    store.assets,
    campaign.id,
    campaign.campaignName,
  )
  for (const asset of campaignAssets) {
    collector.track("assets", asset, {
      source: "campaign-field",
      recordTitle: asset.assetName,
    })
  }

  const bundledIds = new Set(
    collector.relationshipMap.map((rel) => `${rel.recordType}:${rel.recordId}`),
  )
  for (const asset of store.assets) {
    if (campaignAssets.some((item) => item.id === asset.id)) continue
    if (!asset.sourceRecordId || !asset.sourceRecordType) continue
    if (bundledIds.has(`${asset.sourceRecordType}:${asset.sourceRecordId}`)) {
      collector.track("assets", asset, {
        source: "inferred",
        recordTitle: asset.assetName,
      })
    }
  }

  const campaignReviews = filterQualityReviewsForCampaign(
    store.qualityReviews ?? [],
    campaign.id,
    campaign.campaignName,
  )
  for (const review of campaignReviews) {
    collector.track("qualityReviews", review, {
      source: "campaign-field",
      recordTitle: review.reviewName,
    })
  }

  const campaignLearnings = filterLearningsForCampaign(
    store.learnings ?? [],
    campaign.id,
    campaign.campaignName,
  )
  for (const learning of campaignLearnings) {
    collector.track("learnings", learning, {
      source: "campaign-field",
      recordTitle: learning.title,
    })
  }
}

/** Build a portable campaign bundle without mutating source records. */
export function buildCampaignBundle(
  campaign: CampaignRecord,
  store: CampaignBundleStore,
): CampaignBundle {
  const normalizedCampaign = normalizeCampaignRecord(campaign)
  const collector = new BundleCollector()

  for (const link of normalizedCampaign.linkedRecords) {
    collector.addFormalLink(link, store)
  }

  collectInferredBundleRecords(normalizedCampaign, store, collector)

  for (const type of EXPORT_RECORD_TYPES) {
    const formal = normalizedCampaign.linkedRecords.find((link) => link.type === type)
    if (formal && !recordExistsInStore(type, formal.id, store)) {
      collector.addWarning(
        `Formal ${type} link "${formal.title || formal.id}" is missing from the database.`,
      )
    }
  }

  collectCampaignScopedRecords(normalizedCampaign, store, collector)

  const playbookId = extractPlaybookIdFromNotes(normalizedCampaign.notes)
  if (playbookId) {
    collector.addWarning(
      `Campaign notes reference playbook ${playbookId}. Playbooks are stored separately and are not included in campaign bundles.`,
    )
  }

  if (collector.missingRecords.length > 0) {
    collector.addWarning(
      `${collector.missingRecords.length} linked record(s) referenced by this campaign are missing locally.`,
    )
  }

  return {
    bundleVersion: CAMPAIGN_BUNDLE_VERSION,
    bundleType: CAMPAIGN_BUNDLE_TYPE,
    exportedAt: new Date().toISOString(),
    source: {
      appName: "CreatorOps",
      schemaVersion: "1",
    },
    campaign: normalizedCampaign,
    linkedRecords: collector.linkedRecords,
    relationshipMap: collector.relationshipMap,
    missingRecords: collector.missingRecords,
    warnings: collector.warnings,
  }
}

export function assessCampaignBundleReadiness(
  bundle: Pick<CampaignBundle, "linkedRecords" | "missingRecords" | "warnings">,
): CampaignBundleReadiness {
  const linkedRecordsCount = totalLinkedBundleRecords(bundle.linkedRecords)
  const hasMissing = bundle.missingRecords.length > 0
  const hasWarnings = bundle.warnings.length > 0

  let status: CampaignBundleReadiness["status"] = "ready"
  let statusLabel = "Ready"

  if (hasMissing) {
    status = "missing"
    statusLabel = "Has missing linked records"
  } else if (hasWarnings) {
    status = "warnings"
    statusLabel = "Has warnings"
  }

  return {
    linkedRecordsCount,
    status,
    statusLabel,
    warnings: bundle.warnings,
    missingRecords: bundle.missingRecords,
  }
}

function parseBundleRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function parseCampaignBundleJson(
  raw: unknown,
): { ok: true; bundle: CampaignBundle } | { ok: false; error: string } {
  let parsed: unknown = raw
  if (typeof raw === "string") {
    const result = parseImportJsonText(raw)
    if (!result.ok) {
      return { ok: false, error: result.message }
    }
    parsed = result.value
  }

  const record = parseBundleRecord(parsed)
  if (!record) {
    return {
      ok: false,
      error: "This does not look like a valid CreatorOps campaign bundle.",
    }
  }

  if (record.bundleType !== CAMPAIGN_BUNDLE_TYPE) {
    return {
      ok: false,
      error: "This does not look like a valid CreatorOps campaign bundle.",
    }
  }

  const version = Number(record.bundleVersion)
  if (
    !Number.isFinite(version) ||
    !SUPPORTED_CAMPAIGN_BUNDLE_VERSIONS.includes(
      version as (typeof SUPPORTED_CAMPAIGN_BUNDLE_VERSIONS)[number],
    )
  ) {
    return {
      ok: false,
      error: `Unsupported campaign bundle version: ${String(record.bundleVersion)}`,
    }
  }

  if (!record.campaign || typeof record.campaign !== "object") {
    return {
      ok: false,
      error: "This does not look like a valid CreatorOps campaign bundle.",
    }
  }

  const linkedRaw = parseBundleRecord(record.linkedRecords) ?? {}
  const linkedRecords = emptyCampaignBundleLinkedRecords()

  const arrayKeys: (keyof CampaignBundleLinkedRecords)[] = [
    "artists",
    "releasePlans",
    "youtubePackages",
    "youtubeThumbnails",
    "socialRepurposing",
    "emailCampaigns",
    "merchIdeas",
    "productListings",
    "mockupPrompts",
    "analyticsRecords",
    "experiments",
    "promptRuns",
    "workflowRuns",
    "presets",
    "assets",
    "qualityReviews",
    "learnings",
  ]

  for (const key of arrayKeys) {
    const value = linkedRaw[key]
    linkedRecords[key] = Array.isArray(value) ? (value as never[]) : []
  }

  const bundle: CampaignBundle = {
    bundleVersion: version,
    bundleType: CAMPAIGN_BUNDLE_TYPE,
    exportedAt: String(record.exportedAt ?? new Date().toISOString()),
    source: {
      appName: String((record.source as CampaignBundleSource | undefined)?.appName ?? "CreatorOps"),
      schemaVersion: (record.source as CampaignBundleSource | undefined)?.schemaVersion,
    },
    campaign: normalizeCampaignRecord(record.campaign as CampaignRecord),
    linkedRecords,
    relationshipMap: Array.isArray(record.relationshipMap)
      ? (record.relationshipMap as CampaignBundleRelationship[])
      : [],
    missingRecords: Array.isArray(record.missingRecords)
      ? (record.missingRecords as CampaignBundleMissingRecord[])
      : [],
    warnings: Array.isArray(record.warnings)
      ? record.warnings.map((w) => String(w))
      : [],
  }

  return { ok: true, bundle }
}

function conflictForCampaign(
  bundle: CampaignBundle,
  existing: CampaignRecord[],
): CampaignBundleConflict | null {
  const match = existing.find((c) =>
    matches(c.campaignName, bundle.campaign.campaignName),
  )
  if (!match) return null
  return {
    recordType: "campaign",
    bundleRecordId: bundle.campaign.id,
    existingRecordId: match.id,
    matchKey: bundle.campaign.campaignName,
    message: `Campaign name "${bundle.campaign.campaignName}" already exists.`,
  }
}

function detectBundleConflicts(
  bundle: CampaignBundle,
  existing: CampaignBundleStore & { campaigns: CampaignRecord[] },
): CampaignBundleConflict[] {
  const conflicts: CampaignBundleConflict[] = []
  const push = (item: CampaignBundleConflict | null) => {
    if (item) conflicts.push(item)
  }

  push(conflictForCampaign(bundle, existing.campaigns ?? []))

  for (const artist of bundle.linkedRecords.artists) {
    const match = existing.artistRecords.find((r) =>
      matches(r.artistName, artist.artistName),
    )
    push(
      match
        ? {
            recordType: "artist",
            bundleRecordId: artist.id,
            existingRecordId: match.id,
            matchKey: artist.artistName,
            message: `Artist "${artist.artistName}" already exists.`,
          }
        : null,
    )
  }

  for (const pkg of bundle.linkedRecords.youtubePackages) {
    const match = existing.youtubePackages.find(
      (r) =>
        matches(r.artistName, pkg.artistName) &&
        matches(r.trackTitle, pkg.trackTitle),
    )
    push(
      match
        ? {
            recordType: "youtube-package",
            bundleRecordId: pkg.id,
            existingRecordId: match.id,
            matchKey: `${pkg.artistName} · ${pkg.trackTitle}`,
            message: `YouTube package "${pkg.artistName} — ${pkg.trackTitle}" may already exist.`,
          }
        : null,
    )
  }

  for (const thumb of bundle.linkedRecords.youtubeThumbnails) {
    const match = existing.youtubeThumbnailRecords.find(
      (r) =>
        matches(r.artistName, thumb.artistName) &&
        matches(r.trackTitle, thumb.trackTitle),
    )
    push(
      match
        ? {
            recordType: "youtube-thumbnail",
            bundleRecordId: thumb.id,
            existingRecordId: match.id,
            matchKey: `${thumb.artistName} · ${thumb.trackTitle}`,
            message: `YouTube thumbnail "${thumb.artistName} — ${thumb.trackTitle}" may already exist.`,
          }
        : null,
    )
  }

  for (const plan of bundle.linkedRecords.releasePlans) {
    const match = existing.releasePlans.find(
      (r) =>
        matches(r.artistName, plan.artistName) &&
        matches(r.songTitle, plan.songTitle),
    )
    push(
      match
        ? {
            recordType: "release-plan",
            bundleRecordId: plan.id,
            existingRecordId: match.id,
            matchKey: `${plan.artistName} · ${plan.songTitle}`,
            message: `Release plan "${plan.artistName} — ${plan.songTitle}" may already exist.`,
          }
        : null,
    )
  }

  for (const social of bundle.linkedRecords.socialRepurposing) {
    const match = existing.socialRepurposingRecords.find((r) =>
      matches(r.campaignName, social.campaignName),
    )
    push(
      match
        ? {
            recordType: "social-repurposing",
            bundleRecordId: social.id,
            existingRecordId: match.id,
            matchKey: social.campaignName,
            message: `Social repurposing "${social.campaignName}" may already exist.`,
          }
        : null,
    )
  }

  for (const email of bundle.linkedRecords.emailCampaigns) {
    const match = existing.emailCampaignRecords.find(
      (r) =>
        matches(r.campaignName, email.campaignName) &&
        matches(r.productOrReleaseName, email.productOrReleaseName),
    )
    push(
      match
        ? {
            recordType: "email-campaign",
            bundleRecordId: email.id,
            existingRecordId: match.id,
            matchKey: `${email.campaignName} · ${email.productOrReleaseName}`,
            message: `Email campaign "${email.campaignName}" may already exist.`,
          }
        : null,
    )
  }

  for (const merch of bundle.linkedRecords.merchIdeas) {
    const match = existing.merchIdeas.find(
      (r) =>
        matches(r.selectedProductTitle, merch.selectedProductTitle) ||
        (matches(r.niche, merch.niche) && matches(r.productType, merch.productType)),
    )
    push(
      match
        ? {
            recordType: "merch-idea",
            bundleRecordId: merch.id,
            existingRecordId: match.id,
            matchKey: merch.selectedProductTitle || `${merch.niche} · ${merch.productType}`,
            message: `Merch idea "${merch.selectedProductTitle || merch.productType}" may already exist.`,
          }
        : null,
    )
  }

  for (const listing of bundle.linkedRecords.productListings) {
    const match = existing.productListings.find((r) =>
      matches(r.finalTitle, listing.finalTitle),
    )
    push(
      match
        ? {
            recordType: "product-listing",
            bundleRecordId: listing.id,
            existingRecordId: match.id,
            matchKey: listing.finalTitle,
            message: `Product listing "${listing.finalTitle}" may already exist.`,
          }
        : null,
    )
  }

  for (const mockup of bundle.linkedRecords.mockupPrompts) {
    const match = existing.mockupPromptRecords.find((r) =>
      matches(r.projectName, mockup.projectName),
    )
    push(
      match
        ? {
            recordType: "mockup-prompt",
            bundleRecordId: mockup.id,
            existingRecordId: match.id,
            matchKey: mockup.projectName,
            message: `Mockup prompt "${mockup.projectName}" may already exist.`,
          }
        : null,
    )
  }

  for (const analytics of bundle.linkedRecords.analyticsRecords) {
    const match = existing.analyticsRecords.find(
      (r) =>
        matches(r.itemName, analytics.itemName) &&
        matches(r.platform, analytics.platform),
    )
    push(
      match
        ? {
            recordType: "analytics",
            bundleRecordId: analytics.id,
            existingRecordId: match.id,
            matchKey: `${analytics.itemName} · ${analytics.platform}`,
            message: `Analytics record "${analytics.itemName}" may already exist.`,
          }
        : null,
    )
  }

  for (const experiment of bundle.linkedRecords.experiments) {
    const match = existing.experiments.find(
      (r) =>
        matches(r.experimentName, experiment.experimentName) &&
        matches(r.campaignName, experiment.campaignName),
    )
    push(
      match
        ? {
            recordType: "experiment",
            bundleRecordId: experiment.id,
            existingRecordId: match.id,
            matchKey: `${experiment.campaignName} · ${experiment.experimentName}`,
            message: `Experiment "${experiment.experimentName}" may already exist.`,
          }
        : null,
    )
  }

  for (const run of bundle.linkedRecords.promptRuns) {
    const match = existing.runs.find(
      (r) =>
        matches(r.promptName, run.promptName) &&
        matches(r.campaignName, run.campaignName) &&
        matches(r.moduleType, run.moduleType),
    )
    push(
      match
        ? {
            recordType: "prompt-run",
            bundleRecordId: run.id,
            existingRecordId: match.id,
            matchKey: `${run.campaignName} · ${run.promptName} · ${run.moduleType}`,
            message: `Prompt run "${run.promptName}" may already exist.`,
          }
        : null,
    )
  }

  return conflicts
}

function buildImportPlan(
  bundle: CampaignBundle,
  conflicts: CampaignBundleConflict[],
  mode: CampaignBundleImportMode,
): CampaignBundleImportPlanItem[] {
  const conflictMap = new Map(
    conflicts.map((c) => [`${c.recordType}:${c.bundleRecordId}`, c]),
  )
  const plan: CampaignBundleImportPlanItem[] = []

  const addItems = (
    recordType: string,
    records: { id: string }[],
    labelFn: (record: { id: string }) => string,
  ) => {
    for (const record of records) {
      const conflict = conflictMap.get(`${recordType}:${record.id}`)
      if (mode === "create-copy") {
        plan.push({
          recordType,
          bundleRecordId: record.id,
          action: "create",
          label: labelFn(record),
        })
      } else if (mode === "skip-existing" && conflict?.existingRecordId) {
        plan.push({
          recordType,
          bundleRecordId: record.id,
          action: "link-existing",
          targetId: conflict.existingRecordId,
          label: labelFn(record),
        })
      } else {
        plan.push({
          recordType,
          bundleRecordId: record.id,
          action: "create",
          label: labelFn(record),
        })
      }
    }
  }

  plan.push({
    recordType: "campaign",
    bundleRecordId: bundle.campaign.id,
    action: mode === "skip-existing" && conflictMap.get(`campaign:${bundle.campaign.id}`)
      ? "link-existing"
      : "create",
    targetId: conflictMap.get(`campaign:${bundle.campaign.id}`)?.existingRecordId,
    label: bundle.campaign.campaignName,
  })

  addItems("artist", bundle.linkedRecords.artists, (r) => (r as ArtistRecord).artistName)
  addItems("release-plan", bundle.linkedRecords.releasePlans, (r) => (r as ReleasePlan).songTitle)
  addItems("youtube-package", bundle.linkedRecords.youtubePackages, (r) => (r as YouTubePackage).trackTitle)
  addItems("youtube-thumbnail", bundle.linkedRecords.youtubeThumbnails, (r) => (r as YouTubeThumbnailRecord).trackTitle)
  addItems("social-repurposing", bundle.linkedRecords.socialRepurposing, (r) => (r as SocialRepurposingRecord).campaignName)
  addItems("email-campaign", bundle.linkedRecords.emailCampaigns, (r) => (r as EmailCampaignRecord).campaignName)
  addItems("merch-idea", bundle.linkedRecords.merchIdeas, (r) => (r as MerchIdea).selectedProductTitle)
  addItems("product-listing", bundle.linkedRecords.productListings, (r) => (r as ProductListing).finalTitle)
  addItems("mockup-prompt", bundle.linkedRecords.mockupPrompts, (r) => (r as MockupPromptRecord).projectName)
  addItems("analytics", bundle.linkedRecords.analyticsRecords, (r) => (r as AnalyticsRecord).itemName)
  addItems("experiment", bundle.linkedRecords.experiments, (r) => (r as ExperimentRecord).experimentName)
  addItems("prompt-run", bundle.linkedRecords.promptRuns, (r) => (r as PromptRun).promptName)
  addItems("workflow-run", bundle.linkedRecords.workflowRuns, (r) => (r as WorkflowRun).workflowName)
  addItems("preset", bundle.linkedRecords.presets, (r) => (r as PresetRecord).name)
  addItems("asset", bundle.linkedRecords.assets, (r) => (r as AssetRecord).assetName)
  addItems(
    "quality-review",
    bundle.linkedRecords.qualityReviews,
    (r) => (r as QualityReviewRecord).reviewName,
  )
  addItems(
    "learning",
    bundle.linkedRecords.learnings,
    (r) => (r as LearningRecord).title,
  )

  return plan
}

export function previewCampaignBundleImport(
  bundle: CampaignBundle,
  existing: CampaignBundleStore & { campaigns: CampaignRecord[] },
  mode: CampaignBundleImportMode = "create-copy",
): CampaignBundleImportPreview {
  const conflicts = detectBundleConflicts(bundle, existing)
  const importPlan = buildImportPlan(bundle, conflicts, mode)

  return {
    valid: true,
    bundleVersion: bundle.bundleVersion,
    campaignName: bundle.campaign.campaignName,
    exportedAt: bundle.exportedAt,
    summary: countCampaignBundleLinkedRecords(bundle.linkedRecords),
    conflicts,
    warnings: bundle.warnings,
    missingRecords: bundle.missingRecords,
    importPlan,
  }
}

function remapId(idMap: Map<string, string>, id: string): string {
  if (!id) return id
  return idMap.get(id) ?? id
}

function prefixForRecordType(recordType: string): string {
  switch (recordType) {
    case "campaign":
      return "campaign"
    case "artist":
      return "artist"
    case "release-plan":
      return "release-plan"
    case "youtube-package":
      return "youtube-package"
    case "youtube-thumbnail":
      return "youtube-thumbnail"
    case "social-repurposing":
      return "social"
    case "email-campaign":
      return "email"
    case "merch-idea":
      return "merch"
    case "product-listing":
      return "listing"
    case "mockup-prompt":
      return "mockup"
    case "analytics":
      return "analytics"
    case "experiment":
      return "experiment"
    case "prompt-run":
      return "prompt-run"
    case "workflow-run":
      return "workflow-run"
    case "preset":
      return "preset"
    case "asset":
      return "asset"
    case "quality-review":
      return "quality-review"
    case "learning":
      return "learning"
    default:
      return "record"
  }
}

export function buildCampaignBundleIdMap(
  bundle: CampaignBundle,
  plan: CampaignBundleImportPlanItem[],
  mode: CampaignBundleImportMode,
): Map<string, string> {
  const idMap = new Map<string, string>()

  for (const item of plan) {
    if (item.action === "link-existing" && item.targetId) {
      idMap.set(item.bundleRecordId, item.targetId)
      continue
    }
    if (item.action === "create") {
      idMap.set(item.bundleRecordId, createId(prefixForRecordType(item.recordType)))
    }
  }

  if (mode === "create-copy") {
    const campaignId = idMap.get(bundle.campaign.id)
    if (campaignId) return idMap
  }

  return idMap
}

function remapArtistRecord(
  artist: ArtistRecord,
  idMap: Map<string, string>,
): ArtistRecord {
  const newArtistId = remapId(idMap, artist.id)
  return normalizeArtistRecord({
    ...artist,
    id: newArtistId,
    releases: artist.releases.map((release) => ({
      ...release,
      id: remapId(idMap, release.id) || `${newArtistId}-release-${release.id}`,
      thumbnailRecordId: release.thumbnailRecordId
        ? remapId(idMap, release.thumbnailRecordId)
        : release.thumbnailRecordId,
      youtubePackagingRecordId: release.youtubePackagingRecordId
        ? remapId(idMap, release.youtubePackagingRecordId)
        : release.youtubePackagingRecordId,
      releasePlanRecordId: release.releasePlanRecordId
        ? remapId(idMap, release.releasePlanRecordId)
        : release.releasePlanRecordId,
      analyticsRecordId: release.analyticsRecordId
        ? remapId(idMap, release.analyticsRecordId)
        : release.analyticsRecordId,
    })),
    merchProducts: artist.merchProducts.map((product) => ({
      ...product,
      id: remapId(idMap, product.id) || `${newArtistId}-product-${product.id}`,
    })),
    campaigns: artist.campaigns.map((item) => ({
      ...item,
      id: remapId(idMap, item.id) || `${newArtistId}-campaign-${item.id}`,
    })),
  })
}

function remapLinkedRecords(
  links: CampaignLinkedRecord[],
  idMap: Map<string, string>,
): CampaignLinkedRecord[] {
  return links.map((link) => {
    const newId = remapId(idMap, link.id)
    return {
      ...link,
      id: newId,
      href: linkedRecordHref(link.type, newId),
    }
  })
}

export interface RemappedCampaignBundle {
  campaign: CampaignRecord
  linkedRecords: CampaignBundleLinkedRecords
}

export function remapCampaignBundleForImport(
  bundle: CampaignBundle,
  idMap: Map<string, string>,
  options?: { campaignNameSuffix?: string },
): RemappedCampaignBundle {
  const suffix = options?.campaignNameSuffix ?? ""
  const newCampaignId = remapId(idMap, bundle.campaign.id)
  const campaignName =
    suffix && !bundle.campaign.campaignName.includes(suffix)
      ? `${bundle.campaign.campaignName}${suffix}`
      : bundle.campaign.campaignName

  const linkedRecords: CampaignBundleLinkedRecords = {
    artists: bundle.linkedRecords.artists.map((r) => remapArtistRecord(r, idMap)),
    releasePlans: bundle.linkedRecords.releasePlans.map((r) =>
      normalizeReleasePlan({ ...r, id: remapId(idMap, r.id) }),
    ),
    youtubePackages: bundle.linkedRecords.youtubePackages.map((r) =>
      normalizeYouTubePackage({ ...r, id: remapId(idMap, r.id) }),
    ),
    youtubeThumbnails: bundle.linkedRecords.youtubeThumbnails.map((r) =>
      normalizeYouTubeThumbnailRecord({ ...r, id: remapId(idMap, r.id) }),
    ),
    socialRepurposing: bundle.linkedRecords.socialRepurposing.map((r) =>
      normalizeSocialRepurposingRecord({ ...r, id: remapId(idMap, r.id) }),
    ),
    emailCampaigns: bundle.linkedRecords.emailCampaigns.map((r) =>
      normalizeEmailCampaignRecord({ ...r, id: remapId(idMap, r.id) }),
    ),
    merchIdeas: bundle.linkedRecords.merchIdeas.map((r) =>
      normalizeMerchIdea({ ...r, id: remapId(idMap, r.id) }),
    ),
    productListings: bundle.linkedRecords.productListings.map((r) =>
      normalizeProductListing({ ...r, id: remapId(idMap, r.id) }),
    ),
    mockupPrompts: bundle.linkedRecords.mockupPrompts.map((r) =>
      normalizeMockupPromptRecord({ ...r, id: remapId(idMap, r.id) }),
    ),
    analyticsRecords: bundle.linkedRecords.analyticsRecords.map((r) =>
      normalizeAnalyticsRecord({
        ...r,
        id: remapId(idMap, r.id),
        experimentId: r.experimentId ? remapId(idMap, r.experimentId) : r.experimentId,
      }),
    ),
    experiments: bundle.linkedRecords.experiments.map((r) =>
      normalizeExperimentRecord({
        ...r,
        id: remapId(idMap, r.id),
        campaignId: newCampaignId,
        campaignName,
        analyticsRecordId: r.analyticsRecordId
          ? remapId(idMap, r.analyticsRecordId)
          : r.analyticsRecordId,
      }),
    ),
    promptRuns: bundle.linkedRecords.promptRuns.map((r) =>
      normalizePromptRun({
        ...r,
        id: remapId(idMap, r.id),
        campaignId: newCampaignId,
        campaignName,
        outputRecordId: r.outputRecordId
          ? remapId(idMap, r.outputRecordId)
          : r.outputRecordId,
        experimentId: r.experimentId ? remapId(idMap, r.experimentId) : r.experimentId,
      }),
    ),
    workflowRuns: bundle.linkedRecords.workflowRuns.map((r) =>
      normalizeWorkflowRun({ ...r, id: remapId(idMap, r.id) }),
    ),
    presets: bundle.linkedRecords.presets.map((r) =>
      normalizePresetRecord({ ...r, id: remapId(idMap, r.id) }),
    ),
    assets: bundle.linkedRecords.assets.map((r) =>
      normalizeAssetRecord({
        ...r,
        id: remapId(idMap, r.id),
        campaignId: newCampaignId,
        campaignName,
        sourcePromptRunId: r.sourcePromptRunId
          ? remapId(idMap, r.sourcePromptRunId)
          : r.sourcePromptRunId,
        sourceRecordId: r.sourceRecordId
          ? remapId(idMap, r.sourceRecordId)
          : r.sourceRecordId,
        experimentId: r.experimentId ? remapId(idMap, r.experimentId) : r.experimentId,
        analyticsRecordId: r.analyticsRecordId
          ? remapId(idMap, r.analyticsRecordId)
          : r.analyticsRecordId,
      }),
    ),
    qualityReviews: bundle.linkedRecords.qualityReviews.map((r) =>
      normalizeQualityReviewRecord({
        ...r,
        id: remapId(idMap, r.id),
        campaignId: newCampaignId,
        campaignName,
        sourceRecordId: r.sourceRecordId
          ? remapId(idMap, r.sourceRecordId)
          : r.sourceRecordId,
        sourcePromptRunId: r.sourcePromptRunId
          ? remapId(idMap, r.sourcePromptRunId)
          : r.sourcePromptRunId,
        sourceExperimentId: r.sourceExperimentId
          ? remapId(idMap, r.sourceExperimentId)
          : r.sourceExperimentId,
      }),
    ),
    learnings: bundle.linkedRecords.learnings.map((r) =>
      normalizeLearningRecord({
        ...r,
        id: remapId(idMap, r.id),
        campaignId: newCampaignId,
        campaignName,
        sourceId: r.sourceId ? remapId(idMap, r.sourceId) : r.sourceId,
        analyticsRecordId: r.analyticsRecordId
          ? remapId(idMap, r.analyticsRecordId)
          : r.analyticsRecordId,
        experimentId: r.experimentId ? remapId(idMap, r.experimentId) : r.experimentId,
        qualityReviewId: r.qualityReviewId
          ? remapId(idMap, r.qualityReviewId)
          : r.qualityReviewId,
        assetId: r.assetId ? remapId(idMap, r.assetId) : r.assetId,
        promptRunId: r.promptRunId ? remapId(idMap, r.promptRunId) : r.promptRunId,
        playbookId: r.playbookId ? remapId(idMap, r.playbookId) : r.playbookId,
      }),
    ),
  }

  const campaign = normalizeCampaignRecord({
    ...bundle.campaign,
    id: newCampaignId,
    campaignName,
    linkedRecords: remapLinkedRecords(bundle.campaign.linkedRecords, idMap),
    tasks: bundle.campaign.tasks.map((task) => ({
      ...task,
      id: remapId(idMap, task.id) || `${newCampaignId}-task-${task.id}`,
      relatedRecordId: task.relatedRecordId
        ? remapId(idMap, task.relatedRecordId)
        : task.relatedRecordId,
    })),
  })

  return { campaign, linkedRecords }
}
