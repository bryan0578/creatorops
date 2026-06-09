"use client"

import Link from "next/link"
import { ExternalLink, Plus, X } from "lucide-react"

import { buildCampaignQuickActionHref } from "@/lib/campaign-prefill"
import {
  CAMPAIGN_LINK_TYPE_GROUPS,
  groupCampaignLinkedRecords,
} from "@/lib/data/related-records"
import { CAMPAIGN_LINK_GROUP_EMPTY } from "@/lib/data/relationship-empty-states"
import { CAMPAIGN_LINK_TYPE_LABELS } from "@/lib/campaigns"
import type { CampaignFormValues, CampaignLinkedRecord } from "@/lib/types"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"

function groupActionHref(
  groupId: string,
  form: CampaignFormValues,
  campaignId: string,
): string | undefined {
  const group = CAMPAIGN_LINK_TYPE_GROUPS.find((g) => g.id === groupId)
  if (!group?.quickActionModule) {
    return groupId === "operations" ? "/workflow-runner" : undefined
  }
  if (groupId === "operations") {
    return "/workflow-runner"
  }
  return buildCampaignQuickActionHref(
    group.quickActionModule as Parameters<typeof buildCampaignQuickActionHref>[0],
    form,
    campaignId,
  )
}

export function CampaignLinkedRecordsGroups({
  linkedRecords,
  campaignId,
  form,
  onRemove,
}: {
  linkedRecords: CampaignLinkedRecord[]
  campaignId: string
  form: CampaignFormValues
  onRemove: (id: string, type: CampaignLinkedRecord["type"]) => void
}) {
  const grouped = groupCampaignLinkedRecords(linkedRecords)

  if (linkedRecords.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="No linked records yet"
          description="Connect release plans, YouTube assets, merch, marketing, analytics, and artist records to this campaign."
          primaryActionLabel="Create Release Plan"
          primaryActionHref={groupActionHref("planning", form, campaignId)}
          secondaryActionLabel="Seed PrettyWise demo"
          secondaryActionHref="/backups"
        />
        {CAMPAIGN_LINK_TYPE_GROUPS.map((group) => {
          const copy = CAMPAIGN_LINK_GROUP_EMPTY[group.id]
          const href = groupActionHref(group.id, form, campaignId)
          return (
            <EmptyState
              key={group.id}
              className="text-left sm:text-left"
              title={copy?.title ?? `No ${group.label.toLowerCase()} links yet`}
              description={copy?.description}
              primaryActionLabel={copy?.actionLabel}
              primaryActionHref={href}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {grouped.map(({ group, records }) => {
        const copy = CAMPAIGN_LINK_GROUP_EMPTY[group.id]
        const href = groupActionHref(group.id, form, campaignId)

        return (
          <section key={group.id} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">
                {group.label}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({records.length})
                </span>
              </h3>
              {records.length === 0 && href ? (
                <Link
                  href={href}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  <Plus className="size-4" />
                  Quick create
                </Link>
              ) : null}
            </div>
            {records.length === 0 ? (
              <EmptyState
                className="py-4"
                title={copy?.title ?? `No ${group.label.toLowerCase()} records linked.`}
                description={copy?.description}
                primaryActionLabel={copy?.actionLabel}
                primaryActionHref={href}
              />
            ) : (
              <div className="space-y-2">
                {records.map((record) => (
                  <div
                    key={`${record.type}-${record.id}`}
                    className="flex flex-col gap-2 rounded-lg border border-border/80 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {CAMPAIGN_LINK_TYPE_LABELS[record.type]}
                        </Badge>
                        <span className="truncate text-sm font-medium">{record.title}</span>
                      </div>
                      {record.notes ? (
                        <p className="text-xs text-muted-foreground">{record.notes}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <Link
                        href={
                          record.href.includes("?")
                            ? record.href
                            : `${record.href}?recordId=${encodeURIComponent(record.id)}`
                        }
                        className={buttonVariants({
                          variant: "default",
                          size: "sm",
                          className: "h-7 text-xs",
                        })}
                      >
                        <ExternalLink className="size-3.5" />
                        Open
                      </Link>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onRemove(record.id, record.type)}
                      >
                        <X className="size-3.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
