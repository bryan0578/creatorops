"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  History,
  Loader2,
  RefreshCw,
  Settings2,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"

import { getAutomationReport } from "@/lib/actions/automation-rules"
import {
  BUILTIN_AUTOMATION_RULES,
  type AutomationCategory,
  type AutomationPriority,
  type AutomationReport,
  type AutomationSuggestion,
} from "@/lib/data/automation-rules"
import { AutomationSuggestionRow } from "@/components/automation/automation-suggestion-row"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const AUTOMATION_TABS = [
  { value: "overview", label: "Overview" },
  { value: "suggestions", label: "Suggestions" },
  { value: "rules", label: "Rules" },
  { value: "applied", label: "Applied Actions" },
  { value: "settings", label: "Settings" },
] as const

interface AppliedActionEntry {
  id: string
  title: string
  message: string
  appliedAt: number
}

function formatScannedAt(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
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

function PriorityBadge({ priority }: { priority: AutomationPriority }) {
  if (priority === "high") return <Badge variant="destructive">High</Badge>
  if (priority === "medium") {
    return (
      <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300">
        Medium
      </Badge>
    )
  }
  if (priority === "low") return <Badge variant="secondary">Low</Badge>
  return <Badge variant="outline">Info</Badge>
}

function SuggestionsFilterBar({
  priority,
  category,
  campaign,
  canApply,
  campaigns,
  onPriorityChange,
  onCategoryChange,
  onCampaignChange,
  onCanApplyChange,
}: {
  priority: string
  category: string
  campaign: string
  canApply: string
  campaigns: string[]
  onPriorityChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onCampaignChange: (value: string) => void
  onCanApplyChange: (value: string) => void
}) {
  const categories: AutomationCategory[] = [
    "Missing Asset",
    "Task Automation",
    "Publishing Checklist",
    "Campaign Stage",
    "Data Health",
    "Experiment",
    "Analytics",
    "Prompt History",
    "Export",
    "Cleanup",
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5">
        <Label>Priority</Label>
        <Select value={priority} onValueChange={onPriorityChange}>
          <SelectTrigger>
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Campaign</Label>
        <Select value={campaign} onValueChange={onCampaignChange}>
          <SelectTrigger>
            <SelectValue placeholder="All campaigns" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All campaigns</SelectItem>
            {campaigns.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Can apply</Label>
        <Select value={canApply} onValueChange={onCanApplyChange}>
          <SelectTrigger>
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Apply actions only</SelectItem>
            <SelectItem value="no">Navigate / info only</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function filterSuggestions(
  suggestions: AutomationSuggestion[],
  filters: {
    priority: string
    category: string
    campaign: string
    canApply: string
  },
): AutomationSuggestion[] {
  return suggestions.filter((suggestion) => {
    if (filters.priority !== "all" && suggestion.priority !== filters.priority) {
      return false
    }
    if (filters.category !== "all" && suggestion.category !== filters.category) {
      return false
    }
    if (
      filters.campaign !== "all" &&
      (suggestion.campaignName ?? "") !== filters.campaign
    ) {
      return false
    }
    if (filters.canApply === "yes" && !suggestion.canApply) return false
    if (filters.canApply === "no" && suggestion.canApply) return false
    return true
  })
}

function ReportContent({
  report,
  onRefresh,
  refreshing,
  onApplied,
  appliedActions,
  initialCampaignId,
}: {
  report: AutomationReport
  onRefresh: () => void
  refreshing: boolean
  onApplied: (entry: AppliedActionEntry) => void
  appliedActions: AppliedActionEntry[]
  initialCampaignId?: string
}) {
  const [priority, setPriority] = React.useState("all")
  const [category, setCategory] = React.useState("all")
  const [campaign, setCampaign] = React.useState("all")
  const [canApply, setCanApply] = React.useState("all")

  React.useEffect(() => {
    if (!initialCampaignId) return
    const match = report.suggestions.find((s) => s.campaignId === initialCampaignId)
    if (match?.campaignName) setCampaign(match.campaignName)
  }, [initialCampaignId, report.suggestions])

  const campaignNames = React.useMemo(() => {
    const names = new Set<string>()
    for (const suggestion of report.suggestions) {
      if (suggestion.campaignName) names.add(suggestion.campaignName)
    }
    return Array.from(names).sort()
  }, [report.suggestions])

  const filtered = React.useMemo(
    () =>
      filterSuggestions(report.suggestions, {
        priority,
        category,
        campaign,
        canApply,
      }),
    [report.suggestions, priority, category, campaign, canApply],
  )

  function handleApplied(suggestion: AutomationSuggestion, message: string) {
    onApplied({
      id: suggestion.id,
      title: suggestion.title,
      message,
      appliedAt: Date.now(),
    })
    onRefresh()
  }

  return (
    <div className="space-y-6">
      {!report.dataHealthOk ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="size-4 text-amber-600" />
              Data Health partial scan
            </CardTitle>
            <CardDescription>
              Automation continued with limited Data Health context.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Bot className="size-4" />
        <span>Last scanned: {formatScannedAt(report.scannedAt)}</span>
        <span>·</span>
        <span>{report.summary.campaignsScanned} campaigns scanned</span>
      </div>

      <ModuleWorkflowTabs defaultTab="overview" tabs={AUTOMATION_TABS}>
        <ModuleTabPanel value="overview">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <SummaryStatCard label="Total suggestions" value={report.summary.totalSuggestions} />
              <SummaryStatCard label="High priority" value={report.summary.highPriority} />
              <SummaryStatCard label="Medium priority" value={report.summary.mediumPriority} />
              <SummaryStatCard label="Low priority" value={report.summary.lowPriority} />
              <SummaryStatCard
                label="Campaigns scanned"
                value={report.summary.campaignsScanned}
              />
            </div>

            {report.suggestions.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Automation looks good"
                description="No missing workflow steps or suggested actions were found."
              />
            ) : (
              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="text-base">Top suggestions</CardTitle>
                  <CardDescription>Highest priority items from the latest scan</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {report.suggestions.slice(0, 8).map((suggestion) => (
                    <AutomationSuggestionRow
                      key={suggestion.id}
                      suggestion={suggestion}
                      onApplied={() =>
                        handleApplied(suggestion, "Action applied successfully.")
                      }
                    />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </ModuleTabPanel>

        <ModuleTabPanel value="suggestions">
          <div className="space-y-4">
            <SuggestionsFilterBar
              priority={priority}
              category={category}
              campaign={campaign}
              canApply={canApply}
              campaigns={campaignNames}
              onPriorityChange={setPriority}
              onCategoryChange={setCategory}
              onCampaignChange={setCampaign}
              onCanApplyChange={setCanApply}
            />

            {filtered.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No suggestions match filters"
                description="Try clearing filters or run a new scan."
              />
            ) : (
              <div className="space-y-2">
                {filtered.map((suggestion) => (
                  <AutomationSuggestionRow
                    key={suggestion.id}
                    suggestion={suggestion}
                    onApplied={() =>
                      handleApplied(suggestion, "Action applied successfully.")
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </ModuleTabPanel>

        <ModuleTabPanel value="rules">
          <Card className="border-border/80">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {BUILTIN_AUTOMATION_RULES.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium">{rule.name}</p>
                          <p className="text-sm text-muted-foreground text-pretty">
                            {rule.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{rule.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={rule.priority} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.enabled ? "secondary" : "outline"}>
                          {rule.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="applied">
          {appliedActions.length === 0 ? (
            <EmptyState
              icon={History}
              title="Applied action history is not stored yet"
              description="Actions you apply during this session will appear here until you refresh the page."
            />
          ) : (
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="text-base">Session applied actions</CardTitle>
                <CardDescription>Actions applied during this browser session</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {appliedActions.map((entry) => (
                  <div
                    key={`${entry.id}-${entry.appliedAt}`}
                    className="rounded-lg border border-border/80 px-3 py-2"
                  >
                    <p className="font-medium">{entry.title}</p>
                    <p className="text-sm text-muted-foreground">{entry.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatScannedAt(entry.appliedAt)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="settings">
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="size-4" />
                Automation settings
              </CardTitle>
              <CardDescription className="text-pretty">
                Automation rules are built-in and only run when you scan or apply
                suggestions. Nothing changes in your workspace until you click Apply
                or Open.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="text-pretty">Future settings (not active yet):</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Auto-create review tasks when a campaign is published</li>
                <li>Auto-suggest stage changes when readiness reaches 100%</li>
                <li>Auto-check Data Health before each automation scan</li>
              </ul>
            </CardContent>
          </Card>
        </ModuleTabPanel>
      </ModuleWorkflowTabs>
    </div>
  )
}

export function AutomationRulesPage() {
  const searchParams = useSearchParams()
  const campaignId = searchParams.get("campaignId") ?? undefined
  const autoScan = searchParams.get("scan") === "1"

  const [report, setReport] = React.useState<AutomationReport | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [appliedActions, setAppliedActions] = React.useState<AppliedActionEntry[]>([])

  const runScan = React.useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      try {
        const next = await getAutomationReport(campaignId ? { campaignId } : undefined)
        setReport(next)
        if (isRefresh) toast.success("Automation scan complete")
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not run automation scan."
        toast.error(message)
        setReport({
          scannedAt: Date.now(),
          summary: {
            totalSuggestions: 1,
            highPriority: 0,
            mediumPriority: 1,
            lowPriority: 0,
            campaignsScanned: 0,
            readyToApply: 0,
            informational: 0,
          },
          suggestions: [
            {
              id: "automation-scan-failed",
              ruleId: "rule-error",
              priority: "medium",
              category: "Cleanup",
              title: "Automation scan could not complete",
              description: message,
              suggestedActionLabel: "Retry scan",
              actionType: "navigate",
              actionPayload: {},
              canApply: false,
              reason: "Scan failed safely.",
            },
          ],
          dataHealthOk: false,
        })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [campaignId],
  )

  React.useEffect(() => {
    void runScan(autoScan)
  }, [runScan, autoScan])

  return (
    <ModuleShell>
      <ModulePageHeader
        title="Automation Rules"
        description="Scan campaigns and workspace data for suggested next actions, missing workflow steps, and safe automations."
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
            Run Scan
          </Button>
        }
      />

      {loading && !report ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-muted/20 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Scanning campaigns and workspace data…
        </div>
      ) : report ? (
        <ReportContent
          report={report}
          onRefresh={() => void runScan(true)}
          refreshing={refreshing}
          onApplied={(entry) => setAppliedActions((prev) => [entry, ...prev])}
          appliedActions={appliedActions}
          initialCampaignId={campaignId}
        />
      ) : null}
    </ModuleShell>
  )
}
