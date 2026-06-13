/** Encode/decode multi-record links stored in Asset.notes. */

import { classifyDriveFileByPath, getDrivePathFromRawJson } from "@/lib/drive/classify"
import type { AssetRecord } from "@/lib/types"
import type {
  ArtistBibleRecord,
  LoreEntryRecord,
  SongConceptRecord,
  VisualIdentityProfileRecord,
} from "@/lib/artist-universe/types"
import type { CampaignRecord, MerchIdea, YouTubePackage } from "@/lib/types"

export const ASSET_RELATED_LINKS_MARKER = "\n__creatorops_related_links__:"

export type AssetSourceRecordType =
  | "ArtistBible"
  | "VisualIdentityProfile"
  | "LoreEntry"
  | "SongConcept"
  | "Campaign"
  | "Product"
  | "YouTubePackage"
  | "Asset"
  | "DriveFile"
  | "DriveFolder"

export type AssetRelatedLink = {
  recordType: AssetSourceRecordType
  recordId: string
  title: string
}

export type AssetRelatedLinkSuggestion = AssetRelatedLink & {
  reason: string
  confidence: "high" | "medium"
}

export const ASSET_SOURCE_RECORD_LABELS: Record<AssetSourceRecordType, string> = {
  ArtistBible: "Artist Bible",
  VisualIdentityProfile: "Visual Identity",
  LoreEntry: "Lore Entry",
  SongConcept: "Song Concept",
  Campaign: "Campaign",
  Product: "Product / Merch",
  YouTubePackage: "YouTube Packaging",
  Asset: "Asset",
  DriveFile: "Drive File",
  DriveFolder: "Drive Folder",
}

export function stripRelatedLinksFromNotes(notes: string): string {
  const idx = notes.indexOf(ASSET_RELATED_LINKS_MARKER)
  if (idx === -1) return notes
  return notes.slice(0, idx).trimEnd()
}

export function parseRelatedLinksFromNotes(notes: string): AssetRelatedLink[] {
  const idx = notes.indexOf(ASSET_RELATED_LINKS_MARKER)
  if (idx === -1) return []
  try {
    const parsed = JSON.parse(notes.slice(idx + ASSET_RELATED_LINKS_MARKER.length)) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (item): item is AssetRelatedLink =>
          Boolean(
            item &&
              typeof item === "object" &&
              typeof (item as AssetRelatedLink).recordType === "string" &&
              typeof (item as AssetRelatedLink).recordId === "string",
          ),
      )
      .map((item) => ({
        recordType: item.recordType,
        recordId: item.recordId,
        title: item.title?.trim() || ASSET_SOURCE_RECORD_LABELS[item.recordType] || item.recordType,
      }))
  } catch {
    return []
  }
}

export function encodeRelatedLinksInNotes(
  userNotes: string,
  links: AssetRelatedLink[],
): string {
  const stripped = stripRelatedLinksFromNotes(userNotes)
  const deduped = dedupeRelatedLinks(links)
  if (!deduped.length) return stripped
  return `${stripped}${ASSET_RELATED_LINKS_MARKER}${JSON.stringify(deduped)}`.trim()
}

