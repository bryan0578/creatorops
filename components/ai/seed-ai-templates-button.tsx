"use client"

import * as React from "react"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { seedAIGenerationTemplates } from "@/lib/actions/ai-templates"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"

export function SeedAIGenerationTemplatesButton({
  variant = "outline",
  size = "default",
  onSeeded,
}: {
  variant?: "default" | "outline" | "secondary"
  size?: "default" | "sm"
  onSeeded?: () => void | Promise<void>
}) {
  const { reloadPrompts } = useStore()
  const [seeding, setSeeding] = React.useState(false)

  async function handleSeed() {
    setSeeding(true)
    try {
      const result = await seedAIGenerationTemplates()
      await reloadPrompts()
      await onSeeded?.()
      toast.success(
        `AI templates seeded (${result.created} created, ${result.skipped} skipped)`,
      )
    } catch {
      toast.error("Could not seed AI generation templates")
    } finally {
      setSeeding(false)
    }
  }

  return (
    <Button type="button" variant={variant} size={size} disabled={seeding} onClick={() => void handleSeed()}>
      {seeding ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
      Seed AI Templates
    </Button>
  )
}
