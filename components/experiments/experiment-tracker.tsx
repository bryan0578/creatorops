"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  Download,
  FlaskConical,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { duplicateExperiment as duplicateExperimentAction } from "@/lib/actions/experiments"
import { parseCampaignPrefillContext, shouldSkipCampaignUrlPrefill } from "@/lib/campaign-prefill"
import {
  emptyExperimentRecord,
  normalizeExperimentRecord,
  sortExperiments,
} from "@/lib/experiments"
import { parseImportJsonText } from "@/lib/safe-json"
import { downloadJson } from "@/lib/storage"
import { useStore, createId } from "@/lib/store"
import type { ExperimentRecord } from "@/lib/types"
import {
  EXPERIMENT_METRIC_FOCUS,
  EXPERIMENT_STATUSES,
  EXPERIMENT_TYPES,
} from "@/lib/types"

import { ModulePageHeader } from "@/components/app-shell"
import { CreateLearningButton } from "@/components/learnings/learning-action-link"
import { QualityReviewActionLink } from "@/components/quality/quality-review-action"
import { CampaignPrefillBanner } from "@/components/campaigns/campaign-prefill-banner"
import { ExperimentAnalyticsLinkSection } from "@/components/experiments/experiment-analytics-link-section"
import { RelatedPromptRunsPanel } from "@/components/experiments/related-prompt-runs-panel"
import { VariantPerformancePanel } from "@/components/experiments/variant-performance-panel"
import { ApplyWorkspaceDefaultsButton } from "@/components/settings/apply-workspace-defaults-button"
import {
  EXPERIMENT_WORKFLOW_TABS,
  FormGrid,
  FormSection,
  ModuleTabPanel,
  ModuleWorkflowTabs,
  RECENT_RECORDS_CARD_CLASS,
} from "@/components/module/form-layout"
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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useSmartDefaultTab } from "@/hooks/use-smart-default-tab"

type ExperimentFormState = Omit<ExperimentRecord, "id" | "createdAt" | "updatedAt">

const TEXTAREA_FIELDS = new Set([
  "hypothesis",
  "variantA",
  "variantB",
  "variantC",
  "notes",
  "resultSummary",
  "whatWorked",
  "whatDidNotWork",
  "nextTestIdea",
  "relatedAnalyticsNotes",
  "confidenceNotes",
  "learningSummary",
])

const FIELD_LABELS: Record<keyof ExperimentFormState, string> = {
  campaignId: "Campaign ID",
  campaignName: "Campaign name",
  experimentName: "Experiment name",
  experimentType: "Experiment type",
  status: "Status",
  platform: "Platform",
  hypothesis: "Hypothesis",
  variantA: "Variant A",
  variantB: "Variant B",
  variantC: "Variant C",
  winner: "Winner",
  resultSummary: "Result summary",
  metricFocus: "Metric focus",
  startDate: "Start date",
  endDate: "End date",
  notes: "Notes",
  whatWorked: "What worked",
  whatDidNotWork: "What did not work",
  nextTestIdea: "Next test idea",
  relatedAnalyticsNotes: "Related analytics notes",
  variantAMetric: "Variant A metric",
  variantBMetric: "Variant B metric",
  variantCMetric: "Variant C metric",
  analyticsRecordId: "Analytics record ID",
  analyticsRecordName: "Analytics record name",
  confidenceNotes: "Confidence notes",
  learningSummary: "Learning summary",
}

