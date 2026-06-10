import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { ArtistCrm } from "@/components/artist-crm/artist-crm"

export default function ArtistCrmPage() {
  return (
    <AppShell breadcrumb="Artist CRM">
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading artist CRM…</div>}>
        <ArtistCrm />
      </Suspense>
    </AppShell>
  )
}
