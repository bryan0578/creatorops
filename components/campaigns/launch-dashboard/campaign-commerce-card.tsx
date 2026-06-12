"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2, ShoppingBag, Sparkles } from "lucide-react"

import { getCampaignCommerceSnapshot } from "@/lib/actions/commerce"
import { agentHref } from "@/lib/agents/routes"
import type { CampaignRecord } from "@/lib/types"
import { RECENT_RECORDS_CARD_CLASS } from "@/components/module/form-layout"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function CampaignCommerceCard({ campaign }: { campaign: CampaignRecord }) {
  const [loading, setLoading] = React.useState(true)
  const [snapshot, setSnapshot] = React.useState<Awaited<
    ReturnType<typeof getCampaignCommerceSnapshot>
  > | null>(null)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    void getCampaignCommerceSnapshot(campaign.id)
      .then((data) => {
        if (!cancelled) setSnapshot(data)
      })
      .catch(() => {
        if (!cancelled) setSnapshot(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [campaign.id])

  const isProductCampaign =
    /merch|product|commerce|digital/i.test(
      `${campaign.campaignType} ${campaign.primaryGoal} ${campaign.productName}`,
    ) || Boolean(snapshot?.isCommerce)

  if (!isProductCampaign && !loading) return null

  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingBag className="size-4 text-primary" />
          Commerce / Product
        </CardTitle>
        <CardDescription>
          Linked collections, listings, mockups, store links, and tracked revenue for this campaign.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading commerce context…
          </div>
        ) : snapshot ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{snapshot.collections.length} collections</Badge>
              <Badge variant="outline">{snapshot.listings.length} listings</Badge>
              <Badge variant="outline">{snapshot.mockups.length} mockups</Badge>
              <Badge variant="outline">{snapshot.storeLinks.length} store links</Badge>
              <Badge variant="secondary">${snapshot.grossRevenue.toFixed(2)} revenue</Badge>
            </div>
            {snapshot.collections[0] ? (
              <p className="text-sm text-muted-foreground">
                Collection: {snapshot.collections[0].name}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No commerce records linked yet.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href="/product-factory" className={buttonVariants({ size: "sm" })}>
            Open Product Factory
          </Link>
          <Link href="/collections" className={buttonVariants({ size: "sm", variant: "outline" })}>
            Open Collection
          </Link>
          <Link href="/revenue" className={buttonVariants({ size: "sm", variant: "outline" })}>
            Open Revenue
          </Link>
          <Link
            href={agentHref("product-strategist", { campaignId: campaign.id })}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            <Sparkles className="size-4" />
            Run Product Strategist
          </Link>
          <Link href="/feedback-loop" className={buttonVariants({ size: "sm", variant: "ghost" })}>
            Create Product Learning
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
