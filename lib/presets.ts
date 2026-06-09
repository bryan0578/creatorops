import type { PresetFormValues, PresetRecord, PresetType } from "@/lib/types"
import { PRESET_TYPES } from "@/lib/types"

function parseJsonArray(raw: string, fallback: string[]): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : fallback
  } catch {
    return fallback
  }
}

function parseJsonObject(raw: string, fallback: Record<string, unknown>): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : fallback
  } catch {
    return fallback
  }
}

export function parsePresetTags(raw: string): string[] {
  return parseJsonArray(raw, [])
}

export function stringifyPresetTags(tags: string[]): string {
  return JSON.stringify(tags.filter(Boolean))
}

export function parsePresetValues(raw: string): Record<string, unknown> {
  return parseJsonObject(raw, {})
}

export function stringifyPresetValues(values: Record<string, unknown>): string {
  return JSON.stringify(values)
}

export function isPresetType(value: string): value is PresetType {
  return (PRESET_TYPES as string[]).includes(value)
}

export function emptyPresetForm(presetType: PresetType = "Campaign"): PresetFormValues {
  return {
    name: "",
    description: "",
    presetType,
    category: "",
    tags: "",
    valuesJson: PRESET_VALUES_PLACEHOLDERS[presetType],
    notes: "",
  }
}

export function normalizePresetRecord(
  preset: Partial<PresetRecord> & Pick<PresetRecord, "id">,
): PresetRecord {
  const now = Date.now()
  const presetType = isPresetType(preset.presetType ?? "")
    ? preset.presetType
    : "Campaign"

  return {
    id: preset.id,
    name: preset.name ?? "",
    description: preset.description ?? "",
    presetType,
    category: preset.category ?? "",
    tags: Array.isArray(preset.tags) ? preset.tags.filter(Boolean) : [],
    values:
      preset.values && typeof preset.values === "object" && !Array.isArray(preset.values)
        ? preset.values
        : {},
    notes: preset.notes ?? "",
    createdAt: preset.createdAt ?? now,
    updatedAt: preset.updatedAt ?? now,
  }
}

export function presetFormFromRecord(record: PresetRecord): PresetFormValues {
  return {
    name: record.name,
    description: record.description,
    presetType: record.presetType,
    category: record.category,
    tags: record.tags.join(", "),
    valuesJson: JSON.stringify(record.values, null, 2),
    notes: record.notes,
  }
}

export function buildPresetRecordFromForm(
  id: string,
  form: PresetFormValues,
  timestamps?: { createdAt?: number; updatedAt?: number },
): PresetRecord {
  const now = Date.now()
  const tags = form.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)

  return normalizePresetRecord({
    id,
    name: form.name.trim(),
    description: form.description.trim(),
    presetType: form.presetType,
    category: form.category.trim(),
    tags,
    values: parsePresetValues(form.valuesJson),
    notes: form.notes.trim(),
    createdAt: timestamps?.createdAt ?? now,
    updatedAt: timestamps?.updatedAt ?? now,
  })
}

export function duplicatePresetRecord(record: PresetRecord, newId: string): PresetRecord {
  const now = Date.now()
  return normalizePresetRecord({
    ...record,
    id: newId,
    name: record.name ? `${record.name} (copy)` : "Untitled preset (copy)",
    createdAt: now,
    updatedAt: now,
  })
}

export function validatePresetValuesJson(valuesJson: string): {
  valid: boolean
  error?: string
  values?: Record<string, unknown>
} {
  if (!valuesJson.trim()) {
    return { valid: true, values: {} }
  }
  try {
    const parsed = JSON.parse(valuesJson) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { valid: false, error: "Values must be a JSON object." }
    }
    return { valid: true, values: parsed as Record<string, unknown> }
  } catch {
    return { valid: false, error: "Invalid JSON. Check commas, quotes, and brackets." }
  }
}

export function filterPresets(
  presets: PresetRecord[],
  query: string,
  presetType: PresetType | "all",
): PresetRecord[] {
  const q = query.trim().toLowerCase()
  return presets.filter((preset) => {
    if (presetType !== "all" && preset.presetType !== presetType) return false
    if (!q) return true
    const haystack = [
      preset.name,
      preset.description,
      preset.category,
      preset.presetType,
      preset.notes,
      ...preset.tags,
      JSON.stringify(preset.values),
    ]
      .join(" ")
      .toLowerCase()
    return haystack.includes(q)
  })
}

export const PRESET_VALUES_PLACEHOLDERS: Record<PresetType, string> = {
  Campaign: `{
  "campaignName": "Dark AI Music Release",
  "campaignType": "Music Release",
  "status": "Planning",
  "priority": "High",
  "artistName": "Neon Atlas",
  "songTitle": "Midnight Circuit",
  "niche": "Dark AI Music",
  "primaryGoal": "Drive streams and YouTube views",
  "targetAudience": "Late-night electronic listeners",
  "launchDate": "2026-07-15"
}`,
  "YouTube Package": `{
  "trackTitle": "Midnight Circuit",
  "artistName": "Neon Atlas",
  "genre": "Cyberpunk Electronic",
  "mood": "Dark, cinematic, futuristic",
  "visualTheme": "Neon city, rain, holograms",
  "videoType": "Visualizer",
  "primaryGoal": "Views"
}`,
  "YouTube Thumbnail": `{
  "trackTitle": "Midnight Circuit",
  "artistName": "Neon Atlas",
  "videoTitle": "Neon Atlas — Midnight Circuit (Official Visualizer)",
  "genre": "Cyberpunk Electronic",
  "mood": "Dark and cinematic",
  "visualTheme": "Neon city skyline",
  "textOverlay": "MIDNIGHT CIRCUIT",
  "colorDirection": "Cyan and magenta neon"
}`,
  "Release Plan": `{
  "artistName": "Neon Atlas",
  "songTitle": "Midnight Circuit",
  "genre": "Dark Electronic",
  "mood": "Cinematic, moody",
  "releaseDate": "2026-07-15",
  "primaryGoal": "Maximize day-one streams"
}`,
  "Merch Idea": `{
  "niche": "Dark AI Music",
  "audience": "Electronic music fans",
  "productType": "T-shirt",
  "tone": "Edgy, minimal",
  "designStyle": "Glitch typography"
}`,
  "Product Listing": `{
  "productType": "T-shirt",
  "niche": "Funny AI Music",
  "audience": "Creators and musicians",
  "tone": "Playful",
  "primaryKeyword": "funny music shirt"
}`,
  "Social Repurposing": `{
  "sourceContent": "New single release announcement",
  "businessArea": "AI Music",
  "goal": "Drive release day engagement",
  "platforms": "TikTok, Instagram, X, YouTube Shorts"
}`,
  "Email Campaign": `{
  "campaignName": "Release Announcement",
  "campaignType": "Music Release Announcement",
  "businessArea": "AI Music",
  "productOrReleaseName": "Midnight Circuit"
}`,
  "Analytics Record": `{
  "itemName": "Midnight Circuit Visualizer",
  "itemType": "YouTube Video",
  "platform": "YouTube",
  "genre": "Dark Electronic"
}`,
  "Mockup Prompt": `{
  "projectName": "Merch Mockup",
  "mockupType": "T-Shirt Mockup",
  "niche": "Dark AI Music",
  "visualStyle": "Studio product shot"
}`,
}
