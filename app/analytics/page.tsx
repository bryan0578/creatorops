import { Suspense } from "react"
import { AppShell } from "@/components/app-shell"
import { AnalyticsTracker } from "@/components/analytics/analytics-tracker"

export default function AnalyticsPage() {
  return (
    <AppShell breadcrumb="Analytics Tracker">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">
            Loading Analytics Tracker...
          </p>
        }
      >
        <AnalyticsTracker />
      </Suspense>
    </AppShell>
  )
}
