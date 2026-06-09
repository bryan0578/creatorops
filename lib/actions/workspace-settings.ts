"use server"

import { revalidatePath } from "next/cache"

import {
  prismaWorkspaceSettingsToRecord,
  workspaceSettingsToPrismaCreate,
  workspaceSettingsToPrismaUpdate,
} from "@/lib/data/workspace-settings"
import { WorkspaceSettingsDatabaseError } from "@/lib/errors/workspace-settings-database-error"
import { prisma } from "@/lib/prisma"
import type { WorkspaceSettingsRecord } from "@/lib/types"
import {
  defaultWorkspaceSettingsRecord,
  normalizeWorkspaceSettingsRecord,
  WORKSPACE_SETTINGS_ID,
} from "@/lib/workspace-settings"

const SETTINGS_PATHS = ["/settings", "/backups", "/"]

function assertWorkspaceSettingsReady(): void {
  const client = prisma as typeof prisma & { workspaceSettings?: unknown }
  if (client.workspaceSettings == null) {
    throw new WorkspaceSettingsDatabaseError(
      "Prisma Client is missing the WorkspaceSettings delegate. Run `npx prisma generate` and `npm run db:migrate`, then restart the dev server.",
    )
  }
}

function wrapError(error: unknown, context: string): WorkspaceSettingsDatabaseError {
  if (error instanceof WorkspaceSettingsDatabaseError) return error
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("no such table") || message.includes("does not exist")) {
    return new WorkspaceSettingsDatabaseError(
      `${context} WorkspaceSettings table is missing. Run \`npm run db:migrate\`, then restart the dev server.`,
      { cause: error },
    )
  }
  return new WorkspaceSettingsDatabaseError(`${context} ${message}`, { cause: error })
}

function revalidateSettingsRoutes() {
  for (const path of SETTINGS_PATHS) {
    revalidatePath(path)
  }
}

async function ensureDefaultSettings(): Promise<WorkspaceSettingsRecord> {
  assertWorkspaceSettingsReady()
  const existing = await prisma.workspaceSettings.findUnique({
    where: { id: WORKSPACE_SETTINGS_ID },
  })
  if (existing) {
    return prismaWorkspaceSettingsToRecord(existing)
  }
  const defaults = defaultWorkspaceSettingsRecord()
  const row = await prisma.workspaceSettings.create({
    data: workspaceSettingsToPrismaCreate(defaults),
  })
  return prismaWorkspaceSettingsToRecord(row)
}

/** Load workspace settings, creating seeded defaults if missing. */
export async function getWorkspaceSettings(): Promise<WorkspaceSettingsRecord> {
  try {
    return await ensureDefaultSettings()
  } catch (error) {
    throw wrapError(error, "Failed to load workspace settings.")
  }
}

export async function upsertWorkspaceSettings(
  record: WorkspaceSettingsRecord,
): Promise<WorkspaceSettingsRecord> {
  assertWorkspaceSettingsReady()
  const normalized = normalizeWorkspaceSettingsRecord({
    ...record,
    id: WORKSPACE_SETTINGS_ID,
    updatedAt: Date.now(),
  })
  try {
    const row = await prisma.workspaceSettings.upsert({
      where: { id: WORKSPACE_SETTINGS_ID },
      create: workspaceSettingsToPrismaCreate(normalized),
      update: workspaceSettingsToPrismaUpdate(normalized),
    })
    revalidateSettingsRoutes()
    return prismaWorkspaceSettingsToRecord(row)
  } catch (error) {
    throw wrapError(error, "Could not save workspace settings.")
  }
}

export async function resetWorkspaceSettings(): Promise<WorkspaceSettingsRecord> {
  assertWorkspaceSettingsReady()
  const now = Date.now()
  const defaults = defaultWorkspaceSettingsRecord(now)
  try {
    const row = await prisma.workspaceSettings.upsert({
      where: { id: WORKSPACE_SETTINGS_ID },
      create: workspaceSettingsToPrismaCreate(defaults),
      update: workspaceSettingsToPrismaUpdate(defaults),
    })
    revalidateSettingsRoutes()
    return prismaWorkspaceSettingsToRecord(row)
  } catch (error) {
    throw wrapError(error, "Could not reset workspace settings.")
  }
}

export async function importWorkspaceSettings(
  items: WorkspaceSettingsRecord[],
): Promise<WorkspaceSettingsRecord> {
  if (!Array.isArray(items) || items.length === 0) {
    return getWorkspaceSettings()
  }
  const [first] = items
  return upsertWorkspaceSettings(
    normalizeWorkspaceSettingsRecord({
      ...first,
      id: WORKSPACE_SETTINGS_ID,
    }),
  )
}
