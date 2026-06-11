import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { LearningLibraryPage } from "@/components/learnings/learning-library-page"

export default function LearningsRoutePage() {
  return (
    <AppShell breadcrumb="Learnings">
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading learnings…</div>}>
        <LearningLibraryPage />
      </Suspense>
    </AppShell>
  )
}
