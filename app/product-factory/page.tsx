import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { ProductFactoryPage } from "@/components/commerce/product-factory-page"

export default function ProductFactoryRoutePage() {
  return (
    <AppShell breadcrumb="Product Factory">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading Product Factory…</p>
        }
      >
        <ProductFactoryPage />
      </Suspense>
    </AppShell>
  )
}
