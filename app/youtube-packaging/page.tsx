import { Suspense } from "react"
import { AppShell } from "@/components/app-shell"
import { YouTubePackagingTool } from "@/components/youtube/youtube-packaging-tool"

export default function YouTubePackagingPage() {
  return (
    <AppShell breadcrumb="YouTube Packaging">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">
            Loading YouTube Packaging...
          </p>
        }
      >
        <YouTubePackagingTool />
      </Suspense>
    </AppShell>
  )
}
