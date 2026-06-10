import { parseJsonObject, safeJsonParse } from "@/lib/safe-json"
import type {
  PublishingChecklist,
  PublishingChecklistItem,
  PublishingChecklistItemStatus,
  PublishingChecklistPhase,
  PublishingChecklistQuickAction,
} from "@/lib/types"
import {
  PUBLISHING_CHECKLIST_PHASES,
  PUBLISHING_CHECKLIST_STATUSES,
} from "@/lib/types"

export {
  PUBLISHING_CHECKLIST_PHASES,
  PUBLISHING_CHECKLIST_STATUSES,
} from "@/lib/types"

export const PUBLISHING_CHECKLIST_VERSION = 1 as const

export const PUBLISHING_PHASE_DESCRIPTIONS: Record<PublishingChecklistPhase, string> = {
  "Pre-Publish": "Final checks before publishing.",
  Publishing: "Actions done while publishing the video, product, or campaign asset.",
  "Immediately After Publish":
    "First actions after the release is live.",
  "24-Hour Review": "Early performance review and immediate adjustments.",
  "7-Day Review": "First-week performance review and follow-up content.",
  "30-Day Review": "Longer-term review and learnings for future campaigns.",
}

type DefaultItemDef = {
  phase: PublishingChecklistPhase
  title: string
  quickAction?: PublishingChecklistQuickAction
}

const MUSIC_RELEASE_DEFAULTS: DefaultItemDef[] = [
  { phase: "Pre-Publish", title: "Confirm final audio/video file is ready" },
  { phase: "Pre-Publish", title: "Confirm YouTube title is finalized", quickAction: "youtube-packaging" },
  { phase: "Pre-Publish", title: "Confirm YouTube description is finalized", quickAction: "youtube-packaging" },
  { phase: "Pre-Publish", title: "Confirm tags and hashtags are finalized", quickAction: "youtube-packaging" },
  { phase: "Pre-Publish", title: "Confirm thumbnail is finalized", quickAction: "youtube-thumbnails" },
  { phase: "Pre-Publish", title: "Confirm pinned comment is ready", quickAction: "youtube-packaging" },
  { phase: "Pre-Publish", title: "Confirm Shorts caption is ready", quickAction: "social-repurposing" },
  { phase: "Pre-Publish", title: "Confirm community post is ready", quickAction: "social-repurposing" },
  { phase: "Pre-Publish", title: "Confirm streaming link or “Coming soon” text is ready" },
  { phase: "Pre-Publish", title: "Confirm merch/product links if applicable" },
  { phase: "Pre-Publish", title: "Export campaign pack", quickAction: "export-campaign-pack" },
  { phase: "Pre-Publish", title: "Run Data Health check", quickAction: "data-health" },
  { phase: "Pre-Publish", title: "Confirm no critical Data Health issues", quickAction: "data-health" },
  { phase: "Publishing", title: "Upload video to YouTube" },
  { phase: "Publishing", title: "Paste final title", quickAction: "youtube-packaging" },
  { phase: "Publishing", title: "Paste final description", quickAction: "youtube-packaging" },
  { phase: "Publishing", title: "Add final tags", quickAction: "youtube-packaging" },
  { phase: "Publishing", title: "Upload thumbnail", quickAction: "youtube-thumbnails" },
  { phase: "Publishing", title: "Add video to playlist if applicable" },
  { phase: "Publishing", title: "Add end screen/cards if applicable" },
  { phase: "Publishing", title: "Confirm visibility/schedule" },
  { phase: "Publishing", title: "Publish or schedule video" },
  { phase: "Publishing", title: "Save published video URL" },
  { phase: "Publishing", title: "Update campaign status to Published" },
  { phase: "Immediately After Publish", title: "Pin first comment", quickAction: "youtube-packaging" },
  { phase: "Immediately After Publish", title: "Publish YouTube Community post", quickAction: "social-repurposing" },
  { phase: "Immediately After Publish", title: "Post YouTube Short", quickAction: "social-repurposing" },
  { phase: "Immediately After Publish", title: "Post TikTok caption", quickAction: "social-repurposing" },
  { phase: "Immediately After Publish", title: "Post Instagram caption", quickAction: "social-repurposing" },
  { phase: "Immediately After Publish", title: "Post X post", quickAction: "social-repurposing" },
  { phase: "Immediately After Publish", title: "Send email announcement", quickAction: "email-campaigns" },
  { phase: "Immediately After Publish", title: "Add/update merch link" },
  { phase: "Immediately After Publish", title: "Add video URL to analytics record", quickAction: "analytics" },
  {
    phase: "Immediately After Publish",
    title: "Create first experiment if testing title/thumbnail/hook",
    quickAction: "experiments",
  },
  { phase: "24-Hour Review", title: "Record 24-hour views", quickAction: "analytics" },
  { phase: "24-Hour Review", title: "Record 24-hour impressions", quickAction: "analytics" },
  { phase: "24-Hour Review", title: "Record 24-hour CTR", quickAction: "analytics" },
  { phase: "24-Hour Review", title: "Record likes, comments, and subscribers gained", quickAction: "analytics" },
  { phase: "24-Hour Review", title: "Review comments for audience signals" },
  { phase: "24-Hour Review", title: "Check if thumbnail/title needs an experiment", quickAction: "experiments" },
  { phase: "24-Hour Review", title: "Add 24-hour notes to Analytics", quickAction: "analytics" },
  { phase: "24-Hour Review", title: "Create next follow-up Short idea", quickAction: "social-repurposing" },
  { phase: "7-Day Review", title: "Record 7-day views", quickAction: "analytics" },
  { phase: "7-Day Review", title: "Record 7-day CTR", quickAction: "analytics" },
  { phase: "7-Day Review", title: "Record watch time and average duration", quickAction: "analytics" },
  { phase: "7-Day Review", title: "Review retention notes", quickAction: "analytics" },
  { phase: "7-Day Review", title: "Compare against previous releases", quickAction: "analytics" },
  { phase: "7-Day Review", title: "Pick experiment winner if enough data", quickAction: "experiments" },
  { phase: "7-Day Review", title: "Plan follow-up content" },
  { phase: "7-Day Review", title: "Update what worked / what did not work" },
  { phase: "30-Day Review", title: "Record 30-day performance", quickAction: "analytics" },
  { phase: "30-Day Review", title: "Summarize campaign lessons" },
  { phase: "30-Day Review", title: "Mark winning title/thumbnail/hook", quickAction: "experiments" },
  { phase: "30-Day Review", title: "Add learnings to notes" },
  { phase: "30-Day Review", title: "Archive or move campaign to Tracking/Archived" },
  { phase: "30-Day Review", title: "Create next campaign idea based on results" },
]

