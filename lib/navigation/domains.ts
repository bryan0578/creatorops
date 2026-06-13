import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  BookOpen,
  Bot,
  CalendarDays,
  ClipboardCheck,
  Factory,
  FlaskConical,
  FolderOpen,
  GitBranch,
  HardDrive,
  ImageIcon,
  ImagePlus,
  LayoutGrid,
  Library,
  Lightbulb,
  Link2,
  ListChecks,
  Mail,
  Megaphone,
  Music2,
  Palette,
  Play,
  ScrollText,
  Search,
  Repeat,
  ScanSearch,
  Scale,
  Settings,
  Share2,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
  Video,
  Workflow as WorkflowIcon,
  Zap,
  Orbit,
} from "lucide-react"

export type CreatorOpsDomainId =
  | "campaign-command"
  | "youtube-studio"
  | "ai-studio"
  | "music-artist-ops"
  | "product-factory"
  | "commerce"
  | "analytics-learnings"
  | "assets-integrations"
  | "admin-system"

export type CreatorOpsNavItem = {
  label: string
  href: string
  icon?: LucideIcon
  description?: string
  badge?: string
  disabled?: boolean
}

export type CreatorOpsDomain = {
  id: CreatorOpsDomainId
  label: string
  /** Compact label for very narrow sidebar / collapsed states */
  shortLabel: string
  /** Primary CTA on Control Center domain tiles */
  openButtonLabel: string
  description: string
  icon: LucideIcon
  homeHref: string
  matchRoutes: string[]
  navItems: CreatorOpsNavItem[]
  relatedItems?: CreatorOpsNavItem[]
}

