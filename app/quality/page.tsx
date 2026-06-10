import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { QualityReviewPage } from "@/components/quality/quality-review-page"

export default function QualityRoutePage() {
  return (
    <AppShell breadcrumb="Quality Review">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            Loading quality review…
          </div>
        }
      >
        <QualityReviewPage />
      </Suspense>
    </AppShell>
  )
}
