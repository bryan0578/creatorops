import { Suspense } from "react"
import { AppShell } from "@/components/app-shell"
import { PromptRunner } from "@/components/runner/prompt-runner"

export default function RunnerPage() {
  return (
    <AppShell breadcrumb="Prompt Runner">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading Prompt Runner...</p>
        }
      >
        <PromptRunner />
      </Suspense>
    </AppShell>
  )
}
