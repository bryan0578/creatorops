"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import {
  normalizePrompt,
  prismaPromptToPrompt,
  promptToPrismaCreate,
  promptToPrismaUpdate,
} from "@/lib/data/prompts"
import { SEED_PROMPTS } from "@/lib/seed-data"
import type { Prompt } from "@/lib/types"

const PROMPT_PATHS = ["/prompts", "/runner", "/"]

async function listPromptsFromDb(): Promise<Prompt[]> {
  const rows = await prisma.prompt.findMany({
    orderBy: { updatedAt: "desc" },
  })
  return rows.map(prismaPromptToPrompt)
}

async function ensurePromptsSeeded(): Promise<void> {
  const count = await prisma.prompt.count()
  if (count > 0) return

  await prisma.$transaction(
    SEED_PROMPTS.map((prompt) =>
      prisma.prompt.create({
        data: promptToPrismaCreate(normalizePrompt(prompt)),
      }),
    ),
  )
}

function revalidatePromptRoutes() {
  for (const path of PROMPT_PATHS) {
    revalidatePath(path)
  }
}

/** Load all prompts from SQLite (seeds defaults when the table is empty). */
export async function getPrompts(): Promise<Prompt[]> {
  await ensurePromptsSeeded()
  return listPromptsFromDb()
}

/** Create or replace a single prompt. */
export async function upsertPrompt(prompt: Prompt): Promise<Prompt> {
  const normalized = normalizePrompt(prompt)
  const row = await prisma.prompt.upsert({
    where: { id: normalized.id },
    create: promptToPrismaCreate(normalized),
    update: promptToPrismaUpdate(normalized),
  })
  revalidatePromptRoutes()
  return prismaPromptToPrompt(row)
}

/** Delete a prompt by id. */
export async function deletePromptById(id: string): Promise<void> {
  await prisma.prompt.delete({ where: { id } })
  revalidatePromptRoutes()
}

/**
 * Import prompts (merge by id). Used by JSON import in the Prompt Library.
 * TODO: Mirror this for workflows and other modules during backend migration.
 */
export async function importPrompts(items: Prompt[]): Promise<Prompt[]> {
  const normalized = items.map((item) => normalizePrompt(item))

  await prisma.$transaction(
    normalized.map((prompt) =>
      prisma.prompt.upsert({
        where: { id: prompt.id },
        create: promptToPrismaCreate(prompt),
        update: promptToPrismaUpdate(prompt),
      }),
    ),
  )

  revalidatePromptRoutes()
  return listPromptsFromDb()
}

/**
 * One-time migration: copy prompts from browser localStorage into SQLite.
 * Does not delete localStorage data — kept for rollback/export.
 */
export async function migrateLocalPromptsToDatabase(
  items: Prompt[],
): Promise<{ migrated: number; total: number }> {
  if (items.length === 0) {
    return { migrated: 0, total: await prisma.prompt.count() }
  }

  const normalized = items.map((item) => normalizePrompt(item))

  await prisma.$transaction(
    normalized.map((prompt) =>
      prisma.prompt.upsert({
        where: { id: prompt.id },
        create: promptToPrismaCreate(prompt),
        update: promptToPrismaUpdate(prompt),
      }),
    ),
  )

  revalidatePromptRoutes()
  const total = await prisma.prompt.count()
  return { migrated: normalized.length, total }
}
