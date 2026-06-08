import { AppShell } from "@/components/app-shell"
import { ArtistCrm } from "@/components/artist-crm/artist-crm"

export default function ArtistCrmPage() {
  return (
    <AppShell breadcrumb="Artist CRM">
      <ArtistCrm />
    </AppShell>
  )
}
