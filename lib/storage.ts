import type {
  AnalyticsRecord,
  ArtistRecord,
  EmailCampaignRecord,
  MerchIdea,
  MockupPromptRecord,
  ProductListing,
  Prompt,
  PromptRun,
  ReleasePlan,
  SocialRepurposingRecord,
  Workflow,
  WorkflowRun,
  YouTubePackage,
  YouTubeThumbnailRecord,
} from "@/lib/types"
import { normalizeAnalyticsRecord } from "@/lib/analytics-tracker"
import { normalizeArtistRecord } from "@/lib/artist-crm"
import { normalizeEmailCampaignRecord } from "@/lib/email-campaigns"
import { normalizeMockupPromptRecord } from "@/lib/mockup-prompts"
import { SEED_PROMPTS, SEED_WORKFLOWS } from "@/lib/seed-data"
import { normalizeMerchIdea } from "@/lib/merch-ideas"
import { normalizeProductListing } from "@/lib/product-listings"
import { normalizeReleasePlan } from "@/lib/release-planner"
import { normalizeSocialRepurposingRecord } from "@/lib/social-repurposing"
import { normalizeYouTubePackage } from "@/lib/youtube-packaging"
import { normalizeYouTubeThumbnailRecord } from "@/lib/youtube-thumbnails"

export const PROMPTS_KEY = "creatorops:prompts"
export const WORKFLOWS_KEY = "creatorops:workflows"
export const RUNS_KEY = "creatorops:runs"
export const WORKFLOW_RUNS_KEY = "creatorops:workflow-runs"
export const YOUTUBE_PACKAGES_KEY = "creatorops:youtube-packages"
export const MERCH_IDEAS_KEY = "creatorops:merch-ideas"
export const PRODUCT_LISTINGS_KEY = "creatorops:product-listings"
export const SOCIAL_REPURPOSING_KEY = "creatorops:social-repurposing"
export const RELEASE_PLANS_KEY = "creatorops:release-plans"
export const ANALYTICS_KEY = "creatorops:analytics"
export const MOCKUP_PROMPTS_KEY = "creatorops:mockup-prompts"
export const EMAIL_CAMPAIGNS_KEY = "creatorops:email-campaigns"
export const ARTIST_CRM_KEY = "creatorops:artist-crm"
export const YOUTUBE_THUMBNAILS_KEY = "creatorops:youtube-thumbnails"

export function loadPrompts(): Prompt[] {
  if (typeof window === "undefined") return SEED_PROMPTS
  try {
    const raw = localStorage.getItem(PROMPTS_KEY)
    return raw ? (JSON.parse(raw) as Prompt[]) : SEED_PROMPTS
  } catch {
    return SEED_PROMPTS
  }
}

/**
 * Legacy localStorage persistence for prompts.
 * Prompt Library now reads/writes SQLite via server actions.
 * Kept for rollback, JSON migration, and one-time "Migrate local prompts" flow.
 * TODO: Remove once all environments use the database and migration is complete.
 */
export function savePrompts(prompts: Prompt[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts))
}

export function loadWorkflows(): Workflow[] {
  if (typeof window === "undefined") return SEED_WORKFLOWS
  try {
    const raw = localStorage.getItem(WORKFLOWS_KEY)
    return raw ? (JSON.parse(raw) as Workflow[]) : SEED_WORKFLOWS
  } catch {
    return SEED_WORKFLOWS
  }
}

/**
 * Legacy localStorage persistence for workflows.
 * Workflow Hub now reads/writes SQLite via server actions.
 * Kept for rollback, JSON migration, and one-time "Migrate local workflows" flow.
 * TODO: Remove once all environments use the database and migration is complete.
 */
export function saveWorkflows(workflows: Workflow[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(workflows))
}

export function loadRuns(): PromptRun[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(RUNS_KEY)
    return raw ? (JSON.parse(raw) as PromptRun[]) : []
  } catch {
    return []
  }
}

/**
 * Legacy localStorage persistence for prompt runs.
 * Prompt Runner now reads/writes SQLite via server actions.
 * Kept for rollback, JSON migration, and one-time "Migrate local prompt runs" flow.
 * TODO: Remove once all environments use the database and migration is complete.
 */
export function saveRuns(runs: PromptRun[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(RUNS_KEY, JSON.stringify(runs))
}

export function loadWorkflowRuns(): WorkflowRun[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(WORKFLOW_RUNS_KEY)
    return raw ? (JSON.parse(raw) as WorkflowRun[]) : []
  } catch {
    return []
  }
}

/**
 * Legacy localStorage persistence for workflow runs.
 * Workflow Runner now reads/writes SQLite via server actions.
 * Kept for rollback, JSON migration, and one-time "Migrate local workflow runs" flow.
 * TODO: Remove once all environments use the database and migration is complete.
 */
export function saveWorkflowRuns(runs: WorkflowRun[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(WORKFLOW_RUNS_KEY, JSON.stringify(runs))
}

export function loadYouTubePackages(): YouTubePackage[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(YOUTUBE_PACKAGES_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<YouTubePackage>[]) : []
    return parsed.map((pkg) =>
      normalizeYouTubePackage(pkg as Partial<YouTubePackage> & { id: string }),
    )
  } catch {
    return []
  }
}

/**
 * Legacy localStorage persistence for YouTube packages.
 * YouTube Packaging Tool now reads/writes SQLite via server actions.
 * Kept for rollback, JSON migration, and one-time "Migrate local YouTube packages" flow.
 * TODO: Remove once all environments use the database and migration is complete.
 */
