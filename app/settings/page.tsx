import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { WorkspaceSettingsPage } from "@/components/settings/workspace-settings-page"

export default function SettingsPage() {
  return (
    <AppShell breadcrumb="Settings">
      <Suspense fallback={null}>
        <WorkspaceSettingsPage />
      </Suspense>
    </AppShell>
  )
}