const COMMERCE_DEFAULTS: DefaultItemDef[] = [
  { phase: "Pre-Publish", title: "Confirm product concept is finalized" },
  { phase: "Pre-Publish", title: "Confirm product listing title is finalized" },
  { phase: "Pre-Publish", title: "Confirm product description is finalized" },
  { phase: "Pre-Publish", title: "Confirm mockup images/prompts are finalized" },
  { phase: "Pre-Publish", title: "Confirm pricing notes" },
  { phase: "Pre-Publish", title: "Confirm store collection/category" },
  { phase: "Pre-Publish", title: "Confirm social captions", quickAction: "social-repurposing" },
  { phase: "Pre-Publish", title: "Confirm email copy", quickAction: "email-campaigns" },
  { phase: "Pre-Publish", title: "Export campaign pack", quickAction: "export-campaign-pack" },
  { phase: "Pre-Publish", title: "Run Data Health check", quickAction: "data-health" },
  { phase: "Publishing", title: "Create product in store" },
  { phase: "Publishing", title: "Add title and description" },
  { phase: "Publishing", title: "Upload mockup/product images" },
  { phase: "Publishing", title: "Add tags/collection" },
  { phase: "Publishing", title: "Set pricing" },
  { phase: "Publishing", title: "Publish product" },
  { phase: "Publishing", title: "Save product URL" },
  { phase: "Publishing", title: "Update campaign status to Published" },
  { phase: "Immediately After Publish", title: "Post product announcement", quickAction: "social-repurposing" },
  { phase: "Immediately After Publish", title: "Post short-form promo", quickAction: "social-repurposing" },
  { phase: "Immediately After Publish", title: "Send email announcement", quickAction: "email-campaigns" },
  {
    phase: "Immediately After Publish",
    title: "Add product link to related YouTube/video description if applicable",
    quickAction: "youtube-packaging",
  },
  { phase: "Immediately After Publish", title: "Create analytics record", quickAction: "analytics" },
  {
    phase: "Immediately After Publish",
    title: "Create experiment for title/image/caption if needed",
    quickAction: "experiments",
  },
  { phase: "24-Hour Review", title: "Record visits/clicks", quickAction: "analytics" },
  { phase: "24-Hour Review", title: "Record sales/conversions", quickAction: "analytics" },
  { phase: "24-Hour Review", title: "Review comments/messages" },
  { phase: "24-Hour Review", title: "Check if product title/mockup needs test", quickAction: "experiments" },
  { phase: "24-Hour Review", title: "Add 24-hour notes to Analytics", quickAction: "analytics" },
  { phase: "7-Day Review", title: "Record 7-day visits/sales", quickAction: "analytics" },
  { phase: "7-Day Review", title: "Review conversion rate", quickAction: "analytics" },
  { phase: "7-Day Review", title: "Compare product performance", quickAction: "analytics" },
  { phase: "7-Day Review", title: "Plan second promo push", quickAction: "social-repurposing" },
  { phase: "7-Day Review", title: "Pick experiment winner if available", quickAction: "experiments" },
  { phase: "30-Day Review", title: "Record 30-day sales/conversion", quickAction: "analytics" },
  { phase: "30-Day Review", title: "Summarize product lessons" },
  { phase: "30-Day Review", title: "Decide whether to keep, update, or retire product" },
  { phase: "30-Day Review", title: "Add learnings to notes" },
  { phase: "30-Day Review", title: "Move campaign to Tracking/Archived" },
]

