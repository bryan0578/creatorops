import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { PromptLibrary } from "@/components/prompts/prompt-library"

export default function PromptsPage() {
  return (
    <AppShell breadcrumb="Prompt Library">
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading prompt library…</div>}>
        <PromptLibrary />
      </Suspense>
    </AppShell>
  )
}
