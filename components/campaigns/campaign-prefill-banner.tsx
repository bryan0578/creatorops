import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { getCampaignBackHref } from "@/lib/campaign-prefill"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"

export function CampaignPrefillBanner({
  campaignId,
  campaignName,
}: {
  campaignId: string | null
  campaignName: string | null
}) {
  if (!campaignId) return null

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
      <Badge variant="secondary">Linked campaign</Badge>
      <span className="text-sm text-muted-foreground">
        {campaignName
          ? `Prefilled from campaign: ${campaignName}`
          : "Prefilled from campaign"}
      </span>
      <Link
        href={getCampaignBackHref(campaignId)}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "ml-auto",
        )}
      >
        <ArrowLeft className="size-4" />
        Back to Campaign
      </Link>
    </div>
  )
}
