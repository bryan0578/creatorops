"use client"

import * as React from "react"
import { Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { CommandPaletteHeaderButton } from "@/components/command-palette/command-palette-header-button"
import {
  CommandPaletteProvider,
  useCommandPalette,
} from "@/components/command-palette/command-palette-provider"
import { ModuleShell } from "@/components/module/form-layout"
import { getDomainForPath } from "@/lib/navigation/domains"
import { cn } from "@/lib/utils"

function AppShellHeaderFallback({ breadcrumb }: { breadcrumb: string }) {
  const { shortcutLabel } = useCommandPalette()

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger />
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-2 text-sm"
        >
          <span className="shrink-0 font-medium text-muted-foreground">CreatorOps</span>
          <span className="shrink-0 text-muted-foreground/60">/</span>
          <span className="truncate font-medium text-foreground">{breadcrumb}</span>
        </nav>
      </div>
      <CommandPaletteHeaderButton shortcutLabel={shortcutLabel} />
    </header>
  )
}

function AppShellHeader({ breadcrumb }: { breadcrumb: string }) {
  const { shortcutLabel } = useCommandPalette()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const domain = getDomainForPath(pathname, searchParams.toString())

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger />
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-2 text-sm"
        >
          <span className="shrink-0 font-medium text-muted-foreground">CreatorOps</span>
          {domain ? (
            <>
              <span className="shrink-0 text-muted-foreground/60">/</span>
              <span className="hidden truncate font-medium text-muted-foreground sm:inline">
                {domain.label}
              </span>
            </>
          ) : null}
          <span className="shrink-0 text-muted-foreground/60">/</span>
          <span className="truncate font-medium text-foreground">{breadcrumb}</span>
        </nav>
      </div>
      <CommandPaletteHeaderButton shortcutLabel={shortcutLabel} />
    </header>
  )
}

export function AppShell({
  breadcrumb,
  children,
}: {
  breadcrumb: string
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <CommandPaletteProvider>
        <Suspense fallback={null}>
          <AppSidebar />
        </Suspense>
        <SidebarInset>
          <Suspense fallback={<AppShellHeaderFallback breadcrumb={breadcrumb} />}>
            <AppShellHeader breadcrumb={breadcrumb} />
          </Suspense>
          <main className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-hidden p-4 md:p-6">
            <ModuleShell>{children}</ModuleShell>
          </main>
        </SidebarInset>
      </CommandPaletteProvider>
    </SidebarProvider>
  )
}

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      </div>
      {action ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>
      ) : null}
    </div>
  )
}

/** Alias for standardized module page headers. */
export const ModulePageHeader = PageHeader
