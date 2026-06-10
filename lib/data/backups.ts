/**
 * CreatorOps full backup format and validation.
 */

export const BACKUP_APP_NAME = "CreatorOps Dashboard"
export const BACKUP_VERSION = "1.0"

export type BackupDataKey =
  | "prompts"
  | "workflows"
  | "promptRuns"
  | "workflowRuns"
  | "youtubePackages"
  | "youtubeThumbnails"
  | "releasePlans"
  | "artists"
  | "merchIdeas"
  | "productListings"
  | "socialRepurposing"
  | "analyticsRecords"
  | "mockupPrompts"
  | "emailCampaigns"
  | "experiments"
  | "campaigns"
  | "presets"
  | "workspaceSettings"

export type BackupImportMode = "merge" | "replace"

export interface BackupRecordCounts {
  prompts: number
  workflows: number
  promptRuns: number
  workflowRuns: number
  youtubePackages: number
  youtubeThumbnails: number
  releasePlans: number
  artists: number
  merchIdeas: number
  productListings: number
  socialRepurposing: number
  analyticsRecords: number
  mockupPrompts: number
  emailCampaigns: number
  experiments: number
  campaigns: number
  presets: number
  workspaceSettings: number
}

export interface CreatorOpsBackupData {
  prompts: unknown[]
  workflows: unknown[]
  promptRuns: unknown[]
  workflowRuns: unknown[]
  youtubePackages: unknown[]
  youtubeThumbnails: unknown[]
  releasePlans: unknown[]
  artists: unknown[]
  merchIdeas: unknown[]
  productListings: unknown[]
  socialRepurposing: unknown[]
  analyticsRecords: unknown[]
  mockupPrompts: unknown[]
  emailCampaigns: unknown[]
  experiments: unknown[]
  campaigns: unknown[]
  presets: unknown[]
  workspaceSettings: unknown[]
}

export interface CreatorOpsBackup {
  appName: string
  backupVersion: string
  exportedAt: string
  recordCounts: BackupRecordCounts
  data: CreatorOpsBackupData
}

export interface BackupModuleMeta {
  key: BackupDataKey
  label: string
  exportFilename: string
  category: "core" | "youtube" | "commerce" | "marketing" | "operations"
}

export const BACKUP_MODULE_META: BackupModuleMeta[] = [
  { key: "prompts", label: "Prompts", exportFilename: "creatorops-prompts.json", category: "core" },
  { key: "workflows", label: "Workflows", exportFilename: "creatorops-workflows.json", category: "core" },
  { key: "promptRuns", label: "Prompt Runs", exportFilename: "creatorops-prompt-runs.json", category: "core" },
  { key: "workflowRuns", label: "Workflow Runs", exportFilename: "creatorops-workflow-runs.json", category: "core" },
  { key: "youtubePackages", label: "YouTube Packages", exportFilename: "creatorops-youtube-packages.json", category: "youtube" },
  { key: "youtubeThumbnails", label: "YouTube Thumbnails", exportFilename: "creatorops-youtube-thumbnails.json", category: "youtube" },
  { key: "releasePlans", label: "Release Plans", exportFilename: "creatorops-release-plans.json", category: "youtube" },
  { key: "artists", label: "Artists", exportFilename: "creatorops-artists.json", category: "operations" },
  { key: "merchIdeas", label: "Merch Ideas", exportFilename: "creatorops-merch-ideas.json", category: "commerce" },
  { key: "productListings", label: "Product Listings", exportFilename: "creatorops-product-listings.json", category: "commerce" },
  { key: "socialRepurposing", label: "Social Repurposing", exportFilename: "creatorops-social-repurposing.json", category: "marketing" },
  { key: "analyticsRecords", label: "Analytics Records", exportFilename: "creatorops-analytics.json", category: "operations" },
  { key: "mockupPrompts", label: "Mockup Prompts", exportFilename: "creatorops-mockup-prompts.json", category: "commerce" },
  { key: "emailCampaigns", label: "Email Campaigns", exportFilename: "creatorops-email-campaigns.json", category: "marketing" },
  { key: "experiments", label: "Experiments", exportFilename: "creatorops-experiments.json", category: "marketing" },
  { key: "campaigns", label: "Campaigns", exportFilename: "creatorops-campaigns.json", category: "operations" },
  { key: "presets", label: "Presets", exportFilename: "creatorops-presets.json", category: "core" },
  {
    key: "workspaceSettings",
    label: "Workspace Settings",
    exportFilename: "creatorops-workspace-settings.json",
    category: "operations",
  },
]

