import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { GlobalSearchPage } from "@/components/search/global-search-page"

export default function SearchPage() {
  return (
    <AppShell breadcrumb="Global Search">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading search…</div>}>
        <GlobalSearchPage />
      </Suspense>
    </AppShell>
  )
}
