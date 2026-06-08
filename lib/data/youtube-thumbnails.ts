import { normalizeYouTubeThumbnailRecord } from "@/lib/youtube-thumbnails"
import type { YouTubeThumbnailRecord } from "@/lib/types"
import type { YouTubeThumbnail as PrismaYouTubeThumbnail } from "@/lib/generated/prisma/client"

/**
 * Shared YouTube thumbnail data layer — maps between app types and Prisma rows.
 */

export { normalizeYouTubeThumbnailRecord } from "@/lib/youtube-thumbnails"

export function youtubeThumbnailToPrismaCreate(record: YouTubeThumbnailRecord) {
  const normalized = normalizeYouTubeThumbnailRecord(record)
  return {
    id: normalized.id,
    trackTitle: normalized.trackTitle,
    artistName: normalized.artistName,
    videoTitle: normalized.videoTitle,
    contentFormat: normalized.contentFormat,
    videoType: normalized.videoType,
    genre: normalized.genre,
    mood: normalized.mood,
    targetAudience: normalized.targetAudience,
    visualTheme: normalized.visualTheme,
    hookAngle: normalized.hookAngle,
    mainSubject: normalized.mainSubject,
    textOverlay: normalized.textOverlay,
    colorDirection: normalized.colorDirection,
    brandingNotes: normalized.brandingNotes,
    referenceStyle: normalized.referenceStyle,
    ctaGoal: normalized.ctaGoal,
    notes: normalized.notes,
    completedPrompt: normalized.completedPrompt,
    aiResponse: normalized.aiResponse,
    finalConcept: normalized.finalConcept,
    finalTextOverlay: normalized.finalTextOverlay,
    finalComposition: normalized.finalComposition,
    finalColorDirection: normalized.finalColorDirection,
    finalImagePrompt: normalized.finalImagePrompt,
    finalAltVariation: normalized.finalAltVariation,
    finalShortsVersion: normalized.finalShortsVersion,
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function youtubeThumbnailToPrismaUpdate(record: YouTubeThumbnailRecord) {
  const normalized = normalizeYouTubeThumbnailRecord(record)
  return {
    trackTitle: normalized.trackTitle,
    artistName: normalized.artistName,
    videoTitle: normalized.videoTitle,
    contentFormat: normalized.contentFormat,
    videoType: normalized.videoType,
    genre: normalized.genre,
    mood: normalized.mood,
    targetAudience: normalized.targetAudience,
    visualTheme: normalized.visualTheme,
    hookAngle: normalized.hookAngle,
    mainSubject: normalized.mainSubject,
    textOverlay: normalized.textOverlay,
    colorDirection: normalized.colorDirection,
    brandingNotes: normalized.brandingNotes,
    referenceStyle: normalized.referenceStyle,
    ctaGoal: normalized.ctaGoal,
    notes: normalized.notes,
    completedPrompt: normalized.completedPrompt,
    aiResponse: normalized.aiResponse,
    finalConcept: normalized.finalConcept,
    finalTextOverlay: normalized.finalTextOverlay,
    finalComposition: normalized.finalComposition,
    finalColorDirection: normalized.finalColorDirection,
    finalImagePrompt: normalized.finalImagePrompt,
    finalAltVariation: normalized.finalAltVariation,
    finalShortsVersion: normalized.finalShortsVersion,
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function prismaYouTubeThumbnailToRecord(
  row: PrismaYouTubeThumbnail,
): YouTubeThumbnailRecord {
  return normalizeYouTubeThumbnailRecord({
    id: row.id,
    trackTitle: row.trackTitle,
    artistName: row.artistName,
    videoTitle: row.videoTitle,
    contentFormat: row.contentFormat,
    videoType: row.videoType,
    genre: row.genre,
    mood: row.mood,
    targetAudience: row.targetAudience,
    visualTheme: row.visualTheme,
    hookAngle: row.hookAngle,
    mainSubject: row.mainSubject,
    textOverlay: row.textOverlay,
    colorDirection: row.colorDirection,
    brandingNotes: row.brandingNotes,
    referenceStyle: row.referenceStyle,
    ctaGoal: row.ctaGoal,
    notes: row.notes,
    completedPrompt: row.completedPrompt,
    aiResponse: row.aiResponse,
    finalConcept: row.finalConcept,
    finalTextOverlay: row.finalTextOverlay,
    finalComposition: row.finalComposition,
    finalColorDirection: row.finalColorDirection,
    finalImagePrompt: row.finalImagePrompt,
    finalAltVariation: row.finalAltVariation,
    finalShortsVersion: row.finalShortsVersion,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}
