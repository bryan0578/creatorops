import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { OperatingGuidePage } from "@/components/operating-guide/operating-guide-page"

export default function OperatingGuideRoutePage() {
  return (
    <AppShell breadcrumb="Operating Guide">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading Operating Guide…</p>
        }
      >
        <OperatingGuidePage />
      </Suspense>
    </AppShell>
  )
}
