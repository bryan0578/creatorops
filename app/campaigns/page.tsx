import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { CampaignBuilder } from "@/components/campaigns/campaign-builder"

export default function CampaignsPage() {
  return (
    <AppShell breadcrumb="Campaigns">
      <Suspense fallback={null}>
        <CampaignBuilder />
      </Suspense>
    </AppShell>
  )
}
