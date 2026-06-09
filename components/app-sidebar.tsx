"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  HardDrive,
  ImageIcon,
  ImagePlus,
  LayoutDashboard,
  Library,
  Mail,
  ListChecks,
  Music2,
  Play,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Shirt,
  Users,
  Video,
  Workflow as WorkflowIcon,
  Megaphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { focusRing } from "@/lib/ui-classes"
import { useStore } from "@/lib/store"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const SIDEBAR_GROUPS_STORAGE_KEY = "creatorops-sidebar-groups"

type NavItem = {
  title: string
  href: string
  icon: LucideIcon
}

type NavGroup = {
  id: string
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "core",
    label: "Core",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "Global Search", href: "/search", icon: Search },
      { title: "Prompt Library", href: "/prompts", icon: Library },
      { title: "Workflow Hub", href: "/workflows", icon: WorkflowIcon },
      { title: "Prompt Runner", href: "/runner", icon: Play },
      { title: "Workflow Runner", href: "/workflow-runner", icon: ListChecks },
      { title: "Presets", href: "/presets", icon: Sparkles },
    ],
  },
  {
    id: "youtube",
    label: "YouTube",
    items: [
      { title: "YouTube Packaging", href: "/youtube-packaging", icon: Video },
      {
        title: "YouTube Thumbnails",
        href: "/youtube-thumbnails",
        icon: ImagePlus,
      },
      { title: "Release Planner", href: "/release-planner", icon: CalendarDays },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    items: [
      { title: "Merch Ideas", href: "/merch-ideas", icon: Shirt },
      { title: "Product Listings", href: "/product-listings", icon: ShoppingBag },
      { title: "Mockup Prompts", href: "/mockup-prompts", icon: ImageIcon },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    items: [
      { title: "Social Repurposing", href: "/social-repurposing", icon: Share2 },
      { title: "Email Campaigns", href: "/email-campaigns", icon: Mail },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      { title: "Campaigns", href: "/campaigns", icon: Megaphone },
      { title: "Analytics Tracker", href: "/analytics", icon: BarChart3 },
      { title: "Artist CRM", href: "/artist-crm", icon: Users },
      { title: "Backup Center", href: "/backups", icon: HardDrive },
      { title: "Data Health", href: "/data-health", icon: ShieldCheck },
      { title: "Settings", href: "/settings", icon: Settings },
    ],
  },
]

const DEFAULT_GROUP_OPEN: Record<string, boolean> = {
  core: true,
}

function isNavActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/"
  if (href === "/runner") return pathname === "/runner"
  return pathname.startsWith(href)
}

function groupContainsActiveRoute(items: NavItem[], pathname: string): boolean {
  return items.some((item) => isNavActive(item.href, pathname))
}

function loadGroupState(): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(SIDEBAR_GROUPS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, boolean>
    }
  } catch {
    // ignore invalid storage
  }
  return {}
}

function isGroupOpen(
  group: NavGroup,
  pathname: string,
  groupState: Record<string, boolean>,
): boolean {
  if (groupContainsActiveRoute(group.items, pathname)) return true
  if (group.id in groupState) return groupState[group.id]
  return DEFAULT_GROUP_OPEN[group.id] ?? false
}

export function AppSidebar() {
  const pathname = usePathname()
  const { campaignsUseDatabase } = useStore()
  const [groupState, setGroupState] = React.useState<Record<string, boolean>>({})
  const [groupsHydrated, setGroupsHydrated] = React.useState(false)

  React.useEffect(() => {
    setGroupState(loadGroupState())
    setGroupsHydrated(true)
  }, [])

  React.useEffect(() => {
    if (!groupsHydrated) return
    localStorage.setItem(
      SIDEBAR_GROUPS_STORAGE_KEY,
      JSON.stringify(groupState),
    )
  }, [groupState, groupsHydrated])

  function toggleGroup(group: NavGroup) {
    const currentlyOpen = isGroupOpen(group, pathname, groupState)
    setGroupState((prev) => ({
      ...prev,
      [group.id]: !currentlyOpen,
    }))
  }

  return (
    <Sidebar>
      <SidebarHeader className="shrink-0">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_16px_-4px] shadow-primary/50">
            <Music2 className="size-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">CreatorOps</span>
            <span className="text-xs text-muted-foreground">Local workspace</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="min-h-0 flex-1 gap-0.5 overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          const open = isGroupOpen(group, pathname, groupState)
          const contentId = `sidebar-group-${group.id}`

          return (
            <SidebarGroup key={group.id} className="py-0.5">
              <button
                type="button"
                id={`${contentId}-trigger`}
                aria-expanded={open}
                aria-controls={contentId}
                onClick={() => toggleGroup(group)}
                className={cn(
                  "flex h-8 w-full items-center justify-between gap-2 rounded-lg px-2 text-xs font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  focusRing,
                )}
              >
                <span className="truncate">{group.label}</span>
                <ChevronDown
                  className={cn(
                    "size-3.5 shrink-0 opacity-70 transition-transform duration-200",
                    open && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              {open ? (
                <SidebarGroupContent id={contentId} className="pt-0.5">
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const active = isNavActive(item.href, pathname)
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            isActive={active}
                            tooltip={item.title}
                            className={cn(
                              active &&
                                "bg-sidebar-accent text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground",
                            )}
                            render={<Link href={item.href} />}
                          >
                            <item.icon className="size-4 shrink-0" />
                            <span className="truncate">{item.title}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              ) : null}
            </SidebarGroup>
          )
        })}
      </SidebarContent>
      <SidebarFooter className="mt-auto shrink-0 gap-2.5 border-t border-sidebar-border/80 px-3 pb-4 pt-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Press{" "}
          <kbd className="rounded border border-sidebar-border bg-sidebar px-1 py-0.5 font-mono text-[10px]">
            ⌘K
          </kbd>{" "}
          /{" "}
          <kbd className="rounded border border-sidebar-border bg-sidebar px-1 py-0.5 font-mono text-[10px]">
            Ctrl+K
          </kbd>{" "}
          for quick navigation
        </p>
        <ThemeToggle />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {campaignsUseDatabase ? "SQLite database" : "Browser storage"}
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
