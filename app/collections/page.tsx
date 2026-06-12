import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { CollectionsPage } from "@/components/commerce/collections-page"

export default function CollectionsRoutePage() {
  return (
    <AppShell breadcrumb="Collections">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading Collections…</p>
        }
      >
        <CollectionsPage />
      </Suspense>
    </AppShell>
  )
}
