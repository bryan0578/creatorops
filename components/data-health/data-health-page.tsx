"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"

import { getDataHealthReport, removeBrokenCampaignLink } from "@/lib/actions/data-health"
import {
  filterIssuesByCategory,
  type DataHealthIssue,
  type DataHealthReport,
} from "@/lib/data/data-health"
import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { ModuleShell } from "@/components/module/form-layout"
import { ModuleTabPanel, ModuleWorkflowTabs } from "@/components/module/workflow-tabs"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const DATA_HEALTH_TABS = [
  { value: "overview", label: "Overview" },
  { value: "broken-links", label: "Broken Links" },
  { value: "missing-assets", label: "Missing Assets" },
  { value: "duplicates", label: "Duplicates" },
  { value: "incomplete-records", label: "Incomplete Records" },
  { value: "data-issues", label: "JSON / Data Issues" },
] as const

function formatScannedAt(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function SeverityBadge({ severity }: { severity: DataHealthIssue["severity"] }) {
  if (severity === "critical") {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="size-3" />
        Critical
      </Badge>
    )
  }
  if (severity === "warning") {
    return (
      <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-700 dark:text-amber-300">
        <AlertTriangle className="size-3" />
        Warning
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Info className="size-3" />
      Info
    </Badge>
  )
}

function SummaryStatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint?: string
}) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  )
}

function ScanErrorCard({
  message,
  onRetry,
  retrying,
}: {
  message: string
  onRetry: () => void
  retrying: boolean
}) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="size-4 text-destructive" />
          Data health scan failed
        </CardTitle>
        <CardDescription className="text-pretty">{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="outline" onClick={onRetry} disabled={retrying}>
          {retrying ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Refresh Scan
        </Button>
      </CardContent>
    </Card>
  )
}

function IssueRepairActions({
  issue,
  onRepairComplete,
  repairingId,
  setRepairingId,
}: {
  issue: DataHealthIssue
  onRepairComplete: () => void
  repairingId: string | null
  setRepairingId: (id: string | null) => void
}) {
  const repair = issue.repair
  const isRepairing = repairingId === issue.id

  async function handleRemoveBrokenLink() {
    if (repair?.kind !== "remove-broken-link") return

    setRepairingId(issue.id)
    try {
      const result = await removeBrokenCampaignLink(
        repair.campaignId,
        repair.linkedRecordId,
        repair.linkedRecordType,
      )
      if (!result.ok) {
        toast.error(result.message ?? "Could not remove broken link.")
        return
      }
      toast.success("Broken link removed")
      onRepairComplete()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not remove broken link."
      toast.error(message)
    } finally {
      setRepairingId(null)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" asChild>
        <Link href={issue.href}>
          Open Record
          <ExternalLink className="size-3.5" />
        </Link>
      </Button>
      {repair?.kind === "remove-broken-link" ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isRepairing}
          onClick={() => void handleRemoveBrokenLink()}
        >
          {isRepairing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : null}
          Remove Broken Link
        </Button>
      ) : null}
      {repair?.kind === "create-asset" ? (
        <Button variant="secondary" size="sm" asChild>
          <Link href={repair.href}>{repair.label}</Link>
        </Button>
      ) : null}
      {issue.relatedHref ? (
        <Button variant="ghost" size="sm" asChild>
          <Link href={issue.relatedHref}>Related link</Link>
        </Button>
      ) : null}
    </div>
  )
}

