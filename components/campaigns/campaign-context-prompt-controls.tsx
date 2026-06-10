"use client"

import * as React from "react"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { useCampaignContextPrompt } from "@/hooks/use-campaign-context-prompt"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import type { ModulePromptContextType } from "@/lib/prompt-context-builder"
import type { CampaignRecord } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { OutputSection, PromptPreviewBlock } from "@/components/module/form-layout"
import { Copy } from "lucide-react"

export function useCampaignContextPromptIntegration(input: {
  moduleType: ModulePromptContextType
  basePrompt: string
  campaigns: CampaignRecord[]
  urlCampaignId?: string | null
  urlCampaignName?: string | null
  formCampaignName?: string | null
  relatedCampaignName?: string | null
  artistName?: string | null
  songTitle?: string | null
  productName?: string | null
  niche?: string | null
}) {
  return useCampaignContextPrompt(input)
}

export function CampaignContextPromptButton({
  show,
  loading,
  onBuild,
  className,
}: {
  show: boolean
  loading: boolean
  onBuild: () => void
  className?: string
}) {
  if (!show) return null

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={onBuild}
      disabled={loading}
      className={className}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
      Build Prompt From Campaign Context
    </Button>
  )
}

export function CampaignContextReplaceDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Replace campaign context?</DialogTitle>
          <DialogDescription>
            Campaign context is already in the prompt. Replace it with fresh context from the
            campaign?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            Replace context
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CampaignContextPromptDialog({
  open,
  onOpenChange,
  prompt,
  onInsert,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  prompt: string
  onInsert: () => void
}) {
  async function handleCopy() {
    try {
      await copyToClipboard(prompt)
      toast.success("Copied to clipboard")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not copy")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Campaign context prompt</DialogTitle>
          <DialogDescription>
            Review the built prompt before inserting it into the module.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="min-h-0 flex-1 overflow-hidden px-6 py-0">
          <PromptPreviewBlock value={prompt} emptyMessage="No prompt generated." />
        </DialogBody>
        <DialogFooter className="flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
            Copy Prompt
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onInsert()
              onOpenChange(false)
            }}
          >
            Insert Into Prompt Field
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CampaignPromptOutputSection({
  title = "Completed prompt",
  description,
  emptyMessage,
  basePrompt,
  onCopy,
  contextInput,
}: {
  title?: string
  description?: string
  emptyMessage?: string
  basePrompt: string
  onCopy: (text: string, label: string) => void
  contextInput: {
    moduleType: ModulePromptContextType
    campaigns: CampaignRecord[]
    urlCampaignId?: string | null
    urlCampaignName?: string | null
    formCampaignName?: string | null
    relatedCampaignName?: string | null
    artistName?: string | null
    songTitle?: string | null
    productName?: string | null
    niche?: string | null
  }
}) {
  const {
    displayPrompt,
    showButton,
    loading,
    pendingReplace,
    setPendingReplace,
    applyContext,
  } = useCampaignContextPrompt({
    ...contextInput,
    basePrompt,
  })

  async function handleBuild() {
    await runCampaignContextBuild(applyContext)
  }

  async function handleConfirmReplace() {
    try {
      const result = await applyContext(true)
      if (result.status === "success") {
        toast.success("Campaign context added to prompt.")
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "No campaign context found. Link this record to a campaign first.",
      )
    }
  }

  return (
    <>
      <OutputSection
        title={title}
        description={description}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <CampaignContextPromptButton
              show={showButton}
              loading={loading}
              onBuild={handleBuild}
            />
            <Button
              type="button"
              size="sm"
              disabled={!displayPrompt.trim()}
              onClick={() => onCopy(displayPrompt, "prompt")}
            >
              <Copy className="size-4" />
              Copy prompt
            </Button>
          </div>
        }
      >
        <PromptPreviewBlock value={displayPrompt} emptyMessage={emptyMessage} />
      </OutputSection>

      <CampaignContextReplaceDialog
        open={pendingReplace}
        onOpenChange={setPendingReplace}
        onConfirm={handleConfirmReplace}
      />
    </>
  )
}

export async function runCampaignContextBuild(
  applyContext: (replaceExisting?: boolean) => Promise<
    | { status: "success"; block: string }
    | { status: "confirm-replace" }
  >,
  options?: { hasPromptPreview?: boolean; onNoPreview?: (block: string) => void },
): Promise<void> {
  try {
    const result = await applyContext(false)
    if (result.status === "confirm-replace") return
    toast.success("Campaign context added to prompt.")
    if (!options?.hasPromptPreview && options?.onNoPreview) {
      options.onNoPreview(result.block)
    }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "No campaign context found. Link this record to a campaign first."
    toast.error(message)
  }
}
