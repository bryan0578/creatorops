/** Shared smart-default tab resolution for record-based CreatorOps modules. */

export type DefaultTabContext = {
  explicitTab?: string | null
  recordId?: string | null
  campaignId?: string | null
  sourceRecordType?: string | null
  sourceRecordId?: string | null
  hasRecords: boolean
  detailsTab: string
  savedTab: string
  validTabs: readonly string[]
}

export function resolveExplicitTab(
  explicitTab: string | null | undefined,
  validTabs: readonly string[],
): string | null {
  const tab = explicitTab?.trim()
  if (tab && validTabs.includes(tab)) return tab
  return null
}

export function hasUrlCreateContext(
  ctx: Pick<
    DefaultTabContext,
    "recordId" | "campaignId" | "sourceRecordType" | "sourceRecordId"
  >,
): boolean {
  if (ctx.recordId?.trim()) return true
  if (ctx.campaignId?.trim()) return true
  if (ctx.sourceRecordType?.trim() && ctx.sourceRecordId?.trim()) return true
  return false
}

/** Resolve tab when record list is available (sync or after async load). */
export function getDefaultTab(ctx: DefaultTabContext): string {
  const explicit = resolveExplicitTab(ctx.explicitTab, ctx.validTabs)
  if (explicit) return explicit
  if (hasUrlCreateContext(ctx)) return ctx.detailsTab
  if (ctx.hasRecords) return ctx.savedTab
  return ctx.detailsTab
}

/** Initial client tab before async records finish loading (URL-only signals). */
export function getInitialDefaultTab(
  ctx: Omit<DefaultTabContext, "hasRecords"> & { hasRecords?: boolean },
): string {
  const explicit = resolveExplicitTab(ctx.explicitTab, ctx.validTabs)
  if (explicit) return explicit
  if (hasUrlCreateContext(ctx)) return ctx.detailsTab
  return ctx.detailsTab
}

export type CampaignDefaultTabContext = {
  explicitTab?: string | null
  recordId?: string | null
  campaignId?: string | null
  hasRecords: boolean
  validTabs: readonly string[]
  launchTab?: string
  savedTab?: string
  overviewTab?: string
}

export function getCampaignDefaultTab(ctx: CampaignDefaultTabContext): string {
  const launch = ctx.launchTab ?? "launch"
  const saved = ctx.savedTab ?? "saved"
  const overview = ctx.overviewTab ?? "overview"
  const explicit = resolveExplicitTab(ctx.explicitTab, ctx.validTabs)
  if (explicit) return explicit
  if (ctx.recordId?.trim() || ctx.campaignId?.trim()) return launch
  if (ctx.hasRecords) return saved
  return overview
}

export function getPlaybookDefaultTab(ctx: {
  explicitTab?: string | null
  recordId?: string | null
  hasRecords: boolean
  hasStarters: boolean
  validTabs: readonly string[]
  detailsTab?: string
  savedTab?: string
  startersTab?: string
}): string {
  const details = ctx.detailsTab ?? "details"
  const saved = ctx.savedTab ?? "saved"
  const starters = ctx.startersTab ?? "starters"
  const explicit = resolveExplicitTab(ctx.explicitTab, ctx.validTabs)
  if (explicit) return explicit
  if (ctx.recordId?.trim()) return details
  if (ctx.hasRecords) return saved
  if (ctx.hasStarters) return starters
  return details
}

export function getPresetDefaultTab(ctx: {
  explicitTab?: string | null
  presetId?: string | null
  hasRecords: boolean
  hasStarters?: boolean
}): string {
  const tab = ctx.explicitTab?.trim()
  if (tab && ["library", "edit", "starters"].includes(tab)) return tab
  if (ctx.presetId?.trim()) return "edit"
  if (ctx.hasRecords) return "library"
  if (ctx.hasStarters !== false) return "starters"
  return "edit"
}

export const GENERATOR_TAB_VALUES = [
  "details",
  "prompt",
  "ai-response",
  "final",
  "related",
  "saved",
] as const

export const RUNNER_TAB_VALUES = ["run", "saved"] as const
