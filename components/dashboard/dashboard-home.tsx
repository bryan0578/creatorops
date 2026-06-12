"use client"

import * as React from "react"
import Link from "next/link"
import { Search } from "lucide-react"

import { useStore } from "@/lib/store"
import { PageHeader } from "@/components/app-shell"
import { ControlCenterContinueWorking } from "@/components/dashboard/control-center-continue-working"
import { ControlCenterNextActions } from "@/components/dashboard/control-center-actions"
import { ControlCenterOperatingGuide } from "@/components/dashboard/control-center-operating-guide"
import { ControlCenterStatusCards } from "@/components/dashboard/control-center-status"
import { DomainTilesGrid } from "@/components/dashboard/domain-tiles"
import { buttonVariants } from "@/components/ui/button"

export function DashboardHome() {
  const { campaignsUseDatabase } = useStore()

  const todayLabel = React.useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [],
  )

  return (
    <div className="flex w-full min-w-0 flex-col gap-8">
      <PageHeader
        title="CreatorOps Control Center"
        description="Your command center for AI music, YouTube, campaigns, products, assets, analytics, and creator operations."
        action={
          <div className="flex flex-col items-end gap-2">
            <p className="text-xs text-muted-foreground">{todayLabel}</p>
            <p className="text-xs text-muted-foreground">
              {campaignsUseDatabase ? "SQLite workspace" : "Local storage"}
            </p>
            <Link href="/search" className={buttonVariants({ variant: "outline" })}>
              <Search className="size-4" />
              Global Search
            </Link>
          </div>
        }
      />

      <ControlCenterStatusCards />

      <ControlCenterOperatingGuide />

      <DomainTilesGrid />

      <ControlCenterContinueWorking />

      <ControlCenterNextActions />
    </div>
  )
}
