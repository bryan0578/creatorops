"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ExternalLink, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { applyAutomationSuggestion } from "@/lib/actions/automation-rules"
import type { AutomationActionType, AutomationSuggestion } from "@/lib/data/automation-rules"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const MUTATING_ACTIONS: AutomationActionType[] = [
  "generatePublishingChecklist",
  "updateCampaignStatus",
  "addCampaignTasks",
  "addReviewTasks",
]

function PriorityBadge({ priority }: { priority: AutomationSuggestion["priority"] }) {
  if (priority === "high") {
    return <Badge variant="destructive">High</Badge>
  }
  if (priority === "medium") {
    return (
      <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300">
        Medium
      </Badge>
    )
  }
  if (priority === "low") {
    return <Badge variant="secondary">Low</Badge>
  }
  return <Badge variant="outline">Info</Badge>
}

export function AutomationSuggestionRow({
  suggestion,
  onApplied,
  compact = false,
}: {
  suggestion: AutomationSuggestion
  onApplied?: () => void
  compact?: boolean
}) {
  const router = useRouter()
  const [applying, setApplying] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const isNavigate =
    suggestion.actionType === "navigate" ||
    suggestion.actionType === "openDataHealth" ||
    suggestion.actionType === "createMissingAsset"
  const needsConfirm = MUTATING_ACTIONS.includes(suggestion.actionType)

  async function runApply() {
    setApplying(true)
    try {
      const result = await applyAutomationSuggestion({
        suggestionId: suggestion.id,
        actionType: suggestion.actionType,
        actionPayload: suggestion.actionPayload,
      })
      if (!result.success) {
        toast.error(result.message)
        return
      }
      if (result.navigate && result.href) {
        router.push(result.href)
        toast.success(result.message)
      } else {
        toast.success(result.message)
      }
      onApplied?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not apply suggestion."
      toast.error(message)
    } finally {
      setApplying(false)
      setConfirmOpen(false)
    }
  }

  function handleActionClick() {
    if (isNavigate) {
      const href = suggestion.href ?? suggestion.actionPayload.href
      if (href) {
        router.push(href)
        return
      }
    }
    if (needsConfirm) {
      setConfirmOpen(true)
      return
    }
    void runApply()
  }

  const actionLabel = isNavigate ? "Open" : suggestion.suggestedActionLabel

  return (
    <>
      <div
        className={cn(
          "flex flex-col gap-2 rounded-lg border border-border/80 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between",
          compact && "py-2",
        )}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={suggestion.priority} />
            <Badge variant="outline" className="text-[10px]">
              {suggestion.category}
            </Badge>
          </div>
          <p className={cn("font-medium text-pretty", compact ? "text-sm" : "text-base")}>
            {suggestion.title}
          </p>
          {!compact ? (
            <p className="text-sm text-muted-foreground text-pretty">{suggestion.description}</p>
          ) : null}
          {suggestion.campaignName ? (
            <p className="text-xs text-muted-foreground">Campaign: {suggestion.campaignName}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {suggestion.href && isNavigate ? (
            <Link
              href={suggestion.href}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              <ExternalLink className="size-3.5" />
            </Link>
          ) : null}
          {suggestion.canApply ? (
            <Button
              type="button"
              size="sm"
              variant={isNavigate ? "outline" : "default"}
              disabled={applying}
              onClick={handleActionClick}
            >
              {applying ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {actionLabel}
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply automation action?</DialogTitle>
            <DialogDescription className="text-pretty">
              {suggestion.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={applying} onClick={() => void runApply()}>
              {applying ? <Loader2 className="size-4 animate-spin" /> : null}
              {suggestion.suggestedActionLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
