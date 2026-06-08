import { AppShell } from "@/components/app-shell"
import { WorkflowRunner } from "@/components/runner/workflow-runner"

export default function WorkflowRunnerPage() {
  return (
    <AppShell breadcrumb="Workflow Runner">
      <WorkflowRunner />
    </AppShell>
  )
}
