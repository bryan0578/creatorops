import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { EmailCampaignGenerator } from "@/components/email-campaigns/email-campaign-generator"

export default function EmailCampaignsPage() {
  return (
    <AppShell breadcrumb="Email Campaigns">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">
            Loading Email Campaigns...
          </p>
        }
      >
        <EmailCampaignGenerator />
      </Suspense>
    </AppShell>
  )
}
