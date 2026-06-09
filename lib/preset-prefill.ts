import type { PresetRecord, PresetType } from "@/lib/types"

export const PRESET_PREFILL_STORAGE_KEY = "creatorops-preset-prefill"

export interface PresetPrefillPayload {
  presetId: string
  presetName: string
  presetType: PresetType
  values: Record<string, unknown>
  storedAt: number
}

export interface PresetPrefillContext {
  presetId: string
  presetName: string
}

export const PRESET_TYPE_ROUTES: Record<PresetType, string> = {
  Campaign: "/campaigns",
  "YouTube Package": "/youtube-packaging",
  "YouTube Thumbnail": "/youtube-thumbnails",
  "Release Plan": "/release-planner",
  "Merch Idea": "/merch-ideas",
  "Product Listing": "/product-listings",
  "Social Repurposing": "/social-repurposing",
  "Email Campaign": "/email-campaigns",
  "Analytics Record": "/analytics",
  "Mockup Prompt": "/mockup-prompts",
}

export function presetPrefillToastMessage(presetName: string): string {
  return `Prefilled from preset: ${presetName || "Untitled preset"}`
}

export function shouldSkipPresetPrefill(editingId: string | null | undefined): boolean {
  return Boolean(editingId?.trim())
}

export function mergePresetIntoForm<T extends Record<string, unknown>>(
  form: T,
  values: Record<string, unknown>,
): T {
  const next = { ...form }
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) continue
    if (typeof value === "object") continue
    ;(next as Record<string, unknown>)[key] =
      typeof value === "number" || typeof value === "boolean" ? value : String(value)
  }
  return next
}

export function storePresetPrefill(preset: PresetRecord): void {
  if (typeof window === "undefined") return
  const payload: PresetPrefillPayload = {
    presetId: preset.id,
    presetName: preset.name,
    presetType: preset.presetType,
    values: preset.values,
    storedAt: Date.now(),
  }
  sessionStorage.setItem(PRESET_PREFILL_STORAGE_KEY, JSON.stringify(payload))
}

export function readStoredPresetPrefill(presetId: string): PresetPrefillPayload | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(PRESET_PREFILL_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PresetPrefillPayload
    if (!parsed || parsed.presetId !== presetId) return null
    if (!parsed.values || typeof parsed.values !== "object") return null
    return parsed
  } catch {
    return null
  }
}

export function clearStoredPresetPrefill(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(PRESET_PREFILL_STORAGE_KEY)
}

export function buildPresetUseHref(preset: PresetRecord): string {
  const route = PRESET_TYPE_ROUTES[preset.presetType]
  return `${route}?presetId=${encodeURIComponent(preset.id)}`
}

export function preparePresetNavigation(preset: PresetRecord): string {
  storePresetPrefill(preset)
  return buildPresetUseHref(preset)
}

export function tryConsumePresetPrefill<T extends Record<string, unknown>>({
  searchParams,
  editingId,
  prefillApplied,
  setForm,
}: {
  searchParams: URLSearchParams
  editingId: string | null
  prefillApplied: { current: boolean }
  setForm: (updater: (prev: T) => T) => void
}): PresetPrefillContext | null {
  if (prefillApplied.current || shouldSkipPresetPrefill(editingId)) return null

  const presetId = searchParams.get("presetId")
  if (!presetId) return null

  const payload = readStoredPresetPrefill(presetId)
  if (!payload) return null

  prefillApplied.current = true
  setForm((prev) => mergePresetIntoForm(prev, payload.values))
  return { presetId: payload.presetId, presetName: payload.presetName }
}
