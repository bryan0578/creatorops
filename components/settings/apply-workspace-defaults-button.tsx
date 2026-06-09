"use client"

import * as React from "react"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"

import {
  applyWorkspaceDefaults,
  countAppliedEmptyFields,
  type WorkspaceDefaultsModule,
} from "@/lib/apply-workspace-defaults"
import { getWorkspaceSettings } from "@/lib/actions/workspace-settings"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"

export function ApplyWorkspaceDefaultsButton<T extends Record<string, string>>({
  module,
  form,
  setForm,
  variant = "outline",
  size = "sm",
}: {
  module: WorkspaceDefaultsModule
  form: T
  setForm: React.Dispatch<React.SetStateAction<T>>
  variant?: "outline" | "ghost" | "default"
  size?: "sm" | "default"
}) {
  const { workspaceSettings, reloadWorkspaceSettings, setWorkspaceSettings } =
    useStore()
  const [applying, setApplying] = React.useState(false)

  async function handleApply() {
    setApplying(true)
    try {
      let settings = workspaceSettings
      if (!settings) {
        settings = await getWorkspaceSettings()
        setWorkspaceSettings(settings)
      }

      const next = applyWorkspaceDefaults(module, form, settings)
      const applied = countAppliedEmptyFields(form, next)

      if (applied === 0) {
        toast.message("No empty fields to fill — workspace defaults already applied or fields are filled.")
        return
      }

      setForm(next)
      toast.success("Workspace defaults applied.")
    } catch {
      try {
        await reloadWorkspaceSettings()
        toast.error("Could not apply workspace defaults")
      } catch {
        toast.error("Could not load workspace settings")
      }
    } finally {
      setApplying(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={applying}
      onClick={() => void handleApply()}
    >
      <Sparkles className="size-4" />
      Apply Workspace Defaults
    </Button>
  )
}
