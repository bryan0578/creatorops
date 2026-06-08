import type {
  PromptCategory,
  StepRun,
  StepRunStatus,
  WorkflowRun,
  WorkflowRunStatus,
} from "@/lib/types"
import type {
  WorkflowRun as PrismaWorkflowRun,
  WorkflowStepRun as PrismaWorkflowStepRun,
} from "@/lib/generated/prisma/client"

/**
 * Shared workflow-run data layer — maps between app types and Prisma rows.
 * Step runs are stored relationally for ordering and per-step status/notes.
 */

export type WorkflowRunWithSteps = PrismaWorkflowRun & {
  stepRuns: PrismaWorkflowStepRun[]
}

export function normalizeStepRun(
  step: Partial<StepRun> & Pick<StepRun, "id">,
): StepRun {
  return {
    id: step.id,
    workflowStepId: step.workflowStepId ?? "",
    title: step.title ?? "",
    description: step.description ?? "",
    promptId: step.promptId ?? null,
    promptName: step.promptName ?? "",
    status: (step.status ?? "Not started") as StepRunStatus,
    notes: step.notes ?? "",
    completedAt:
      typeof step.completedAt === "number" ? step.completedAt : null,
  }
}

export function normalizeWorkflowRun(
  run: Partial<WorkflowRun> & Pick<WorkflowRun, "id">,
): WorkflowRun {
  const now = Date.now()
  return {
    id: run.id,
    workflowId: run.workflowId ?? "",
    workflowName: run.workflowName ?? "",
    category: (run.category ?? "General") as PromptCategory,
    status: (run.status ?? "Not started") as WorkflowRunStatus,
    stepRuns: (run.stepRuns ?? []).map((step, index) =>
      normalizeStepRun({
        ...step,
        id: step.id || `step-run-${index}`,
      }),
    ),
    notes: run.notes ?? "",
    startedAt: run.startedAt ?? now,
    updatedAt: run.updatedAt ?? now,
    completedAt:
      typeof run.completedAt === "number" ? run.completedAt : null,
  }
}

function toDateOrNull(ts: number | null): Date | null {
  return ts == null ? null : new Date(ts)
}

export function workflowRunToPrismaCreate(run: WorkflowRun) {
  const normalized = normalizeWorkflowRun(run)
  return {
    id: normalized.id,
    workflowId: normalized.workflowId,
    workflowName: normalized.workflowName,
    category: normalized.category,
    status: normalized.status,
    notes: normalized.notes,
    startedAt: new Date(normalized.startedAt),
    updatedAt: new Date(normalized.updatedAt),
    completedAt: toDateOrNull(normalized.completedAt),
  }
}

export function workflowRunToPrismaUpdate(run: WorkflowRun) {
  const normalized = normalizeWorkflowRun(run)
  return {
    workflowId: normalized.workflowId,
    workflowName: normalized.workflowName,
    category: normalized.category,
    status: normalized.status,
    notes: normalized.notes,
    startedAt: new Date(normalized.startedAt),
    updatedAt: new Date(normalized.updatedAt),
    completedAt: toDateOrNull(normalized.completedAt),
  }
}

/** Step rows for nested `stepRuns: { create: [...] }` — omit workflowRunId. */
export function stepRunsToNestedCreate(
  stepRuns: StepRun[],
): {
  id: string
  sortOrder: number
  workflowStepId: string
  title: string
  description: string
  promptId: string | null
  promptName: string
  status: string
  notes: string
  completedAt: Date | null
}[] {
  return normalizeWorkflowRun({ id: "nested", stepRuns }).stepRuns.map(
    (step, index) => ({
      id: step.id,
      sortOrder: index,
      workflowStepId: step.workflowStepId,
      title: step.title,
      description: step.description,
      promptId: step.promptId,
      promptName: step.promptName,
      status: step.status,
      notes: step.notes,
      completedAt: toDateOrNull(step.completedAt),
    }),
  )
}

/** Flat step rows for createMany — includes workflowRunId. */
export function stepRunsToPrismaCreate(
  workflowRunId: string,
  stepRuns: StepRun[],
): {
  id: string
  workflowRunId: string
  sortOrder: number
  workflowStepId: string
  title: string
  description: string
  promptId: string | null
  promptName: string
  status: string
  notes: string
  completedAt: Date | null
}[] {
  return stepRunsToNestedCreate(stepRuns).map((step) => ({
    ...step,
    workflowRunId,
  }))
}

export function prismaWorkflowRunToWorkflowRun(
  row: WorkflowRunWithSteps,
): WorkflowRun {
  const sortedSteps = [...row.stepRuns].sort((a, b) => a.sortOrder - b.sortOrder)
  return normalizeWorkflowRun({
    id: row.id,
    workflowId: row.workflowId,
    workflowName: row.workflowName,
    category: row.category as PromptCategory,
    status: row.status as WorkflowRunStatus,
    notes: row.notes,
    stepRuns: sortedSteps.map((step) => ({
      id: step.id,
      workflowStepId: step.workflowStepId,
      title: step.title,
      description: step.description,
      promptId: step.promptId,
      promptName: step.promptName,
      status: step.status as StepRunStatus,
      notes: step.notes,
      completedAt: step.completedAt?.getTime() ?? null,
    })),
    startedAt: row.startedAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    completedAt: row.completedAt?.getTime() ?? null,
  })
}
