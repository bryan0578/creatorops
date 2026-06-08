"use server"

import { revalidatePath } from "next/cache"

import {
  normalizeWorkflowRun,
  prismaWorkflowRunToWorkflowRun,
  stepRunsToNestedCreate,
  stepRunsToPrismaCreate,
  workflowRunToPrismaCreate,
  workflowRunToPrismaUpdate,
} from "@/lib/data/workflow-runs"
import { WorkflowRunDatabaseError } from "@/lib/errors/workflow-run-database-error"
import { prisma } from "@/lib/prisma"
import type { WorkflowRun } from "@/lib/types"

const WORKFLOW_RUN_PATHS = ["/workflow-runner", "/"]

const workflowRunInclude = {
  stepRuns: {
    orderBy: { sortOrder: "asc" as const },
  },
}

function assertWorkflowRunPrismaReady(): void {
  const client = prisma as typeof prisma & {
    workflowRun?: unknown
    workflowStepRun?: unknown
  }

  if (client.workflowRun == null || client.workflowStepRun == null) {
    throw new WorkflowRunDatabaseError(
      "Prisma Client is missing WorkflowRun/WorkflowStepRun delegates. Run `npx prisma generate` and `npm run db:migrate`, then restart the dev server.",
    )
  }
}

function wrapWorkflowRunDbError(
  error: unknown,
  context: string,
): WorkflowRunDatabaseError {
  if (error instanceof WorkflowRunDatabaseError) return error

  const message = error instanceof Error ? error.message : String(error)

  if (message.includes("no such table") || message.includes("does not exist")) {
    return new WorkflowRunDatabaseError(
      `${context} WorkflowRun tables are missing. Run \`npm run db:migrate\`, then restart the dev server.`,
      { cause: error },
    )
  }

  return new WorkflowRunDatabaseError(`${context} ${message}`, { cause: error })
}

function revalidateWorkflowRunRoutes() {
  for (const path of WORKFLOW_RUN_PATHS) {
    revalidatePath(path)
  }
}

async function listWorkflowRunsFromDb(): Promise<WorkflowRun[]> {
  assertWorkflowRunPrismaReady()
  const rows = await prisma.workflowRun.findMany({
    include: workflowRunInclude,
    orderBy: { updatedAt: "desc" },
  })
  return rows.map(prismaWorkflowRunToWorkflowRun)
}

async function replaceWorkflowStepRuns(
  workflowRunId: string,
  stepRuns: WorkflowRun["stepRuns"],
): Promise<void> {
  await prisma.workflowStepRun.deleteMany({ where: { workflowRunId } })
  const stepData = stepRunsToPrismaCreate(workflowRunId, stepRuns)
  if (stepData.length === 0) return
  await prisma.workflowStepRun.createMany({ data: stepData })
}

/**
 * Load all workflow runs from SQLite.
 * Throws WorkflowRunDatabaseError on failure — store falls back to localStorage.
 */
export async function getWorkflowRuns(): Promise<WorkflowRun[]> {
  try {
    return await listWorkflowRunsFromDb()
  } catch (error) {
    throw wrapWorkflowRunDbError(
      error,
      "Failed to load workflow runs from database.",
    )
  }
}

/** Create or replace a workflow run and its step runs. */
export async function upsertWorkflowRun(run: WorkflowRun): Promise<WorkflowRun> {
  assertWorkflowRunPrismaReady()
  const normalized = normalizeWorkflowRun(run)

  try {
    await prisma.workflowRun.upsert({
      where: { id: normalized.id },
      create: {
        ...workflowRunToPrismaCreate(normalized),
        stepRuns: {
          create: stepRunsToNestedCreate(normalized.stepRuns),
        },
      },
      update: workflowRunToPrismaUpdate(normalized),
    })

    await replaceWorkflowStepRuns(normalized.id, normalized.stepRuns)

    const row = await prisma.workflowRun.findUniqueOrThrow({
      where: { id: normalized.id },
      include: workflowRunInclude,
    })

    revalidateWorkflowRunRoutes()
    return prismaWorkflowRunToWorkflowRun(row)
  } catch (error) {
    throw wrapWorkflowRunDbError(error, "Could not save workflow run.")
  }
}

/** Delete a workflow run by id (step runs cascade). */
export async function deleteWorkflowRunById(id: string): Promise<void> {
  assertWorkflowRunPrismaReady()
  try {
    await prisma.workflowRun.delete({ where: { id } })
    revalidateWorkflowRunRoutes()
  } catch (error) {
    throw wrapWorkflowRunDbError(error, "Could not delete workflow run.")
  }
}

/** Import workflow runs (merge by id). */
export async function importWorkflowRuns(
  items: WorkflowRun[],
): Promise<WorkflowRun[]> {
  if (!Array.isArray(items)) {
    throw new WorkflowRunDatabaseError(
      "Import payload must be an array of workflow runs.",
    )
  }

  for (const item of items) {
    await upsertWorkflowRun(item)
  }
  revalidateWorkflowRunRoutes()
  return listWorkflowRunsFromDb()
}

/**
 * One-time migration: copy workflow runs from browser localStorage into SQLite.
 * Does not delete localStorage data — kept for rollback/export.
 */
export async function migrateLocalWorkflowRunsToDatabase(
  items: WorkflowRun[],
): Promise<{ migrated: number; total: number }> {
  assertWorkflowRunPrismaReady()

  if (!Array.isArray(items)) {
    throw new WorkflowRunDatabaseError(
      "Migration payload must be an array of workflow runs.",
    )
  }

  if (items.length === 0) {
    const total = await prisma.workflowRun.count()
    return { migrated: 0, total }
  }

  for (const item of items) {
    await upsertWorkflowRun(item)
  }

  revalidateWorkflowRunRoutes()
  const total = await prisma.workflowRun.count()
  return { migrated: items.length, total }
}
