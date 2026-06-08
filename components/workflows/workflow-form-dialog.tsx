"use client"

import * as React from "react"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"

import type {
  Prompt,
  Workflow,
  WorkflowStatus,
  WorkflowStep,
  PromptCategory,
} from "@/lib/types"
import { PROMPT_CATEGORIES, WORKFLOW_STATUSES } from "@/lib/types"
import { createId } from "@/lib/store"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"

const PROMPT_SELECT_CONTENT_CLASS = "min-w-[320px]"

function createEmptyStep(): WorkflowStep {
  return {
    id: createId("s"),
    title: "",
    description: "",
    promptId: null,
  }
}

function emptyWorkflow(): Workflow {
  const now = Date.now()
  return {
    id: createId("w"),
    name: "",
    category: "General",
    description: "",
    status: "Draft",
    estimatedTimeSaved: "",
    steps: [],
    notes: "",
    createdAt: now,
    updatedAt: now,
  }
}

function WorkflowStepCard({
  step,
  index,
  totalSteps,
  prompts,
  onUpdate,
  onRemove,
  onMove,
  onAddBelow,
}: {
  step: WorkflowStep
  index: number
  totalSteps: number
  prompts: Prompt[]
  onUpdate: (patch: Partial<WorkflowStep>) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onAddBelow: () => void
}) {
  const getPromptById = (promptId?: string | null) =>
    prompts.find((prompt) => prompt.id === promptId)

  const getPromptNameById = (promptId?: string | null) =>
    getPromptById(promptId)?.name ?? "No linked prompt"

  const promptLabel = step.promptId
    ? getPromptNameById(step.promptId)
    : "No linked prompt"

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
          {index + 1}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label="Move step up"
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            disabled={index === totalSteps - 1}
            onClick={() => onMove(1)}
            aria-label="Move step down"
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7 text-destructive hover:text-destructive"
            onClick={onRemove}
            aria-label="Remove step"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`step-title-${step.id}`}>Step title</Label>
        <Input
          id={`step-title-${step.id}`}
          value={step.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Write track metadata"
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`step-description-${step.id}`}>Step description</Label>
        <Textarea
          id={`step-description-${step.id}`}
          value={step.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="What happens in this step"
          className="min-h-16 w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`step-prompt-${step.id}`}>Prompt reference</Label>
        <Select
          value={step.promptId ?? "none"}
          onValueChange={(value) =>
            onUpdate({ promptId: value === "none" ? null : value })
          }
        >
          <SelectTrigger id={`step-prompt-${step.id}`} className="w-full">
            <span className="truncate">{promptLabel}</span>
          </SelectTrigger>
          <SelectContent className={PROMPT_SELECT_CONTENT_CLASS}>
            <SelectItem value="none">No linked prompt</SelectItem>
            {prompts.map((prompt) => (
              <SelectItem key={prompt.id} value={prompt.id}>
                {prompt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {step.promptId ? (
          <Badge variant="secondary" className="text-xs font-normal">
            Linked prompt: {getPromptNameById(step.promptId)}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-xs font-normal text-muted-foreground"
          >
            No prompt linked
          </Badge>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onAddBelow}>
          Add step below
        </Button>
      </div>
    </div>
  )
}

export function WorkflowFormDialog({
  open,
  onOpenChange,
  initial,
  prompts,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Workflow | null
  prompts: Prompt[]
  onSave: (workflow: Workflow) => void
}) {
  const [draft, setDraft] = React.useState<Workflow>(emptyWorkflow())

  React.useEffect(() => {
    if (!open) return
    setDraft(initial ? { ...initial, steps: [...initial.steps] } : emptyWorkflow())
  }, [open, initial])

  function set<K extends keyof Workflow>(key: K, value: Workflow[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function addStep() {
    setDraft((prev) => ({ ...prev, steps: [...prev.steps, createEmptyStep()] }))
  }

  function addStepAfter(stepId: string) {
    setDraft((prev) => {
      const index = prev.steps.findIndex((s) => s.id === stepId)
      if (index === -1) return prev
      const steps = [...prev.steps]
      steps.splice(index + 1, 0, createEmptyStep())
      return { ...prev, steps }
    })
  }

  function updateStep(id: string, patch: Partial<WorkflowStep>) {
    setDraft((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
  }

  function removeStep(id: string) {
    setDraft((prev) => ({
      ...prev,
      steps: prev.steps.filter((s) => s.id !== id),
    }))
  }

  function moveStep(index: number, dir: -1 | 1) {
    setDraft((prev) => {
      const steps = [...prev.steps]
      const target = index + dir
      if (target < 0 || target >= steps.length) return prev
      ;[steps[index], steps[target]] = [steps[target], steps[index]]
      return { ...prev, steps }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      ...draft,
      name: draft.name.trim() || "Untitled workflow",
      updatedAt: Date.now(),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit workflow" : "New workflow"}</DialogTitle>
          <DialogDescription>
            Define a repeatable process and link each step to a prompt.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <ScrollArea className="max-h-[62vh] pr-4">
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="wf-name">Name</Label>
                  <Input
                    id="wf-name"
                    value={draft.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Full Release Pipeline"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wf-category">Category</Label>
                  <Select
                    value={draft.category}
                    onValueChange={(v) => set("category", v as PromptCategory)}
                  >
                    <SelectTrigger id="wf-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROMPT_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wf-desc">Description</Label>
                <Input
                  id="wf-desc"
                  value={draft.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="What this workflow accomplishes"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="wf-status">Status</Label>
                  <Select
                    value={draft.status}
                    onValueChange={(v) => set("status", v as WorkflowStatus)}
                  >
                    <SelectTrigger id="wf-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKFLOW_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wf-time">Estimated time saved</Label>
                  <Input
                    id="wf-time"
                    value={draft.estimatedTimeSaved}
                    onChange={(e) => set("estimatedTimeSaved", e.target.value)}
                    placeholder="4h / release"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Steps</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addStep}>
                    <Plus className="size-4" />
                    Add step
                  </Button>
                </div>

                {draft.steps.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-md border border-dashed px-3 py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      No steps yet. Add your first step to build the workflow.
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={addStep}>
                      <Plus className="size-4" />
                      Add step
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {draft.steps.map((step, index) => (
                      <WorkflowStepCard
                        key={step.id}
                        step={step}
                        index={index}
                        totalSteps={draft.steps.length}
                        prompts={prompts}
                        onUpdate={(patch) => updateStep(step.id, patch)}
                        onRemove={() => removeStep(step.id)}
                        onMove={(dir) => moveStep(index, dir)}
                        onAddBelow={() => addStepAfter(step.id)}
                      />
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={addStep}
                    >
                      <Plus className="size-4" />
                      Add step
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="wf-notes">Notes</Label>
                <Textarea
                  id="wf-notes"
                  value={draft.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  className="min-h-20"
                  placeholder="Anything to remember about this workflow"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {initial ? "Save changes" : "Create workflow"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
