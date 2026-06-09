import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { WorkflowRunner } from "@/components/runner/workflow-runner"

export default function WorkflowRunnerPage() {
  return (
    <AppShell breadcrumb="Workflow Runner">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading Workflow Runner…</p>
        }
      >
        <WorkflowRunner />
      </Suspense>
    </AppShell>
  )
}
