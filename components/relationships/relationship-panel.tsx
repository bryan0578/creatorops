"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { linkRecordToCampaign } from "@/lib/campaign-prefill"
import {
  getRelatedRecordsFromStore,
  groupRelatedRecordsByCategory,
  type GetRelatedRecordsInput,
  type RelatedRecordItem,
} from "@/lib/data/related-records"
import { useStore } from "@/lib/store"
import type { CampaignLinkedRecordType } from "@/lib/types"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { LinkedRecordList } from "@/components/relationships/relationship-card"
import { EmptyState } from "@/components/empty-state"
import { RELATIONSHIP_PANEL_EMPTY } from "@/lib/data/relationship-empty-states"

const LINK_TYPE_MAP: Partial<
  Record<GetRelatedRecordsInput["currentType"], CampaignLinkedRecordType>
> = {
  "youtube-packaging": "youtube-package",
  "youtube-thumbnail": "youtube-thumbnail",
  "release-plan": "release-plan",
  "social-repurposing": "social-repurposing",
  "email-campaign": "email-campaign",
  analytics: "analytics",
  "merch-idea": "merch-idea",
  "product-listing": "product-listing",
  "mockup-prompt": "mockup-prompt",
}

export function RelationshipPanel({
  input,
  title = "Related Records",
  description = "Linked campaigns and matching assets across CreatorOps",
  className,
}: {
  input: GetRelatedRecordsInput
  title?: string
  description?: string
  className?: string
}) {
  const store = useStore()
  const [linking, setLinking] = React.useState(false)

  const records = React.useMemo(() => {
    if (!store.hydrated) return []
    return getRelatedRecordsFromStore(store, input)
  }, [store, input, store.hydrated])

  const grouped = React.useMemo(
    () => groupRelatedRecordsByCategory(records),
    [records],
  )

  async function handleLinkToCampaign(_item: RelatedRecordItem) {
    if (!input.campaignId || !input.currentId) return
    const linkType = LINK_TYPE_MAP[input.currentType]
    if (!linkType) return

    const campaign = store.campaigns.find((c) => c.id === input.campaignId)
    if (!campaign) {
      toast.error("Campaign not found")
      return
    }

    setLinking(true)
    try {
      const titleText =
        records.find((r) => r.id === input.currentId)?.title || "Linked record"
      await linkRecordToCampaign(
        store.campaigns,
        store.updateCampaign,
        input.campaignId,
        linkType,
        input.currentId,
        titleText,
        buildRecordHrefForLink(input.currentType, input.currentId),
      )
      toast.success("Linked to campaign")
    } catch {
      toast.error("Could not link to campaign")
    } finally {
      setLinking(false)
    }
  }

  const emptyConfig = RELATIONSHIP_PANEL_EMPTY[input.currentType]

  if (!store.hydrated) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading relationships…
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {grouped.length === 0 ? (
          <EmptyState
            title={emptyConfig?.title ?? "No related records found"}
            description={
              emptyConfig?.description ??
              "Linked campaigns and matching assets across CreatorOps will appear here."
            }
            primaryActionLabel={emptyConfig?.primaryActionLabel}
            primaryActionHref={emptyConfig?.primaryActionHref}
            secondaryActionLabel={emptyConfig?.secondaryActionLabel}
            secondaryActionHref={emptyConfig?.secondaryActionHref}
          />
        ) : (
          grouped.map(({ category, items }) => (
            <section key={category} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium">{category}</h3>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <LinkedRecordList
                items={items}
                campaignId={input.campaignId}
                onLinkToCampaign={input.campaignId ? handleLinkToCampaign : undefined}
                linking={linking}
              />
            </section>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function buildRecordHrefForLink(
  currentType: GetRelatedRecordsInput["currentType"],
  id: string,
): string {
  switch (currentType) {
    case "youtube-packaging":
      return "/youtube-packaging"
    case "youtube-thumbnail":
      return "/youtube-thumbnails"
    case "release-plan":
      return "/release-planner"
    case "social-repurposing":
      return "/social-repurposing"
    case "email-campaign":
      return "/email-campaigns"
    case "analytics":
      return "/analytics"
    case "merch-idea":
      return "/merch-ideas"
    case "product-listing":
      return "/product-listings"
    case "mockup-prompt":
      return "/mockup-prompts"
    default:
      return `/`
  }
}