export function dedupeRelatedLinks(links: AssetRelatedLink[]): AssetRelatedLink[] {
  const seen = new Set<string>()
  const out: AssetRelatedLink[] = []
  for (const link of links) {
    const key = `${link.recordType}:${link.recordId}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(link)
  }
  return out
}

export function buildAssetRelatedHref(type: AssetSourceRecordType, id: string): string {
  switch (type) {
    case "ArtistBible":
      return `/artist-bible?recordId=${encodeURIComponent(id)}`
    case "VisualIdentityProfile":
      return `/visual-identity?recordId=${encodeURIComponent(id)}`
    case "LoreEntry":
      return `/lore?recordId=${encodeURIComponent(id)}`
    case "SongConcept":
      return `/song-vault?recordId=${encodeURIComponent(id)}`
    case "Campaign":
      return `/campaigns?campaignId=${encodeURIComponent(id)}`
    case "Product":
      return `/merch-ideas?recordId=${encodeURIComponent(id)}`
    case "YouTubePackage":
      return `/youtube-packaging?recordId=${encodeURIComponent(id)}`
    case "Asset":
      return `/assets?recordId=${encodeURIComponent(id)}`
    case "DriveFile":
    case "DriveFolder":
      return `/integrations?tab=google-drive`
    default:
      return "/assets"
  }
}

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase()
}

function titleFromFileName(name: string): string {
  return name
    .replace(/\.(md|txt|docx?|pdf)$/i, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function fuzzyTitleMatch(a: string, b: string): boolean {
  const na = norm(a)
  const nb = norm(b)
  if (!na || !nb) return false
  return na === nb || na.includes(nb) || nb.includes(na)
}

export type AssetUniverseDataset = {
  artistBibles: ArtistBibleRecord[]
  visualIdentities: VisualIdentityProfileRecord[]
  loreEntries: LoreEntryRecord[]
  songConcepts: SongConceptRecord[]
  campaigns: CampaignRecord[]
  merchIdeas: MerchIdea[]
  youtubePackages: YouTubePackage[]
}

export function suggestRelatedLinksForAsset(
  asset: AssetRecord,
  dataset: AssetUniverseDataset,
  drivePath = "",
): AssetRelatedLinkSuggestion[] {
  const suggestions: AssetRelatedLinkSuggestion[] = []
  const path = drivePath || asset.filePath || ""
  const classification = classifyDriveFileByPath(asset.assetName, path)
  const artist = asset.artistName || classification.artistName
  const song = asset.songTitle || classification.songTitle
  const assetType = asset.assetType || classification.assetType

  const push = (link: AssetRelatedLink, reason: string, confidence: "high" | "medium") => {
    suggestions.push({ ...link, reason, confidence })
  }

  if (assetType === "Artist Bible" || norm(asset.assetName).includes("artist bible")) {
    const bible =
      dataset.artistBibles.find((b) => norm(b.artistName) === norm(artist)) ??
      dataset.artistBibles.find((b) => norm(b.artistName).includes("prettywise"))
    if (bible) {
      push(
        { recordType: "ArtistBible", recordId: bible.id, title: bible.artistName },
        "Filename matches artist bible",
        "high",
      )
    }
  }

  if (assetType === "Visual Identity" || norm(asset.assetName).includes("visual identity")) {
    const profile =
      dataset.visualIdentities.find((v) => norm(v.artistName) === norm(artist)) ??
      dataset.visualIdentities[0]
    if (profile) {
      push(
        {
          recordType: "VisualIdentityProfile",
          recordId: profile.id,
          title: profile.profileName || profile.artistName,
        },
        "Filename matches visual identity",
        "high",
      )
    }
  }

  if (assetType === "Lore" || norm(path).includes("lore")) {
    const fileTitle = titleFromFileName(asset.assetName)
    if (!norm(fileTitle).includes("lore index")) {
      const lore =
        dataset.loreEntries.find((entry) => fuzzyTitleMatch(entry.title, fileTitle)) ??
        dataset.loreEntries.find(
          (entry) =>
            norm(entry.artistName) === norm(artist) &&
            fuzzyTitleMatch(entry.title, fileTitle),
        )
      if (lore) {
        push(
          { recordType: "LoreEntry", recordId: lore.id, title: lore.title },
          "Filename matches lore entry title",
          "high",
        )
      }
    }
  }

  if (
    assetType === "Lyrics" ||
    assetType === "Song Concept" ||
    norm(asset.assetName).includes("lyrics") ||
    norm(asset.assetName).includes("song concept")
  ) {
    const concept =
      dataset.songConcepts.find(
        (c) => norm(c.songTitle) === norm(song) || norm(c.title) === norm(song),
      ) ??
      dataset.songConcepts.find((c) => norm(c.songTitle).includes("no exit"))
    if (concept) {
      push(
        {
          recordType: "SongConcept",
          recordId: concept.id,
          title: concept.songTitle || concept.title,
        },
        "Song title matches concept vault",
        "high",
      )
    }
  }

  if (assetType === "YouTube Metadata" || norm(asset.assetName).includes("youtube metadata")) {
    const concept = dataset.songConcepts.find((c) => norm(c.songTitle) === norm(song))
    if (concept) {
      push(
        {
          recordType: "SongConcept",
          recordId: concept.id,
          title: concept.songTitle || concept.title,
        },
        "YouTube metadata for song",
        "high",
      )
    }
    const campaign =
      dataset.campaigns.find((c) => norm(c.campaignName) === norm(song)) ??
      dataset.campaigns.find((c) => norm(c.songTitle) === norm(song))
    if (campaign) {
      push(
        { recordType: "Campaign", recordId: campaign.id, title: campaign.campaignName },
        "Campaign name matches song",
        "high",
      )
    }
    const pkg = dataset.youtubePackages.find(
      (p) => norm(p.trackTitle) === norm(song) || norm(p.artistName) === norm(artist),
    )
    if (pkg) {
      push(
        {
          recordType: "YouTubePackage",
          recordId: pkg.id,
          title: [pkg.artistName, pkg.trackTitle].filter(Boolean).join(" — ") || "YouTube package",
        },
        "YouTube packaging for track",
        "medium",
      )
    }
  }

  if (assetType === "Merch Ideas" || norm(asset.assetName).includes("merch")) {
    const campaign = dataset.campaigns.find((c) => norm(c.campaignName) === norm(song))
    if (campaign) {
      push(
        { recordType: "Campaign", recordId: campaign.id, title: campaign.campaignName },
        "Merch ideas tied to campaign",
        "medium",
      )
    }
    const merch = dataset.merchIdeas.find(
      (m) => norm(m.selectedConceptName).includes(norm(song)) || norm(m.niche).includes("prettywise"),
    )
    if (merch) {
      push(
        {
          recordType: "Product",
          recordId: merch.id,
          title: merch.selectedConceptName || merch.noun || "Merch idea",
        },
        "Merch idea matches song/artist",
        "medium",
      )
    }
  }

  return dedupeRelatedLinks(suggestions) as AssetRelatedLinkSuggestion[]
}

export function isPrettyWiseAssetCandidate(asset: AssetRecord, drivePath = ""): boolean {
  const combined = `${asset.assetName} ${asset.filePath} ${drivePath} ${asset.artistName} ${asset.songTitle} ${asset.tags.join(" ")}`.toLowerCase()
  return combined.includes("prettywise") || combined.includes("no exit") || combined.includes("no_exit")
}

export function getDrivePathForAsset(asset: AssetRecord, driveFiles: { id: string; rawJson: string }[]): string {
  if (asset.filePath.trim()) return asset.filePath
  if (asset.sourceRecordType === "DriveFile" && asset.sourceRecordId) {
    const file = driveFiles.find((f) => f.id === asset.sourceRecordId)
    if (file) return getDrivePathFromRawJson(file.rawJson)
  }
  return ""
}
