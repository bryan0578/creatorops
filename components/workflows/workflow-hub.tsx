"use client"

import * as React from "react"
import { Download, Plus, Search, Upload } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import type { Workflow, WorkflowStatus, PromptCategory } from "@/lib/types"
import { PROMPT_CATEGORIES, WORKFLOW_STATUSES } from "@/lib/types"
import { downloadJson } from "@/lib/storage"

import { PageHeader } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { WorkflowCard } from "@/components/workflows/workflow-card"
import { WorkflowFormDialog } from "@/components/workflows/workflow-form-dialog"
import { WorkflowDetailPanel } from "@/components/workflows/workflow-detail-panel"

export function WorkflowHub() {
  const {
    workflows,
    prompts,
    hydrated,
    addWorkflow,
    updateWorkflow,
    deleteWorkflow,
    importWorkflows,
  } = useStore()

  const [search, setSearch] = React.useState("")
  const [category, setCategory] = React.useState<"all" | PromptCategory>("all")
  const [status, setStatus] = React.useState<"all" | WorkflowStatus>("all")

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Workflow | null>(null)

  const [detailId, setDetailId] = React.useState<string | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)

  const [pendingDelete, setPendingDelete] = React.useState<Workflow | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const detailWorkflow = workflows.find((w) => w.id === detailId) ?? null

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return workflows.filter((w) => {
      if (category !== "all" && w.category !== category) return false
      if (status !== "all" && w.status !== status) return false
      if (!q) return true
      return (
        w.name.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.steps.some((s) => s.title.toLowerCase().includes(q))
      )
    })
  }, [workflows, search, category, status])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(workflow: Workflow) {
    setEditing(workflow)
    setDetailOpen(false)
    setFormOpen(true)
  }

  function openDetail(workflow: Workflow) {
    setDetailId(workflow.id)
    setDetailOpen(true)
  }

  function handleSave(workflow: Workflow) {
    if (workflows.some((w) => w.id === workflow.id)) {
      updateWorkflow(workflow)
      toast.success("Workflow updated")
    } else {
      addWorkflow(workflow)
      toast.success("Workflow created")
    }
  }

  function confirmDelete() {
    if (!pendingDelete) return
    deleteWorkflow(pendingDelete.id)
    setDetailOpen(false)
    setPendingDelete(null)
    toast.success("Workflow deleted")
  }

  function handleExport() {
    downloadJson("creatorops-workflows.json", workflows)
    toast.success("Exported workflows")
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        const items = Array.isArray(parsed) ? parsed : [parsed]
        importWorkflows(items as Workflow[])
        toast.success(`Imported ${items.length} workflow(s)`)
      } catch {
        toast.error("Invalid JSON file")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Workflow Hub"
        description="Turn your prompts into repeatable, multi-step processes for releases, drops, and label operations."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportFile}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" />
              Import JSON
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="size-4" />
              Export JSON
            </Button>
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              New Workflow
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows..."
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {PROMPT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {WORKFLOW_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} of {workflows.length} workflows
      </p>

      {hydrated && filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {workflows.length === 0
              ? "No workflows yet. Create your first repeatable process."
              : "No workflows match your filters."}
          </p>
          <Button variant="outline" onClick={openCreate}>
            <Plus className="size-4" />
            New Workflow
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onOpen={openDetail}
            />
          ))}
        </div>
      )}

      <WorkflowFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        prompts={prompts}
        onSave={handleSave}
      />

      <WorkflowDetailPanel
        workflow={detailWorkflow}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={openEdit}
        onDelete={(w) => setPendingDelete(w)}
      />

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete workflow?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `"${pendingDelete.name}" and its steps will be permanently removed.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
