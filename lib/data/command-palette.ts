import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  CalendarDays,
  HardDrive,
  ImageIcon,
  ImagePlus,
  LayoutDashboard,
  Library,
  ListChecks,
  Mail,
  Megaphone,
  Play,
  Search,
  Share2,
  Shirt,
  ShoppingBag,
  Sparkles,
  Users,
  Video,
  Workflow as WorkflowIcon,
} from "lucide-react"

import { normalizeSearchQuery } from "@/lib/data/global-search"

export type CommandPaletteGroupId =
  | "quick-actions"
  | "modules"
  | "campaigns"
  | "presets"
  | "records"
  | "recent"

export type CommandPaletteStaticItem = {
  id: string
  group: CommandPaletteGroupId
  title: string
  subtitle?: string
  href: string
  icon?: LucideIcon
  keywords?: string
}

export const COMMAND_PALETTE_GROUP_LABELS: Record<CommandPaletteGroupId, string> = {
  "quick-actions": "Quick Actions",
  modules: "Modules",
  campaigns: "Campaigns",
  presets: "Presets",
  records: "Records",
  recent: "Recent Activity",
}

export const COMMAND_PALETTE_QUICK_ACTIONS: CommandPaletteStaticItem[] = [
  {
    id: "qa-new-campaign",
    group: "quick-actions",
    title: "New Campaign",
    subtitle: "Open Campaign Builder",
    href: "/campaigns",
    keywords: "create campaign launch",
  },
  {
    id: "qa-run-prompt",
    group: "quick-actions",
    title: "Run Prompt",
    subtitle: "Open Prompt Runner",
    href: "/runner",
    keywords: "prompt execute ai",
  },
  {
    id: "qa-youtube-package",
    group: "quick-actions",
    title: "Create YouTube Package",
    href: "/youtube-packaging",
    keywords: "youtube metadata packaging",
  },
  {
    id: "qa-youtube-thumbnail",
    group: "quick-actions",
    title: "Create YouTube Thumbnail",
    href: "/youtube-thumbnails",
    keywords: "thumbnail cover art",
  },
  {
    id: "qa-release-plan",
    group: "quick-actions",
    title: "Create Release Plan",
    href: "/release-planner",
    keywords: "release planner launch",
  },
  {
    id: "qa-social",
    group: "quick-actions",
    title: "Create Social Content",
    href: "/social-repurposing",
    keywords: "social repurposing marketing",
  },
  {
    id: "qa-email",
    group: "quick-actions",
    title: "Create Email Campaign",
    href: "/email-campaigns",
    keywords: "email newsletter",
  },
  {
    id: "qa-analytics",
    group: "quick-actions",
    title: "Add Analytics Record",
    href: "/analytics",
    keywords: "analytics tracker metrics",
  },
  {
    id: "qa-backups",
    group: "quick-actions",
    title: "Open Backup Center",
    href: "/backups",
    keywords: "backup export import demo",
  },
  {
    id: "qa-search",
    group: "quick-actions",
    title: "Open Global Search",
    href: "/search",
    keywords: "search find records",
  },
  {
    id: "qa-presets",
    group: "quick-actions",
    title: "Open Presets",
    href: "/presets",
    keywords: "templates preset starter",
  },
]

export const COMMAND_PALETTE_MODULES: CommandPaletteStaticItem[] = [
  {
    id: "mod-dashboard",
    group: "modules",
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    id: "mod-search",
    group: "modules",
    title: "Global Search",
    href: "/search",
    icon: Search,
  },
  {
    id: "mod-presets",
    group: "modules",
    title: "Presets",
    href: "/presets",
    icon: Sparkles,
  },
  {
    id: "mod-prompts",
    group: "modules",
    title: "Prompt Library",
    href: "/prompts",
    icon: Library,
  },
  {
    id: "mod-workflows",
    group: "modules",
    title: "Workflow Hub",
    href: "/workflows",
    icon: WorkflowIcon,
  },
  {
    id: "mod-runner",
    group: "modules",
    title: "Prompt Runner",
    href: "/runner",
    icon: Play,
  },
  {
    id: "mod-workflow-runner",
    group: "modules",
    title: "Workflow Runner",
    href: "/workflow-runner",
    icon: ListChecks,
  },
  {
    id: "mod-campaigns",
    group: "modules",
    title: "Campaigns",
    href: "/campaigns",
    icon: Megaphone,
  },
  {
    id: "mod-youtube-packaging",
    group: "modules",
    title: "YouTube Packaging",
    href: "/youtube-packaging",
    icon: Video,
  },
  {
    id: "mod-youtube-thumbnails",
    group: "modules",
    title: "YouTube Thumbnails",
    href: "/youtube-thumbnails",
    icon: ImagePlus,
  },
  {
    id: "mod-release-planner",
    group: "modules",
    title: "Release Planner",
    href: "/release-planner",
    icon: CalendarDays,
  },
  {
    id: "mod-merch",
    group: "modules",
    title: "Merch Ideas",
    href: "/merch-ideas",
    icon: Shirt,
  },
  {
    id: "mod-product-listings",
    group: "modules",
    title: "Product Listings",
    href: "/product-listings",
    icon: ShoppingBag,
  },
  {
    id: "mod-social",
    group: "modules",
    title: "Social Repurposing",
    href: "/social-repurposing",
    icon: Share2,
  },
  {
    id: "mod-mockups",
    group: "modules",
    title: "Mockup Prompts",
    href: "/mockup-prompts",
    icon: ImageIcon,
  },
  {
    id: "mod-email",
    group: "modules",
    title: "Email Campaigns",
    href: "/email-campaigns",
    icon: Mail,
  },
  {
    id: "mod-analytics",
    group: "modules",
    title: "Analytics Tracker",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    id: "mod-artist-crm",
    group: "modules",
    title: "Artist CRM",
    href: "/artist-crm",
    icon: Users,
  },
  {
    id: "mod-backups",
    group: "modules",
    title: "Backup Center",
    href: "/backups",
    icon: HardDrive,
  },
]

export function filterStaticCommandItems(
  items: CommandPaletteStaticItem[],
  rawQuery: string,
): CommandPaletteStaticItem[] {
  const query = normalizeSearchQuery(rawQuery)
  if (!query) return items
  return items.filter((item) => {
    const haystack = normalizeSearchQuery(
      [item.title, item.subtitle, item.keywords, item.href].filter(Boolean).join(" "),
    )
    return haystack.includes(query)
  })
}

export function commandPaletteShortcutLabel(): string {
  if (typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform)) {
    return "⌘K"
  }
  return "Ctrl+K"
}
