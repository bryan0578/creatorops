import type { LoreEntryRecord, SongConceptRecord } from "@/lib/artist-universe/types"
import type { AssetRecord, YouTubeVideoRecord } from "@/lib/types"

export const PUBLISHED_SONG_PLATFORMS = [
  "YouTube",
  "Spotify",
  "Apple Music",
  "Suno",
  "TikTok",
  "Instagram",
  "Fourthwall",
  "Other",
] as const

export type PublishedSongPlatform = (typeof PUBLISHED_SONG_PLATFORMS)[number]

const PUBLISHED_STATUSES = new Set(["published", "released"])

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase()
}

function slug(value: string): string {
  return norm(value).replace(/\s+/g, "-")
}

export function isYouTubeUrl(url: string): boolean {
  const lower = url.trim().toLowerCase()
  return lower.includes("youtube.com") || lower.includes("youtu.be")
}

export function extractYouTubeUrlFromConcept(concept: SongConceptRecord): string {
  if (concept.publishedUrl.trim() && isYouTubeUrl(concept.publishedUrl)) {
    return concept.publishedUrl.trim()
  }
  const haystack = `${concept.notes} ${concept.youtubeAngle} ${concept.tags.join(" ")}`
  const match = haystack.match(/https?:\/\/[^\s]*(?:youtube\.com|youtu\.be)[^\s]*/i)
  return match?.[0]?.trim() ?? ""
}

export function isPublishedSong(concept: SongConceptRecord): boolean {
  if (PUBLISHED_STATUSES.has(norm(concept.status))) return true
  if (concept.publishedUrl.trim()) return true
  if (extractYouTubeUrlFromConcept(concept)) return true
  if (concept.releaseStatus.trim() && PUBLISHED_STATUSES.has(norm(concept.releaseStatus))) {
    return true
  }
  return false
}

export function filterPublishedSongs(concepts: SongConceptRecord[]): SongConceptRecord[] {
  return concepts.filter(isPublishedSong)
}

export function publishedSongMissingUrl(concept: SongConceptRecord): boolean {
  const statusPublished =
    PUBLISHED_STATUSES.has(norm(concept.status)) ||
    PUBLISHED_STATUSES.has(norm(concept.releaseStatus))
  return statusPublished && !concept.publishedUrl.trim()
}

export function matchLoreForSong(
  concept: SongConceptRecord,
  loreEntries: LoreEntryRecord[],
): LoreEntryRecord[] {
  const byId = new Set(concept.relatedLoreIds)
  const songSlug = slug(concept.songTitle || concept.title)
  const artist = norm(concept.artistName)

  return loreEntries.filter((entry) => {
    if (byId.has(entry.id)) return true
    if (norm(entry.artistName) !== artist) return false
    if (entry.relatedSongs.some((song) => norm(song) === songSlug)) return true
    if (songSlug && norm(entry.title).includes(songSlug)) return true
    return false
  })
}

export function matchAssetsForSong(
  concept: SongConceptRecord,
  assets: AssetRecord[],
): AssetRecord[] {
  const linkedIds = new Set(concept.relatedAssetIds)
  const artist = norm(concept.artistName)
  const songSlug = slug(concept.songTitle || concept.title)

  return assets.filter((asset) => {
    if (linkedIds.has(asset.id)) return true
    if (norm(asset.artistName) !== artist && !norm(asset.assetName).includes(artist)) return false
    if (songSlug) {
      const haystack = `${asset.assetName} ${asset.filePath} ${asset.tags.join(" ")}`.toLowerCase()
      if (haystack.includes(songSlug.replace(/-/g, " ")) || haystack.includes(songSlug)) {
        return true
      }
    }
    if (norm(asset.songTitle) === songSlug) return true
    return false
  })
}

export function suggestYouTubeVideoForSong(
  concept: SongConceptRecord,
  videos: YouTubeVideoRecord[],
): YouTubeVideoRecord | null {
  if (concept.relatedYouTubeVideoId.trim()) {
    return videos.find((video) => video.id === concept.relatedYouTubeVideoId) ?? null
  }

  const songTitle = concept.songTitle || concept.title
  const artist = norm(concept.artistName)
  const songNorm = norm(songTitle)

  return (
    videos.find(
      (video) =>
        (norm(video.artistName) === artist || norm(video.title).includes(artist)) &&
        norm(video.title).includes(songNorm),
    ) ??
    videos.find((video) => norm(video.songTitle) === songNorm) ??
    null
  )
}

export function publishedSongPerformancePreview(concept: SongConceptRecord): string {
  const text = concept.performanceNotes.trim()
  if (!text) return ""
  return text.length > 120 ? `${text.slice(0, 117)}…` : text
}

export function daysSincePublished(concept: SongConceptRecord): number | null {
  const raw = concept.publishedDate.trim()
  if (!raw) return null
  const ts = Date.parse(raw)
  if (Number.isNaN(ts)) return null
  return Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000))
}

export type PublishedSongSummary = {
  concept: SongConceptRecord
  displayTitle: string
  publishedUrl: string
  loreCount: number
  assetCount: number
  performancePreview: string
  futureMerchPreview: string
  futureCampaignPreview: string
  missingPublishedUrl: boolean
  hasCampaign: boolean
  linkedYouTubeVideo: YouTubeVideoRecord | null
}

export function buildPublishedSongSummary(
  concept: SongConceptRecord,
  loreEntries: LoreEntryRecord[],
  assets: AssetRecord[],
  youtubeVideos: YouTubeVideoRecord[],
): PublishedSongSummary {
  const matchedLore = matchLoreForSong(concept, loreEntries)
  const matchedAssets = matchAssetsForSong(concept, assets)
  const linkedYouTubeVideo = suggestYouTubeVideoForSong(concept, youtubeVideos)
  const publishedUrl = concept.publishedUrl.trim() || linkedYouTubeVideo?.videoUrl || extractYouTubeUrlFromConcept(concept)

  return {
    concept,
    displayTitle: concept.songTitle || concept.title,
    publishedUrl,
    loreCount: matchedLore.length,
    assetCount: matchedAssets.length,
    performancePreview: publishedSongPerformancePreview(concept),
    futureMerchPreview: concept.futureMerchIdeas.trim() || concept.productTieIn.trim(),
    futureCampaignPreview: concept.futureCampaignIdeas.trim(),
    missingPublishedUrl: publishedSongMissingUrl(concept),
    hasCampaign: Boolean(concept.campaignId.trim()),
    linkedYouTubeVideo,
  }
}

export function buildPublishedSongSummaries(
  concepts: SongConceptRecord[],
  loreEntries: LoreEntryRecord[],
  assets: AssetRecord[],
  youtubeVideos: YouTubeVideoRecord[],
): PublishedSongSummary[] {
  return filterPublishedSongs(concepts).map((concept) =>
    buildPublishedSongSummary(concept, loreEntries, assets, youtubeVideos),
  )
}