const COMMERCE_CAMPAIGN_TYPES = new Set([
  "merch drop",
  "product launch",
  "digital product launch",
])

function phaseSlug(phase: PublishingChecklistPhase): string {
  return phase
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function stableItemId(phase: PublishingChecklistPhase, index: number): string {
  return `pc-${phaseSlug(phase)}-${index + 1}`
}

export function emptyPublishingChecklist(): PublishingChecklist {
  return { version: PUBLISHING_CHECKLIST_VERSION, items: [] }
}

export function normalizePublishingChecklistItem(
  input: Partial<PublishingChecklistItem>,
  fallbackIndex: number,
): PublishingChecklistItem | null {
  if (!input.title?.trim()) return null

  const phase = PUBLISHING_CHECKLIST_PHASES.includes(
    input.phase as PublishingChecklistPhase,
  )
    ? (input.phase as PublishingChecklistPhase)
    : "Pre-Publish"

  const status = PUBLISHING_CHECKLIST_STATUSES.includes(
    input.status as PublishingChecklistItemStatus,
  )
    ? (input.status as PublishingChecklistItemStatus)
    : "todo"

  return {
    id: String(input.id ?? stableItemId(phase, fallbackIndex)),
    phase,
    title: String(input.title).trim(),
    status,
    dueDate: String(input.dueDate ?? ""),
    completedAt: String(input.completedAt ?? ""),
    notes: String(input.notes ?? ""),
    quickAction: input.quickAction,
  }
}

export function normalizePublishingChecklist(
  input: unknown,
): PublishingChecklist {
  if (!input || typeof input !== "object") {
    return emptyPublishingChecklist()
  }

  const obj = input as Partial<PublishingChecklist>
  const rawItems = Array.isArray(obj.items) ? obj.items : []

  const items = rawItems
    .map((item, index) =>
      normalizePublishingChecklistItem(item as Partial<PublishingChecklistItem>, index),
    )
    .filter((item): item is PublishingChecklistItem => item != null)

  return {
    version: PUBLISHING_CHECKLIST_VERSION,
    items,
  }
}

export function parsePublishingChecklistRaw(raw: string): PublishingChecklist {
  const parsed = safeJsonParse<unknown>(raw, {})
  return normalizePublishingChecklist(parsed)
}

export function parsePublishingChecklistFromUnknown(
  value: unknown,
): PublishingChecklist {
  if (typeof value === "string") {
    return parsePublishingChecklistRaw(value)
  }
  return normalizePublishingChecklist(value)
}

export function stringifyPublishingChecklist(
  checklist: PublishingChecklist,
): string {
  return JSON.stringify(normalizePublishingChecklist(checklist))
}

export function isPublishingChecklistMalformed(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed || trimmed === "{}") return false
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (!parsed || typeof parsed !== "object") return true
    const obj = parsed as { items?: unknown }
    return obj.items !== undefined && !Array.isArray(obj.items)
  } catch {
    return true
  }
}

function defaultDefsForCampaignType(campaignType: string): DefaultItemDef[] {
  const norm = campaignType.trim().toLowerCase()
  if (COMMERCE_CAMPAIGN_TYPES.has(norm)) {
    return COMMERCE_DEFAULTS
  }
  return MUSIC_RELEASE_DEFAULTS
}

