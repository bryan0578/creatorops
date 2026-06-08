import { Suspense } from "react"
import { AppShell } from "@/components/app-shell"
import { ReleasePlannerTool } from "@/components/release-planner/release-planner-tool"

export default function ReleasePlannerPage() {
  return (
    <AppShell breadcrumb="Release Planner">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">
            Loading Release Planner...
          </p>
        }
      >
        <ReleasePlannerTool />
      </Suspense>
    </AppShell>
  )
}
