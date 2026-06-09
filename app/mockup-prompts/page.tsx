import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { MockupPromptGenerator } from "@/components/mockup-prompts/mockup-prompt-generator"

export default function MockupPromptsPage() {
  return (
    <AppShell breadcrumb="Mockup Prompts">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">
            Loading Mockup Prompts...
          </p>
        }
      >
        <MockupPromptGenerator />
      </Suspense>
    </AppShell>
  )
}
