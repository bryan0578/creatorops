import { parseJsonStringArray } from "@/lib/safe-json"
import {
  ASSET_SOURCE_TOOLS,
  ASSET_STATUSES,
  ASSET_TYPES,
  type AssetFormValues,
  type AssetRecord,
} from "@/lib/types"

export { ASSET_SOURCE_TOOLS, ASSET_STATUSES, ASSET_TYPES } from "@/lib/types"

export function emptyAssetForm(): AssetFormValues {
  return {
    assetName: "",
    assetType: "Other",
    status: "Draft",
    campaignId: "",
    campaignName: "",
    artistName: "",
    songTitle: "",
    productName: "",
    platform: "",
    filePath: "",
    fileUrl: "",
    externalUrl: "",
    sourceTool: "",
    sourcePromptRunId: "",
    sourcePromptName: "",
    sourceRecordType: "",
    sourceRecordId: "",
    experimentId: "",
    analyticsRecordId: "",
    versionLabel: "",
    tags: "",
    description: "",
    usageNotes: "",
    rightsNotes: "",
    notes: "",
  }
}

export function parseAssetTags(raw: string | string[] | undefined | null): string[] {
  if (Array.isArray(raw)) return raw.map((tag) => String(tag).trim()).filter(Boolean)
  return parseJsonStringArray(raw ?? "[]", [])
}

export function formatAssetTags(tags: string[]): string {
  return tags.filter(Boolean).join(", ")
}

export function tagsFromInput(input: string): string[] {
  const trimmed = input.trim()
  if (!trimmed) return []
  if (trimmed.startsWith("[")) return parseAssetTags(trimmed)
  return trimmed
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function pickAssetType(value: string | undefined): string {
  const trimmed = (value ?? "").trim()
  if (ASSET_TYPES.includes(trimmed as (typeof ASSET_TYPES)[number])) return trimmed
  return "Other"
}

function pickAssetStatus(value: string | undefined): string {
  const trimmed = (value ?? "").trim()
  if (ASSET_STATUSES.includes(trimmed as (typeof ASSET_STATUSES)[number])) return trimmed
  return "Draft"
}

function pickSourceTool(value: string | undefined): string {
  const trimmed = (value ?? "").trim()
  if (ASSET_SOURCE_TOOLS.includes(trimmed as (typeof ASSET_SOURCE_TOOLS)[number])) {
    return trimmed
  }
  return trimmed
}

export function normalizeAssetRecord(
  input: Partial<AssetRecord> & { id: string },
): AssetRecord {
  const tags = parseAssetTags(input.tags as string | string[] | undefined)
  const now = Date.now()

  return {
    id: input.id,
    assetName: (input.assetName ?? "").trim(),
    assetType: pickAssetType(input.assetType),
    status: pickAssetStatus(input.status),
    campaignId: (input.campaignId ?? "").trim(),
    campaignName: (input.campaignName ?? "").trim(),
    artistName: (input.artistName ?? "").trim(),
    songTitle: (input.songTitle ?? "").trim(),
    productName: (input.productName ?? "").trim(),
    platform: (input.platform ?? "").trim(),
    filePath: (input.filePath ?? "").trim(),
    fileUrl: (input.fileUrl ?? "").trim(),
    externalUrl: (input.externalUrl ?? "").trim(),
    sourceTool: pickSourceTool(input.sourceTool),
    sourcePromptRunId: (input.sourcePromptRunId ?? "").trim(),
    sourcePromptName: (input.sourcePromptName ?? "").trim(),
    sourceRecordType: (input.sourceRecordType ?? "").trim(),
    sourceRecordId: (input.sourceRecordId ?? "").trim(),
    experimentId: (input.experimentId ?? "").trim(),
    analyticsRecordId: (input.analyticsRecordId ?? "").trim(),
    versionLabel: (input.versionLabel ?? "").trim(),
    tags,
    description: (input.description ?? "").trim(),
    usageNotes: (input.usageNotes ?? "").trim(),
    rightsNotes: (input.rightsNotes ?? "").trim(),
    notes: (input.notes ?? "").trim(),
    createdAt: typeof input.createdAt === "number" ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === "number" ? input.updatedAt : now,
  }
}

export function assetFormFromRecord(record: AssetRecord): AssetFormValues {
  return {
    assetName: record.assetName,
    assetType: record.assetType,
    status: record.status,
    campaignId: record.campaignId,
    campaignName: record.campaignName,
    artistName: record.artistName,
    songTitle: record.songTitle,
    productName: record.productName,
    platform: record.platform,
    filePath: record.filePath,
    fileUrl: record.fileUrl,
    externalUrl: record.externalUrl,
    sourceTool: record.sourceTool,
    sourcePromptRunId: record.sourcePromptRunId,
    sourcePromptName: record.sourcePromptName,
    sourceRecordType: record.sourceRecordType,
    sourceRecordId: record.sourceRecordId,
    experimentId: record.experimentId,
    analyticsRecordId: record.analyticsRecordId,
    versionLabel: record.versionLabel,
    tags: formatAssetTags(record.tags),
    description: record.description,
    usageNotes: record.usageNotes,
    rightsNotes: record.rightsNotes,
    notes: record.notes,
  }
}

export function recordFromAssetForm(
  id: string,
  form: AssetFormValues,
  timestamps?: { createdAt?: number; updatedAt?: number },
): AssetRecord {
  return normalizeAssetRecord({
    id,
    ...form,
    tags: tagsFromInput(form.tags),
    createdAt: timestamps?.createdAt,
    updatedAt: timestamps?.updatedAt ?? Date.now(),
  })
}

export function assetHasLocation(record: AssetRecord): boolean {
  return Boolean(record.filePath || record.fileUrl || record.externalUrl)
}

export function filterAssetsForCampaign(
  assets: AssetRecord[],
  campaignId: string,
  campaignName?: string,
): AssetRecord[] {
  const name = (campaignName ?? "").trim().toLowerCase()
  return assets.filter(
    (asset) =>
      asset.campaignId === campaignId ||
      (name && asset.campaignName.trim().toLowerCase() === name),
  )
}

export function filterAssetsForArtist(
  assets: AssetRecord[],
  artistName: string,
): AssetRecord[] {
  const needle = artistName.trim().toLowerCase()
  if (!needle) return []
  return assets.filter((asset) => asset.artistName.trim().toLowerCase() === needle)
}
