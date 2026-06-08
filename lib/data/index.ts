/**
 * Shared data-access mappers and normalizers for Prisma-backed modules.
 *
 * Pattern for future migrations:
 * 1. Add model to prisma/schema.prisma
 * 2. Create lib/data/<entity>.ts with normalize + prisma mappers
 * 3. Create lib/actions/<entity>.ts with server actions
 * 4. Point lib/store.tsx hydration + CRUD at server actions
 * 5. Keep lib/storage.ts localStorage helpers for rollback/migration
 *
 * TODO: workflows, prompt runs, workflow runs, youtube packages, etc.
 */

export {
  normalizePrompt,
  parseJsonStringArray,
  prismaPromptToPrompt,
  promptToPrismaCreate,
  promptToPrismaUpdate,
  stringifyJsonArray,
} from "@/lib/data/prompts"
