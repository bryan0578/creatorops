import { AppShell } from "@/components/app-shell"
import { WorkflowHub } from "@/components/workflows/workflow-hub"

export default function WorkflowsPage() {
  return (
    <AppShell breadcrumb="Workflow Hub">
      <WorkflowHub />
    </AppShell>
  )
}
