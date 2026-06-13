import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { ArtistUniverseDashboardPage } from "@/components/artist-universe/artist-universe-dashboard-page"

export default function ArtistUniverseRoutePage() {
  return (
    <AppShell breadcrumb="Artist Universe">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading Artist Universe dashboard…</p>
        }
      >
        <ArtistUniverseDashboardPage />
      </Suspense>
    </AppShell>
  )
}
