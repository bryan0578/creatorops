import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { MerchIdeaGenerator } from "@/components/merch/merch-idea-generator"

export default function MerchIdeasPage() {
  return (
    <AppShell breadcrumb="Merch Ideas">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading Merch Ideas...</p>
        }
      >
        <MerchIdeaGenerator />
      </Suspense>
    </AppShell>
  )
}