const DOMAINS: CreatorOpsDomain[] = [
  {
    id: "campaign-command",
    label: "Campaign Command",
    shortLabel: "Campaign Cmd",
    openButtonLabel: "Open Campaign Command",
    description: "Plan, launch, track, and manage creator campaigns.",
    icon: Megaphone,
    homeHref: "/campaigns",
    matchRoutes: [
      "/campaigns",
      "/campaign-board",
      "/tasks",
      "/calendar",
      "/copilot",
    ],
    navItems: [
      { label: "Task Command Center", href: "/tasks", icon: ListChecks },
      { label: "Campaigns", href: "/campaigns", icon: Megaphone },
      { label: "Campaign Board", href: "/campaign-board", icon: LayoutGrid },
      { label: "Calendar", href: "/calendar", icon: CalendarDays },
      { label: "Campaign Copilot", href: "/copilot", icon: Bot },
      { label: "Automation", href: "/automation", icon: Zap },
      { label: "Data Health", href: "/data-health", icon: ShieldCheck },
    ],
    relatedItems: [
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Assets", href: "/assets", icon: FolderOpen },
    ],
  },
  {
    id: "youtube-studio",
    label: "YouTube Studio",
    shortLabel: "YouTube",
    openButtonLabel: "Open YouTube Studio",
    description: "Package, import, analyze, and optimize YouTube content.",
    icon: Video,
    homeHref: "/videos",
    matchRoutes: [
      "/videos",
      "/youtube-packaging",
      "/youtube-thumbnails",
      "/release-planner",
    ],
    navItems: [
      {
        label: "Video Intelligence",
        href: "/videos",
        icon: Video,
      },
      {
        label: "YouTube API",
        href: "/integrations?tab=youtube-api",
        icon: Link2,
      },
      { label: "YouTube Packaging", href: "/youtube-packaging", icon: Video },
      {
        label: "YouTube Thumbnails",
        href: "/youtube-thumbnails",
        icon: ImagePlus,
      },
      { label: "Release Planner", href: "/release-planner", icon: CalendarDays },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Experiments", href: "/experiments", icon: FlaskConical },
      { label: "Quality Reviews", href: "/quality", icon: ClipboardCheck },
      { label: "Learnings", href: "/learnings", icon: Lightbulb },
    ],
    relatedItems: [
      { label: "Campaigns", href: "/campaigns", icon: Megaphone },
      { label: "Assets", href: "/assets", icon: FolderOpen },
      { label: "Integrations", href: "/integrations", icon: Link2 },
    ],
  },
  {
    id: "ai-studio",
    label: "AI Studio",
    shortLabel: "AI Studio",
    openButtonLabel: "Open AI Studio",
    description:
      "Run prompts, templates, playbooks, AI generation, agents, and copilot workflows.",
    icon: Sparkles,
    homeHref: "/agents",
    matchRoutes: [
      "/agents",
      "/prompts",
      "/runner",
      "/prompt-runner",
      "/workflows",
      "/workflow-runner",
      "/presets",
      "/copilot",
    ],
    navItems: [
      { label: "Creator AI Agents", href: "/agents", icon: Bot },
      { label: "Campaign Copilot", href: "/copilot", icon: Bot },
      { label: "Artist Bible", href: "/artist-bible", icon: BookOpen },
      { label: "Song Concept Vault", href: "/song-vault", icon: Music2 },
      { label: "Visual Identity", href: "/visual-identity", icon: Palette },
      { label: "Prompt Runner", href: "/runner", icon: Play },
      { label: "Prompt Library", href: "/prompts", icon: Library },
      { label: "Workflow Hub", href: "/workflows", icon: WorkflowIcon },
      { label: "Workflow Runner", href: "/workflow-runner", icon: ListChecks },
      { label: "Presets", href: "/presets", icon: Sparkles },
      { label: "Playbooks", href: "/playbooks", icon: BookOpen },
      { label: "Quality Reviews", href: "/quality", icon: ClipboardCheck },
      { label: "Learnings", href: "/learnings", icon: Lightbulb },
    ],
    relatedItems: [
      { label: "Operating Guide", href: "/operating-guide", icon: BookOpen },
      { label: "Campaigns", href: "/campaigns", icon: Megaphone },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
  {
    id: "music-artist-ops",
    label: "Artist Ops",
    shortLabel: "Artist Ops",
    openButtonLabel: "Open Artist Ops",
    description:
      "Manage AI artists, releases, brand identity, assets, and music projects.",
    icon: Music2,
    homeHref: "/artist-universe",
    matchRoutes: [
      "/artist-universe",
      "/artist-crm",
      "/artist-bible",
      "/lore",
      "/song-vault",
      "/story-arcs",
      "/visual-identity",
    ],
    navItems: [
      { label: "Artist Universe", href: "/artist-universe", icon: Orbit },
      { label: "Task Command Center", href: "/tasks?domain=artist-ops", icon: ListChecks },
      { label: "Artist CRM", href: "/artist-crm", icon: Users },
      { label: "Artist Bible", href: "/artist-bible", icon: BookOpen },
      { label: "Lore Manager", href: "/lore", icon: ScrollText },
      { label: "Song Concept Vault", href: "/song-vault", icon: Music2 },
      { label: "Release Story Arcs", href: "/story-arcs", icon: GitBranch },
      { label: "Visual Identity", href: "/visual-identity", icon: Palette },
      { label: "Release Planner", href: "/release-planner", icon: CalendarDays },
      { label: "Asset Library", href: "/assets", icon: FolderOpen },
      { label: "Campaigns", href: "/campaigns", icon: Megaphone },
      { label: "YouTube Packaging", href: "/youtube-packaging", icon: Video },
      {
        label: "YouTube Thumbnails",
        href: "/youtube-thumbnails",
        icon: ImagePlus,
      },
      { label: "Learnings", href: "/learnings", icon: Lightbulb },
      { label: "Creator AI Agents", href: "/agents", icon: Bot },
    ],
    relatedItems: [
      { label: "Operating Guide", href: "/operating-guide", icon: BookOpen },
      { label: "Set Up PrettyWise", href: "/operating-guide?tab=prettywise", icon: Sparkles },
      { label: "Artist Universe", href: "/artist-universe?artist=PrettyWise", icon: Orbit },
      { label: "PrettyWise Setup Tasks", href: "/tasks?artist=PrettyWise&tab=artist-setup", icon: ListChecks },
      { label: "Campaigns", href: "/campaigns", icon: Megaphone },
      { label: "Integrations", href: "/integrations", icon: Link2 },
    ],
  },
  {
    id: "product-factory",
    label: "Product Factory",
    shortLabel: "Products",
    openButtonLabel: "Open Product Factory",
    description:
      "Create merch, listings, mockups, prompt packs, and digital products.",
    icon: ShoppingBag,
    homeHref: "/product-factory",
    matchRoutes: [
      "/product-factory",
      "/product-research",
      "/collections",
      "/merch-ideas",
      "/product-listings",
      "/mockup-prompts",
    ],
    navItems: [
      { label: "Product Factory", href: "/product-factory", icon: Factory },
      { label: "Product Research", href: "/product-research", icon: Search },
      { label: "Artist Bible", href: "/artist-bible", icon: BookOpen },
      { label: "Visual Identity", href: "/visual-identity", icon: Palette },
      { label: "Merch Ideas", href: "/merch-ideas", icon: Shirt },
      { label: "Product Listings", href: "/product-listings", icon: ShoppingBag },
      { label: "Mockup Prompts", href: "/mockup-prompts", icon: ImageIcon },
      { label: "Collections", href: "/collections", icon: LayoutGrid },
      { label: "Assets", href: "/assets", icon: FolderOpen },
      { label: "Quality Reviews", href: "/quality", icon: ClipboardCheck },
      { label: "Learnings", href: "/learnings", icon: Lightbulb },
      {
        label: "Product Strategist Agent",
        href: "/agents?agentId=product-strategist&tab=run",
        icon: Bot,
      },
    ],
    relatedItems: [
      { label: "Operating Guide", href: "/operating-guide", icon: BookOpen },
      { label: "Campaigns", href: "/campaigns", icon: Megaphone },
      { label: "Integrations", href: "/integrations", icon: Link2 },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    shortLabel: "Commerce",
    openButtonLabel: "Open Commerce",
    description:
      "Track store links, product launches, revenue, and sales channels.",
    icon: Store,
    homeHref: "/revenue",
    matchRoutes: [
      "/revenue",
      "/collections",
      "/product-factory",
      "/social-repurposing",
      "/email-campaigns",
    ],
    navItems: [
      { label: "Revenue Dashboard", href: "/revenue", icon: BarChart3 },
      { label: "Collections", href: "/collections", icon: LayoutGrid },
      { label: "Product Listings", href: "/product-listings", icon: ShoppingBag },
      { label: "Product Factory", href: "/product-factory", icon: Factory },
      { label: "Integrations", href: "/integrations", icon: Link2 },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Campaigns", href: "/campaigns", icon: Megaphone },
      { label: "Learnings", href: "/learnings", icon: Lightbulb },
      { label: "Experiments", href: "/experiments", icon: FlaskConical },
      { label: "Social Repurposing", href: "/social-repurposing", icon: Share2 },
      { label: "Email Campaigns", href: "/email-campaigns", icon: Mail },
    ],
    relatedItems: [
      { label: "Product Factory", href: "/product-factory", icon: ShoppingBag },
      { label: "Assets", href: "/assets", icon: FolderOpen },
    ],
  },
  {
    id: "analytics-learnings",
    label: "Analytics",
    shortLabel: "Analytics",
    openButtonLabel: "Open Analytics",
    description:
      "Review performance, experiments, quality scores, and reusable insights.",
    icon: BarChart3,
    homeHref: "/analytics",
    matchRoutes: ["/analytics", "/patterns", "/quality-performance", "/feedback-loop", "/experiments", "/quality", "/learnings"],
    navItems: [
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Pattern Detection", href: "/patterns", icon: ScanSearch },
      { label: "Quality vs Performance", href: "/quality-performance", icon: Scale },
      { label: "Learning Feedback Loop", href: "/feedback-loop", icon: Repeat },
      { label: "Experiments", href: "/experiments", icon: FlaskConical },
      { label: "Quality Reviews", href: "/quality", icon: ClipboardCheck },
      { label: "Learnings", href: "/learnings", icon: Lightbulb },
      { label: "Data Health", href: "/data-health", icon: ShieldCheck },
      { label: "Automation", href: "/automation", icon: Zap },
    ],
    relatedItems: [
      { label: "Operating Guide", href: "/operating-guide", icon: BookOpen },
      { label: "Weekly Review", href: "/operating-guide?tab=weekly", icon: ListChecks },
      { label: "Campaigns", href: "/campaigns", icon: Megaphone },
      {
        label: "YouTube API",
        href: "/integrations?tab=youtube-api",
        icon: Video,
      },
    ],
  },
  {
    id: "assets-integrations",
    label: "Assets & Integrations",
    shortLabel: "Assets",
    openButtonLabel: "Open Assets & Integrations",
    description:
      "Manage assets, external links, YouTube, Drive, Suno, and platform connections.",
    icon: FolderOpen,
    homeHref: "/assets",
    matchRoutes: ["/assets", "/integrations", "/backups"],
    navItems: [
      { label: "Asset Library", href: "/assets", icon: FolderOpen },
      { label: "Task Command Center", href: "/tasks?tab=google-drive", icon: ListChecks },
      { label: "Integrations", href: "/integrations", icon: Link2 },
      {
        label: "YouTube API",
        href: "/integrations?tab=youtube-api",
        icon: Video,
      },
      {
        label: "Google Drive",
        href: "/integrations?tab=google-drive",
        icon: HardDrive,
      },
      { label: "Backup Center", href: "/backups", icon: HardDrive },
      { label: "Data Health", href: "/data-health", icon: ShieldCheck },
    ],
    relatedItems: [
      {
        label: "YouTube API",
        href: "/integrations?tab=youtube-api",
        icon: Video,
      },
      {
        label: "Google Drive Integration",
        href: "/integrations?tab=google-drive",
        icon: HardDrive,
      },
      { label: "Campaigns", href: "/campaigns", icon: Megaphone },
    ],
  },
  {
    id: "admin-system",
    label: "Admin",
    shortLabel: "Admin",
    openButtonLabel: "Open Admin",
    description:
      "Manage settings, backups, data health, automation, and system maintenance.",
    icon: Settings,
    homeHref: "/settings",
    matchRoutes: [
      "/settings",
      "/search",
      "/activity",
      "/automation",
      "/data-health",
      "/operating-guide",
    ],
    navItems: [
      { label: "Operating Guide", href: "/operating-guide", icon: BookOpen },
      { label: "Task Command Center", href: "/tasks", icon: ListChecks },
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Global Search", href: "/search", icon: Search },
      { label: "Activity", href: "/activity", icon: ListChecks },
      { label: "Backup Center", href: "/backups", icon: HardDrive },
      { label: "Data Health", href: "/data-health", icon: ShieldCheck },
      { label: "Automation", href: "/automation", icon: Zap },
    ],
    relatedItems: [
      { label: "Campaigns", href: "/campaigns", icon: Megaphone },
      { label: "Integrations", href: "/integrations", icon: Link2 },
    ],
  },
]

const DOMAIN_BY_ID = new Map(DOMAINS.map((domain) => [domain.id, domain]))

/** Shared routes that default to Analytics & Learnings unless query rules override. */
const SHARED_ANALYTICS_PATHS = new Set([
  "/analytics",
  "/experiments",
  "/quality",
  "/learnings",
])

type QueryDomainRule = {
  pathname: string
  param: string
  value: string
  domainId: CreatorOpsDomainId
}

const QUERY_DOMAIN_RULES: QueryDomainRule[] = [
  {
    pathname: "/integrations",
    param: "tab",
    value: "youtube-api",
    domainId: "youtube-studio",
  },
  {
    pathname: "/integrations",
    param: "tab",
    value: "google-drive",
    domainId: "assets-integrations",
  },
]

type PathDomainRule = {
  path: string
  domainId: CreatorOpsDomainId
  exact?: boolean
}

/**
 * Ordered route rules — first match wins.
 * More specific paths should appear before broader prefixes.
 */
const PATH_DOMAIN_RULES: PathDomainRule[] = [
  { path: "/campaign-board", domainId: "campaign-command" },
  { path: "/campaigns", domainId: "campaign-command" },
  { path: "/copilot", domainId: "campaign-command" },
  { path: "/tasks", domainId: "campaign-command" },
  { path: "/calendar", domainId: "campaign-command" },
  { path: "/videos", domainId: "youtube-studio" },
  { path: "/youtube-packaging", domainId: "youtube-studio" },
  { path: "/youtube-thumbnails", domainId: "youtube-studio" },
  { path: "/prompt-runner", domainId: "ai-studio" },
  { path: "/runner", domainId: "ai-studio", exact: true },
  { path: "/workflow-runner", domainId: "ai-studio" },
  { path: "/workflows", domainId: "ai-studio" },
  { path: "/prompts", domainId: "ai-studio" },
  { path: "/presets", domainId: "ai-studio" },
  { path: "/playbooks", domainId: "ai-studio" },
  { path: "/artist-universe", domainId: "music-artist-ops" },
  { path: "/artist-crm", domainId: "music-artist-ops" },
  { path: "/artist-bible", domainId: "music-artist-ops" },
  { path: "/lore", domainId: "music-artist-ops" },
  { path: "/song-vault", domainId: "music-artist-ops" },
  { path: "/story-arcs", domainId: "music-artist-ops" },
  { path: "/visual-identity", domainId: "music-artist-ops" },
  { path: "/product-factory", domainId: "product-factory" },
  { path: "/product-research", domainId: "product-factory" },
  { path: "/collections", domainId: "product-factory" },
  { path: "/merch-ideas", domainId: "product-factory" },
  { path: "/product-listings", domainId: "product-factory" },
  { path: "/mockup-prompts", domainId: "product-factory" },
  { path: "/revenue", domainId: "commerce" },
  { path: "/social-repurposing", domainId: "commerce" },
  { path: "/email-campaigns", domainId: "commerce" },
  { path: "/analytics", domainId: "analytics-learnings" },
  { path: "/patterns", domainId: "analytics-learnings" },
  { path: "/quality-performance", domainId: "analytics-learnings" },
  { path: "/feedback-loop", domainId: "analytics-learnings" },
  { path: "/experiments", domainId: "analytics-learnings" },
  { path: "/quality", domainId: "analytics-learnings" },
  { path: "/learnings", domainId: "analytics-learnings" },
  { path: "/assets", domainId: "assets-integrations" },
  { path: "/integrations", domainId: "assets-integrations" },
  { path: "/backups", domainId: "assets-integrations" },
  { path: "/settings", domainId: "admin-system" },
  { path: "/search", domainId: "admin-system" },
  { path: "/activity", domainId: "admin-system" },
  { path: "/automation", domainId: "campaign-command" },
  { path: "/data-health", domainId: "admin-system" },
  { path: "/operating-guide", domainId: "admin-system" },
  { path: "/release-planner", domainId: "youtube-studio" },
]

const FALLBACK_DOMAIN_ID: CreatorOpsDomainId = "campaign-command"

function normalizePathname(pathname: string): string {
  const trimmed = pathname.trim() || "/"
  if (trimmed.length > 1 && trimmed.endsWith("/")) {
    return trimmed.slice(0, -1)
  }
  return trimmed
}

function parseSearchParams(search: string): URLSearchParams {
  const raw = search.startsWith("?") ? search.slice(1) : search
  return new URLSearchParams(raw)
}

function matchPathRule(
  pathname: string,
  rule: PathDomainRule,
): boolean {
  if (rule.exact) return pathname === rule.path
  if (pathname === rule.path) return true
  return pathname.startsWith(`${rule.path}/`)
}

export function getAllDomains(): CreatorOpsDomain[] {
  return DOMAINS
}

export function getDomainById(id: string): CreatorOpsDomain | undefined {
  return DOMAIN_BY_ID.get(id as CreatorOpsDomainId)
}

export function getDomainNavItems(domainId: string): CreatorOpsNavItem[] {
  return getDomainById(domainId)?.navItems ?? []
}

/**
 * Resolve the active domain for a route.
 * Query string is used only for explicit tab rules (e.g. YouTube API tab).
 * Returns null on the Control Center home route (/).
 */
export function getDomainForPath(
  pathname: string,
  search = "",
): CreatorOpsDomain | null {
  const normalizedPath = normalizePathname(pathname)

  if (normalizedPath === "/") return null

  const params = parseSearchParams(search)
  for (const rule of QUERY_DOMAIN_RULES) {
    if (normalizedPath === rule.pathname && params.get(rule.param) === rule.value) {
      return getDomainById(rule.domainId) ?? getDomainById(FALLBACK_DOMAIN_ID)!
    }
  }

  for (const rule of PATH_DOMAIN_RULES) {
    if (matchPathRule(normalizedPath, rule)) {
      return getDomainById(rule.domainId) ?? getDomainById(FALLBACK_DOMAIN_ID)!
    }
  }

  if (SHARED_ANALYTICS_PATHS.has(normalizedPath)) {
    return getDomainById("analytics-learnings") ?? getDomainById(FALLBACK_DOMAIN_ID)!
  }

  return getDomainById(FALLBACK_DOMAIN_ID)!
}

export function countDomainModules(domain: CreatorOpsDomain): number {
  return domain.navItems.length
}
