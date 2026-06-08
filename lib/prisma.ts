import path from "node:path"

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaClient } from "@/lib/generated/prisma/client"

/**
 * Shared Prisma client singleton for server-side data access.
 * Prisma 7+ requires a driver adapter (no bare `new PrismaClient()`).
 * TODO: Reuse this module when migrating workflows, runs, and other entities.
 */

function resolveSqliteUrl(rawUrl: string): string {
  if (!rawUrl.startsWith("file:")) return rawUrl

  const filePath = rawUrl.slice("file:".length)
  if (path.isAbsolute(filePath)) {
    return `file:${filePath}`
  }

  // Next.js may run with a different cwd — anchor relative paths to project root.
  return `file:${path.join(process.cwd(), filePath)}`
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url?.trim()) {
    throw new Error(
      "DATABASE_URL is not set. Add DATABASE_URL=\"file:./prisma/dev.db\" to .env",
    )
  }
  return resolveSqliteUrl(url.trim())
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

type PrismaWithDelegates = PrismaClient & {
  prompt?: unknown
  promptRun?: unknown
  workflow?: unknown
  workflowStep?: unknown
  workflowRun?: unknown
  workflowStepRun?: unknown
  youTubePackage?: unknown
  youTubeThumbnail?: unknown
  releasePlan?: unknown
}

function isPrismaClientComplete(client: PrismaClient): boolean {
  const c = client as PrismaWithDelegates
  return (
    typeof c.prompt !== "undefined" &&
    typeof c.promptRun !== "undefined" &&
    typeof c.workflow !== "undefined" &&
    typeof c.workflowStep !== "undefined" &&
    typeof c.workflowRun !== "undefined" &&
    typeof c.workflowStepRun !== "undefined" &&
    typeof c.youTubePackage !== "undefined" &&
    typeof c.youTubeThumbnail !== "undefined" &&
    typeof c.releasePlan !== "undefined"
  )
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({
    url: getDatabaseUrl(),
  })

  const client = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  })

  if (!isPrismaClientComplete(client)) {
    throw new Error(
      "Prisma Client is missing expected model delegates (prompt, promptRun, workflow, workflowStep, workflowRun, workflowStepRun, youTubePackage, youTubeThumbnail, releasePlan). Run `npx prisma generate` and `npm run db:migrate`, then restart the dev server.",
    )
  }

  return client
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma
  if (cached && isPrismaClientComplete(cached)) {
    return cached
  }

  const client = createPrismaClient()
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client
  }
  return client
}

export const prisma = getPrismaClient()