export const BACKUP_DATA_KEYS = BACKUP_MODULE_META.map((m) => m.key)

export function emptyBackupData(): CreatorOpsBackupData {
  return {
    prompts: [],
    workflows: [],
    promptRuns: [],
    workflowRuns: [],
    youtubePackages: [],
    youtubeThumbnails: [],
    releasePlans: [],
    artists: [],
    merchIdeas: [],
    productListings: [],
    socialRepurposing: [],
    analyticsRecords: [],
    mockupPrompts: [],
    emailCampaigns: [],
    experiments: [],
    campaigns: [],
    presets: [],
    workspaceSettings: [],
  }
}

export function countBackupData(data: CreatorOpsBackupData): BackupRecordCounts {
  return {
    prompts: data.prompts.length,
    workflows: data.workflows.length,
    promptRuns: data.promptRuns.length,
    workflowRuns: data.workflowRuns.length,
    youtubePackages: data.youtubePackages.length,
    youtubeThumbnails: data.youtubeThumbnails.length,
    releasePlans: data.releasePlans.length,
    artists: data.artists.length,
    merchIdeas: data.merchIdeas.length,
    productListings: data.productListings.length,
    socialRepurposing: data.socialRepurposing.length,
    analyticsRecords: data.analyticsRecords.length,
    mockupPrompts: data.mockupPrompts.length,
    emailCampaigns: data.emailCampaigns.length,
    experiments: data.experiments.length,
    campaigns: data.campaigns.length,
    presets: data.presets.length,
    workspaceSettings: data.workspaceSettings.length,
  }
}

export function totalFromCounts(counts: BackupRecordCounts): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0)
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

function extractArray(payload: Record<string, unknown>, key: BackupDataKey): unknown[] {
  const data = payload.data
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const nested = (data as Record<string, unknown>)[key]
    if (isArray(nested)) return nested
  }
  const direct = payload[key]
  if (isArray(direct)) return direct
  return []
}

/**
 * Normalize a parsed JSON payload into backup data arrays.
 * Accepts full backup shape or legacy single-module / partial exports.
 */
export function normalizeBackupPayload(payload: unknown): CreatorOpsBackupData {
  const data = emptyBackupData()
  if (!payload || typeof payload !== "object") return data

  const record = payload as Record<string, unknown>

  for (const key of BACKUP_DATA_KEYS) {
    data[key] = extractArray(record, key)
  }

  return data
}

export function validateFullBackup(payload: unknown): payload is CreatorOpsBackup {
  if (!payload || typeof payload !== "object") return false
  const backup = payload as Record<string, unknown>

  if (typeof backup.appName !== "string") return false
  if (typeof backup.backupVersion !== "string") return false
  if (typeof backup.exportedAt !== "string") return false
  if (!backup.data || typeof backup.data !== "object" || Array.isArray(backup.data)) {
    return false
  }

  const data = backup.data as Record<string, unknown>
  for (const key of BACKUP_DATA_KEYS) {
    if (key in data && !isArray(data[key])) return false
  }

  return true
}

export function buildFullBackup(data: CreatorOpsBackupData): CreatorOpsBackup {
  const recordCounts = countBackupData(data)
  return {
    appName: BACKUP_APP_NAME,
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    recordCounts,
    data,
  }
}

export function maxUpdatedAt(items: { updatedAt?: number }[]): number | null {
  if (items.length === 0) return null
  return Math.max(...items.map((item) => item.updatedAt ?? 0))
}
