import { normalizeReleasePlan } from "@/lib/release-planner"
import type { ReleasePlan } from "@/lib/types"
import type { ReleasePlan as PrismaReleasePlan } from "@/lib/generated/prisma/client"

/**
 * Shared release plan data layer — maps between app types and Prisma rows.
 */

export { normalizeReleasePlan } from "@/lib/release-planner"

export function releasePlanToPrismaCreate(plan: ReleasePlan) {
  const normalized = normalizeReleasePlan(plan)
  return {
    id: normalized.id,
    artistName: normalized.artistName,
    songTitle: normalized.songTitle,
    genre: normalized.genre,
    mood: normalized.mood,
    releaseDate: normalized.releaseDate,
    youtubeChannel: normalized.youtubeChannel,
    targetAudience: normalized.targetAudience,
    visualTheme: normalized.visualTheme,
    merchTieIn: normalized.merchTieIn,
    streamingPlatforms: normalized.streamingPlatforms,
    primaryGoal: normalized.primaryGoal,
    notes: normalized.notes,
    completedPrompt: normalized.completedPrompt,
    aiResponse: normalized.aiResponse,
    finalStrategySummary: normalized.finalStrategySummary,
    finalTargetListener: normalized.finalTargetListener,
    finalPreReleasePlan: normalized.finalPreReleasePlan,
    finalReleaseDayChecklist: normalized.finalReleaseDayChecklist,
    finalPostReleasePlan: normalized.finalPostReleasePlan,
    finalYouTubePackage: normalized.finalYouTubePackage,
    finalShortFormIdeas: normalized.finalShortFormIdeas,
    finalSocialCaptions: normalized.finalSocialCaptions,
    finalEmailAnnouncement: normalized.finalEmailAnnouncement,
    finalMerchTieIns: normalized.finalMerchTieIns,
    finalPriorityTasks: normalized.finalPriorityTasks,
    finalChecklist: normalized.finalChecklist,
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function releasePlanToPrismaUpdate(plan: ReleasePlan) {
  const normalized = normalizeReleasePlan(plan)
  return {
    artistName: normalized.artistName,
    songTitle: normalized.songTitle,
    genre: normalized.genre,
    mood: normalized.mood,
    releaseDate: normalized.releaseDate,
    youtubeChannel: normalized.youtubeChannel,
    targetAudience: normalized.targetAudience,
    visualTheme: normalized.visualTheme,
    merchTieIn: normalized.merchTieIn,
    streamingPlatforms: normalized.streamingPlatforms,
    primaryGoal: normalized.primaryGoal,
    notes: normalized.notes,
    completedPrompt: normalized.completedPrompt,
    aiResponse: normalized.aiResponse,
    finalStrategySummary: normalized.finalStrategySummary,
    finalTargetListener: normalized.finalTargetListener,
    finalPreReleasePlan: normalized.finalPreReleasePlan,
    finalReleaseDayChecklist: normalized.finalReleaseDayChecklist,
    finalPostReleasePlan: normalized.finalPostReleasePlan,
    finalYouTubePackage: normalized.finalYouTubePackage,
    finalShortFormIdeas: normalized.finalShortFormIdeas,
    finalSocialCaptions: normalized.finalSocialCaptions,
    finalEmailAnnouncement: normalized.finalEmailAnnouncement,
    finalMerchTieIns: normalized.finalMerchTieIns,
    finalPriorityTasks: normalized.finalPriorityTasks,
    finalChecklist: normalized.finalChecklist,
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function prismaReleasePlanToReleasePlan(
  row: PrismaReleasePlan,
): ReleasePlan {
  return normalizeReleasePlan({
    id: row.id,
    artistName: row.artistName,
    songTitle: row.songTitle,
    genre: row.genre,
    mood: row.mood,
    releaseDate: row.releaseDate,
    youtubeChannel: row.youtubeChannel,
    targetAudience: row.targetAudience,
    visualTheme: row.visualTheme,
    merchTieIn: row.merchTieIn,
    streamingPlatforms: row.streamingPlatforms,
    primaryGoal: row.primaryGoal,
    notes: row.notes,
    completedPrompt: row.completedPrompt,
    aiResponse: row.aiResponse,
    finalStrategySummary: row.finalStrategySummary,
    finalTargetListener: row.finalTargetListener,
    finalPreReleasePlan: row.finalPreReleasePlan,
    finalReleaseDayChecklist: row.finalReleaseDayChecklist,
    finalPostReleasePlan: row.finalPostReleasePlan,
    finalYouTubePackage: row.finalYouTubePackage,
    finalShortFormIdeas: row.finalShortFormIdeas,
    finalSocialCaptions: row.finalSocialCaptions,
    finalEmailAnnouncement: row.finalEmailAnnouncement,
    finalMerchTieIns: row.finalMerchTieIns,
    finalPriorityTasks: row.finalPriorityTasks,
    finalChecklist: row.finalChecklist,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}
