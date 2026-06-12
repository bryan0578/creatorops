import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { LorePage } from "@/components/artist-universe/lore-page"

export default function LoreRoutePage() {
  return (
    <AppShell breadcrumb="Lore Manager">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading Lore Manager…</p>}>
        <LorePage />
      </Suspense>
    </AppShell>
  )
}
