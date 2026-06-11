"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Megaphone } from "lucide-react"

import { useStore } from "@/lib/store"
import { buildLaunchDashboardData } from "@/lib/campaign-launch-dashboard"
import { CampaignCopilotCard } from "@/components/campaigns/launch-dashboard/campaign-copilot-card"
import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { buttonVariants } from "@/components/ui/button"

export function CampaignCopilotPage() {
  const searchParams = useSearchParams()
  const { campaigns, hydrated, releasePlans, youtubePackages, youtubeThumbnailRecords, socialRepurposingRecords, merchIdeas, productListings, mockupPromptRecords, emailCampaignRecords, analyticsRecords, artistRecords, runs } =
    useStore()

  const initialId = searchParams.get("campaignId") ?? searchParams.get("recordId") ?? ""
  const [campaignId, setCampaignId] = React.useState(initialId)

  React.useEffect(() => {
    const id = searchParams.get("campaignId") ?? searchParams.get("recordId")
    if (id) setCampaignId(id)
  }, [searchParams])

  const campaign = campaigns.find((item) => item.id === campaignId) ?? null

  const store = React.useMemo(
    () => ({
      releasePlans,
      youtubePackages,
      youtubeThumbnailRecords,
      socialRepurposingRecords,
      merchIdeas,
      productListings,
      mockupPromptRecords,
      emailCampaignRecords,
      analyticsRecords,
      artistRecords,
      workflows: [],
      workflowRuns: [],
      runs,
    }),
    [
      releasePlans,
      youtubePackages,
      youtubeThumbnailRecords,
      socialRepurposingRecords,
      merchIdeas,
      productListings,
      mockupPromptRecords,
      emailCampaignRecords,
      analyticsRecords,
      artistRecords,
      runs,
    ],
  )

  const launchData = React.useMemo(
    () => (campaign ? buildLaunchDashboardData(campaign, store) : null),
    [campaign, store],
  )

  if (!hydrated) {
    return <p className="text-sm text-muted-foreground">Loading campaigns…</p>
  }

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Campaign Copilot"
        description="AI launch strategist for a selected campaign. Choose a campaign, pick a mode, and run Copilot when you're ready."
      />

      <div className="max-w-md space-y-2">
        <label htmlFor="copilot-campaign" className="text-sm font-medium">
          Campaign
        </label>
        <Select value={campaignId || "none"} onValueChange={(v) => setCampaignId(v === "none" ? "" : v)}>
          <SelectTrigger id="copilot-campaign">
            <SelectValue placeholder="Select a campaign" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select a campaign…</SelectItem>
            {campaigns.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.campaignName || "Untitled campaign"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!campaign || !launchData ? (
        <EmptyState
          icon={Megaphone}
          title="Select a campaign"
          description="Choose a saved campaign to analyze with Campaign Copilot, or open Copilot from a campaign Launch Dashboard."
          primaryActionLabel="Open Campaigns"
          primaryActionHref="/campaigns"
        />
      ) : (
        <>
          <CampaignCopilotCard campaign={campaign} launchData={launchData} />
          <Link href={`/campaigns?campaignId=${encodeURIComponent(campaign.id)}`} className={buttonVariants({ variant: "outline" })}>
            Open Launch Dashboard
          </Link>
        </>
      )}
    </div>
  )
}
