import { AppShell } from "@/components/app-shell"
import { EmailCampaignGenerator } from "@/components/email-campaigns/email-campaign-generator"

export default function EmailCampaignsPage() {
  return (
    <AppShell breadcrumb="Email Campaigns">
      <EmailCampaignGenerator />
    </AppShell>
  )
}
