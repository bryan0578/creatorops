"use server"

import { revalidatePath } from "next/cache"

import {
  normalizePresetRecord,
  presetToPrismaCreate,
  presetToPrismaUpdate,
  prismaPresetToPresetRecord,
} from "@/lib/data/presets"
import { PresetDatabaseError } from "@/lib/errors/preset-database-error"
import { prisma } from "@/lib/prisma"
import type { PresetRecord } from "@/lib/types"

const PRESET_PATHS = ["/presets", "/", "/search", "/backups"]

function assertPresetPrismaReady(): void {
  const client = prisma as typeof prisma & { preset?: unknown }
  if (client.preset == null) {
    throw new PresetDatabaseError(
      "Prisma Client is missing the Preset delegate. Run `npx prisma generate` and `npm run db:migrate`, then restart the dev server.",
    )
  }
}

function wrapPresetDbError(error: unknown, context: string): PresetDatabaseError {
  if (error instanceof PresetDatabaseError) return error
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("no such table") || message.includes("does not exist")) {
    return new PresetDatabaseError(
      `${context} Preset table is missing. Run \`npm run db:migrate\`, then restart the dev server.`,
      { cause: error },
    )
  }
  return new PresetDatabaseError(`${context} ${message}`, { cause: error })
}

function revalidatePresetRoutes() {
  for (const path of PRESET_PATHS) {
    revalidatePath(path)
  }
}

async function listPresetsFromDb(): Promise<PresetRecord[]> {
  assertPresetPrismaReady()
  const rows = await prisma.preset.findMany({
    orderBy: { updatedAt: "desc" },
  })
  return rows.map(prismaPresetToPresetRecord)
}

export async function getPresets(): Promise<PresetRecord[]> {
  try {
    return await listPresetsFromDb()
  } catch (error) {
    throw wrapPresetDbError(error, "Failed to load presets from database.")
  }
}

export async function upsertPreset(record: PresetRecord): Promise<PresetRecord> {
  assertPresetPrismaReady()
  const normalized = normalizePresetRecord(record)
  try {
    const row = await prisma.preset.upsert({
      where: { id: normalized.id },
      create: presetToPrismaCreate(normalized),
      update: presetToPrismaUpdate(normalized),
    })
    revalidatePresetRoutes()
    return prismaPresetToPresetRecord(row)
  } catch (error) {
    throw wrapPresetDbError(error, "Could not save preset.")
  }
}

export async function deletePresetById(id: string): Promise<void> {
  assertPresetPrismaReady()
  try {
    await prisma.preset.delete({ where: { id } })
    revalidatePresetRoutes()
  } catch (error) {
    throw wrapPresetDbError(error, "Could not delete preset.")
  }
}

export async function importPresets(items: PresetRecord[]): Promise<PresetRecord[]> {
  if (!Array.isArray(items)) {
    throw new PresetDatabaseError("Import payload must be an array of presets.")
  }
  for (const item of items) {
    await upsertPreset(normalizePresetRecord(item))
  }
  revalidatePresetRoutes()
  return listPresetsFromDb()
}

export async function migrateLocalPresetsToDatabase(
  items: PresetRecord[],
): Promise<{ migrated: number; total: number }> {
  assertPresetPrismaReady()
  if (!Array.isArray(items)) {
    throw new PresetDatabaseError("Migration payload must be an array of presets.")
  }
  if (items.length === 0) {
    const total = await prisma.preset.count()
    return { migrated: 0, total }
  }
  for (const item of items) {
    await upsertPreset(normalizePresetRecord(item))
  }
  revalidatePresetRoutes()
  const total = await prisma.preset.count()
  return { migrated: items.length, total }
}
