import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { ArtistBiblePage } from "@/components/artist-universe/artist-bible-page"

export default function ArtistBibleRoutePage() {
  return (
    <AppShell breadcrumb="Artist Bible">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading Artist Bible…</p>}>
        <ArtistBiblePage />
      </Suspense>
    </AppShell>
  )
}
