import type {
  AnalyticsRecord,
  ArtistRecord,
  CampaignFormValues,
  CampaignLinkedRecord,
  CampaignLinkedRecordType,
  CampaignRecord,
  CampaignTask,
  EmailCampaignRecord,
  MerchIdea,
  MockupPromptRecord,
  ProductListing,
  PromptRun,
  ReleasePlan,
  SocialRepurposingRecord,
  Workflow,
  WorkflowRun,
  YouTubePackage,
  YouTubeThumbnailRecord,
} from "@/lib/types"
import {
  CAMPAIGN_BUILDER_STATUSES,
  CAMPAIGN_BUILDER_TYPES,
  CAMPAIGN_PRIORITIES,
  CAMPAIGN_TASK_STATUSES,
} from "@/lib/types"

export {
  CAMPAIGN_BUILDER_STATUSES,
  CAMPAIGN_BUILDER_TYPES,
  CAMPAIGN_PRIORITIES,
  CAMPAIGN_TASK_STATUSES,
}

export const CAMPAIGN_LINK_TYPE_LABELS: Record<CampaignLinkedRecordType, string> =
  {
    "release-plan": "Release Plan",
    "youtube-package": "YouTube Package",
    "youtube-thumbnail": "YouTube Thumbnail",
    "social-repurposing": "Social Repurposing",
    "merch-idea": "Merch Idea",
    "product-listing": "Product Listing",
    "mockup-prompt": "Mockup Prompt",
    "email-campaign": "Email Campaign",
    analytics: "Analytics",
    artist: "Artist",
    workflow: "Workflow",
    "workflow-run": "Workflow Run",
    "prompt-run": "Prompt Run",
  }

export const CAMPAIGN_LINKABLE_TYPES: CampaignLinkedRecordType[] = [
  "release-plan",
  "youtube-package",
  "youtube-thumbnail",
  "social-repurposing",
  "merch-idea",
  "product-listing",
  "mockup-prompt",
  "email-campaign",
  "analytics",
  "artist",
  "workflow",
  "workflow-run",
  "prompt-run",
]

export interface LinkableRecordOption {
  id: string
  title: string
  subtitle: string
  href: string
}

export interface CampaignLinkableStoreSlice {
  releasePlans: ReleasePlan[]
  youtubePackages: YouTubePackage[]
  youtubeThumbnailRecords: YouTubeThumbnailRecord[]
  socialRepurposingRecords: SocialRepurposingRecord[]
  merchIdeas: MerchIdea[]
  productListings: ProductListing[]
  mockupPromptRecords: MockupPromptRecord[]
  emailCampaignRecords: EmailCampaignRecord[]
  analyticsRecords: AnalyticsRecord[]
  artistRecords: ArtistRecord[]
  workflows: Workflow[]
  workflowRuns: WorkflowRun[]
  runs: PromptRun[]
}

function parseJsonArray<T>(raw: string, fallback: T[]): T[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as T[]) : fallback
  } catch {
    return fallback
  }
}

export function stringifyJsonArray<T>(items: T[]): string {
  return JSON.stringify(items)
}

export function emptyCampaignForm(): CampaignFormValues {
  return {
    campaignName: "",
    campaignType: "Music Release",
    status: "Idea",
    priority: "Medium",
    artistName: "",
    songTitle: "",
    productName: "",
    niche: "",
    primaryGoal: "",
    targetAudience: "",
    startDate: "",
    launchDate: "",
    endDate: "",
    description: "",
    notes: "",
    lessonsLearned: "",
    whatWorked: "",
    whatToImprove: "",
  }
}

export function emptyCampaignRecord(id: string): CampaignRecord {
  const now = Date.now()
  return normalizeCampaignRecord({
    id,
    ...emptyCampaignForm(),
    linkedRecords: [],
    tasks: [],
    createdAt: now,
    updatedAt: now,
  })
}

export function emptyCampaignTask(id: string, order: number): CampaignTask {
  return {
    id,
    title: "",
    description: "",
    status: "To Do",
    dueDate: "",
    relatedRecordType: "",
    relatedRecordId: "",
    order,
  }
}

