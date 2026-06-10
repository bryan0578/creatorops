import type { CampaignRecord } from "@/lib/types"

export type CampaignBoardStage =
  | "ideas"
  | "planning"
  | "generating-assets"
  | "ready-to-publish"
  | "published"
  | "tracking"
  | "archived"

export interface CampaignBoardStageConfig {
  id: CampaignBoardStage
  title: string
  description: string
}

export const CAMPAIGN_BOARD_STAGES: CampaignBoardStageConfig[] = [
  {
    id: "ideas",
    title: "Ideas",
    description: "Raw campaign concepts and future launch ideas.",
  },
  {
    id: "planning",
    title: "Planning",
    description: "Campaigns being scoped, scheduled, and structured.",
  },
  {
    id: "generating-assets",
    title: "Generating Assets",
    description:
      "Campaigns actively creating YouTube, social, merch, email, or visual assets.",
  },
  {
    id: "ready-to-publish",
    title: "Ready to Publish",
    description: "Campaigns with key assets ready and waiting for launch.",
  },
  {
    id: "published",
    title: "Published",
    description: "Campaigns that have gone live.",
  },
  {
    id: "tracking",
    title: "Tracking",
    description: "Campaigns being monitored for performance and follow-up.",
  },
  {
    id: "archived",
    title: "Archived",
    description: "Completed or inactive campaigns.",
  },
]

const STAGE_TO_STATUS: Record<CampaignBoardStage, string> = {
  ideas: "Idea",
  planning: "Planning",
  "generating-assets": "Active",
  "ready-to-publish": "Ready to Publish",
  published: "Launched",
  tracking: "Reviewing",
  archived: "Archived",
}

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase()
}

/** Map a campaign status string to a kanban stage. */
export function normalizeStatusToStage(status: string): CampaignBoardStage {
  const value = norm(status)

  if (
    value === "idea" ||
    value === "ideas" ||
    value === "draft"
  ) {
    return "ideas"
  }

  if (value === "planning" || value === "planned") {
    return "planning"
  }

  if (
    value === "in progress" ||
    value === "generating" ||
    value === "generating assets" ||
    value === "production" ||
    value === "active"
  ) {
    return "generating-assets"
  }

  if (
    value === "ready" ||
    value === "ready to publish" ||
    value === "scheduled"
  ) {
    return "ready-to-publish"
  }

  if (value === "published" || value === "live" || value === "launched") {
    return "published"
  }

  if (value === "tracking" || value === "analytics" || value === "reviewing") {
    return "tracking"
  }

  if (
    value === "archived" ||
    value === "complete" ||
    value === "completed"
  ) {
    return "archived"
  }

  return "planning"
}

/** Canonical status written when moving a card to a stage. */
export function stageToStatus(stage: CampaignBoardStage): string {
  return STAGE_TO_STATUS[stage]
}

export function getStageConfig(stage: CampaignBoardStage): CampaignBoardStageConfig {
  return (
    CAMPAIGN_BOARD_STAGES.find((item) => item.id === stage) ?? CAMPAIGN_BOARD_STAGES[1]
  )
}

export interface CampaignBoardFilters {
  search: string
  campaignType: string
  priority: string
  artist: string
  stage: string
  showArchived: boolean
}

export function filterCampaignsForBoard(
  campaigns: CampaignRecord[],
  filters: CampaignBoardFilters,
): CampaignRecord[] {
  const search = filters.search.trim().toLowerCase()

  return campaigns.filter((campaign) => {
    const stage = normalizeStatusToStage(campaign.status)

    if (!filters.showArchived && stage === "archived") {
      return false
    }

    if (filters.stage && filters.stage !== "all" && stage !== filters.stage) {
      return false
    }

    if (filters.campaignType !== "all" && campaign.campaignType !== filters.campaignType) {
      return false
    }

    if (filters.priority !== "all" && campaign.priority !== filters.priority) {
      return false
    }

    if (filters.artist !== "all" && campaign.artistName !== filters.artist) {
      return false
    }

    if (!search) return true

    const haystack = [
      campaign.campaignName,
      campaign.campaignType,
      campaign.status,
      campaign.priority,
      campaign.artistName,
      campaign.songTitle,
      campaign.productName,
      campaign.niche,
    ]
      .join(" ")
      .toLowerCase()

    return haystack.includes(search)
  })
}

export function groupCampaignsByStage(
  campaigns: CampaignRecord[],
): Record<CampaignBoardStage, CampaignRecord[]> {
  const groups = Object.fromEntries(
    CAMPAIGN_BOARD_STAGES.map((stage) => [stage.id, [] as CampaignRecord[]]),
  ) as Record<CampaignBoardStage, CampaignRecord[]>

  for (const campaign of campaigns) {
    const stage = normalizeStatusToStage(campaign.status)
    groups[stage].push(campaign)
  }

  for (const stage of CAMPAIGN_BOARD_STAGES) {
    groups[stage.id].sort((a, b) => b.updatedAt - a.updatedAt)
  }

  return groups
}

export function countCampaignsByStage(
  campaigns: CampaignRecord[],
): Record<CampaignBoardStage, number> {
  const counts = Object.fromEntries(
    CAMPAIGN_BOARD_STAGES.map((stage) => [stage.id, 0]),
  ) as Record<CampaignBoardStage, number>

  for (const campaign of campaigns) {
    const stage = normalizeStatusToStage(campaign.status)
    counts[stage] += 1
  }

  return counts
}

export function uniqueCampaignFilterValues(campaigns: CampaignRecord[]) {
  const types = new Set<string>()
  const priorities = new Set<string>()
  const artists = new Set<string>()

  for (const campaign of campaigns) {
    if (campaign.campaignType.trim()) types.add(campaign.campaignType)
    if (campaign.priority.trim()) priorities.add(campaign.priority)
    if (campaign.artistName.trim()) artists.add(campaign.artistName)
  }

  return {
    types: Array.from(types).sort(),
    priorities: Array.from(priorities).sort((a, b) => {
      const order: Record<string, number> = { Urgent: 0, High: 1, Medium: 2, Low: 3 }
      return (order[a] ?? 99) - (order[b] ?? 99)
    }),
    artists: Array.from(artists).sort(),
  }
}