function IssuesTable({
  issues,
  onRepairComplete,
  emptyTitle = "Data health looks good",
  emptyDescription = "No broken links, duplicate records, malformed JSON, or major missing assets were found in this category.",
}: {
  issues: DataHealthIssue[]
  onRepairComplete: () => void
  emptyTitle?: string
  emptyDescription?: string
}) {
  const [repairingId, setRepairingId] = React.useState<string | null>(null)
  if (!issues.length) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  return (
    <Card className="border-border/80">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">Severity</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead className="hidden md:table-cell">Source</TableHead>
              <TableHead className="w-[200px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map((issue) => (
              <TableRow key={issue.id}>
                <TableCell>
                  <SeverityBadge severity={issue.severity} />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">{issue.title}</p>
                    <p className="text-sm text-muted-foreground text-pretty">
                      {issue.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {issue.suggestedAction}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="text-sm">
                    <p>{issue.sourceTitle}</p>
                    <p className="text-xs text-muted-foreground">{issue.sourceType}</p>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <IssueRepairActions
                    issue={issue}
                    onRepairComplete={onRepairComplete}
                    repairingId={repairingId}
                    setRepairingId={setRepairingId}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function ReportContent({
  report,
  onRetry,
  refreshing,
  onRepairComplete,
}: {
  report: DataHealthReport
  onRetry: () => void
  refreshing: boolean
  onRepairComplete: () => void
}) {
  const summary = report.summary
  const noRecords = report.totalRecords === 0
  const isHealthy = summary.totalIssues === 0

  return (
    <div className="space-y-6">
      {report.scanError ? (
        <ScanErrorCard
          message={report.scanError}
          onRetry={onRetry}
          retrying={refreshing}
        />
      ) : null}

      {!report.scanError && noRecords ? (
        <EmptyState
          icon={ShieldCheck}
          title="No records to scan yet"
          description="Create your first campaign or seed PrettyWise demo data to test data health checks."
          primaryActionLabel="Open Backup Center"
          primaryActionHref="/backups"
          secondaryActionLabel="Create Campaign"
          secondaryActionHref="/campaigns"
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4" />
            <span>Last scanned: {formatScannedAt(report.scannedAt)}</span>
            <span>·</span>
            <span>{report.totalRecords} records scanned</span>
          </div>

          <ModuleWorkflowTabs defaultTab="overview" tabs={DATA_HEALTH_TABS}>
            <ModuleTabPanel value="overview">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  <SummaryStatCard label="Total issues" value={summary.totalIssues} />
                  <SummaryStatCard label="Broken links" value={summary.brokenLinks} />
                  <SummaryStatCard label="Missing assets" value={summary.missingAssets} />
                  <SummaryStatCard label="Duplicates" value={summary.duplicates} />
                  <SummaryStatCard
                    label="Incomplete records"
                    value={summary.incompleteRecords}
                  />
                  <SummaryStatCard label="JSON / data issues" value={summary.dataIssues} />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <SummaryStatCard
                    label="Critical"
                    value={summary.critical}
                    hint="Broken links and malformed JSON"
                  />
                  <SummaryStatCard
                    label="Warnings"
                    value={summary.warnings}
                    hint="Missing assets, duplicates, incomplete fields"
                  />
                  <SummaryStatCard
                    label="Info"
                    value={summary.info}
                    hint="Non-critical href mismatches"
                  />
                </div>

                {isHealthy ? (
                  <EmptyState
                    icon={CheckCircle2}
                    title="Data health looks good"
                    description="No broken links, duplicate records, malformed JSON, or major missing assets were found."
                    primaryActionLabel="Open Backup Center"
                    primaryActionHref="/backups"
                  />
                ) : (
                  <IssuesTable
                    issues={report.issues.slice(0, 12)}
                    onRepairComplete={onRepairComplete}
                  />
                )}
              </div>
            </ModuleTabPanel>

            {DATA_HEALTH_TABS.slice(1).map((tab) => (
              <ModuleTabPanel key={tab.value} value={tab.value}>
                <IssuesTable
                  issues={filterIssuesByCategory(report.issues, tab.value)}
                  onRepairComplete={onRepairComplete}
                />
              </ModuleTabPanel>
            ))}
          </ModuleWorkflowTabs>
        </>
      )}
    </div>
  )
}

export function DataHealthPage() {
  const [report, setReport] = React.useState<DataHealthReport | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  const runScan = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const next = await getDataHealthReport()
      setReport(next)
      if (next.scanError) {
        toast.error(next.scanError)
      } else if (isRefresh) {
        toast.success("Data health scan complete")
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not run data health scan."
      toast.error(message)
      setReport({
        scannedAt: Date.now(),
        totalRecords: 0,
        summary: {
          totalIssues: 1,
          critical: 1,
          warnings: 0,
          info: 0,
          brokenLinks: 0,
          missingAssets: 0,
          duplicates: 0,
          incompleteRecords: 0,
          dataIssues: 1,
        },
        issues: [],
        scanError: message,
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    void runScan()
  }, [runScan])

  return (
    <ModuleShell>
      <ModulePageHeader
        title="Data Health"
        description="Read-only scan of broken links, missing assets, duplicates, incomplete records, and JSON issues across your local database."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => void runScan(true)}
            disabled={loading || refreshing}
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Refresh Scan
          </Button>
        }
      />

      {loading && !report ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-muted/20 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Scanning local database…
        </div>
      ) : report ? (
        <ReportContent
          report={report}
          onRetry={() => void runScan(true)}
          refreshing={refreshing}
          onRepairComplete={() => void runScan(true)}
        />
      ) : (
        <ScanErrorCard
          message="The scan did not return a report. Try refreshing."
          onRetry={() => void runScan(true)}
          retrying={refreshing}
        />
      )}
    </ModuleShell>
  )
}
