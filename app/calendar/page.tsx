import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { CalendarPage } from "@/components/calendar/calendar-page"

export default function CalendarRoutePage() {
  return (
    <AppShell breadcrumb="Calendar">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            Loading calendar…
          </div>
        }
      >
        <CalendarPage />
      </Suspense>
    </AppShell>
  )
}
