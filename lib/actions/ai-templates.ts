"use server"

import { revalidatePath } from "next/cache"

import { upsertPrompt } from "@/lib/actions/prompts"
import { prisma } from "@/lib/prisma"
import { AI_GENERATION_TEMPLATE_CATEGORY } from "@/lib/ai-templates/constants"
import {
  STARTER_AI_TEMPLATES,
  starterDefToPrompt,
} from "@/lib/ai-templates/starter-templates"

const REVALIDATE_PATHS = ["/prompts", "/runner", "/settings", "/backups", "/"]

function revalidateTemplateRoutes() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path)
  }
}

/** Idempotent seed for starter AI generation templates in Prompt Library. */
export async function seedAIGenerationTemplates(): Promise<{
  created: number
  skipped: number
}> {
  let created = 0
  let skipped = 0

  for (const def of STARTER_AI_TEMPLATES) {
    const prompt = starterDefToPrompt(def)

    const byId = await prisma.prompt.findUnique({ where: { id: prompt.id } })
    if (byId) {
      skipped += 1
      continue
    }

    const byName = await prisma.prompt.findFirst({
      where: {
        name: prompt.name,
        category: AI_GENERATION_TEMPLATE_CATEGORY,
      },
    })
    if (byName) {
      skipped += 1
      continue
    }

    await upsertPrompt(prompt)
    created += 1
  }

  revalidateTemplateRoutes()
  return { created, skipped }
}

export async function getAIGenerationTemplateCount(): Promise<number> {
  const rows = await prisma.prompt.findMany({
    where: { category: AI_GENERATION_TEMPLATE_CATEGORY },
    select: { id: true },
  })
  return rows.length
}
