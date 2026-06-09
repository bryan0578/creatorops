import { AppShell } from "@/components/app-shell"
import { BackupCenter } from "@/components/backups/backup-center"

export default function BackupsPage() {
  return (
    <AppShell breadcrumb="Backup Center">
      <BackupCenter />
    </AppShell>
  )
}
