import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { PlaybookBuilder } from "@/components/playbooks/playbook-builder"

export default function PlaybooksRoutePage() {
  return (
    <AppShell breadcrumb="Playbooks">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            Loading playbook builder…
          </div>
        }
      >
        <PlaybookBuilder />
      </Suspense>
    </AppShell>
  )
}
