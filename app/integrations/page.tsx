import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { IntegrationsHub } from "@/components/integrations/integrations-hub"

export default function IntegrationsPage() {
  return (
    <AppShell breadcrumb="External Integrations">
      <Suspense fallback={null}>
        <IntegrationsHub />
      </Suspense>
    </AppShell>
  )
}
