import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { TaskCommandCenterPage } from "@/components/tasks/task-command-center-page"

export default function TasksPage() {
  return (
    <AppShell breadcrumb="Tasks">
      <Suspense fallback={null}>
        <TaskCommandCenterPage />
      </Suspense>
    </AppShell>
  )
}
