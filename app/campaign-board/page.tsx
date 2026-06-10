import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { CampaignBoardPage } from "@/components/campaigns/campaign-board-page"

export default function CampaignBoardRoutePage() {
  return (
    <AppShell breadcrumb="Campaign Board">
      <Suspense fallback={null}>
        <CampaignBoardPage />
      </Suspense>
    </AppShell>
  )
}
