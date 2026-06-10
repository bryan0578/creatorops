import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { WorkflowHub } from "@/components/workflows/workflow-hub"

export default function WorkflowsPage() {
  return (
    <AppShell breadcrumb="Workflow Hub">
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading workflow hub…</div>}>
        <WorkflowHub />
      </Suspense>
    </AppShell>
  )
}
