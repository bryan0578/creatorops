"use client"

import Link from "next/link"
import { ArrowRight, Link2, Megaphone } from "lucide-react"

import type { RelatedRecordItem } from "@/lib/data/related-records"
import { RELATED_TYPE_LABELS } from "@/lib/data/related-records"
import { getCampaignBackHref } from "@/lib/campaign-prefill"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function RelatedRecordBadge({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  return (
    <Badge variant="outline" className={cn("text-[10px]", className)}>
      {label}
    </Badge>
  )
}

export function RelationshipCard({
  item,
  campaignId,
  onLinkToCampaign,
  linking,
}: {
  item: RelatedRecordItem
  campaignId?: string | null
  onLinkToCampaign?: (item: RelatedRecordItem) => void
  linking?: boolean
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/80 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <RelatedRecordBadge label={RELATED_TYPE_LABELS[item.type]} />
          {item.isLinked ? (
            <Badge variant="secondary" className="text-[10px]">
              Linked
            </Badge>
          ) : null}
        </div>
        <p className="truncate text-sm font-medium">{item.title}</p>
        {item.subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
        ) : null}
        <p className="text-[11px] text-muted-foreground">{item.relationshipReason}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5">
        {campaignId && item.type === "campaign" ? (
          <Link
            href={getCampaignBackHref(campaignId)}
            className={buttonVariants({ variant: "outline", size: "sm", className: "h-7 text-xs" })}
          >
            <Megaphone className="size-3.5" />
            Back to Campaign
          </Link>
        ) : null}
        {item.canLinkToCampaign && onLinkToCampaign ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={linking}
            onClick={() => onLinkToCampaign(item)}
          >
            <Link2 className="size-3.5" />
            Link to Campaign
          </Button>
        ) : null}
        <Link
          href={item.href}
          className={buttonVariants({ size: "sm", className: "h-7 text-xs" })}
        >
          Open
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}

export function LinkedRecordList({
  items,
  emptyMessage = "No related records found.",
  campaignId,
  onLinkToCampaign,
  linking,
}: {
  items: RelatedRecordItem[]
  emptyMessage?: string
  campaignId?: string | null
  onLinkToCampaign?: (item: RelatedRecordItem) => void
  linking?: boolean
}) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground text-pretty">{emptyMessage}</p>
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <RelationshipCard
          key={`${item.type}-${item.id}`}
          item={item}
          campaignId={campaignId}
          onLinkToCampaign={onLinkToCampaign}
          linking={linking}
        />
      ))}
    </div>
  )
}
