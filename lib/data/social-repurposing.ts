import { normalizeSocialRepurposingRecord } from "@/lib/social-repurposing"
import type { SocialRepurposingRecord } from "@/lib/types"
import type { SocialRepurposing as PrismaSocialRepurposing } from "@/lib/generated/prisma/client"

/**
 * Shared social repurposing data layer — maps between app types and Prisma rows.
 */

export { normalizeSocialRepurposingRecord } from "@/lib/social-repurposing"

export function socialRepurposingToPrismaCreate(record: SocialRepurposingRecord) {
  const normalized = normalizeSocialRepurposingRecord(record)
  return {
    id: normalized.id,
    campaignName: normalized.campaignName,
    sourceContent: normalized.sourceContent,
    businessArea: normalized.businessArea,
    goal: normalized.goal,
    audience: normalized.audience,
    tone: normalized.tone,
    platforms: normalized.platforms,
    callToAction: normalized.callToAction,
    productOrReleaseLink: normalized.productOrReleaseLink,
    contentType: normalized.contentType,
    completedPrompt: normalized.completedPrompt,
    aiResponse: normalized.aiResponse,
    finalCoreMessage: normalized.finalCoreMessage,
    finalTikTokCaption: normalized.finalTikTokCaption,
    finalInstagramCaption: normalized.finalInstagramCaption,
    finalXPost: normalized.finalXPost,
    finalYouTubeShortsIdea: normalized.finalYouTubeShortsIdea,
    finalYouTubeCommunityPost: normalized.finalYouTubeCommunityPost,
    finalEmailSnippet: normalized.finalEmailSnippet,
    finalHashtags: normalized.finalHashtags,
    finalCTA: normalized.finalCTA,
    notes: normalized.notes,
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function socialRepurposingToPrismaUpdate(record: SocialRepurposingRecord) {
  const normalized = normalizeSocialRepurposingRecord(record)
  return {
    campaignName: normalized.campaignName,
    sourceContent: normalized.sourceContent,
    businessArea: normalized.businessArea,
    goal: normalized.goal,
    audience: normalized.audience,
    tone: normalized.tone,
    platforms: normalized.platforms,
    callToAction: normalized.callToAction,
    productOrReleaseLink: normalized.productOrReleaseLink,
    contentType: normalized.contentType,
    completedPrompt: normalized.completedPrompt,
    aiResponse: normalized.aiResponse,
    finalCoreMessage: normalized.finalCoreMessage,
    finalTikTokCaption: normalized.finalTikTokCaption,
    finalInstagramCaption: normalized.finalInstagramCaption,
    finalXPost: normalized.finalXPost,
    finalYouTubeShortsIdea: normalized.finalYouTubeShortsIdea,
    finalYouTubeCommunityPost: normalized.finalYouTubeCommunityPost,
    finalEmailSnippet: normalized.finalEmailSnippet,
    finalHashtags: normalized.finalHashtags,
    finalCTA: normalized.finalCTA,
    notes: normalized.notes,
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function prismaSocialRepurposingToSocialRepurposingRecord(
  row: PrismaSocialRepurposing,
): SocialRepurposingRecord {
  return normalizeSocialRepurposingRecord({
    id: row.id,
    campaignName: row.campaignName,
    sourceContent: row.sourceContent,
    businessArea: row.businessArea,
    goal: row.goal,
    audience: row.audience,
    tone: row.tone,
    platforms: row.platforms,
    callToAction: row.callToAction,
    productOrReleaseLink: row.productOrReleaseLink,
    contentType: row.contentType,
    completedPrompt: row.completedPrompt,
    aiResponse: row.aiResponse,
    finalCoreMessage: row.finalCoreMessage,
    finalTikTokCaption: row.finalTikTokCaption,
    finalInstagramCaption: row.finalInstagramCaption,
    finalXPost: row.finalXPost,
    finalYouTubeShortsIdea: row.finalYouTubeShortsIdea,
    finalYouTubeCommunityPost: row.finalYouTubeCommunityPost,
    finalEmailSnippet: row.finalEmailSnippet,
    finalHashtags: row.finalHashtags,
    finalCTA: row.finalCTA,
    notes: row.notes,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}
