/**
 * Global search — normalized result shape and search helpers.
 */

import { parseJsonStringArray } from "@/lib/safe-json"

export type GlobalSearchCategory =
  | "core"
  | "youtube"
  | "commerce"
  | "marketing"
  | "operations"

export type GlobalSearchFilter =
  | "all"
  | GlobalSearchCategory

export type GlobalSearchResultType =
  | "prompt"
  | "workflow"
  | "prompt-run"
  | "workflow-run"
  | "youtube-package"
  | "youtube-thumbnail"
  | "release-plan"
  | "artist"
  | "merch-idea"
  | "product-listing"
  | "social-repurposing"
  | "analytics"
  | "mockup-prompt"
  | "email-campaign"
  | "experiment"
  | "campaign"
  | "preset"
  | "playbook"
  | "asset"
  | "quality-review"
  | "learning"
  | "external-link"
  | "youtube-video"
  | "drive-folder"
  | "drive-file"

export interface GlobalSearchResult {
  id: string
  type: GlobalSearchResultType
  typeLabel: string
  category: GlobalSearchCategory
  title: string
  subtitle: string
  description: string
  href: string
  createdAt: number
  updatedAt: number
  matchedFields?: string[]
  /** True when the module can open this record directly via query param. */
  directOpen: boolean
  openNote?: string
}

export interface GlobalSearchGroup {
  type: GlobalSearchResultType
  typeLabel: string
  category: GlobalSearchCategory
  results: GlobalSearchResult[]
  total: number
}

export interface GlobalSearchResponse {
  query: string
  filter: GlobalSearchFilter
  groups: GlobalSearchGroup[]
  totalResults: number
}

export const GLOBAL_SEARCH_LIMIT_PER_TYPE = 10

export const GLOBAL_SEARCH_FETCH_BATCH = 250

export const GLOBAL_SEARCH_TYPE_META: Record<
  GlobalSearchResultType,
  { typeLabel: string; category: GlobalSearchCategory; href: string }
> = {
  prompt: { typeLabel: "Prompt", category: "core", href: "/prompts" },
  workflow: { typeLabel: "Workflow", category: "core", href: "/workflows" },
  "prompt-run": { typeLabel: "Prompt Run", category: "core", href: "/runner" },
  "workflow-run": {
    typeLabel: "Workflow Run",
    category: "core",
    href: "/workflow-runner",
  },
  "youtube-package": {
    typeLabel: "YouTube Package",
    category: "youtube",
    href: "/youtube-packaging",
  },
  "youtube-thumbnail": {
    typeLabel: "YouTube Thumbnail",
    category: "youtube",
    href: "/youtube-thumbnails",
  },
  "release-plan": {
    typeLabel: "Release Plan",
    category: "youtube",
    href: "/release-planner",
  },
  artist: { typeLabel: "Artist", category: "operations", href: "/artist-crm" },
  "merch-idea": {
    typeLabel: "Merch Idea",
    category: "commerce",
    href: "/merch-ideas",
  },
  "product-listing": {
    typeLabel: "Product Listing",
    category: "commerce",
    href: "/product-listings",
  },
  "social-repurposing": {
    typeLabel: "Social Repurposing",
    category: "marketing",
    href: "/social-repurposing",
  },
  analytics: {
    typeLabel: "Analytics",
    category: "operations",
    href: "/analytics",
  },
  "mockup-prompt": {
    typeLabel: "Mockup Prompt",
    category: "commerce",
    href: "/mockup-prompts",
  },
  "email-campaign": {
    typeLabel: "Email Campaign",
    category: "marketing",
    href: "/email-campaigns",
  },
  experiment: {
    typeLabel: "Experiment",
    category: "marketing",
    href: "/experiments",
  },
  campaign: {
    typeLabel: "Campaign",
    category: "operations",
    href: "/campaigns",
  },
  preset: {
    typeLabel: "Preset",
    category: "core",
    href: "/presets",
  },
  playbook: {
    typeLabel: "Playbook",
    category: "core",
    href: "/playbooks",
  },
  asset: {
    typeLabel: "Asset",
    category: "operations",
    href: "/assets",
  },
  "quality-review": {
    typeLabel: "Quality Review",
    category: "operations",
    href: "/quality",
  },
  learning: {
    typeLabel: "Learning",
    category: "operations",
    href: "/learnings",
  },
  "external-link": {
    typeLabel: "External Link",
    category: "operations",
    href: "/integrations",
  },
  "youtube-video": {
    typeLabel: "YouTube Video",
    category: "youtube",
    href: "/videos",
  },
  "drive-folder": {
    typeLabel: "Drive Folder",
    category: "operations",
    href: "/integrations",
  },
  "drive-file": {
    typeLabel: "Drive File",
    category: "operations",
    href: "/integrations",
  },
}

