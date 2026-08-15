import type {
  Prompt,
  StepRun,
  StepRunStatus,
  Workflow,
  WorkflowRun,
  WorkflowRunStatus,
} from "@/lib/types"
import { createId } from "@/lib/storage"

export function getPromptName(
  prompts: Prompt[],
  promptId: string | null,
): string {
  if (!promptId) return ""
  return prompts.find((p) => p.id === promptId)?.name ?? "Unknown prompt"
}

export function countLinkedPrompts(workflow: Workflow): number {
  return workflow.steps.filter((step) => step.promptId).length
}

export function computeStepProgress(stepRuns: StepRun[]): {
  done: number
  total: number
  percent: number
} {
  const total = stepRuns.length
  if (total === 0) return { done: 0, total: 0, percent: 0 }
  const done = stepRuns.filter(
    (step) => step.status === "Complete" || step.status === "Skipped",
  ).length
  return {
    done,
    total,
    percent: Math.round((done / total) * 100),
  }
}

export function allStepsFinished(stepRuns: StepRun[]): boolean {
  if (stepRuns.length === 0) return false
  return stepRuns.every(
    (step) => step.status === "Complete" || step.status === "Skipped",
  )
}

export function deriveWorkflowRunStatus(
  stepRuns: StepRun[],
  current: WorkflowRunStatus,
): WorkflowRunStatus {
  if (current === "Archived" || current === "Complete") return current
  if (stepRuns.length === 0) return "Not started"
  const anyStarted = stepRuns.some((step) => step.status !== "Not started")
  if (!anyStarted) return "Not started"
  return "In progress"
}

export function createWorkflowRunFromWorkflow(
  workflow: Workflow,
  prompts: Prompt[],
): WorkflowRun {
  const now = Date.now()
  return {
    id: createId("wrun"),
    workflowId: workflow.id,
    workflowName: workflow.name,
    category: workflow.category,
    status: workflow.steps.length > 0 ? "In progress" : "Not started",
    stepRuns: workflow.steps.map((step) => ({
      id: createId("sr"),
      workflowStepId: step.id,
      title: step.title,
      description: step.description,
      promptId: step.promptId,
      promptName: getPromptName(prompts, step.promptId),
      status: "Not started" as StepRunStatus,
      notes: "",
      completedAt: null,
    })),
    notes: "",
    startedAt: now,
    updatedAt: now,
    completedAt: null,
  }
}

export function updateStepRunStatus(
  run: WorkflowRun,
  stepRunId: string,
  status: StepRunStatus,
): WorkflowRun {
  const now = Date.now()
  const stepRuns = run.stepRuns.map((step) => {
    if (step.id !== stepRunId) return step
    const completedAt =
      status === "Complete" ? now : status === "Not started" ? null : step.completedAt
    return {
      ...step,
      status,
      completedAt: status === "Complete" ? now : status === "Not started" ? null : completedAt,
    }
  })

  return {
    ...run,
    stepRuns,
    status: deriveWorkflowRunStatus(stepRuns, run.status),
    updatedAt: now,
  }
}

export function updateStepRunNotes(
  run: WorkflowRun,
  stepRunId: string,
  notes: string,
): WorkflowRun {
  return {
    ...run,
    stepRuns: run.stepRuns.map((step) =>
      step.id === stepRunId ? { ...step, notes } : step,
    ),
    updatedAt: Date.now(),
  }
}

export function markWorkflowRunComplete(run: WorkflowRun): WorkflowRun {
  const now = Date.now()
  return {
    ...run,
    status: "Complete",
    completedAt: now,
    updatedAt: now,
  }
}

export function updateWorkflowRunNotes(
  run: WorkflowRun,
  notes: string,
): WorkflowRun {
  return {
    ...run,
    notes,
    updatedAt: Date.now(),
  }
}
