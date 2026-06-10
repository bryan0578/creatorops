import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { AssetLibrary } from "@/components/assets/asset-library"

export default function AssetsRoutePage() {
  return (
    <AppShell breadcrumb="Asset Library">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            Loading asset library…
          </div>
        }
      >
        <AssetLibrary />
      </Suspense>
    </AppShell>
  )
}
