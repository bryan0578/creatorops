import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { ExperimentTracker } from "@/components/experiments/experiment-tracker"

export default function ExperimentsPage() {
  return (
    <AppShell breadcrumb="Experiments">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading Experiment Tracker…</p>
        }
      >
        <ExperimentTracker />
      </Suspense>
    </AppShell>
  )
}
