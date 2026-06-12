import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { AgentsPage } from "@/components/agents/agents-page"

export default function AgentsRoutePage() {
  return (
    <AppShell breadcrumb="Creator AI Agents">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading Creator AI Agents…</p>
        }
      >
        <AgentsPage />
      </Suspense>
    </AppShell>
  )
}
