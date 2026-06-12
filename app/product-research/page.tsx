import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { ProductResearchPage } from "@/components/commerce/product-research-page"

export default function ProductResearchRoutePage() {
  return (
    <AppShell breadcrumb="Product Research">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading Product Research…</p>
        }
      >
        <ProductResearchPage />
      </Suspense>
    </AppShell>
  )
}
