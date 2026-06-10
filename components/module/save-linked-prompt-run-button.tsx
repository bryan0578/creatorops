"use client"

import * as React from "react"
import { History } from "lucide-react"
import { toast } from "sonner"

import { saveLinkedPromptRun } from "@/lib/actions/linked-prompt-runs"
import {
  canSaveLinkedPromptRun,
  MODULE_TO_OUTPUT_RECORD_TYPE,
  type SaveLinkedPromptRunInput,
} from "@/lib/prompt-run-linking"
import { useStore } from "@/lib/store"
import type { CampaignLinkedRecordType, PromptRunModuleType } from "@/lib/types"
import { Button } from "@/components/ui/button"

export type SaveLinkedPromptRunButtonProps = {
  completedPrompt: string
  aiResponse?: string
  inputValues?: Record<string, string>
  promptId?: string
  promptName?: string
  moduleType: PromptRunModuleType
  campaignId?: string
  campaignName?: string
  outputRecordId?: string
  outputRecordType?: CampaignLinkedRecordType
  experimentId?: string
  notes?: string
  tags?: string[]
  size?: "sm" | "default"
  variant?: "outline" | "secondary" | "default" | "ghost"
  className?: string
}

export function SaveLinkedPromptRunButton({
  completedPrompt,
  aiResponse = "",
  inputValues,
  promptId,
  promptName,
  moduleType,
  campaignId,
  campaignName,
  outputRecordId,
  outputRecordType,
  experimentId,
  notes,
  tags,
  size = "sm",
  variant = "outline",
  className,
}: SaveLinkedPromptRunButtonProps) {
  const { addRun } = useStore()
  const [saving, setSaving] = React.useState(false)

  const canSave = canSaveLinkedPromptRun({ completedPrompt, aiResponse })

  async function handleSave() {
    if (!canSave || saving) return

    const input: SaveLinkedPromptRunInput = {
      completedPrompt,
      aiResponse,
      inputValues,
      promptId,
      promptName,
      moduleType,
      campaignId,
      campaignName,
      outputRecordId,
      outputRecordType:
        outputRecordType ?? MODULE_TO_OUTPUT_RECORD_TYPE[moduleType],
      experimentId,
      notes,
      tags,
      runType: "module",
    }

    setSaving(true)
    try {
      const saved = await saveLinkedPromptRun(input)
      await addRun(saved)
      toast.success("Prompt run saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save prompt run")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      disabled={!canSave || saving}
      onClick={() => void handleSave()}
    >
      <History className="size-4" />
      {saving ? "Saving…" : "Save as Prompt Run"}
    </Button>
  )
}
