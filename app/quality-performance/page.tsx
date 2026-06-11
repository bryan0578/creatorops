import { Suspense } from "react"
import { AppShell } from "@/components/app-shell"
import { QualityPerformancePage } from "@/components/quality-performance/quality-performance-page"

export default function QualityPerformanceRoutePage() {
  return (
    <AppShell breadcrumb="Quality vs Performance">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading Quality vs Performance…</p>
        }
      >
        <QualityPerformancePage />
      </Suspense>
    </AppShell>
  )
}
