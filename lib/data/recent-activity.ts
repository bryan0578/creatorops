import type { GlobalSearchCategory, GlobalSearchResultType } from "@/lib/data/global-search"
import { GLOBAL_SEARCH_TYPE_META } from "@/lib/data/global-search"

export type ActivityAction = "Created" | "Updated"

export type ActivityType = GlobalSearchResultType

export interface RecentActivityItem {
  id: string
  type: ActivityType
  action: ActivityAction
  title: string
  subtitle: string
  href: string
  timestamp: number
  updatedAt: number
  createdAt: number
  badgeLabel: string
  category: GlobalSearchCategory
  directOpen: boolean
}

export const RECENT_ACTIVITY_PER_MODULE = 8
export const RECENT_ACTIVITY_LIMIT = 20

/** If updatedAt is more than this many ms after createdAt, treat as Updated. */
export const ACTIVITY_UPDATED_THRESHOLD_MS = 60_000

const RECORD_ID_MODULES: ActivityType[] = [
  "youtube-package",
  "youtube-thumbnail",
  "release-plan",
  "social-repurposing",
  "merch-idea",
  "product-listing",
  "mockup-prompt",
  "email-campaign",
  "analytics",
  "artist",
  "prompt-run",
  "workflow-run",
]

export function deriveActivityAction(
  createdAt: number,
  updatedAt: number,
): ActivityAction {
  if (updatedAt - createdAt > ACTIVITY_UPDATED_THRESHOLD_MS) {
    return "Updated"
  }
  return "Created"
}

export function buildActivityHref(
  type: ActivityType,
  id: string,
): { href: string; directOpen: boolean } {
  const base = GLOBAL_SEARCH_TYPE_META[type].href

  if (type === "campaign") {
    return {
      href: `${base}?campaignId=${encodeURIComponent(id)}`,
      directOpen: true,
    }
  }

  if (type === "prompt") {
    return {
      href: `/runner?promptId=${encodeURIComponent(id)}`,
      directOpen: true,
    }
  }

  if (type === "youtube-thumbnail") {
    return {
      href: `${base}?recordId=${encodeURIComponent(id)}`,
      directOpen: true,
    }
  }

  if (RECORD_ID_MODULES.includes(type)) {
    return {
      href: `${base}?recordId=${encodeURIComponent(id)}`,
      directOpen: true,
    }
  }

  if (type === "workflow") {
    return {
      href: `${base}?recordId=${encodeURIComponent(id)}`,
      directOpen: true,
    }
  }

  return { href: base, directOpen: false }
}

export function buildActivityItem(input: {
  id: string
  type: ActivityType
  title: string
  subtitle: string
  createdAt: Date
  updatedAt: Date
}): RecentActivityItem {
  const meta = GLOBAL_SEARCH_TYPE_META[input.type]
  const createdAt = input.createdAt.getTime()
  const updatedAt = input.updatedAt.getTime()
  const action = deriveActivityAction(createdAt, updatedAt)
  const link = buildActivityHref(input.type, input.id)

  return {
    id: input.id,
    type: input.type,
    action,
    title: input.title || "Untitled",
    subtitle: input.subtitle,
    href: link.href,
    timestamp: Math.max(createdAt, updatedAt),
    updatedAt,
    createdAt,
    badgeLabel: meta.typeLabel,
    category: meta.category,
    directOpen: link.directOpen,
  }
}

export function mergeAndLimitActivities(
  items: RecentActivityItem[],
  limit = RECENT_ACTIVITY_LIMIT,
): RecentActivityItem[] {
  return [...items]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
}

export function filterActivities(
  items: RecentActivityItem[],
  options: {
    query?: string
    category?: GlobalSearchCategory | "all"
    type?: ActivityType | "all"
  },
): RecentActivityItem[] {
  const q = options.query?.trim().toLowerCase() ?? ""

  return items.filter((item) => {
    if (options.category && options.category !== "all" && item.category !== options.category) {
      return false
    }
    if (options.type && options.type !== "all" && item.type !== options.type) {
      return false
    }
    if (!q) return true
    const haystack = [
      item.title,
      item.subtitle,
      item.badgeLabel,
      item.action,
      item.category,
    ]
      .join(" ")
      .toLowerCase()
    return haystack.includes(q)
  })
}
