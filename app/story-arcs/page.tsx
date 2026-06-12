import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { StoryArcsPage } from "@/components/artist-universe/story-arcs-page"

export default function StoryArcsRoutePage() {
  return (
    <AppShell breadcrumb="Release Story Arcs">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading Story Arcs…</p>}>
        <StoryArcsPage />
      </Suspense>
    </AppShell>
  )
}
