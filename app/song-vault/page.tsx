import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import { SongVaultPage } from "@/components/artist-universe/song-vault-page"

export default function SongVaultRoutePage() {
  return (
    <AppShell breadcrumb="Song Concept Vault">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading Song Vault…</p>}>
        <SongVaultPage />
      </Suspense>
    </AppShell>
  )
}
