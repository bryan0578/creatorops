import { AppShell } from "@/components/app-shell"
import { DashboardHome } from "@/components/dashboard/dashboard-home"

export default function Page() {
  return (
    <AppShell breadcrumb="Dashboard">
      <DashboardHome />
    </AppShell>
  )
}
