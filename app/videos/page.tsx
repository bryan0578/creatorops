import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { VideoIntelligencePage } from "@/components/videos/video-intelligence-page"

export default function VideosPage() {
  return (
    <AppShell breadcrumb="Video Intelligence">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading Video Intelligence…</p>
        }
      >
        <VideoIntelligencePage />
      </Suspense>
    </AppShell>
  )
}
