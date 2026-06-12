import { Suspense } from "react"
import { AppShell } from "@/components/app-shell"
import { FeedbackLoopPage } from "@/components/feedback-loop/feedback-loop-page"

export default function FeedbackLoopRoutePage() {
  return (
    <AppShell breadcrumb="Learning Feedback Loop">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading Learning Feedback Loop…</p>
        }
      >
        <FeedbackLoopPage />
      </Suspense>
    </AppShell>
  )
}
