import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { ProductListingGenerator } from "@/components/product-listings/product-listing-generator"

export default function ProductListingsPage() {
  return (
    <AppShell breadcrumb="Product Listings">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">
            Loading Product Listings...
          </p>
        }
      >
        <ProductListingGenerator />
      </Suspense>
    </AppShell>
  )
}
