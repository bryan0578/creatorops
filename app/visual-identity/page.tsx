import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { VisualIdentityPage } from "@/components/artist-universe/visual-identity-page"

export default function VisualIdentityRoutePage() {
  return (
    <AppShell breadcrumb="Visual Identity">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading Visual Identity…</p>}>
        <VisualIdentityPage />
      </Suspense>
    </AppShell>
  )
}
