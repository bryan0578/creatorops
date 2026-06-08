"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  CalendarDays,
  ImageIcon,
  ImagePlus,
  LayoutDashboard,
  Library,
  Mail,
  ListChecks,
  Play,
  Share2,
  ShoppingBag,
  Shirt,
  Video,
  Workflow as WorkflowIcon,
  Music2,
  Users,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const NAV = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Prompt Library", href: "/prompts", icon: Library },
  { title: "Workflow Hub", href: "/workflows", icon: WorkflowIcon },
  { title: "Prompt Runner", href: "/runner", icon: Play },
  { title: "Workflow Runner", href: "/workflow-runner", icon: ListChecks },
  { title: "YouTube Packaging", href: "/youtube-packaging", icon: Video },
  { title: "YouTube Thumbnails", href: "/youtube-thumbnails", icon: ImagePlus },
  { title: "Merch Ideas", href: "/merch-ideas", icon: Shirt },
  { title: "Product Listings", href: "/product-listings", icon: ShoppingBag },
  { title: "Social Repurposing", href: "/social-repurposing", icon: Share2 },
  { title: "Release Planner", href: "/release-planner", icon: CalendarDays },
  { title: "Analytics Tracker", href: "/analytics", icon: BarChart3 },
  { title: "Mockup Prompts", href: "/mockup-prompts", icon: ImageIcon },
  { title: "Email Campaigns", href: "/email-campaigns", icon: Mail },
  { title: "Artist CRM", href: "/artist-crm", icon: Users },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Music2 className="size-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">CreatorOps</span>
            <span className="text-xs text-muted-foreground">Local workspace</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : item.href === "/runner"
                      ? pathname === "/runner"
                      : pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.title}
                      render={<Link href={item.href} />}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <p className="px-2 py-1 text-xs text-muted-foreground text-balance">
          Data is saved locally in this browser.
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
