"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  Check,
  ChevronDown,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Music2,
  Orbit,
  Search,
  Settings,
  ShieldCheck,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { focusRing } from "@/lib/ui-classes"
import { useStore } from "@/lib/store"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  getAllDomains,
  getDomainForPath,
  type CreatorOpsDomain,
  type CreatorOpsNavItem,
} from "@/lib/navigation/domains"
import { isNavItemActive } from "@/lib/navigation/nav-active"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

const GLOBAL_NAV: CreatorOpsNavItem[] = [
  { label: "Control Center", href: "/", icon: LayoutDashboard },
  { label: "Global Search", href: "/search", icon: Search },
  { label: "Task Command Center", href: "/tasks", icon: ListChecks },
  { label: "Artist Universe", href: "/artist-universe", icon: Orbit },
  { label: "Campaigns", href: "/campaigns", icon: Megaphone },
  { label: "Settings", href: "/settings", icon: Settings },
]

function NavLinkItem({
  item,
  pathname,
  search,
}: {
  item: CreatorOpsNavItem
  pathname: string
  search: string
}) {
  const Icon = item.icon
  const active = isNavItemActive(item.href, pathname, search)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={item.label}
        disabled={item.disabled}
        className={cn(
          active &&
            "bg-sidebar-accent text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground",
        )}
        render={<Link href={item.href} />}
      >
        {Icon ? <Icon className="size-4 shrink-0" /> : null}
        <span className="truncate">{item.label}</span>
        {item.badge ? (
          <span className="ml-auto rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            {item.badge}
          </span>
        ) : null}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function DomainSwitcher({
  currentDomain,
  onControlCenter,
}: {
  currentDomain: CreatorOpsDomain | null
  onControlCenter: boolean
}) {
  const domains = getAllDomains()
  const DomainIcon = onControlCenter ? LayoutDashboard : (currentDomain?.icon ?? LayoutDashboard)
  const switcherTitle = onControlCenter
    ? "Control Center — all domains"
    : (currentDomain?.label ?? "All Domains")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title={switcherTitle}
        aria-label={`Switch workspace domain. Current: ${switcherTitle}`}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border border-sidebar-border/80 bg-sidebar-accent/30 px-2.5 py-2 text-left text-sm transition-colors hover:bg-sidebar-accent/60",
          focusRing,
        )}
      >
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <DomainIcon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-muted-foreground">
            {onControlCenter ? "Control Center" : "Workspace"}
          </p>
          <p className="truncate text-sm font-semibold" title={switcherTitle}>
            {onControlCenter ? "All Domains" : (currentDomain?.label ?? "All Domains")}
          </p>
        </div>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[min(70vh,28rem)] w-72 overflow-y-auto">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Switch domain</DropdownMenuLabel>
          <DropdownMenuItem className="p-0">
            <Link
              href="/"
              className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5"
            >
              <LayoutDashboard className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">Control Center</p>
                <p className="truncate text-xs text-muted-foreground">All Domains</p>
              </div>
              {onControlCenter ? <Check className="size-4 shrink-0 text-primary" /> : null}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {domains.map((domain) => {
            const Icon = domain.icon
            const active = !onControlCenter && currentDomain?.id === domain.id
            return (
              <DropdownMenuItem key={domain.id} className="p-0">
                <Link
                  href={domain.homeHref}
                  title={domain.label}
                  className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{domain.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {domain.navItems.length} modules
                    </p>
                  </div>
                  {active ? <Check className="size-4 shrink-0 text-primary" /> : null}
                </Link>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams.toString()
  const { campaignsUseDatabase } = useStore()

  const currentDomain = React.useMemo(
    () => getDomainForPath(pathname, search),
    [pathname, search],
  )

  const onControlCenter = pathname === "/"

  return (
    <Sidebar>
      <SidebarHeader className="shrink-0 space-y-3 px-2 py-2">
        <div className="flex items-center gap-2 px-1">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_16px_-4px] shadow-primary/50">
            <Music2 className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold">CreatorOps</span>
            <span className="truncate text-xs text-muted-foreground">Platform workspace</span>
          </div>
        </div>
        <DomainSwitcher
          currentDomain={currentDomain}
          onControlCenter={onControlCenter}
        />
      </SidebarHeader>

      <SidebarContent className="min-h-0 flex-1 gap-1 overflow-y-auto overflow-x-hidden">
        <SidebarGroup className="py-0.5">
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wide text-sidebar-foreground/60">
            Global
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {GLOBAL_NAV.map((item) => (
                <NavLinkItem
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  search={search}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {onControlCenter ? (
          <SidebarGroup className="py-0.5">
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wide text-sidebar-foreground/60">
              Domains
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {getAllDomains().map((domain) => {
                  const Icon = domain.icon
                  return (
                    <SidebarMenuItem key={domain.id}>
                      <SidebarMenuButton
                        tooltip={domain.label}
                        title={domain.label}
                        render={<Link href={domain.homeHref} />}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate">{domain.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : currentDomain ? (
          <>
            <SidebarGroup className="py-0.5">
              <SidebarGroupLabel
                className="truncate text-[11px] uppercase tracking-wide text-sidebar-foreground/60"
                title={currentDomain.label}
              >
                {currentDomain.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {currentDomain.navItems.map((item) => (
                    <NavLinkItem
                      key={`${item.href}-${item.label}`}
                      item={item}
                      pathname={pathname}
                      search={search}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {currentDomain.relatedItems?.length ? (
              <SidebarGroup className="py-0.5">
                <SidebarGroupLabel className="text-[11px] uppercase tracking-wide text-sidebar-foreground/60">
                  Related
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {currentDomain.relatedItems.map((item) => (
                      <NavLinkItem
                        key={`related-${item.href}-${item.label}`}
                        item={item}
                        pathname={pathname}
                        search={search}
                      />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : null}
          </>
        ) : null}
      </SidebarContent>

      <SidebarFooter className="mt-auto shrink-0 gap-2.5 border-t border-sidebar-border/80 px-3 pb-4 pt-3">
        <Link
          href="/data-health"
          className="flex items-center gap-2 rounded-md px-1 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ShieldCheck className="size-3.5 shrink-0" />
          <span className="truncate">Data Health</span>
        </Link>
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
