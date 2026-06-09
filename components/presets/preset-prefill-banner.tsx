"use client"

import { Sparkles } from "lucide-react"

import type { PresetPrefillContext } from "@/lib/preset-prefill"
import { Badge } from "@/components/ui/badge"

export function PresetPrefillBanner({
  presetPrefill,
}: {
  presetPrefill: PresetPrefillContext | null
}) {
  if (!presetPrefill?.presetName) return null

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-sm">
      <Sparkles className="size-4 text-primary" />
      <span className="text-muted-foreground">Prefilled from preset:</span>
      <Badge variant="secondary">{presetPrefill.presetName}</Badge>
    </div>
  )
}
