import { AppShell } from "@/components/app-shell"
import { ProductListingGenerator } from "@/components/product-listings/product-listing-generator"

export default function ProductListingsPage() {
  return (
    <AppShell breadcrumb="Product Listings">
      <ProductListingGenerator />
    </AppShell>
  )
}