export function normalizeCampaignRecord(
  input: Partial<CampaignRecord> & { id: string },
): CampaignRecord {
  const now = Date.now()
  const linkedRecords = Array.isArray(input.linkedRecords)
    ? input.linkedRecords.map(normalizeLinkedRecord).filter(Boolean)
    : []

  const tasks = Array.isArray(input.tasks)
    ? input.tasks
        .map((task, index) => normalizeCampaignTask(task, index))
        .sort((a, b) => a.order - b.order)
    : []

  return {
    id: input.id,
    campaignName: String(input.campaignName ?? ""),
    campaignType: String(input.campaignType ?? "Music Release"),
    status: String(input.status ?? "Idea"),
    priority: String(input.priority ?? "Medium"),
    artistName: String(input.artistName ?? ""),
    songTitle: String(input.songTitle ?? ""),
    productName: String(input.productName ?? ""),
    niche: String(input.niche ?? ""),
    primaryGoal: String(input.primaryGoal ?? ""),
    targetAudience: String(input.targetAudience ?? ""),
    startDate: String(input.startDate ?? ""),
    launchDate: String(input.launchDate ?? ""),
    endDate: String(input.endDate ?? ""),
    description: String(input.description ?? ""),
    notes: String(input.notes ?? ""),
    lessonsLearned: String(input.lessonsLearned ?? ""),
    whatWorked: String(input.whatWorked ?? ""),
    whatToImprove: String(input.whatToImprove ?? ""),
    linkedRecords,
    tasks,
    createdAt: Number(input.createdAt ?? now),
    updatedAt: Number(input.updatedAt ?? now),
  }
}

function normalizeLinkedRecord(
  input: Partial<CampaignLinkedRecord>,
): CampaignLinkedRecord | null {
  if (!input.id || !input.type) return null
  if (!CAMPAIGN_LINKABLE_TYPES.includes(input.type as CampaignLinkedRecordType)) {
    return null
  }
  return {
    id: String(input.id),
    type: input.type as CampaignLinkedRecordType,
    title: String(input.title ?? "Untitled"),
    href: String(input.href ?? "/"),
    notes: String(input.notes ?? ""),
  }
}

function normalizeCampaignTask(
  input: Partial<CampaignTask>,
  fallbackOrder: number,
): CampaignTask {
  const status = CAMPAIGN_TASK_STATUSES.includes(
    input.status as CampaignTask["status"],
  )
    ? (input.status as CampaignTask["status"])
    : "To Do"

  const relatedType =
    input.relatedRecordType &&
    CAMPAIGN_LINKABLE_TYPES.includes(
      input.relatedRecordType as CampaignLinkedRecordType,
    )
      ? (input.relatedRecordType as CampaignLinkedRecordType)
      : ""

  return {
    id: String(input.id ?? `task-${fallbackOrder}`),
    title: String(input.title ?? ""),
    description: String(input.description ?? ""),
    status,
    dueDate: String(input.dueDate ?? ""),
    relatedRecordType: relatedType,
    relatedRecordId: String(input.relatedRecordId ?? ""),
    order: Number.isFinite(input.order) ? Number(input.order) : fallbackOrder,
  }
}

export function campaignFormFromRecord(record: CampaignRecord): CampaignFormValues {
  return {
    campaignName: record.campaignName,
    campaignType: record.campaignType,
    status: record.status,
    priority: record.priority,
    artistName: record.artistName,
    songTitle: record.songTitle,
    productName: record.productName,
    niche: record.niche,
    primaryGoal: record.primaryGoal,
    targetAudience: record.targetAudience,
    startDate: record.startDate,
    launchDate: record.launchDate,
    endDate: record.endDate,
    description: record.description,
    notes: record.notes,
    lessonsLearned: record.lessonsLearned,
    whatWorked: record.whatWorked,
    whatToImprove: record.whatToImprove,
  }
}

export function buildCampaignRecordFromForm(
  id: string,
  form: CampaignFormValues,
  linkedRecords: CampaignLinkedRecord[],
  tasks: CampaignTask[],
  timestamps?: { createdAt?: number; updatedAt?: number },
): CampaignRecord {
  return normalizeCampaignRecord({
    id,
    ...form,
    linkedRecords,
    tasks,
    createdAt: timestamps?.createdAt,
    updatedAt: timestamps?.updatedAt ?? Date.now(),
  })
}

export function duplicateCampaignRecord(
  record: CampaignRecord,
  newId: string,
): CampaignRecord {
  const now = Date.now()
  return normalizeCampaignRecord({
    ...record,
    id: newId,
    campaignName: record.campaignName
      ? `${record.campaignName} (copy)`
      : "Untitled (copy)",
    status: "Idea",
    tasks: record.tasks.map((task, index) => ({
      ...task,
      id: `${newId}-task-${index}`,
      status: "To Do" as const,
    })),
    createdAt: now,
    updatedAt: now,
  })
}

