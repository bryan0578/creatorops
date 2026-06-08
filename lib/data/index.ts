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
 * TODO: merch ideas, product listings, etc.
 */

export {
  normalizeYouTubeThumbnailRecord,
  prismaYouTubeThumbnailToRecord,
  youtubeThumbnailToPrismaCreate,
  youtubeThumbnailToPrismaUpdate,
} from "@/lib/data/youtube-thumbnails"

export {
  normalizeYouTubePackage,
  prismaYouTubePackageToYouTubePackage,
  youtubePackageToPrismaCreate,
  youtubePackageToPrismaUpdate,
} from "@/lib/data/youtube-packages"

export {
  normalizeStepRun,
  normalizeWorkflowRun,
  prismaWorkflowRunToWorkflowRun,
  stepRunsToNestedCreate,
  stepRunsToPrismaCreate,
  workflowRunToPrismaCreate,
  workflowRunToPrismaUpdate,
} from "@/lib/data/workflow-runs"

export {
  normalizePromptRun,
  parseJsonRecord,
  prismaPromptRunToPromptRun,
  promptRunToPrismaCreate,
  promptRunToPrismaUpdate,
  stringifyJsonRecord,
} from "@/lib/data/prompt-runs"

export {
  normalizePrompt,
  parseJsonStringArray,
  prismaPromptToPrompt,
  promptToPrismaCreate,
  promptToPrismaUpdate,
  stringifyJsonArray,
} from "@/lib/data/prompts"

export {
  normalizeWorkflow,
  normalizeWorkflowStep,
  prismaWorkflowToWorkflow,
  stepsToNestedCreate,
  stepsToPrismaCreate,
  workflowToPrismaCreate,
  workflowToPrismaUpdate,
} from "@/lib/data/workflows"
