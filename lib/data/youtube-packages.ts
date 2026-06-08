import { normalizeYouTubePackage } from "@/lib/youtube-packaging"
import type { YouTubePackage } from "@/lib/types"
import type { YouTubePackage as PrismaYouTubePackage } from "@/lib/generated/prisma/client"

/**
 * Shared YouTube package data layer — maps between app types and Prisma rows.
 */

export { normalizeYouTubePackage } from "@/lib/youtube-packaging"

export function youtubePackageToPrismaCreate(pkg: YouTubePackage) {
  const normalized = normalizeYouTubePackage(pkg)
  return {
    id: normalized.id,
    trackTitle: normalized.trackTitle,
    artistName: normalized.artistName,
    channelName: normalized.channelName,
    genre: normalized.genre,
    mood: normalized.mood,
    targetListener: normalized.targetListener,
    visualTheme: normalized.visualTheme,
    primaryGoal: normalized.primaryGoal,
    merchTieIn: normalized.merchTieIn,
    streamingLink: normalized.streamingLink,
    releaseDate: normalized.releaseDate,
    videoType: normalized.videoType,
    keywords: normalized.keywords,
    notes: normalized.notes,
    completedPrompt: normalized.completedPrompt,
    aiResponse: normalized.aiResponse,
    finalTitle: normalized.finalTitle,
    finalDescription: normalized.finalDescription,
    finalTags: normalized.finalTags,
    finalHashtags: normalized.finalHashtags,
    finalPinnedComment: normalized.finalPinnedComment,
    finalThumbnailText: normalized.finalThumbnailText,
    finalShortsCaption: normalized.finalShortsCaption,
    finalCommunityPost: normalized.finalCommunityPost,
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function youtubePackageToPrismaUpdate(pkg: YouTubePackage) {
  const normalized = normalizeYouTubePackage(pkg)
  return {
    trackTitle: normalized.trackTitle,
    artistName: normalized.artistName,
    channelName: normalized.channelName,
    genre: normalized.genre,
    mood: normalized.mood,
    targetListener: normalized.targetListener,
    visualTheme: normalized.visualTheme,
    primaryGoal: normalized.primaryGoal,
    merchTieIn: normalized.merchTieIn,
    streamingLink: normalized.streamingLink,
    releaseDate: normalized.releaseDate,
    videoType: normalized.videoType,
    keywords: normalized.keywords,
    notes: normalized.notes,
    completedPrompt: normalized.completedPrompt,
    aiResponse: normalized.aiResponse,
    finalTitle: normalized.finalTitle,
    finalDescription: normalized.finalDescription,
    finalTags: normalized.finalTags,
    finalHashtags: normalized.finalHashtags,
    finalPinnedComment: normalized.finalPinnedComment,
    finalThumbnailText: normalized.finalThumbnailText,
    finalShortsCaption: normalized.finalShortsCaption,
    finalCommunityPost: normalized.finalCommunityPost,
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function prismaYouTubePackageToYouTubePackage(
  row: PrismaYouTubePackage,
): YouTubePackage {
  return normalizeYouTubePackage({
    id: row.id,
    trackTitle: row.trackTitle,
    artistName: row.artistName,
    channelName: row.channelName,
    genre: row.genre,
    mood: row.mood,
    targetListener: row.targetListener,
    visualTheme: row.visualTheme,
    primaryGoal: row.primaryGoal,
    merchTieIn: row.merchTieIn,
    streamingLink: row.streamingLink,
    releaseDate: row.releaseDate,
    videoType: row.videoType,
    keywords: row.keywords,
    notes: row.notes,
    completedPrompt: row.completedPrompt,
    aiResponse: row.aiResponse,
    finalTitle: row.finalTitle,
    finalDescription: row.finalDescription,
    finalTags: row.finalTags,
    finalHashtags: row.finalHashtags,
    finalPinnedComment: row.finalPinnedComment,
    finalThumbnailText: row.finalThumbnailText,
    finalShortsCaption: row.finalShortsCaption,
    finalCommunityPost: row.finalCommunityPost,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}
