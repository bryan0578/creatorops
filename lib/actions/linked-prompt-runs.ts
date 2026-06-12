"use server"

import { revalidatePath } from "next/cache"

import { upsertPromptRun } from "@/lib/actions/prompt-runs"
import {
  buildLinkedPromptRun,
  type SaveLinkedPromptRunInput,
} from "@/lib/prompt-run-linking"
import type { PromptRun } from "@/lib/types"

const REVALIDATE_PATHS = ["/runner", "/campaigns", "/search", "/activity", "/backups", "/agents"]

function revalidatePromptRunRoutes() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path)
  }
}

function createRunId(): string {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Save a module- or campaign-linked prompt run without overwriting unless id is provided for edit.
 */
export async function saveLinkedPromptRun(
  input: SaveLinkedPromptRunInput,
): Promise<PromptRun> {
  if (!input.completedPrompt?.trim() && !input.aiResponse?.trim()) {
    throw new Error("Completed prompt or AI response is required.")
  }

  const run = buildLinkedPromptRun(input, createRunId)
  const saved = await upsertPromptRun(run)
  revalidatePromptRunRoutes()
  return saved
}
