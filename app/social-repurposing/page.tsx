import { Suspense } from "react"
import { AppShell } from "@/components/app-shell"
import { SocialRepurposingEngine } from "@/components/social-repurposing/social-repurposing-engine"

export default function SocialRepurposingPage() {
  return (
    <AppShell breadcrumb="Social Repurposing">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">
            Loading Social Repurposing...
          </p>
        }
      >
        <SocialRepurposingEngine />
      </Suspense>
    </AppShell>
  )
}
