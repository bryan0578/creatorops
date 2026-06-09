"use client"

import * as React from "react"
import {
  AlertTriangle,
  Database,
  Download,
  HardDrive,
  Loader2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import {
  exportFullBackup,
  exportModuleBackup,
  getBackupSummary,
  importFullBackup,
  type BackupModuleSummary,
  type BackupSummary,
  type ImportBackupResult,
} from "@/lib/actions/backups"
import type { BackupDataKey, BackupImportMode } from "@/lib/data/backups"
import { downloadJson } from "@/lib/storage"
import { useStore } from "@/lib/store"
import { ModulePageHeader } from "@/components/app-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DemoTestingSection } from "@/components/backups/demo-testing-section"
import { EmptyState } from "@/components/empty-state"

function formatDate(ts: number | null) {
  if (!ts) return "—"
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  icon: React.ElementType
}) {
  return (
    <Card className="border-border/80">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardDescription>{label}</CardDescription>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground text-pretty">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function BackupCenter() {
  const store = useStore()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [summary, setSummary] = React.useState<BackupSummary | null>(null)
  const [loadingSummary, setLoadingSummary] = React.useState(true)
  const [exportingFull, setExportingFull] = React.useState(false)
  const [exportingModule, setExportingModule] = React.useState<BackupDataKey | null>(
    null,
  )
  const [lastExportedAt, setLastExportedAt] = React.useState<string | null>(null)
  const [importMode, setImportMode] = React.useState<BackupImportMode>("merge")
  const [pendingImport, setPendingImport] = React.useState<unknown | null>(null)
  const [importing, setImporting] = React.useState(false)

  const refreshSummary = React.useCallback(async () => {
    setLoadingSummary(true)
    try {
      const next = await getBackupSummary()
      setSummary(next)
    } catch (error) {
      console.error("[CreatorOps] Failed to load backup summary", error)
      toast.error("Could not load backup summary")
    } finally {
      setLoadingSummary(false)
    }
  }, [])

  React.useEffect(() => {
    void refreshSummary()
  }, [refreshSummary])

  async function reloadAllStoreData() {
    await Promise.all([
      store.reloadPrompts(),
      store.reloadWorkflows(),
      store.reloadRuns(),
      store.reloadWorkflowRuns(),
      store.reloadYouTubePackages(),
      store.reloadYouTubeThumbnailRecords(),
      store.reloadReleasePlans(),
      store.reloadArtistRecords(),
      store.reloadMerchIdeas(),
      store.reloadProductListings(),
      store.reloadSocialRepurposingRecords(),
      store.reloadAnalyticsRecords(),
      store.reloadMockupPromptRecords(),
      store.reloadEmailCampaignRecords(),
      store.reloadCampaigns(),
      store.reloadPresets(),
    ])
  }

  async function handleExportFull() {
    setExportingFull(true)
    try {
      const backup = await exportFullBackup()
      const stamp = new Date().toISOString().slice(0, 10)
      downloadJson(`creatorops-full-backup-${stamp}.json`, backup)
      setLastExportedAt(new Date().toISOString())
      toast.success(
        `Exported full backup (${backup.recordCounts ? Object.values(backup.recordCounts).reduce((a, b) => a + b, 0) : 0} records)`,
      )
    } catch {
      toast.error("Full backup export failed")
    } finally {
      setExportingFull(false)
    }
  }

  async function handleExportModule(module: BackupModuleSummary) {
    setExportingModule(module.key)
    try {
      const items = await exportModuleBackup(module.key)
      downloadJson(module.exportFilename, items)
      setLastExportedAt(new Date().toISOString())
      toast.success(`Exported ${items.length} ${module.label.toLowerCase()}`)
    } catch {
      toast.error(`Could not export ${module.label}`)
    } finally {
      setExportingModule(null)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        setPendingImport(parsed)
      } catch {
        toast.error("Invalid JSON file")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  async function confirmImport() {
    if (!pendingImport) return
    setImporting(true)
    try {
      const result: ImportBackupResult = await importFullBackup(
        pendingImport,
        importMode,
      )
      if (result.success) {
        toast.success(result.message)
        await reloadAllStoreData()
        await refreshSummary()
        setLastExportedAt(null)
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error("Backup import failed")
    } finally {
      setImporting(false)
      setPendingImport(null)
    }
  }

  const modules = summary?.modules ?? []

  return (
    <div className="flex flex-col gap-8">
      <ModulePageHeader
        title="Backup Center"
        description="Export, import, and back up all CreatorOps records stored in your local SQLite database."
        action={
          <Button onClick={handleExportFull} disabled={exportingFull}>
            {exportingFull ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Export Full Backup
          </Button>
        }
      />

      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <p className="text-pretty">
          Backups are local JSON files. Keep copies somewhere safe. Exports include
          app records only — never secrets, <code className="text-xs">.env</code>, or
          the SQLite database file.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <SummaryCard
          label="Total records"
          value={loadingSummary ? "…" : (summary?.totalRecords ?? 0)}
          hint="Across all modules"
          icon={Database}
        />
        <SummaryCard
          label="Modules included"
          value={summary?.modulesIncluded ?? 15}
          hint="Prompts through campaigns"
          icon={HardDrive}
        />
        <SummaryCard
          label="Database"
          value="SQLite"
          hint="Local Prisma database"
          icon={Database}
        />
        <SummaryCard
          label="Last exported"
          value={
            lastExportedAt
              ? formatDate(new Date(lastExportedAt).getTime())
              : "—"
          }
          hint={
            lastExportedAt
              ? "Most recent export in this browser session"
              : "No export yet this session"
          }
          icon={Download}
        />
        <SummaryCard
          label="Backup status"
          value={loadingSummary ? "…" : summary ? "Ready" : "Unavailable"}
          hint="Export and import operations available"
          icon={HardDrive}
        />
      </div>

      <DemoTestingSection onDataChanged={reloadAllStoreData} />

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base">Import backup</CardTitle>
          <CardDescription>
            Restore records from a full CreatorOps backup or compatible module export.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="import-mode">Import mode</Label>
              <Select
                value={importMode}
                onValueChange={(v) => setImportMode(v as BackupImportMode)}
              >
                <SelectTrigger id="import-mode" className="w-full">
                  <span>
                    {importMode === "merge"
                      ? "Add / update records"
                      : "Replace all records"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merge">Add / update records</SelectItem>
                  <SelectItem value="replace">Replace all records</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground text-pretty">
                {importMode === "merge"
                  ? "Upsert by id — existing records not in the backup are kept."
                  : "Deletes all current records, then imports the backup."}
              </p>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4" />
                Choose backup file
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base">Module exports</CardTitle>
          <CardDescription>
            Export individual modules as JSON — compatible with per-module import in each
            tool.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSummary ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading module summary…
            </div>
          ) : summary && summary.totalRecords === 0 ? (
            <EmptyState
              icon={Database}
              title="No records in your database yet"
              description="Create records in any module or seed the PrettyWise demo to explore backups and exports."
              primaryActionLabel="Seed PrettyWise demo"
              primaryActionHref="/backups"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead>Last updated</TableHead>
                  <TableHead className="text-right">Export</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((module) => (
                  <TableRow key={module.key}>
                    <TableCell className="font-medium">{module.label}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {module.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {module.count}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(module.lastUpdated)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={exportingModule === module.key}
                        onClick={() => handleExportModule(module)}
                      >
                        {exportingModule === module.key ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Download className="size-4" />
                        )}
                        JSON
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!pendingImport}
        onOpenChange={(open) => !open && setPendingImport(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import backup?</DialogTitle>
            <DialogDescription>
              {importMode === "merge"
                ? "Records from this file will be added or updated by id. Existing records not in the file will be kept."
                : "This will delete all current CreatorOps records and replace them with the backup. This cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {importMode === "replace" ? (
              <p className="text-sm font-medium text-destructive">
                Replace mode will wipe all existing data before import.
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingImport(null)}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={importMode === "replace" ? "destructive" : "default"}
              onClick={confirmImport}
              disabled={importing}
            >
              {importing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Importing…
                </>
              ) : (
                "Confirm import"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
