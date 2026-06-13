"use client"

import * as React from "react"
import Link from "next/link"
import { ExternalLink, Link2, Sparkles, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  applyBulkAutoLinkSuggestions,
  createRelatedRecordLink,
  fetchRelatedLinks,
  promoteInferredLink,
  removeRelatedRecordLink,
  reviewAutoLinkSuggestions,
} from "@/lib/related-records/actions"
import type {
  BulkAutoLinkSuggestion,
  CreatorOpsRecordType,
  RelatedLinkDisplay,
  RelatedLinkSuggestion,
  RelatedRecordOption,
} from "@/lib/related-records/types"
import { RECORD_TYPE_LABELS } from "@/lib/related-records/types"
import { RelatedRecordSelector } from "@/components/related-records/related-record-selector"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function linkKey(type: string, id: string): string {
  return `${type}:${id}`
}

function LinkCard({
  item,
  badge,
  subtitle,
  actions,
}: {
  item: RelatedLinkDisplay | RelatedLinkSuggestion
  badge: string
  subtitle?: string
  actions: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/80 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{badge}</Badge>
          {"origin" in item && item.origin === "suggested" ? (
            <Badge variant="outline">Suggested</Badge>
          ) : null}
          {"origin" in item && item.origin === "inferred" ? (
            <Badge variant="outline">Inferred</Badge>
          ) : null}
          {item.relationshipType ? (
            <Badge variant="outline" className="text-[10px]">
              {item.relationshipType}
            </Badge>
          ) : null}
        </div>
        <p className="font-medium text-pretty">{item.title}</p>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        {item.subtitle ? <p className="text-xs text-muted-foreground">{item.subtitle}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href={item.href}>
            Open
            <ExternalLink className="ml-1.5 size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

function BulkAutoLinkReviewDialog({
  open,
  onClose,
  onComplete,
}: {
  open: boolean
  onClose: () => void
  onComplete?: () => void
}) {
  const [items, setItems] = React.useState<BulkAutoLinkSuggestion[]>([])
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [loading, setLoading] = React.useState(true)
  const [applying, setApplying] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setLoading(true)
    void reviewAutoLinkSuggestions()
      .then((results) => {
        setItems(results)
        setSelected(new Set(results.filter((r) => r.confidence === "high").map((r) => r.id)))
      })
      .finally(() => setLoading(false))
  }, [open])

  async function handleApply() {
    setApplying(true)
    try {
      const picks = items.filter((item) => selected.has(item.id))
      const result = await applyBulkAutoLinkSuggestions(picks)
      toast.success(result.message)
      onComplete?.()
      onClose()
    } finally {
      setApplying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Auto-Link Suggestions</DialogTitle>
          <DialogDescription>
            Select suggestions to apply. High-confidence matches are pre-selected.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground">Scanning assets…</p>
        ) : items.length ? (
          <div className="space-y-2">
            {items.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 p-3"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected.has(item.id)}
                  onChange={(e) => {
                    setSelected((prev) => {
                      const next = new Set(prev)
                      if (e.target.checked) next.add(item.id)
                      else next.delete(item.id)
                      return next
                    })
                  }}
                />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">
                    {item.sourceTitle} → {item.targetTitle}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.reason}</p>
                  <div className="flex gap-2">
                    <Badge variant="outline">{RECORD_TYPE_LABELS[item.targetType]}</Badge>
                    <Badge variant="secondary">{item.confidence}</Badge>
                  </div>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No suggestions found.</p>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={applying || selected.size === 0} onClick={() => void handleApply()}>
            {applying ? "Applying…" : `Apply Selected (${selected.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function RelatedLinksPanel({
  sourceType,
  sourceId,
  artistName,
  songTitle,
  onLinksChanged,
  showBulkActions = false,
}: {
  sourceType: CreatorOpsRecordType
  sourceId: string | null
  artistName?: string
  songTitle?: string
  onLinksChanged?: () => void
  showBulkActions?: boolean
}) {
  const [loading, setLoading] = React.useState(false)
  const [linked, setLinked] = React.useState<RelatedLinkDisplay[]>([])
  const [inferred, setInferred] = React.useState<RelatedLinkDisplay[]>([])
  const [suggested, setSuggested] = React.useState<RelatedLinkSuggestion[]>([])
  const [bulkOpen, setBulkOpen] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!sourceId) {
      setLinked([])
      setInferred([])
      setSuggested([])
      return
    }
    setLoading(true)
    try {
      const bundle = await fetchRelatedLinks(sourceType, sourceId)
      setLinked(bundle.linked)
      setInferred(bundle.inferred)
      setSuggested(bundle.suggested)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load related links.")
    } finally {
      setLoading(false)
    }
  }, [sourceType, sourceId])

  React.useEffect(() => {
    void load()
  }, [load])

  const linkedKeys = React.useMemo(
    () => new Set([...linked, ...inferred].map((item) => linkKey(item.recordType, item.recordId))),
    [linked, inferred],
  )

  async function handleLink(option: RelatedRecordOption) {
    if (!sourceId) return
    const result = await createRelatedRecordLink({
      sourceType,
      sourceId,
      targetType: option.type,
      targetId: option.id,
      label: option.title,
    })
    if (result.success) {
      toast.success(result.message)
      await load()
      onLinksChanged?.()
    } else {
      toast.error(result.message)
    }
  }

  async function handleApplySuggestion(item: RelatedLinkSuggestion) {
    if (!sourceId) return
    const result = await createRelatedRecordLink({
      sourceType,
      sourceId,
      targetType: item.recordType,
      targetId: item.recordId,
      relationshipType: item.relationshipType,
      label: item.title,
    })
    if (result.success) {
      toast.success(result.message)
      await load()
      onLinksChanged?.()
    } else {
      toast.error(result.message)
    }
  }

  async function handlePromoteInferred(item: RelatedLinkDisplay) {
    if (!sourceId) return
    const result = await promoteInferredLink({
      sourceType,
      sourceId,
      targetType: item.recordType,
      targetId: item.recordId,
      relationshipType: item.relationshipType,
    })
    if (result.success) {
      toast.success("Inferred link confirmed.")
      await load()
      onLinksChanged?.()
    } else {
      toast.error(result.message)
    }
  }

  async function handleRemove(item: RelatedLinkDisplay) {
    if (!sourceId) return
    const result = await removeRelatedRecordLink({
      sourceType,
      sourceId,
      linkId: item.origin === "linked" ? item.linkId : undefined,
      targetType: item.recordType,
      targetId: item.recordId,
    })
    if (result.success) {
      toast.success(result.message)
      await load()
      onLinksChanged?.()
    } else {
      toast.error(result.message)
    }
  }

  if (!sourceId) {
    return (
      <EmptyState
        icon={Link2}
        title="Select a record"
        description="Open or create a record to manage related links."
      />
    )
  }

  return (
    <div className="space-y-4">
      {showBulkActions ? (
        <>
          <Button type="button" variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
            Review Auto-Link Suggestions
          </Button>
          <BulkAutoLinkReviewDialog
            open={bulkOpen}
            onClose={() => setBulkOpen(false)}
            onComplete={() => {
              void load()
              onLinksChanged?.()
            }}
          />
        </>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Linked Records</CardTitle>
          <CardDescription>
            Explicit links you created or confirmed. No raw database IDs required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading related links…</p>
          ) : linked.length ? (
            linked.map((item) => (
              <LinkCard
                key={item.linkId}
                item={item}
                badge={RECORD_TYPE_LABELS[item.recordType]}
                actions={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove link"
                    onClick={() => void handleRemove(item)}
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                }
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No linked records yet. Use suggestions or add a related record manually.
            </p>
          )}
        </CardContent>
      </Card>

      {inferred.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inferred links</CardTitle>
            <CardDescription>
              Derived from legacy fields (relatedLoreIds, sourceRecordType, asset notes, etc.).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {inferred.map((item) => (
              <LinkCard
                key={`inferred-${item.linkId}`}
                item={item}
                badge={RECORD_TYPE_LABELS[item.recordType]}
                actions={
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void handlePromoteInferred(item)}
                  >
                    Confirm
                  </Button>
                }
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {suggested.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-amber-500" />
              Suggested links
            </CardTitle>
            <CardDescription>
              Review before applying — based on filename, tags, and artist context.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggested.map((item) => (
              <LinkCard
                key={item.linkId}
                item={item}
                badge={RECORD_TYPE_LABELS[item.recordType]}
                subtitle={item.reason}
                actions={
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleApplySuggestion(item)}
                  >
                    Apply
                  </Button>
                }
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <RelatedRecordSelector
        artistName={artistName}
        songTitle={songTitle}
        selectedIds={linkedKeys}
        onLink={(option) => void handleLink(option)}
      />
    </div>
  )
}
