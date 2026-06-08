import { Suspense } from "react"
import { AppShell } from "@/components/app-shell"
import { YouTubeThumbnailGenerator } from "@/components/youtube-thumbnails/youtube-thumbnail-generator"

export default function YouTubeThumbnailsPage() {
  return (
    <AppShell breadcrumb="YouTube Thumbnails">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">
            Loading YouTube Thumbnails...
          </p>
        }
      >
        <YouTubeThumbnailGenerator />
      </Suspense>
    </AppShell>
  )
}
