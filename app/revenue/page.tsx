import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { RevenuePage } from "@/components/commerce/revenue-page"

export default function RevenueRoutePage() {
  return (
    <AppShell breadcrumb="Revenue Dashboard">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading Revenue Dashboard…</p>
        }
      >
        <RevenuePage />
      </Suspense>
    </AppShell>
  )
}
