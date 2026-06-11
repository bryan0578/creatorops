import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { CampaignCopilotPage } from "@/components/campaigns/campaign-copilot-page"

export default function CopilotRoutePage() {
  return (
    <AppShell breadcrumb="Campaign Copilot">
      <Suspense fallback={null}>
        <CampaignCopilotPage />
      </Suspense>
    </AppShell>
  )
}
