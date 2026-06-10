import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { AutomationRulesPage } from "@/components/automation/automation-rules-page"

export default function AutomationRoutePage() {
  return (
    <AppShell breadcrumb="Automation">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            Loading automation…
          </div>
        }
      >
        <AutomationRulesPage />
      </Suspense>
    </AppShell>
  )
}
