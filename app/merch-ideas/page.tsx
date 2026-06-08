import { AppShell } from "@/components/app-shell"
import { MerchIdeaGenerator } from "@/components/merch/merch-idea-generator"

export default function MerchIdeasPage() {
  return (
    <AppShell breadcrumb="Merch Ideas">
      <MerchIdeaGenerator />
    </AppShell>
  )
}
