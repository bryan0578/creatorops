import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { PresetLibrary } from "@/components/presets/preset-library"

export default function PresetsPage() {
  return (
    <AppShell breadcrumb="Presets">
      <Suspense fallback={null}>
        <PresetLibrary />
      </Suspense>
    </AppShell>
  )
}
