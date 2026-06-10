"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Download,
  ExternalLink,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"

import {
  addCustomChecklistItem,
  computePhaseProgress,
  computePublishingChecklistProgress,
  formatPublishingChecklistMarkdown,
  generateDefaultPublishingChecklist,
  getQuickActionHref,
  getQuickActionLabel,
  isPublishingChecklistMalformed,
  isReadyToPublishCampaignStatus,
  PUBLISHING_CHECKLIST_PHASES,
  PUBLISHING_CHECKLIST_STATUSES,
  PUBLISHING_PHASE_DESCRIPTIONS,
  removeChecklistItem,
  updateChecklistItem,
  updateChecklistItemStatus,
} from "@/lib/data/publishing-checklist"
import { getQualityReviewsForCampaign } from "@/lib/actions/quality-reviews"
import { buildQualityReviewUrl } from "@/lib/quality-prefill"
import type {
  CampaignFormValues,
  PublishingChecklist,
  PublishingChecklistItemStatus,
  PublishingChecklistPhase,
  QualityReviewRecord,
} from "@/lib/types"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RECENT_RECORDS_CARD_CLASS } from "@/components/module/form-layout"
import { TabRow } from "@/components/ui/tab-row"
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const STATUS_LABELS: Record<PublishingChecklistItemStatus, string> = {
  todo: "To do",
  "in-progress": "In progress",
  done: "Done",
  skipped: "Skipped",
  blocked: "Blocked",
}

function PublishingQualityWarningCard({
  campaignId,
  campaignName,
  campaignStatus,
}: {
  campaignId: string
  campaignName: string
  campaignStatus: string
}) {
  const [reviews, setReviews] = React.useState<QualityReviewRecord[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    void getQualityReviewsForCampaign(campaignId, campaignName)
      .then((rows) => {
        if (!cancelled) setReviews(rows)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [campaignId, campaignName])

  if (loading || !campaignId) return null

  const readinessReviews = reviews.filter(
    (review) => review.reviewType === "Campaign Readiness",
  )
  const latestReadiness = [...readinessReviews].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  )[0]

  const lowScore =
    latestReadiness &&
    latestReadiness.overallScore > 0 &&
    latestReadiness.overallScore < 70

  const missingReadiness =
    isReadyToPublishCampaignStatus(campaignStatus) && !latestReadiness

  if (!lowScore && !missingReadiness) return null

  const qualityHref = lowScore
    ? `/quality?recordId=${encodeURIComponent(latestReadiness.id)}`
    : buildQualityReviewUrl({
        campaignId,
        campaignName,
        reviewType: "Campaign Readiness",
      })

  return (
    <Card
      className={cn(
        "border-border/80",
        lowScore
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-sky-500/30 bg-sky-500/5",
      )}
    >
      <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          {lowScore ? (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" />
          ) : (
            <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          )}
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {lowScore ? "Quality review needs attention" : "No campaign readiness review found"}
            </p>
            <p className="text-sm text-muted-foreground text-pretty">
              {lowScore
                ? `Latest campaign readiness score is ${latestReadiness.overallScore}/100 — below 70. Review recommendations before publishing.`
                : "This campaign is Ready to Publish but has no Campaign Readiness quality review yet."}
            </p>
          </div>
        </div>
        <Link
          href={qualityHref}
          className={buttonVariants({ size: "sm", variant: lowScore ? "default" : "outline" })}
        >
          {lowScore ? "Open Quality Review" : "Create Quality Review"}
        </Link>
      </CardContent>
    </Card>
  )
}

function statusBadgeVariant(
  status: PublishingChecklistItemStatus,
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "done") return "default"
  if (status === "blocked") return "destructive"
  if (status === "in-progress") return "secondary"
  return "outline"
}

