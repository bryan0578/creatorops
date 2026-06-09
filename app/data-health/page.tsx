import { AppShell } from "@/components/app-shell"
import { DataHealthPage } from "@/components/data-health/data-health-page"

export default function DataHealthRoutePage() {
  return (
    <AppShell breadcrumb="Data Health">
      <DataHealthPage />
    </AppShell>
  )
}