export function normalizeSearchQuery(raw: string): string {
  return raw.trim().toLowerCase()
}

export function textMatches(value: unknown, query: string): boolean {
  if (!query) return false
  if (value == null) return false
  const text = String(value).toLowerCase()
  return text.includes(query)
}

export function matchFields(
  record: Record<string, unknown>,
  fieldKeys: string[],
  query: string,
  fieldLabels?: Record<string, string>,
): { matched: boolean; matchedFields: string[] } {
  const matchedFields: string[] = []
  for (const key of fieldKeys) {
    if (textMatches(record[key], query)) {
      matchedFields.push(fieldLabels?.[key] ?? key)
    }
  }
  return { matched: matchedFields.length > 0, matchedFields }
}

export function previewText(
  value: unknown,
  maxLength = 140,
): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim()
  if (!text) return ""
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}…`
}

const GLOBAL_SEARCH_RECORD_ID_TYPES = new Set<GlobalSearchResultType>([
  "youtube-package",
  "youtube-thumbnail",
  "release-plan",
  "social-repurposing",
  "merch-idea",
  "product-listing",
  "mockup-prompt",
  "email-campaign",
  "analytics",
  "experiment",
  "artist",
  "prompt-run",
  "workflow-run",
  "asset",
  "playbook",
  "quality-review",
  "learning",
  "external-link",
  "youtube-video",
])

export function buildResultHref(
  type: GlobalSearchResultType,
  id: string,
): { href: string; directOpen: boolean; openNote?: string } {
  const base = GLOBAL_SEARCH_TYPE_META[type].href

  if (type === "prompt") {
    return {
      href: `/runner?promptId=${encodeURIComponent(id)}`,
      directOpen: true,
      openNote: "Opens in Prompt Runner with this prompt selected.",
    }
  }

  if (type === "prompt-run") {
    return {
      href: `/runner?recordId=${encodeURIComponent(id)}`,
      directOpen: true,
      openNote: "Opens in Prompt Runner with this run loaded.",
    }
  }

  if (type === "campaign") {
    return {
      href: `${base}?campaignId=${encodeURIComponent(id)}`,
      directOpen: true,
    }
  }

  if (type === "preset") {
    return {
      href: `${base}?presetId=${encodeURIComponent(id)}`,
      directOpen: true,
    }
  }

  if (type === "playbook") {
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

  if (type === "youtube-video") {
    return {
      href: `${base}?recordId=${encodeURIComponent(id)}`,
      directOpen: true,
    }
  }

  if (type === "drive-folder") {
    return {
      href: `${base}?tab=google-drive&folderId=${encodeURIComponent(id)}`,
      directOpen: true,
    }
  }

  if (type === "drive-file") {
    return {
      href: `${base}?tab=google-drive&fileId=${encodeURIComponent(id)}`,
      directOpen: true,
    }
  }

  if (GLOBAL_SEARCH_RECORD_ID_TYPES.has(type)) {
    return {
      href: `${base}?recordId=${encodeURIComponent(id)}`,
      directOpen: true,
    }
  }

  return {
    href: base,
    directOpen: false,
    openNote: "Open the module and find this record in Saved Records.",
  }
}

export function parseTagsArray(value: unknown): string[] {
  if (value == null || value === "") return []

  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean)
  }

  if (typeof value === "string") {
    const fromJson = parseJsonStringArray(value, [])
    if (fromJson.length > 0) return fromJson
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map(String)
      .filter(Boolean)
  }

  return []
}

/** Flatten tags for search matching (comma-separated display string). */
export function parseTagsJson(raw: unknown): string {
  return parseTagsArray(raw).join(", ")
}

export function filterGroupsByCategory(
  groups: GlobalSearchGroup[],
  filter: GlobalSearchFilter,
): GlobalSearchGroup[] {
  if (filter === "all") return groups
  return groups.filter((group) => group.category === filter)
}
