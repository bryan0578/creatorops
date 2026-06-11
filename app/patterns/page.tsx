import { Suspense } from "react"
import { AppShell } from "@/components/app-shell"
import { PatternDetectionPage } from "@/components/patterns/pattern-detection-page"

export default function PatternsRoutePage() {
  return (
    <AppShell breadcrumb="Pattern Detection">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading Pattern Detection…</p>
        }
      >
        <PatternDetectionPage />
      </Suspense>
    </AppShell>
  )
}
