"use client"

import * as React from "react"
import Link from "next/link"
import {
  Copy,
  Database,
  Download,
  ExternalLink,
  Eye,
  ListChecks,
  Play,
  Search,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { migrateLocalWorkflowRunsToDatabase } from "@/lib/actions/workflow-runs"
import { useStore } from "@/lib/store"
import type {
  Prompt,
  StepRunStatus,
  Workflow,
  WorkflowRun,
} from "@/lib/types"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import { downloadJson, loadWorkflowRuns } from "@/lib/storage"
import {
  allStepsFinished,
  computeStepProgress,
  countLinkedPrompts,
  createWorkflowRunFromWorkflow,
  markWorkflowRunComplete,
  updateStepRunNotes,
  updateStepRunStatus,
  updateWorkflowRunNotes,
} from "@/lib/workflow-run-utils"

import { ModulePageHeader } from "@/components/app-shell"
import {
  FormSection,
  PromptPreviewBlock,
  RECENT_RECORDS_CARD_CLASS,
  StickyActionBar,
} from "@/components/module/form-layout"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/workflows/status-badge"
import {
  StepRunStatusBadge,
  WorkflowProgress,
  WorkflowRunStatusBadge,
} from "@/components/runner/step-run-status-badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function WorkflowRunner() {
  const {
    workflows,
    prompts,
    workflowRuns,
    hydrated,
    workflowRunsUseDatabase,
    getPrompt,
    addWorkflowRun,
    updateWorkflowRun,
    deleteWorkflowRun,
    importWorkflowRuns,
    reloadWorkflowRuns,
  } = useStore()

  const [workflowSearch, setWorkflowSearch] = React.useState("")
  const [showAllStatuses, setShowAllStatuses] = React.useState(false)
  const [selectedWorkflowId, setSelectedWorkflowId] = React.useState<
    string | null
  >(null)
  const [activeRun, setActiveRun] = React.useState<WorkflowRun | null>(null)

  const [runSearch, setRunSearch] = React.useState("")
  const [pendingDelete, setPendingDelete] = React.useState<WorkflowRun | null>(
    null,
  )
  const [viewingPrompt, setViewingPrompt] = React.useState<Prompt | null>(null)
  const [migrating, setMigrating] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const selectedWorkflow =
    workflows.find((w) => w.id === selectedWorkflowId) ?? null

  const filteredWorkflows = React.useMemo(() => {
    const q = workflowSearch.trim().toLowerCase()
    return workflows.filter((w) => {
      if (!showAllStatuses && w.status !== "Active") return false
      if (!q) return true
      return (
        w.name.toLowerCase().includes(q) ||
        w.category.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q)
      )
    })
  }, [workflows, workflowSearch, showAllStatuses])

  const filteredRuns = React.useMemo(() => {
    const q = runSearch.trim().toLowerCase()
    const sorted = [...workflowRuns].sort((a, b) => b.updatedAt - a.updatedAt)
    if (!q) return sorted
    return sorted.filter(
      (r) =>
        r.workflowName.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q),
    )
  }, [workflowRuns, runSearch])

  const progress = React.useMemo(
    () => computeStepProgress(activeRun?.stepRuns ?? []),
    [activeRun],
  )

  function selectWorkflow(workflow: Workflow) {
    setSelectedWorkflowId(workflow.id)
    setActiveRun(null)
  }

  async function startNewRun() {
    if (!selectedWorkflow) return
    if (selectedWorkflow.steps.length === 0) {
      toast.error("This workflow has no steps")
      return
    }
    const run = createWorkflowRunFromWorkflow(selectedWorkflow, prompts)
    try {
      await addWorkflowRun(run)
      setActiveRun(run)
      toast.success("Workflow run started")
    } catch {
      toast.error("Could not save workflow run to database")
    }
  }

  async function persistRun(run: WorkflowRun) {
    setActiveRun(run)
    try {
      await updateWorkflowRun(run)
    } catch {
      toast.error("Could not save workflow run to database")
    }
  }

  async function setStepStatus(stepRunId: string, status: StepRunStatus) {
    if (!activeRun) return
    const updated = updateStepRunStatus(activeRun, stepRunId, status)
    await persistRun(updated)
    toast.success(`Step marked ${status.toLowerCase()}`)
  }

  function setStepNotes(stepRunId: string, notes: string) {
    if (!activeRun) return
    void persistRun(updateStepRunNotes(activeRun, stepRunId, notes))
  }

  function handleRunNotesChange(notes: string) {
    if (!activeRun) return
    void persistRun(updateWorkflowRunNotes(activeRun, notes))
  }

  async function handleMarkComplete() {
    if (!activeRun) return
    const updated = markWorkflowRunComplete(activeRun)
    await persistRun(updated)
    toast.success("Workflow run marked complete")
  }

  function openRun(run: WorkflowRun) {
    setSelectedWorkflowId(run.workflowId)
    setActiveRun(run)
    window.scrollTo({ top: 0, behavior: "smooth" })
    toast.success("Workflow run loaded")
  }

  async function handleCopyPrompt(prompt: Prompt) {
    try {
      await copyToClipboard(prompt.promptText)
      toast.success("Copied linked prompt")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not copy")
    }
  }

  async function confirmDeleteRun() {
    if (!pendingDelete) return
    try {
      await deleteWorkflowRun(pendingDelete.id)
      if (activeRun?.id === pendingDelete.id) setActiveRun(null)
      setPendingDelete(null)
      toast.success("Workflow run deleted")
    } catch {
      toast.error("Could not delete workflow run from database")
    }
  }

  function handleExportRuns() {
    downloadJson("creatorops-workflow-runs.json", workflowRuns)
    toast.success("Exported workflow runs")
  }

  function handleImportRuns(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        const items = Array.isArray(parsed) ? parsed : [parsed]
        await importWorkflowRuns(items as WorkflowRun[])
        toast.success(`Imported ${items.length} workflow run(s) to database`)
      } catch {
        toast.error("Invalid JSON file or import failed")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  async function handleMigrateLocal() {
    const local = loadWorkflowRuns()
    if (local.length === 0) {
      toast.error("No workflow runs found in localStorage to migrate")
      return
    }
    setMigrating(true)
    try {
      const { migrated, total } =
        await migrateLocalWorkflowRunsToDatabase(local)
      await reloadWorkflowRuns()
      toast.success(
        `Migrated ${migrated} local workflow run(s). Database now has ${total} total.`,
      )
    } catch {
      toast.error("Migration to database failed")
    } finally {
      setMigrating(false)
    }
  }

  if (hydrated && workflows.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <ModulePageHeader
          title="Workflow Runner"
          description="Run saved workflows step by step, track progress, and link to prompts."
        />
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <ListChecks className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Create your first workflow before using the runner.
          </p>
          <Link
            href="/workflows"
            className={buttonVariants({ variant: "default" })}
          >
            Go to Workflow Hub
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <ModulePageHeader
        title="Workflow Runner"
        description="Select a workflow, run each step in order, and track your progress locally."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="pt-6">
              <FormSection
                title="Select workflow"
                description="Active workflows shown by default"
              >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={workflowSearch}
                  onChange={(e) => setWorkflowSearch(e.target.value)}
                  placeholder="Search workflows..."
                  className="pl-9"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={showAllStatuses ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowAllStatuses((v) => !v)}
                >
                  {showAllStatuses ? "Showing all statuses" : "Active only"}
                </Button>
              </div>

              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-1">
                {filteredWorkflows.length === 0 ? (
                  <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No workflows match your filters.
                  </p>
                ) : (
                  filteredWorkflows.map((workflow) => (
                    <button
                      key={workflow.id}
                      type="button"
                      onClick={() => selectWorkflow(workflow)}
                      className={cn(
                        "flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60",
                        selectedWorkflowId === workflow.id && "bg-muted",
                      )}
                    >
                      <span className="font-medium">{workflow.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {workflow.category} · {workflow.steps.length} steps
                      </span>
                    </button>
                  ))
                )}
              </div>

              {selectedWorkflow ? (
                <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={selectedWorkflow.status} />
                    <Badge variant="secondary">{selectedWorkflow.category}</Badge>
                  </div>
                  <p className="text-sm font-medium">{selectedWorkflow.name}</p>
                  <p className="text-sm text-muted-foreground text-pretty">
                    {selectedWorkflow.description || "No description"}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>{selectedWorkflow.steps.length} steps</span>
                    <span>
                      {countLinkedPrompts(selectedWorkflow)} linked prompts
                    </span>
                    {selectedWorkflow.estimatedTimeSaved ? (
                      <span className="col-span-2">
                        Saves {selectedWorkflow.estimatedTimeSaved}
                      </span>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={startNewRun}
                    disabled={selectedWorkflow.steps.length === 0}
                  >
                    <Play className="size-4" />
                    Start new run
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a workflow to begin.
                </p>
              )}
              </FormSection>
            </CardContent>
          </Card>

          {activeRun ? (
            <Card>
              <CardContent className="pt-6">
                <FormSection
                  title="Run summary"
                  description={activeRun.workflowName}
                >
                <div className="flex flex-wrap items-center gap-2">
                  <WorkflowRunStatusBadge status={activeRun.status} />
                  <Badge variant="secondary">{activeRun.category}</Badge>
                </div>
                <WorkflowProgress {...progress} />
                <p className="text-xs text-muted-foreground">
                  Started {formatDate(activeRun.startedAt)}
                  {activeRun.completedAt
                    ? ` · Completed ${formatDate(activeRun.completedAt)}`
                    : null}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="workflow-run-notes" className="text-sm font-medium">
                    Run notes
                  </Label>
                  <Textarea
                    id="workflow-run-notes"
                    value={activeRun.notes}
                    onChange={(e) => handleRunNotesChange(e.target.value)}
                    placeholder="Notes for this workflow run..."
                    className="min-h-20 w-full"
                  />
                </div>
                </FormSection>
                {allStepsFinished(activeRun.stepRuns) &&
                activeRun.status !== "Complete" ? (
                  <StickyActionBar>
                    <Button
                      type="button"
                      onClick={handleMarkComplete}
                    >
                      Mark workflow run complete
                    </Button>
                  </StickyActionBar>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          {!activeRun ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Start a workflow run to see steps here.
              </CardContent>
            </Card>
          ) : activeRun.stepRuns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                This workflow has no steps. Add steps in Workflow Hub first.
              </CardContent>
            </Card>
          ) : (
            activeRun.stepRuns.map((stepRun, index) => {
              const linked = stepRun.promptId
                ? getPrompt(stepRun.promptId)
                : undefined

              return (
                <Card key={stepRun.id}>
                  <CardHeader className="gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                          {index + 1}
                        </span>
                        <div>
                          <CardTitle className="text-base">
                            {stepRun.title || "Untitled step"}
                          </CardTitle>
                          {stepRun.description ? (
                            <CardDescription className="text-pretty">
                              {stepRun.description}
                            </CardDescription>
                          ) : null}
                        </div>
                      </div>
                      <StepRunStatusBadge status={stepRun.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {stepRun.promptId ? (
                      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                        <span className="text-muted-foreground">
                          Linked prompt:{" "}
                        </span>
                        <span className="font-medium">
                          {stepRun.promptName || "Unknown prompt"}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No linked prompt
                      </p>
                    )}

                    {stepRun.completedAt ? (
                      <p className="text-xs text-muted-foreground">
                        Completed {formatDate(stepRun.completedAt)}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setStepStatus(stepRun.id, "In progress")}
                        disabled={stepRun.status === "In progress"}
                      >
                        In progress
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setStepStatus(stepRun.id, "Complete")}
                      >
                        Complete
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setStepStatus(stepRun.id, "Skipped")}
                      >
                        Skipped
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setStepStatus(stepRun.id, "Not started")}
                      >
                        Reset
                      </Button>
                    </div>

                    {linked ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingPrompt(linked)}
                        >
                          <Eye className="size-4" />
                          View linked prompt
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyPrompt(linked)}
                        >
                          <Copy className="size-4" />
                          Copy linked prompt
                        </Button>
                        <Link
                          href={`/runner?promptId=${linked.id}`}
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                          })}
                        >
                          <ExternalLink className="size-4" />
                          Run linked prompt
                        </Link>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <Label
                        htmlFor={`step-notes-${stepRun.id}`}
                        className="text-sm font-medium"
                      >
                        Step notes
                      </Label>
                      <Textarea
                        id={`step-notes-${stepRun.id}`}
                        value={stepRun.notes}
                        onChange={(e) =>
                          setStepNotes(stepRun.id, e.target.value)
                        }
                        placeholder="Notes for this step..."
                        className="min-h-16 w-full"
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>

      <Card className={RECENT_RECORDS_CARD_CLASS}>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Recent workflow runs</CardTitle>
            <CardDescription>
              Reopen, track, or delete saved workflow runs
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportRuns}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMigrateLocal}
              disabled={migrating}
            >
              <Database className="size-4" />
              {migrating ? "Migrating…" : "Migrate local runs"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              Import
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportRuns}
              disabled={workflowRuns.length === 0}
            >
              <Download className="size-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {workflowRuns.length} saved run
            {workflowRuns.length === 1 ? "" : "s"}
            {workflowRunsUseDatabase
              ? " · stored in SQLite"
              : " · using localStorage fallback"}
          </p>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={runSearch}
              onChange={(e) => setRunSearch(e.target.value)}
              placeholder="Search runs..."
              className="pl-9"
            />
          </div>

          {filteredRuns.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {workflowRuns.length === 0
                ? "No workflow runs yet. Start a run above."
                : "No runs match your search."}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredRuns.map((run) => {
                const runProgress = computeStepProgress(run.stepRuns)
                return (
                  <div
                    key={run.id}
                    className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <button
                      type="button"
                      onClick={() => openRun(run)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{run.workflowName}</p>
                        <Badge variant="secondary">{run.category}</Badge>
                        <WorkflowRunStatusBadge status={run.status} />
                        {activeRun?.id === run.id ? (
                          <Badge variant="outline" className="text-xs">
                            Active
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(run.updatedAt)} · {runProgress.done} of{" "}
                        {runProgress.total} steps ({runProgress.percent}%)
                      </p>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openRun(run)}
                      >
                        Open
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => setPendingDelete(run)}
                        aria-label="Delete run"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View prompt dialog */}
      <Dialog
        open={!!viewingPrompt}
        onOpenChange={(open) => !open && setViewingPrompt(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewingPrompt?.name}</DialogTitle>
            <DialogDescription>
              {viewingPrompt?.category} · Linked prompt
            </DialogDescription>
          </DialogHeader>
          <PromptPreviewBlock
            value={viewingPrompt?.promptText ?? ""}
            emptyMessage="—"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setViewingPrompt(null)}
            >
              Close
            </Button>
            {viewingPrompt ? (
              <Button onClick={() => handleCopyPrompt(viewingPrompt)}>
                <Copy className="size-4" />
                Copy prompt
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete workflow run?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `"${pendingDelete.workflowName}" run from ${formatDate(pendingDelete.startedAt)} will be permanently removed.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteRun}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
