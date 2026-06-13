import type { CreatorOpsRecordType, RelatedRecordOption } from "@/lib/related-records/types"
import { RECORD_TYPE_LABELS } from "@/lib/related-records/types"

export function buildRecordHref(type: CreatorOpsRecordType, id: string): string {
  switch (type) {
    case "ArtistBible":
      return `/artist-bible?recordId=${encodeURIComponent(id)}`
    case "VisualIdentityProfile":
      return `/visual-identity?recordId=${encodeURIComponent(id)}`
    case "LoreEntry":
      return `/lore?recordId=${encodeURIComponent(id)}`
    case "SongConcept":
      return `/song-vault?recordId=${encodeURIComponent(id)}`
    case "ReleaseStoryArc":
      return `/story-arcs?recordId=${encodeURIComponent(id)}`
    case "Asset":
      return `/assets?recordId=${encodeURIComponent(id)}`
    case "Campaign":
      return `/campaigns?campaignId=${encodeURIComponent(id)}`
    case "Product":
      return `/merch-ideas?recordId=${encodeURIComponent(id)}`
    case "ProductResearch":
      return `/product-research?recordId=${encodeURIComponent(id)}`
    case "YouTubeVideo":
      return `/videos?recordId=${encodeURIComponent(id)}`
    case "YouTubePackage":
      return `/youtube-packaging?recordId=${encodeURIComponent(id)}`
    case "DriveFile":
    case "DriveFolder":
      return `/integrations?tab=google-drive`
    case "ExternalLink":
      return `/integrations?tab=external-links&recordId=${encodeURIComponent(id)}`
    default:
      return "/"
  }
}

export function optionFromFields(
  type: CreatorOpsRecordType,
  id: string,
  title: string,
  fields: {
    subtitle?: string
    artistName?: string
    songTitle?: string
    status?: string
    tags?: string[]
  } = {},
): RelatedRecordOption {
  return {
    id,
    type,
    title: title.trim() || RECORD_TYPE_LABELS[type],
    subtitle: fields.subtitle?.trim() ?? "",
    artistName: fields.artistName?.trim() ?? "",
    songTitle: fields.songTitle?.trim() ?? "",
    status: fields.status?.trim() ?? "",
    tags: fields.tags ?? [],
    href: buildRecordHref(type, id),
  }
}

export type RelatedRecordCatalog = {
  artistBibles: RelatedRecordOption[]
  visualIdentities: RelatedRecordOption[]
  loreEntries: RelatedRecordOption[]
  songConcepts: RelatedRecordOption[]
  storyArcs: RelatedRecordOption[]
  assets: RelatedRecordOption[]
  campaigns: RelatedRecordOption[]
  products: RelatedRecordOption[]
  youtubeVideos: RelatedRecordOption[]
  youtubePackages: RelatedRecordOption[]
  driveFiles: RelatedRecordOption[]
  driveFolders: RelatedRecordOption[]
  externalLinks: RelatedRecordOption[]
}

export function allCatalogOptions(catalog: RelatedRecordCatalog): RelatedRecordOption[] {
  return [
    ...catalog.artistBibles,
    ...catalog.visualIdentities,
    ...catalog.loreEntries,
    ...catalog.songConcepts,
    ...catalog.storyArcs,
    ...catalog.assets,
    ...catalog.campaigns,
    ...catalog.products,
    ...catalog.youtubeVideos,
    ...catalog.youtubePackages,
    ...catalog.driveFiles,
    ...catalog.driveFolders,
    ...catalog.externalLinks,
  ]
}

export function catalogOptionsByType(
  catalog: RelatedRecordCatalog,
  type: CreatorOpsRecordType,
): RelatedRecordOption[] {
  switch (type) {
    case "ArtistBible":
      return catalog.artistBibles
    case "VisualIdentityProfile":
      return catalog.visualIdentities
    case "LoreEntry":
      return catalog.loreEntries
    case "SongConcept":
      return catalog.songConcepts
    case "ReleaseStoryArc":
      return catalog.storyArcs
    case "Asset":
      return catalog.assets
    case "Campaign":
      return catalog.campaigns
    case "Product":
      return catalog.products
    case "YouTubeVideo":
      return catalog.youtubeVideos
    case "YouTubePackage":
      return catalog.youtubePackages
    case "DriveFile":
      return catalog.driveFiles
    case "DriveFolder":
      return catalog.driveFolders
    case "ExternalLink":
      return catalog.externalLinks
    default:
      return []
  }
}

export function findCatalogOption(
  catalog: RelatedRecordCatalog,
  type: CreatorOpsRecordType,
  id: string,
): RelatedRecordOption | null {
  return catalogOptionsByType(catalog, type).find((item) => item.id === id) ?? null
}
