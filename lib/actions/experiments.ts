"use server"

import { revalidatePath } from "next/cache"

import {
  experimentToPrismaCreate,
  experimentToPrismaUpdate,
  normalizeExperimentRecord,
  prismaExperimentToExperimentRecord,
} from "@/lib/data/experiments"
import { duplicateExperimentRecord } from "@/lib/experiments"
import { ExperimentDatabaseError } from "@/lib/errors/experiment-database-error"
import { prisma } from "@/lib/prisma"
import type { ExperimentRecord } from "@/lib/types"
import { createId } from "@/lib/storage"

const EXPERIMENT_PATHS = ["/experiments", "/campaigns", "/analytics", "/search", "/"]

function assertExperimentPrismaReady(): void {
  const client = prisma as typeof prisma & { experiment?: unknown }
  if (client.experiment == null) {
    throw new ExperimentDatabaseError(
      "Prisma Client is missing the Experiment delegate. Run `npx prisma generate` and `npm run db:migrate`, then restart the dev server.",
    )
  }
}

function wrapExperimentDbError(error: unknown, context: string): ExperimentDatabaseError {
  if (error instanceof ExperimentDatabaseError) return error
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("no such table") || message.includes("does not exist")) {
    return new ExperimentDatabaseError(
      `${context} Experiment table is missing. Run \`npm run db:migrate\`, then restart the dev server.`,
      { cause: error },
    )
  }
  return new ExperimentDatabaseError(`${context} ${message}`, { cause: error })
}

function revalidateExperimentRoutes() {
  for (const path of EXPERIMENT_PATHS) {
    revalidatePath(path)
  }
}

async function listExperimentsFromDb(): Promise<ExperimentRecord[]> {
  assertExperimentPrismaReady()
  const rows = await prisma.experiment.findMany({
    orderBy: { updatedAt: "desc" },
  })
  return rows.map(prismaExperimentToExperimentRecord)
}

export async function getExperiments(): Promise<ExperimentRecord[]> {
  try {
    return await listExperimentsFromDb()
  } catch (error) {
    throw wrapExperimentDbError(error, "Failed to load experiments from database.")
  }
}

export async function getExperimentById(id: string): Promise<ExperimentRecord | null> {
  const trimmedId = id.trim()
  if (!trimmedId) return null

  assertExperimentPrismaReady()
  try {
    const row = await prisma.experiment.findUnique({ where: { id: trimmedId } })
    return row ? prismaExperimentToExperimentRecord(row) : null
  } catch (error) {
    throw wrapExperimentDbError(error, "Failed to load experiment.")
  }
}

export async function createExperiment(
  record: ExperimentRecord,
): Promise<ExperimentRecord> {
  const normalized = normalizeExperimentRecord({
    ...record,
    id: record.id.trim() || createId(),
    createdAt: record.createdAt || Date.now(),
    updatedAt: Date.now(),
  })
  return upsertExperiment(normalized)
}

export async function updateExperiment(
  record: ExperimentRecord,
): Promise<ExperimentRecord> {
  const normalized = normalizeExperimentRecord({
    ...record,
    updatedAt: Date.now(),
  })
  return upsertExperiment(normalized)
}

async function upsertExperiment(record: ExperimentRecord): Promise<ExperimentRecord> {
  assertExperimentPrismaReady()
  const normalized = normalizeExperimentRecord(record)

  try {
    const row = await prisma.experiment.upsert({
      where: { id: normalized.id },
      create: experimentToPrismaCreate(normalized),
      update: experimentToPrismaUpdate(normalized),
    })
    revalidateExperimentRoutes()
    return prismaExperimentToExperimentRecord(row)
  } catch (error) {
    throw wrapExperimentDbError(error, "Could not save experiment.")
  }
}

export async function deleteExperiment(id: string): Promise<void> {
  const trimmedId = id.trim()
  if (!trimmedId) {
    throw new ExperimentDatabaseError("Experiment id is required.")
  }

  assertExperimentPrismaReady()
  try {
    await prisma.experiment.delete({ where: { id: trimmedId } })
    revalidateExperimentRoutes()
  } catch (error) {
    throw wrapExperimentDbError(error, "Could not delete experiment.")
  }
}

export async function duplicateExperiment(id: string): Promise<ExperimentRecord> {
  const source = await getExperimentById(id)
  if (!source) {
    throw new ExperimentDatabaseError("Experiment not found.")
  }
  const copy = duplicateExperimentRecord(source, createId())
  return createExperiment(copy)
}

export async function importExperiments(
  items: ExperimentRecord[],
): Promise<ExperimentRecord[]> {
  if (!Array.isArray(items)) {
    throw new ExperimentDatabaseError("Import payload must be an array of experiments.")
  }

  for (const item of items) {
    await upsertExperiment(normalizeExperimentRecord(item))
  }
  revalidateExperimentRoutes()
  return listExperimentsFromDb()
}