export function generateDefaultPublishingChecklist(
  campaignType: string,
): PublishingChecklist {
  const defs = defaultDefsForCampaignType(campaignType)
  const phaseCounts = new Map<PublishingChecklistPhase, number>()

  const items = defs.map((def) => {
    const count = phaseCounts.get(def.phase) ?? 0
    phaseCounts.set(def.phase, count + 1)
    return {
      id: stableItemId(def.phase, count),
      phase: def.phase,
      title: def.title,
      status: "todo" as const,
      dueDate: "",
      completedAt: "",
      notes: "",
      quickAction: def.quickAction,
    }
  })

  return { version: PUBLISHING_CHECKLIST_VERSION, items }
}

export function isChecklistItemDone(status: PublishingChecklistItemStatus): boolean {
  return status === "done" || status === "skipped"
}

export interface PublishingChecklistProgress {
  total: number
  done: number
  blocked: number
  percent: number
  currentPhase: PublishingChecklistPhase | "Complete"
  nextDueItem: PublishingChecklistItem | null
}

export function computePublishingChecklistProgress(
  checklist: PublishingChecklist,
): PublishingChecklistProgress {
  const items = checklist.items
  const total = items.length
  const done = items.filter((item) => isChecklistItemDone(item.status)).length
  const blocked = items.filter((item) => item.status === "blocked").length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  let currentPhase: PublishingChecklistPhase | "Complete" = "Complete"
  for (const phase of PUBLISHING_CHECKLIST_PHASES) {
    const phaseItems = items.filter((item) => item.phase === phase)
    if (phaseItems.length === 0) continue
    const phaseComplete = phaseItems.every((item) => isChecklistItemDone(item.status))
    if (!phaseComplete) {
      currentPhase = phase
      break
    }
  }

  const incompleteWithDue = items
    .filter((item) => !isChecklistItemDone(item.status) && item.dueDate.trim())
    .sort((a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate))

  return {
    total,
    done,
    blocked,
    percent,
    currentPhase,
    nextDueItem: incompleteWithDue[0] ?? null,
  }
}

export function computePhaseProgress(
  checklist: PublishingChecklist,
  phase: PublishingChecklistPhase,
): { done: number; total: number; percent: number } {
  const phaseItems = checklist.items.filter((item) => item.phase === phase)
  const total = phaseItems.length
  const done = phaseItems.filter((item) => isChecklistItemDone(item.status)).length
  return {
    total,
    done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  }
}

export function getNextIncompleteItems(
  checklist: PublishingChecklist,
  limit = 3,
): PublishingChecklistItem[] {
  const result: PublishingChecklistItem[] = []
  for (const phase of PUBLISHING_CHECKLIST_PHASES) {
    for (const item of checklist.items) {
      if (item.phase !== phase) continue
      if (isChecklistItemDone(item.status)) continue
      result.push(item)
      if (result.length >= limit) return result
    }
  }
  return result
}

export function getQuickActionHref(
  action: PublishingChecklistQuickAction,
  campaignId: string,
): string {
  const id = encodeURIComponent(campaignId)
  switch (action) {
    case "export-campaign-pack":
      return `/campaigns?campaignId=${id}&tab=launch`
    case "data-health":
      return "/data-health"
    case "analytics":
      return `/analytics?campaignId=${id}`
    case "experiments":
      return `/experiments?campaignId=${id}`
    case "youtube-packaging":
      return `/youtube-packaging?campaignId=${id}`
    case "youtube-thumbnails":
      return `/youtube-thumbnails?campaignId=${id}`
    case "social-repurposing":
      return `/social-repurposing?campaignId=${id}`
    case "email-campaigns":
      return `/email-campaigns?campaignId=${id}`
    default:
      return `/campaigns?campaignId=${id}`
  }
}

export function getQuickActionLabel(action: PublishingChecklistQuickAction): string {
  switch (action) {
    case "export-campaign-pack":
      return "Open export pack"
    case "data-health":
      return "Data Health"
    case "analytics":
      return "Analytics"
    case "experiments":
      return "Experiments"
    case "youtube-packaging":
      return "YouTube Package"
    case "youtube-thumbnails":
      return "Thumbnail"
    case "social-repurposing":
      return "Social Content"
    case "email-campaigns":
      return "Email Campaign"
    default:
      return "Open"
  }
}

export function updateChecklistItemStatus(
  checklist: PublishingChecklist,
  itemId: string,
  status: PublishingChecklistItemStatus,
): PublishingChecklist {
  return {
    ...checklist,
    items: checklist.items.map((item) => {
      if (item.id !== itemId) return item
      const completedAt =
        status === "done"
          ? new Date().toISOString()
          : status === "todo"
            ? ""
            : item.completedAt
      return { ...item, status, completedAt }
    }),
  }
}