export function saveYouTubePackages(packages: YouTubePackage[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(YOUTUBE_PACKAGES_KEY, JSON.stringify(packages))
}

export function loadMerchIdeas(): MerchIdea[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(MERCH_IDEAS_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<MerchIdea>[]) : []
    return parsed.map((idea) =>
      normalizeMerchIdea(idea as Partial<MerchIdea> & { id: string }),
    )
  } catch {
    return []
  }
}

/**
 * Legacy localStorage persistence for merch ideas.
 * Merch Idea Generator now reads/writes SQLite via server actions.
 * Kept for rollback, JSON migration, and one-time "Migrate local merch ideas" flow.
 * TODO: Remove once all environments use the database and migration is complete.
 */
export function saveMerchIdeas(ideas: MerchIdea[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(MERCH_IDEAS_KEY, JSON.stringify(ideas))
}

export function loadProductListings(): ProductListing[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(PRODUCT_LISTINGS_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<ProductListing>[]) : []
    return parsed.map((listing) =>
      normalizeProductListing(
        listing as Partial<ProductListing> & { id: string },
      ),
    )
  } catch {
    return []
  }
}

export function saveProductListings(listings: ProductListing[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(PRODUCT_LISTINGS_KEY, JSON.stringify(listings))
}

export function loadSocialRepurposingRecords(): SocialRepurposingRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(SOCIAL_REPURPOSING_KEY)
    const parsed = raw
      ? (JSON.parse(raw) as Partial<SocialRepurposingRecord>[])
      : []
    return parsed.map((record) =>
      normalizeSocialRepurposingRecord(
        record as Partial<SocialRepurposingRecord> & { id: string },
      ),
    )
  } catch {
    return []
  }
}

export function saveSocialRepurposingRecords(
  records: SocialRepurposingRecord[],
): void {
  if (typeof window === "undefined") return
  localStorage.setItem(SOCIAL_REPURPOSING_KEY, JSON.stringify(records))
}

export function loadReleasePlans(): ReleasePlan[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(RELEASE_PLANS_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<ReleasePlan>[]) : []
    return parsed.map((plan) =>
      normalizeReleasePlan(plan as Partial<ReleasePlan> & { id: string }),
    )
  } catch {
    return []
  }
}

/**
 * Legacy localStorage persistence for release plans.
 * AI Music Release Planner now reads/writes SQLite via server actions.
 * Kept for rollback, JSON migration, and one-time "Migrate local release plans" flow.
 * TODO: Remove once all environments use the database and migration is complete.
 */
export function saveReleasePlans(plans: ReleasePlan[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(RELEASE_PLANS_KEY, JSON.stringify(plans))
}

export function loadAnalyticsRecords(): AnalyticsRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<AnalyticsRecord>[]) : []
    return parsed.map((record) =>
      normalizeAnalyticsRecord(
        record as Partial<AnalyticsRecord> & { id: string },
      ),
    )
  } catch {
    return []
  }
}

export function saveAnalyticsRecords(records: AnalyticsRecord[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(records))
}

export function loadMockupPromptRecords(): MockupPromptRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(MOCKUP_PROMPTS_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<MockupPromptRecord>[]) : []
    return parsed.map((record) =>
      normalizeMockupPromptRecord(
        record as Partial<MockupPromptRecord> & { id: string },
      ),
    )
  } catch {
    return []
  }
}

export function saveMockupPromptRecords(records: MockupPromptRecord[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(MOCKUP_PROMPTS_KEY, JSON.stringify(records))
}

export function loadEmailCampaignRecords(): EmailCampaignRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(EMAIL_CAMPAIGNS_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<EmailCampaignRecord>[]) : []
    return parsed.map((record) =>
      normalizeEmailCampaignRecord(
        record as Partial<EmailCampaignRecord> & { id: string },
      ),
    )
  } catch {
    return []
  }
}

export function saveEmailCampaignRecords(records: EmailCampaignRecord[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(EMAIL_CAMPAIGNS_KEY, JSON.stringify(records))
}

export function loadArtistRecords(): ArtistRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(ARTIST_CRM_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<ArtistRecord>[]) : []
    return parsed.map((record) =>
      normalizeArtistRecord(
        record as Partial<ArtistRecord> & { id: string },
      ),
    )
  } catch {
    return []
  }
}

/**
 * Legacy localStorage persistence for artist CRM records.
 * Artist / Label CRM now reads/writes SQLite via server actions.
 * Kept for rollback, JSON migration, and one-time "Migrate local artists" flow.
 * TODO: Remove once all environments use the database and migration is complete.
 */
export function saveArtistRecords(records: ArtistRecord[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(ARTIST_CRM_KEY, JSON.stringify(records))
}

export function loadYouTubeThumbnailRecords(): YouTubeThumbnailRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(YOUTUBE_THUMBNAILS_KEY)
    const parsed = raw
      ? (JSON.parse(raw) as Partial<YouTubeThumbnailRecord>[])
      : []
    return parsed.map((record) =>
      normalizeYouTubeThumbnailRecord(
        record as Partial<YouTubeThumbnailRecord> & { id: string },
      ),
    )
  } catch {
    return []
  }
}

/**
 * Legacy localStorage persistence for YouTube thumbnail records.
 * YouTube Thumbnail Generator now reads/writes SQLite via server actions.
 * Kept for rollback, JSON migration, and one-time "Migrate local YouTube thumbnails" flow.
 * TODO: Remove once all environments use the database and migration is complete.
 */
export function saveYouTubeThumbnailRecords(
  records: YouTubeThumbnailRecord[],
): void {
  if (typeof window === "undefined") return
  localStorage.setItem(YOUTUBE_THUMBNAILS_KEY, JSON.stringify(records))
}

export function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map(existing.map((item) => [item.id, item]))
  for (const item of incoming) map.set(item.id, item)
  return Array.from(map.values())
}

export function createId(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
