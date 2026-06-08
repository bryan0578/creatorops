"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import {
  normalizeWorkflow,
  prismaWorkflowToWorkflow,
  stepsToNestedCreate,
  stepsToPrismaCreate,
  workflowToPrismaCreate,
  workflowToPrismaUpdate,
} from "@/lib/data/workflows"
import { WorkflowDatabaseError } from "@/lib/errors/workflow-database-error"
import { SEED_WORKFLOWS } from "@/lib/seed-data"
import type { Workflow } from "@/lib/types"

const WORKFLOW_PATHS = ["/workflows", "/workflow-runner", "/"]

const workflowInclude = {
  steps: {
    orderBy: { sortOrder: "asc" as const },
  },
}

function assertWorkflowPrismaReady(): void {
  const client = prisma as typeof prisma & {
    workflow?: unknown
    workflowStep?: unknown
  }

  if (client.workflow == null || client.workflowStep == null) {
    throw new WorkflowDatabaseError(
      "Prisma Client is missing Workflow/WorkflowStep delegates. Run `npx prisma generate` and `npm run db:migrate`, then restart the dev server.",
    )
  }
}

function getSeedWorkflows(): Workflow[] {
  if (!Array.isArray(SEED_WORKFLOWS)) {
    console.warn("[CreatorOps] SEED_WORKFLOWS is not an array; skipping workflow seed.")
    return []
  }
  return SEED_WORKFLOWS
}

function wrapWorkflowDbError(error: unknown, context: string): WorkflowDatabaseError {
  if (error instanceof WorkflowDatabaseError) return error

  const message =
    error instanceof Error ? error.message : String(error)

  if (message.includes("no such table") || message.includes("does not exist")) {
    return new WorkflowDatabaseError(
      `${context} Workflow tables are missing. Run \`npm run db:migrate\`, then restart the dev server.`,
      { cause: error },
    )
  }

  return new WorkflowDatabaseError(
    `${context} ${message}`,
    { cause: error },
  )
}

async function listWorkflowsFromDb(): Promise<Workflow[]> {
  assertWorkflowPrismaReady()
  const rows = await prisma.workflow.findMany({
    include: workflowInclude,
    orderBy: { updatedAt: "desc" },
  })
  return rows.map(prismaWorkflowToWorkflow)
}

async function ensureWorkflowsSeeded(): Promise<void> {
  assertWorkflowPrismaReady()

  try {
    const count = await prisma.workflow.count()
    if (count > 0) return

    const seeds = getSeedWorkflows()
    if (seeds.length === 0) return

    for (const workflow of seeds) {
      const normalized = normalizeWorkflow(workflow)
      await prisma.workflow.create({
        data: {
          ...workflowToPrismaCreate(normalized),
          steps: {
            create: stepsToNestedCreate(normalized.id, normalized.steps),
          },
        },
      })
    }
  } catch (error) {
    throw wrapWorkflowDbError(
      error,
      "Could not seed workflows.",
    )
  }
}

function revalidateWorkflowRoutes() {
  for (const path of WORKFLOW_PATHS) {
    revalidatePath(path)
  }
}

async function replaceWorkflowSteps(
  workflowId: string,
  steps: Workflow["steps"],
): Promise<void> {
  await prisma.workflowStep.deleteMany({ where: { workflowId } })
  const stepData = stepsToPrismaCreate(workflowId, steps)
  if (stepData.length === 0) return
  await prisma.workflowStep.createMany({ data: stepData })
}

/**
 * Load all workflows from SQLite (seeds defaults when the table is empty).
 * Throws WorkflowDatabaseError on failure — store falls back to localStorage.
 */
export async function getWorkflows(): Promise<Workflow[]> {
  try {
    await ensureWorkflowsSeeded()
    return await listWorkflowsFromDb()
  } catch (error) {
    throw wrapWorkflowDbError(
      error,
      "Failed to load workflows from database.",
    )
  }
}

/** Create or replace a workflow and its steps. */
export async function upsertWorkflow(workflow: Workflow): Promise<Workflow> {
  assertWorkflowPrismaReady()
  const normalized = normalizeWorkflow(workflow)

  try {
    await prisma.workflow.upsert({
      where: { id: normalized.id },
      create: {
        ...workflowToPrismaCreate(normalized),
        steps: {
          create: stepsToNestedCreate(normalized.id, normalized.steps),
        },
      },
      update: workflowToPrismaUpdate(normalized),
    })

    await replaceWorkflowSteps(normalized.id, normalized.steps)

    const row = await prisma.workflow.findUniqueOrThrow({
      where: { id: normalized.id },
      include: workflowInclude,
    })

    revalidateWorkflowRoutes()
    return prismaWorkflowToWorkflow(row)
  } catch (error) {
    throw wrapWorkflowDbError(error, "Could not save workflow.")
  }
}

/** Delete a workflow by id (steps cascade). */
export async function deleteWorkflowById(id: string): Promise<void> {
  assertWorkflowPrismaReady()
  try {
    await prisma.workflow.delete({ where: { id } })
    revalidateWorkflowRoutes()
  } catch (error) {
    throw wrapWorkflowDbError(error, "Could not delete workflow.")
  }
}

/** Import workflows (merge by id). */
export async function importWorkflows(items: Workflow[]): Promise<Workflow[]> {
  if (!Array.isArray(items)) {
    throw new WorkflowDatabaseError("Import payload must be an array of workflows.")
  }

  for (const item of items) {
    await upsertWorkflow(item)
  }
  revalidateWorkflowRoutes()
  return listWorkflowsFromDb()
}

/**
 * One-time migration: copy workflows from browser localStorage into SQLite.
 * Does not delete localStorage data — kept for rollback/export.
 */
export async function migrateLocalWorkflowsToDatabase(
  items: Workflow[],
): Promise<{ migrated: number; total: number }> {
  assertWorkflowPrismaReady()

  if (!Array.isArray(items)) {
    throw new WorkflowDatabaseError("Migration payload must be an array of workflows.")
  }

  if (items.length === 0) {
    const total = await prisma.workflow.count()
    return { migrated: 0, total }
  }

  for (const item of items) {
    await upsertWorkflow(item)
  }

  revalidateWorkflowRoutes()
  const total = await prisma.workflow.count()
  return { migrated: items.length, total }
}