export function getLinkableRecordOptions(
  type: CampaignLinkedRecordType,
  store: CampaignLinkableStoreSlice,
): LinkableRecordOption[] {
  switch (type) {
    case "release-plan":
      return store.releasePlans.map((plan) => ({
        id: plan.id,
        title:
          [plan.artistName, plan.songTitle].filter(Boolean).join(" — ") ||
          "Release plan",
        subtitle: plan.releaseDate || plan.primaryGoal,
        href: "/release-planner",
      }))
    case "youtube-package":
      return store.youtubePackages.map((pkg) => ({
        id: pkg.id,
        title:
          [pkg.artistName, pkg.trackTitle].filter(Boolean).join(" — ") ||
          "YouTube package",
        subtitle: pkg.channelName || pkg.videoType,
        href: "/youtube-packaging",
      }))
    case "youtube-thumbnail":
      return store.youtubeThumbnailRecords.map((record) => ({
        id: record.id,
        title:
          [record.artistName, record.videoTitle || record.trackTitle]
            .filter(Boolean)
            .join(" — ") || "Thumbnail",
        subtitle: record.contentFormat || record.videoType,
        href: `/youtube-thumbnails?recordId=${encodeURIComponent(record.id)}`,
      }))
    case "social-repurposing":
      return store.socialRepurposingRecords.map((record) => ({
        id: record.id,
        title: record.campaignName || record.contentType || "Social campaign",
        subtitle: record.businessArea || record.platforms,
        href: "/social-repurposing",
      }))
    case "merch-idea":
      return store.merchIdeas.map((idea) => ({
        id: idea.id,
        title: idea.selectedConceptName || idea.noun || "Merch idea",
        subtitle: [idea.niche, idea.productType].filter(Boolean).join(" · "),
        href: "/merch-ideas",
      }))
    case "product-listing":
      return store.productListings.map((listing) => ({
        id: listing.id,
        title: listing.finalTitle || listing.designConcept || "Product listing",
        subtitle: [listing.niche, listing.productType].filter(Boolean).join(" · "),
        href: "/product-listings",
      }))
    case "mockup-prompt":
      return store.mockupPromptRecords.map((record) => ({
        id: record.id,
        title: record.projectName || record.mockupType || "Mockup prompt",
        subtitle: record.niche || record.productType,
        href: "/mockup-prompts",
      }))
    case "email-campaign":
      return store.emailCampaignRecords.map((record) => ({
        id: record.id,
        title: record.campaignName || "Email campaign",
        subtitle: [record.campaignType, record.productOrReleaseName]
          .filter(Boolean)
          .join(" · "),
        href: "/email-campaigns",
      }))
    case "analytics":
      return store.analyticsRecords.map((record) => ({
        id: record.id,
        title: record.itemName || "Analytics record",
        subtitle: [record.itemType, record.platform].filter(Boolean).join(" · "),
        href: "/analytics",
      }))
    case "artist":
      return store.artistRecords.map((record) => ({
        id: record.id,
        title: record.artistName || "Artist",
        subtitle: [record.artistType, record.genre].filter(Boolean).join(" · "),
        href: "/artist-crm",
      }))
    case "workflow":
      return store.workflows.map((workflow) => ({
        id: workflow.id,
        title: workflow.name,
        subtitle: `${workflow.category} · ${workflow.status}`,
        href: "/workflows",
      }))
    case "workflow-run":
      return store.workflowRuns.map((run) => ({
        id: run.id,
        title: run.workflowName,
        subtitle: `${run.category} · ${run.status}`,
        href: "/workflow-runner",
      }))
    case "prompt-run":
      return store.runs.map((run) => ({
        id: run.id,
        title: run.promptName,
        subtitle: run.category,
        href: "/runner",
      }))
    default:
      return []
  }
}

export function buildLinkedRecordFromOption(
  type: CampaignLinkedRecordType,
  option: LinkableRecordOption,
  notes = "",
): CampaignLinkedRecord {
  return {
    id: option.id,
    type,
    title: option.title,
    href: option.href,
    notes,
  }
}

export interface TimelineEvent {
  id: string
  date: string
  label: string
  kind: "milestone" | "task"
  status?: string
}

export function buildCampaignTimeline(record: CampaignRecord): TimelineEvent[] {
  const events: TimelineEvent[] = []

  if (record.startDate) {
    events.push({
      id: "start",
      date: record.startDate,
      label: "Campaign start",
      kind: "milestone",
    })
  }
  if (record.launchDate) {
    events.push({
      id: "launch",
      date: record.launchDate,
      label: "Launch date",
      kind: "milestone",
    })
  }
  if (record.endDate) {
    events.push({
      id: "end",
      date: record.endDate,
      label: "Campaign end",
      kind: "milestone",
    })
  }

  for (const task of record.tasks) {
    if (!task.dueDate) continue
    events.push({
      id: task.id,
      date: task.dueDate,
      label: task.title || "Task",
      kind: "task",
      status: task.status,
    })
  }

  return events.sort((a, b) => {
    const aTime = Date.parse(a.date) || 0
    const bTime = Date.parse(b.date) || 0
    return aTime - bTime
  })
}

export function parseCampaignLinkedRecords(raw: string): CampaignLinkedRecord[] {
  return parseJsonArray(raw, [])
    .map((item) => normalizeLinkedRecord(item as Partial<CampaignLinkedRecord>))
    .filter((item): item is CampaignLinkedRecord => item != null)
}

export function parseCampaignTasks(raw: string): CampaignTask[] {
  return parseJsonArray(raw, []).map((item, index) =>
    normalizeCampaignTask(item as Partial<CampaignTask>, index),
  )
}
