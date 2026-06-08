import type {
  PromptCategory,
  Workflow,
  WorkflowStatus,
  WorkflowStep,
} from "@/lib/types"
import type {
  Workflow as PrismaWorkflow,
  WorkflowStep as PrismaWorkflowStep,
} from "@/lib/generated/prisma/client"

/**
 * Shared workflow data layer — maps between app types and Prisma rows.
 * Steps are stored relationally (WorkflowStep table) for ordering and future queries.
 */

export type WorkflowWithSteps = PrismaWorkflow & {
  steps: PrismaWorkflowStep[]
}

/** Step ids are unique per workflow in app types; Prisma PKs must be globally unique. */
function toPrismaStepId(workflowId: string, stepId: string): string {
  return `${workflowId}__${stepId}`
}

function fromPrismaStepId(workflowId: string, prismaStepId: string): string {
  const prefix = `${workflowId}__`
  return prismaStepId.startsWith(prefix)
    ? prismaStepId.slice(prefix.length)
    : prismaStepId
}

export function emptyWorkflowStep(): WorkflowStep {
  return {
    id: "",
    title: "",
    description: "",
    promptId: null,
  }
}

export function normalizeWorkflowStep(
  step: Partial<WorkflowStep> & Pick<WorkflowStep, "id">,
): WorkflowStep {
  return {
    id: step.id,
    title: step.title ?? "",
    description: step.description ?? "",
    promptId: step.promptId ?? null,
  }
}

export function normalizeWorkflow(
  workflow: Partial<Workflow> & Pick<Workflow, "id">,
): Workflow {
  const now = Date.now()
  return {
    id: workflow.id,
    name: workflow.name ?? "",
    category: (workflow.category ?? "General") as PromptCategory,
    description: workflow.description ?? "",
    status: (workflow.status ?? "Draft") as WorkflowStatus,
    estimatedTimeSaved: workflow.estimatedTimeSaved ?? "",
    steps: (workflow.steps ?? []).map((step, index) =>
      normalizeWorkflowStep({
        ...step,
        id: step.id || `step-${index}`,
      }),
    ),
    notes: workflow.notes ?? "",
    createdAt: workflow.createdAt ?? now,
    updatedAt: workflow.updatedAt ?? now,
  }
}

export function workflowToPrismaCreate(workflow: Workflow) {
  const normalized = normalizeWorkflow(workflow)
  return {
    id: normalized.id,
    name: normalized.name,
    category: normalized.category,
    description: normalized.description,
    status: normalized.status,
    estimatedTimeSaved: normalized.estimatedTimeSaved,
    notes: normalized.notes,
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function workflowToPrismaUpdate(workflow: Workflow) {
  const normalized = normalizeWorkflow(workflow)
  return {
    name: normalized.name,
    category: normalized.category,
    description: normalized.description,
    status: normalized.status,
    estimatedTimeSaved: normalized.estimatedTimeSaved,
    notes: normalized.notes,
    updatedAt: new Date(normalized.updatedAt),
  }
}

/** Step rows for nested `steps: { create: [...] }` — omit workflowId (set by relation). */
export function stepsToNestedCreate(
  workflowId: string,
  steps: WorkflowStep[],
): {
  id: string
  sortOrder: number
  title: string
  description: string
  promptId: string | null
}[] {
  return normalizeWorkflow({ id: workflowId, steps }).steps.map((step, index) => ({
    id: toPrismaStepId(workflowId, step.id),
    sortOrder: index,
    title: step.title,
    description: step.description,
    promptId: step.promptId,
  }))
}

/** Flat step rows for createMany — includes workflowId. */
export function stepsToPrismaCreate(
  workflowId: string,
  steps: WorkflowStep[],
): {
  id: string
  workflowId: string
  sortOrder: number
  title: string
  description: string
  promptId: string | null
}[] {
  return stepsToNestedCreate(workflowId, steps).map((step) => ({
    ...step,
    workflowId,
  }))
}

export function prismaWorkflowToWorkflow(row: WorkflowWithSteps): Workflow {
  const sortedSteps = [...row.steps].sort((a, b) => a.sortOrder - b.sortOrder)
  return normalizeWorkflow({
    id: row.id,
    name: row.name,
    category: row.category as PromptCategory,
    description: row.description,
    status: row.status as WorkflowStatus,
    estimatedTimeSaved: row.estimatedTimeSaved,
    notes: row.notes,
    steps: sortedSteps.map((step) => ({
      id: fromPrismaStepId(row.id, step.id),
      title: step.title,
      description: step.description,
      promptId: step.promptId,
    })),
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}