export function updateChecklistItem(
  checklist: PublishingChecklist,
  itemId: string,
  patch: Partial<PublishingChecklistItem>,
): PublishingChecklist {
  return {
    ...checklist,
    items: checklist.items.map((item) =>
      item.id === itemId ? { ...item, ...patch } : item,
    ),
  }
}

export function addCustomChecklistItem(
  checklist: PublishingChecklist,
  item: Omit<PublishingChecklistItem, "id"> & { id?: string },
): PublishingChecklist {
  const phaseIndex = checklist.items.filter((i) => i.phase === item.phase).length
  const newItem = normalizePublishingChecklistItem(
    {
      ...item,
      id: item.id ?? `pc-custom-${Date.now()}-${phaseIndex}`,
    },
    phaseIndex,
  )
  if (!newItem) return checklist
  return {
    ...checklist,
    items: [...checklist.items, newItem],
  }
}

export function removeChecklistItem(
  checklist: PublishingChecklist,
  itemId: string,
): PublishingChecklist {
  return {
    ...checklist,
    items: checklist.items.filter((item) => item.id !== itemId),
  }
}

export function formatPublishingChecklistMarkdown(input: {
  campaignName: string
  campaignType: string
  publishingChecklist: PublishingChecklist
}): string {
  const lines: string[] = [
    "## Publishing Checklist",
    "",
    `Campaign: ${input.campaignName || "Untitled"}`,
    `Type: ${input.campaignType || "—"}`,
    "",
  ]

  const progress = computePublishingChecklistProgress(input.publishingChecklist)
  lines.push(
    `Progress: ${progress.done}/${progress.total} complete (${progress.percent}%)`,
    `Current phase: ${progress.currentPhase}`,
    "",
  )

  if (input.publishingChecklist.items.length === 0) {
    lines.push("_No publishing checklist items._", "")
    return lines.join("\n")
  }

  for (const phase of PUBLISHING_CHECKLIST_PHASES) {
    const phaseItems = input.publishingChecklist.items.filter(
      (item) => item.phase === phase,
    )
    if (phaseItems.length === 0) continue

    const phaseProgress = computePhaseProgress(input.publishingChecklist, phase)
    lines.push(
      `### ${phase}`,
      "",
      `${phaseProgress.done}/${phaseProgress.total} complete`,
      "",
    )

    for (const item of phaseItems) {
      const statusLabel = item.status.replace("-", " ")
      lines.push(`- [${item.status === "done" ? "x" : " "}] **${item.title}** (${statusLabel})`)
      if (item.dueDate) lines.push(`  - Due: ${item.dueDate}`)
      if (item.notes.trim()) lines.push(`  - Notes: ${item.notes.trim()}`)
    }
    lines.push("")
  }

  return lines.join("\n").trim() + "\n"
}

function normStatus(value: string): string {
  return value.trim().toLowerCase()
}

export function isPublishedCampaignStatus(status: string): boolean {
  const value = normStatus(status)
  return (
    value === "published" ||
    value === "live" ||
    value === "launched" ||
    value === "reviewing" ||
    value === "tracking"
  )
}

export function isReadyToPublishCampaignStatus(status: string): boolean {
  const value = normStatus(status)
  return value === "ready to publish" || value === "ready" || value === "scheduled"
}

export function hasIncompletePhaseItems(
  checklist: PublishingChecklist,
  phase: PublishingChecklistPhase,
): boolean {
  const phaseItems = checklist.items.filter((item) => item.phase === phase)
  if (phaseItems.length === 0) return false
  return phaseItems.some((item) => !isChecklistItemDone(item.status))
}

export function buildDemoPublishingChecklist(
  campaignType: string,
): PublishingChecklist {
  const checklist = generateDefaultPublishingChecklist(campaignType)
  let prePublishDone = 0
  return {
    ...checklist,
    items: checklist.items.map((item) => {
      if (item.phase === "Pre-Publish" && prePublishDone < 4) {
        prePublishDone += 1
        return {
          ...item,
          status: "done" as const,
          completedAt: new Date().toISOString(),
          notes: "DEMO_DATA_CREATOROPS",
        }
      }
      return item
    }),
  }
}

/** Validate parsed object shape for Data Health JSON scans. */
export function validatePublishingChecklistJson(raw: string): boolean {
  if (!raw.trim() || raw.trim() === "{}") return true
  const obj = parseJsonObject(raw, {})
  if (!obj || typeof obj !== "object") return false
  if ("items" in obj && !Array.isArray(obj.items)) return false
  return true
}