function formFromRecord(record: ExperimentRecord): ExperimentFormState {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = record
  return rest
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function ExperimentTracker() {
  const {
    experiments,
    campaigns,
    addExperiment,
    updateExperiment,
    deleteExperiment,
    importExperiments,
    reloadExperiments,
    hydrated,
  } = useStore()

  const { activeTab, setActiveTab } = useSmartDefaultTab({
    validTabs: ["experiment", "results", "saved"],
    detailsTab: "experiment",
    savedTab: "saved",
    recordsLoaded: hydrated,
    hasRecords: experiments.length > 0,
  })

  const searchParams = useSearchParams()
  const [form, setForm] = React.useState<ExperimentFormState>(
    formFromRecord(emptyExperimentRecord()),
  )
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [recordSearch, setRecordSearch] = React.useState("")
  const [pendingDelete, setPendingDelete] = React.useState<ExperimentRecord | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const prefillApplied = React.useRef(false)
  const [campaignPrefill, setCampaignPrefill] = React.useState(
    parseCampaignPrefillContext(searchParams),
  )

  React.useEffect(() => {
    const recordId = searchParams.get("recordId")?.trim()
    if (!recordId) return
    const record = experiments.find((item) => item.id === recordId)
    if (record) {
      setEditingId(record.id)
      setForm(formFromRecord(record))
    }
  }, [searchParams, experiments])

  React.useEffect(() => {
    if (prefillApplied.current || shouldSkipCampaignUrlPrefill(editingId)) return
    const { campaignId, campaignName } = campaignPrefill
    const experimentType = searchParams.get("experimentType")
    const hypothesis = searchParams.get("hypothesis")
    const notes = searchParams.get("notes")
    const platform = searchParams.get("platform")
    const hasVideoPrefill =
      experimentType || hypothesis || notes || platform || campaignId || campaignName
    if (!hasVideoPrefill) return

    const campaign = campaignId
      ? campaigns.find((item) => item.id === campaignId)
      : campaigns.find(
          (item) =>
            item.campaignName.trim().toLowerCase() ===
            (campaignName ?? "").trim().toLowerCase(),
        )

    setForm((prev) => ({
      ...prev,
      campaignId: campaign?.id ?? campaignId ?? prev.campaignId,
      campaignName: campaign?.campaignName ?? campaignName ?? prev.campaignName,
      experimentType: experimentType ?? prev.experimentType,
      hypothesis: hypothesis ?? prev.hypothesis,
      notes: notes ?? prev.notes,
      platform: platform ?? prev.platform,
    }))
    prefillApplied.current = true
  }, [campaignPrefill, campaigns, editingId, searchParams])

  const filteredRecords = React.useMemo(() => {
    const q = recordSearch.trim().toLowerCase()
    const list = sortExperiments(experiments)
    if (!q) return list
    return list.filter((record) => {
      const haystack = [
        record.experimentName,
        record.experimentType,
        record.campaignName,
        record.platform,
        record.hypothesis,
        record.variantA,
        record.variantB,
        record.variantC,
        record.winner,
        record.resultSummary,
        record.notes,
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [experiments, recordSearch])

  function resetForm() {
    setEditingId(null)
    setForm(formFromRecord(emptyExperimentRecord()))
    prefillApplied.current = false
  }

  async function handleSave() {
    const now = Date.now()
    const record = normalizeExperimentRecord({
      ...form,
      id: editingId ?? createId("experiment"),
      createdAt: editingId
        ? experiments.find((item) => item.id === editingId)?.createdAt ?? now
        : now,
      updatedAt: now,
    })

    if (!record.experimentName.trim()) {
      toast.error("Experiment name is required.")
      return
    }

    try {
      if (editingId) {
        await updateExperiment(record)
        toast.success("Experiment updated.")
      } else {
        await addExperiment(record)
        setEditingId(record.id)
        toast.success("Experiment saved.")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save experiment."
      toast.error(message)
    }
  }

  async function handleDuplicate(record: ExperimentRecord) {
    try {
      const copy = await duplicateExperimentAction(record.id)
      await reloadExperiments()
      setEditingId(copy.id)
      setForm(formFromRecord(copy))
      toast.success("Experiment duplicated.")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not duplicate experiment."
      toast.error(message)
    }
  }

  function openRecord(record: ExperimentRecord) {
    setEditingId(record.id)
    setForm(formFromRecord(record))
  }

  function updateField<K extends keyof ExperimentFormState>(
    key: K,
    value: ExperimentFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function renderField(key: keyof ExperimentFormState) {
    const label = FIELD_LABELS[key]
    const value = form[key]

    if (key === "experimentType") {
      return (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={key}>{label}</Label>
          <Select value={value || ""} onValueChange={(next) => updateField(key, next)}>
            <SelectTrigger id={key} className="w-full">
              <span>{value || "Select type"}</span>
            </SelectTrigger>
            <SelectContent>
              {EXPERIMENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    if (key === "status") {
      return (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={key}>{label}</Label>
          <Select value={value || "Idea"} onValueChange={(next) => updateField(key, next)}>
            <SelectTrigger id={key} className="w-full">
              <span>{value || "Idea"}</span>
            </SelectTrigger>
            <SelectContent>
              {EXPERIMENT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    if (key === "metricFocus") {
      return (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={key}>{label}</Label>
          <Select value={value || ""} onValueChange={(next) => updateField(key, next)}>
            <SelectTrigger id={key} className="w-full">
              <span>{value || "Select metric"}</span>
            </SelectTrigger>
            <SelectContent>
              {EXPERIMENT_METRIC_FOCUS.map((metric) => (
                <SelectItem key={metric} value={metric}>
                  {metric}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    if (key === "campaignName") {
      return (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={key}>{label}</Label>
          <Select
            value={form.campaignId || "none"}
            onValueChange={(next) => {
              if (next === "none") {
                updateField("campaignId", "")
                updateField("campaignName", "")
                return
              }
              const campaign = campaigns.find((item) => item.id === next)
              updateField("campaignId", next)
              updateField("campaignName", campaign?.campaignName ?? "")
            }}
          >
            <SelectTrigger id={key} className="w-full">
              <span>{form.campaignName || "Select campaign"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No campaign</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.campaignName || "Untitled campaign"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    if (TEXTAREA_FIELDS.has(key)) {
      return (
        <div key={key} className="space-y-1.5 md:col-span-2">
          <Label htmlFor={key}>{label}</Label>
          <Textarea
            id={key}
            value={value}
            onChange={(event) => updateField(key, event.target.value)}
            rows={key.startsWith("variant") ? 3 : 4}
          />
        </div>
      )
    }

    return (
      <div key={key} className="space-y-1.5">
        <Label htmlFor={key}>{label}</Label>
        <Input
          id={key}
          value={value}
          onChange={(event) => updateField(key, event.target.value)}
        />
      </div>
    )
  }

  const experimentFields: (keyof ExperimentFormState)[] = [
    "experimentName",
    "experimentType",
    "status",
    "platform",
    "campaignName",
    "hypothesis",
    "metricFocus",
    "startDate",
    "endDate",
    "variantA",
    "variantB",
    "variantC",
    "notes",
  ]

  const resultsFields: (keyof ExperimentFormState)[] = [
    "resultSummary",
    "whatWorked",
    "whatDidNotWork",
    "relatedAnalyticsNotes",
  ]

  const currentExperiment = React.useMemo(() => {
    if (!editingId) return null
    return normalizeExperimentRecord({
      ...form,
      id: editingId,
      createdAt: experiments.find((e) => e.id === editingId)?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    })
  }, [editingId, form, experiments])

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Experiment Tracker"
        description="Track creative variations, hypotheses, winners, and performance learnings across campaigns."
        actions={
          <>
            <Button type="button" size="sm" onClick={resetForm}>
              <Plus className="size-4" />
              New Experiment
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => downloadJson("creatorops-experiments.json", experiments)}
            >
              <Download className="size-4" />
              Export JSON
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              Import JSON
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                event.target.value = ""
                if (!file) return
                try {
                  const text = await file.text()
                  const result = parseImportJsonText(text)
                  if (!result.ok) {
                    toast.error(result.message)
                    return
                  }
                  const parsed = result.value
                  await importExperiments(
                    Array.isArray(parsed)
                      ? parsed.map((item) =>
                          normalizeExperimentRecord(item as ExperimentRecord),
                        )
                      : [normalizeExperimentRecord(parsed as ExperimentRecord)],
                  )
                  toast.success("Experiments imported.")
                } catch {
                  toast.error("Could not import experiments JSON.")
                }
              }}
            />
          </>
        }
      />

      {campaignPrefill.campaignName ? (
        <CampaignPrefillBanner
          campaignName={campaignPrefill.campaignName}
          campaignId={campaignPrefill.campaignId}
          onDismiss={() => setCampaignPrefill({ campaignId: null, campaignName: null })}
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className={RECENT_RECORDS_CARD_CLASS}>
          <CardHeader className="pb-2">
            <CardDescription>Total experiments</CardDescription>
            <CardTitle className="text-2xl">{experiments.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={RECENT_RECORDS_CARD_CLASS}>
          <CardHeader className="pb-2">
            <CardDescription>Running / reviewing</CardDescription>
            <CardTitle className="text-2xl">
              {
                experiments.filter(
                  (item) => item.status === "Running" || item.status === "Reviewing",
                ).length
              }
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className={RECENT_RECORDS_CARD_CLASS}>
          <CardHeader className="pb-2">
            <CardDescription>Winners chosen</CardDescription>
            <CardTitle className="text-2xl">
              {experiments.filter((item) => item.status === "Winner Chosen").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <ModuleWorkflowTabs
        tabs={EXPERIMENT_WORKFLOW_TABS}
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <ModuleTabPanel value="experiment">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Experiment setup</CardTitle>
                <CardDescription>
                  Define the hypothesis, variants, and campaign context for this test.
                </CardDescription>
              </div>
              <ApplyWorkspaceDefaultsButton
                module="experiments"
                form={form}
                setForm={setForm}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              {form.campaignName ? (
                <Badge variant="secondary">
                  Linked to campaign: {form.campaignName}
                </Badge>
              ) : null}
              <FormSection>
                <FormGrid>{experimentFields.map((field) => renderField(field))}</FormGrid>
              </FormSection>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={handleSave}>
                  {editingId ? "Update Experiment" : "Save Experiment"}
                </Button>
                {editingId ? (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    New Experiment
                  </Button>
                ) : null}
                <QualityReviewActionLink
                  recordId={editingId}
                  campaignId={form.campaignId}
                  campaignName={form.campaignName}
                  sourceExperimentId={editingId ?? undefined}
                  reviewType="Experiment Variant"
                  label="Review Experiment Variant"
                  contextTitle={form.experimentName}
                />
                <CreateLearningButton
                  source="experiment"
                  sourceId={editingId}
                  campaignId={form.campaignId}
                  campaignName={form.campaignName}
                  label="Create Learning from Experiment"
                />
              </div>
            </CardContent>
          </Card>
          <ExperimentAnalyticsLinkSection
            experiment={currentExperiment}
            onLinked={(updated) => setForm(formFromRecord(updated))}
          />
        </ModuleTabPanel>

        <ModuleTabPanel value="results">
          <VariantPerformancePanel
            form={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          />
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Results & learnings</CardTitle>
              <CardDescription>
                Capture outcome summary and qualitative notes alongside variant metrics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormSection>
                <FormGrid>{resultsFields.map((field) => renderField(field))}</FormGrid>
              </FormSection>
              <Button type="button" onClick={handleSave}>
                Save Results
              </Button>
            </CardContent>
          </Card>
          <ExperimentAnalyticsLinkSection
            experiment={currentExperiment}
            onLinked={(updated) => setForm(formFromRecord(updated))}
          />
          <RelatedPromptRunsPanel
            experimentId={editingId}
            campaignId={campaignPrefill.campaignId}
          />
        </ModuleTabPanel>

        <ModuleTabPanel value="saved">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Saved Experiments</CardTitle>
                <CardDescription>Search, open, duplicate, or export experiments.</CardDescription>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={recordSearch}
                  onChange={(event) => setRecordSearch(event.target.value)}
                  placeholder="Search experiments…"
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredRecords.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/80 px-4 py-10 text-center text-sm text-muted-foreground">
                  <FlaskConical className="mx-auto mb-2 size-5 opacity-60" />
                  No experiments yet. Create your first experiment to start tracking variants.
                </div>
              ) : (
                filteredRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex flex-col gap-3 rounded-xl border border-border/80 p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{record.experimentName || "Untitled experiment"}</p>
                        {record.experimentType ? (
                          <Badge variant="outline">{record.experimentType}</Badge>
                        ) : null}
                        {record.status ? (
                          <Badge variant="secondary">{record.status}</Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {[record.campaignName, record.platform, record.metricFocus]
                          .filter(Boolean)
                          .join(" · ") || "No campaign context"}
                      </p>
                      {record.winner ? (
                        <p className="text-sm">Winner: {record.winner}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        Updated {formatDate(record.updatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" onClick={() => openRecord(record)}>
                        Open
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleDuplicate(record)}
                      >
                        Duplicate
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          downloadJson(
                            `creatorops-experiment-${record.id}.json`,
                            record,
                          )
                        }
                      >
                        <Download className="size-4" />
                        Export
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setPendingDelete(record)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </ModuleTabPanel>
      </ModuleWorkflowTabs>

      <Dialog open={pendingDelete != null} onOpenChange={() => setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete experiment?</DialogTitle>
            <DialogDescription>
              This removes &quot;{pendingDelete?.experimentName || "this experiment"}&quot; permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                if (!pendingDelete) return
                try {
                  await deleteExperiment(pendingDelete.id)
                  if (editingId === pendingDelete.id) resetForm()
                  toast.success("Experiment deleted.")
                } catch (error) {
                  const message =
                    error instanceof Error ? error.message : "Could not delete experiment."
                  toast.error(message)
                } finally {
                  setPendingDelete(null)
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