export function PublishingChecklistTab({
  campaignId,
  campaignName,
  form,
  checklist,
  onChecklistChange,
  onSave,
  saving,
  malformedRaw,
}: {
  campaignId: string
  campaignName: string
  form: CampaignFormValues
  checklist: PublishingChecklist
  onChecklistChange: (next: PublishingChecklist) => void
  onSave: (checklistOverride?: PublishingChecklist) => Promise<void>
  saving: boolean
  malformedRaw?: boolean
}) {
  const [activePhase, setActivePhase] =
    React.useState<PublishingChecklistPhase>("Pre-Publish")
  const [expandedNotes, setExpandedNotes] = React.useState<Set<string>>(
    () => new Set(),
  )
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [confirmGenerateOpen, setConfirmGenerateOpen] = React.useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = React.useState(false)
  const [customTitle, setCustomTitle] = React.useState("")
  const [customPhase, setCustomPhase] =
    React.useState<PublishingChecklistPhase>("Pre-Publish")
  const [customDueDate, setCustomDueDate] = React.useState("")
  const [customNotes, setCustomNotes] = React.useState("")

  const progress = React.useMemo(
    () => computePublishingChecklistProgress(checklist),
    [checklist],
  )

  const hasItems = checklist.items.length > 0
  const allComplete = hasItems && progress.done === progress.total

  async function persist(next: PublishingChecklist) {
    onChecklistChange(next)
    await onSave(next)
  }

  async function handleGenerateDefaults() {
    const next = generateDefaultPublishingChecklist(form.campaignType)
    onChecklistChange(next)
    await onSave(next)
    setConfirmGenerateOpen(false)
    toast.success("Default publishing checklist generated")
  }

  async function handleReset() {
    const next = { version: 1 as const, items: [] }
    onChecklistChange(next)
    await onSave(next)
    setConfirmResetOpen(false)
    toast.message("Publishing checklist reset")
  }

  async function handleStatusChange(
    itemId: string,
    status: PublishingChecklistItemStatus,
  ) {
    await persist(updateChecklistItemStatus(checklist, itemId, status))
  }

  async function handleItemPatch(
    itemId: string,
    patch: Parameters<typeof updateChecklistItem>[2],
  ) {
    await persist(updateChecklistItem(checklist, itemId, patch))
  }

  async function handleAddCustom() {
    if (!customTitle.trim()) {
      toast.error("Title is required")
      return
    }
    const next = addCustomChecklistItem(checklist, {
      phase: customPhase,
      title: customTitle.trim(),
      status: "todo",
      dueDate: customDueDate,
      completedAt: "",
      notes: customNotes,
    })
    onChecklistChange(next)
    setCustomTitle("")
    setCustomDueDate("")
    setCustomNotes("")
    setAddDialogOpen(false)
    await onSave(next)
    toast.success("Custom checklist item added")
  }

  async function handleExportMarkdown() {
    const markdown = formatPublishingChecklistMarkdown({
      campaignName,
      campaignType: form.campaignType,
      publishingChecklist: checklist,
    })
    const ok = await copyToClipboard(markdown)
    if (ok) toast.success("Checklist markdown copied")
    else toast.error("Could not copy checklist")
  }

  function toggleNotes(itemId: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }


  if (!campaignName.trim()) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No campaign selected"
        description="Open or create a campaign to use Publishing Checklist Mode."
      />
    )
  }

  return (
    <div className="space-y-4">
      {malformedRaw ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">
                Publishing checklist data is malformed. Regenerate to restore a valid checklist.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setConfirmGenerateOpen(true)}
            >
              Regenerate checklist
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <PublishingQualityWarningCard
        campaignId={campaignId}
        campaignName={campaignName}
        campaignStatus={form.status}
      />

      <Card className={RECENT_RECORDS_CARD_CLASS}>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Publishing Checklist</CardTitle>
              <CardDescription>
                Release-day execution workflow for {campaignName}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  hasItems ? setConfirmGenerateOpen(true) : void handleGenerateDefaults()
                }
              >
                <Sparkles className="size-4" />
                Generate default
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasItems}
                onClick={() => setConfirmResetOpen(true)}
              >
                <RotateCcw className="size-4" />
                Reset
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
                <Plus className="size-4" />
                Add item
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasItems}
                onClick={() => void handleExportMarkdown()}
              >
                <Download className="size-4" />
                Export markdown
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasItems ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Progress</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {progress.done}/{progress.total}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Current phase</p>
                  <p className="text-sm font-medium">{progress.currentPhase}</p>
                </div>
                <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Blocked</p>
                  <p className="text-lg font-semibold tabular-nums">{progress.blocked}</p>
                </div>
                <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Next due</p>
                  <p className="text-sm font-medium">
                    {progress.nextDueItem?.title ?? "—"}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{progress.percent}% complete</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
            </>
          ) : null}

          {!hasItems ? (
            <EmptyState
              icon={ClipboardList}
              title="No publishing checklist yet"
              description="Generate a default checklist based on this campaign type."
              primaryActionLabel="Generate default checklist"
              primaryActionOnClick={() => void handleGenerateDefaults()}
            />
          ) : allComplete ? (
            <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <CheckCircle2 className="size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Publishing checklist complete</p>
                <p className="text-xs text-muted-foreground">
                  All release execution items are complete.
                </p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {hasItems ? (
        <Tabs
          value={activePhase}
          onValueChange={(v) => setActivePhase(v as PublishingChecklistPhase)}
          className="w-full gap-4"
        >
          <TabRow>
            {PUBLISHING_CHECKLIST_PHASES.map((phase) => {
              const pp = computePhaseProgress(checklist, phase)
              const incomplete = pp.total > 0 && pp.done < pp.total
              return (
                <TabsTrigger key={phase} value={phase} className="gap-1.5">
                  <span className="truncate">{phase}</span>
                  {pp.total > 0 ? (
                    <Badge
                      variant={incomplete ? "secondary" : "outline"}
                      className="h-5 px-1.5 text-[10px]"
                    >
                      {pp.done}/{pp.total}
                    </Badge>
                  ) : null}
                </TabsTrigger>
              )
            })}
          </TabRow>

          {PUBLISHING_CHECKLIST_PHASES.map((phase) => {
            const phaseItems = checklist.items.filter((item) => item.phase === phase)
            const phaseProgressLocal = computePhaseProgress(checklist, phase)

            return (
            <TabsContent key={phase} value={phase} className="mt-0 space-y-3">
              <p className="text-sm text-muted-foreground">
                {PUBLISHING_PHASE_DESCRIPTIONS[phase]}
              </p>
              <p className="text-xs text-muted-foreground">
                Phase progress: {phaseProgressLocal.done}/{phaseProgressLocal.total}
              </p>

              {phaseItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items in this phase.</p>
              ) : (
                phaseItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "space-y-3 rounded-xl border border-border/80 p-4",
                      item.status === "done" && "bg-muted/20",
                      item.status === "blocked" && "border-destructive/40 bg-destructive/5",
                    )}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{item.title}</p>
                          <Badge variant={statusBadgeVariant(item.status)}>
                            {STATUS_LABELS[item.status]}
                          </Badge>
                          {item.dueDate ? (
                            <span className="text-xs text-muted-foreground">
                              Due {item.dueDate}
                            </span>
                          ) : null}
                        </div>
                        {item.notes.trim() && !expandedNotes.has(item.id) ? (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.notes}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          type="button"
                          size="xs"
                          variant={item.status === "done" ? "default" : "outline"}
                          disabled={saving}
                          onClick={() => void handleStatusChange(item.id, "done")}
                        >
                          Done
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant={item.status === "in-progress" ? "secondary" : "outline"}
                          disabled={saving}
                          onClick={() => void handleStatusChange(item.id, "in-progress")}
                        >
                          In progress
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant={item.status === "blocked" ? "destructive" : "outline"}
                          disabled={saving}
                          onClick={() => void handleStatusChange(item.id, "blocked")}
                        >
                          Blocked
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          disabled={saving}
                          onClick={() => void handleStatusChange(item.id, "skipped")}
                        >
                          Skip
                        </Button>
                        {item.quickAction ? (
                          <Link
                            href={getQuickActionHref(item.quickAction, campaignId)}
                            className={buttonVariants({ variant: "outline", size: "xs" })}
                          >
                            {getQuickActionLabel(item.quickAction)}
                            <ExternalLink className="size-3" />
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => toggleNotes(item.id)}
                      >
                        {expandedNotes.has(item.id) ? "Hide notes" : "Edit notes"}
                      </Button>
                      <Select
                        value={item.status}
                        onValueChange={(v) =>
                          void handleStatusChange(
                            item.id,
                            v as PublishingChecklistItemStatus,
                          )
                        }
                      >
                        <SelectTrigger className="h-7 w-auto min-w-[7rem] text-xs">
                          <span>{STATUS_LABELS[item.status]}</span>
                        </SelectTrigger>
                        <SelectContent>
                          {PUBLISHING_CHECKLIST_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="date"
                        className="h-7 w-auto text-xs"
                        value={item.dueDate}
                        onChange={(e) =>
                          void handleItemPatch(item.id, { dueDate: e.target.value })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="text-destructive"
                        onClick={() =>
                          void persist(removeChecklistItem(checklist, item.id))
                        }
                      >
                        Remove
                      </Button>
                    </div>

                    {expandedNotes.has(item.id) ? (
                      <Textarea
                        rows={2}
                        placeholder="Notes for this checklist item…"
                        value={item.notes}
                        onChange={(e) =>
                          void handleItemPatch(item.id, { notes: e.target.value })
                        }
                      />
                    ) : null}
                  </div>
                ))
              )}
            </TabsContent>
            )
          })}
        </Tabs>
      ) : null}

      {saving ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Saving checklist…
        </div>
      ) : null}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add custom checklist item</DialogTitle>
            <DialogDescription>
              Add a release execution step to the publishing checklist.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label>Phase</Label>
              <Select
                value={customPhase}
                onValueChange={(v) => setCustomPhase(v as PublishingChecklistPhase)}
              >
                <SelectTrigger className="w-full">
                  <span>{customPhase}</span>
                </SelectTrigger>
                <SelectContent>
                  {PUBLISHING_CHECKLIST_PHASES.map((phase) => (
                    <SelectItem key={phase} value={phase}>
                      {phase}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Confirm final title is ready"
              />
            </div>
            <div className="space-y-2">
              <Label>Due date (optional)</Label>
              <Input
                type="date"
                value={customDueDate}
                onChange={(e) => setCustomDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                rows={2}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleAddCustom()}>
              Add item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmGenerateOpen} onOpenChange={setConfirmGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace publishing checklist?</DialogTitle>
            <DialogDescription>
              This will replace your current checklist with defaults for{" "}
              {form.campaignType || "this campaign type"}. Existing items will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmGenerateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleGenerateDefaults()}>
              Replace checklist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset publishing checklist?</DialogTitle>
            <DialogDescription>
              This removes all publishing checklist items. General campaign tasks are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmResetOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleReset()}>
              Reset checklist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { isPublishingChecklistMalformed }
