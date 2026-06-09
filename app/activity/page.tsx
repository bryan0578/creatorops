import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { ActivityPage } from "@/components/activity/activity-page"

export default function ActivityRoutePage() {
  return (
    <AppShell breadcrumb="Recent Activity">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading activity…</p>
        }
      >
        <ActivityPage />
      </Suspense>
    </AppShell>
  )
}
