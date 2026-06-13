"use server"

import { revalidatePath } from "next/cache"

import { getArtistBibles } from "@/lib/actions/artist-bible"
import { getAssetById, getAssets, upsertAsset } from "@/lib/actions/assets"
import { getCampaigns } from "@/lib/actions/campaigns"
import { getDriveFiles } from "@/lib/actions/drive-integration"
import { getLoreEntries } from "@/lib/actions/lore"
import { getMerchIdeas } from "@/lib/actions/merch-ideas"
import { getSongConcepts } from "@/lib/actions/song-concepts"
import { getVisualIdentityProfiles } from "@/lib/actions/visual-identity"
import { getYouTubePackages } from "@/lib/actions/youtube-packages"
import {
  ASSET_SOURCE_RECORD_LABELS,
  dedupeRelatedLinks,
  encodeRelatedLinksInNotes,
  getDrivePathForAsset,
  isPrettyWiseAssetCandidate,
  parseRelatedLinksFromNotes,
  suggestRelatedLinksForAsset,
  stripRelatedLinksFromNotes,
  type AssetRelatedLink,
  type AssetRelatedLinkSuggestion,
  type AssetSourceRecordType,
  type AssetUniverseDataset,
} from "@/lib/asset-linking/asset-related-links"
import { prismaAssetToAssetRecord } from "@/lib/data/assets"
import { prisma } from "@/lib/prisma"
import type { AssetRecord } from "@/lib/types"

const PATHS = ["/", "/assets", "/artist-bible", "/lore", "/song-vault", "/visual-identity", "/campaigns", "/youtube-packaging", "/integrations"]

function revalidate() {
  for (const path of PATHS) revalidatePath(path)
}

async function loadUniverseDataset(): Promise<AssetUniverseDataset> {
  const [
    artistBibles,
    visualIdentities,
    loreEntries,
    songConcepts,
    campaigns,
    merchIdeas,
    youtubePackages,
  ] = await Promise.all([
    getArtistBibles().catch(() => []),
    getVisualIdentityProfiles().catch(() => []),
    getLoreEntries().catch(() => []),
    getSongConcepts().catch(() => []),
    getCampaigns().catch(() => []),
    getMerchIdeas().catch(() => []),
    getYouTubePackages().catch(() => []),
  ])
  return {
    artistBibles,
    visualIdentities,
    loreEntries,
    songConcepts,
    campaigns,
    merchIdeas,
    youtubePackages,
  }
}

export type AssetLinkingOptions = {
  artistBibles: { id: string; label: string }[]
  visualIdentities: { id: string; label: string }[]
  loreEntries: { id: string; label: string }[]
  songConcepts: { id: string; label: string }[]
  campaigns: { id: string; label: string }[]
  products: { id: string; label: string }[]
  youtubePackages: { id: string; label: string }[]
}

export async function getAssetLinkingOptions(): Promise<AssetLinkingOptions> {
  const dataset = await loadUniverseDataset()
  return {
    artistBibles: dataset.artistBibles.map((b) => ({
      id: b.id,
      label: b.artistName || b.projectName || "Artist Bible",
    })),
    visualIdentities: dataset.visualIdentities.map((v) => ({
      id: v.id,
      label: v.profileName || v.artistName || "Visual Identity",
    })),
    loreEntries: dataset.loreEntries.map((l) => ({
      id: l.id,
      label: l.title || "Lore entry",
    })),
    songConcepts: dataset.songConcepts.map((s) => ({
      id: s.id,
      label: s.songTitle || s.title || "Song concept",
    })),
    campaigns: dataset.campaigns.map((c) => ({
      id: c.id,
      label: c.campaignName || "Campaign",
    })),
    products: dataset.merchIdeas.map((m) => ({
      id: m.id,
      label: m.selectedConceptName || m.noun || "Merch idea",
    })),
    youtubePackages: dataset.youtubePackages.map((p) => ({
      id: p.id,
      label: [p.artistName, p.trackTitle].filter(Boolean).join(" — ") || "YouTube package",
    })),
  }
}

export async function getAssetRelatedLinks(assetId: string): Promise<{
  links: AssetRelatedLink[]
  suggestions: AssetRelatedLinkSuggestion[]
}> {
  const asset = await getAssetById(assetId.trim())
  if (!asset) return { links: [], suggestions: [] }

  const [dataset, driveFiles] = await Promise.all([loadUniverseDataset(), getDriveFiles()])
  const drivePath = getDrivePathForAsset(asset, driveFiles)
  const links = parseRelatedLinksFromNotes(asset.notes)
  const allSuggestions = suggestRelatedLinksForAsset(asset, dataset, drivePath)
  const linkedKeys = new Set(links.map((l) => `${l.recordType}:${l.recordId}`))
  const suggestions = allSuggestions.filter(
    (s) => !linkedKeys.has(`${s.recordType}:${s.recordId}`),
  )

  return { links, suggestions }
}

function titleForLink(
  type: AssetSourceRecordType,
  recordId: string,
  options: AssetLinkingOptions,
): string {
  const lists: Record<AssetSourceRecordType, { id: string; label: string }[]> = {
    ArtistBible: options.artistBibles,
    VisualIdentityProfile: options.visualIdentities,
    LoreEntry: options.loreEntries,
    SongConcept: options.songConcepts,
    Campaign: options.campaigns,
    Product: options.products,
    YouTubePackage: options.youtubePackages,
    Asset: [],
    DriveFile: [],
    DriveFolder: [],
  }
  const match = lists[type]?.find((item) => item.id === recordId)
  return match?.label || ASSET_SOURCE_RECORD_LABELS[type]
}

export async function applyAssetRelatedLink(
  assetId: string,
  link: AssetRelatedLink,
): Promise<{ success: boolean; message: string; asset?: AssetRecord }> {
  try {
    const asset = await getAssetById(assetId.trim())
    if (!asset) return { success: false, message: "Asset not found." }

    const options = await getAssetLinkingOptions()
    const existing = parseRelatedLinksFromNotes(asset.notes)
    const next = dedupeRelatedLinks([
      ...existing,
      {
        recordType: link.recordType,
        recordId: link.recordId,
        title: link.title || titleForLink(link.recordType, link.recordId, options),
      },
    ])

    const userNotes = stripRelatedLinksFromNotes(asset.notes)
    const saved = await upsertAsset({
      ...asset,
      notes: encodeRelatedLinksInNotes(userNotes, next),
      updatedAt: Date.now(),
    })
    revalidate()
    return { success: true, message: "Link applied.", asset: saved }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not apply link.",
    }
  }
}

export async function removeAssetRelatedLink(
  assetId: string,
  recordType: AssetSourceRecordType,
  recordId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const asset = await getAssetById(assetId.trim())
    if (!asset) return { success: false, message: "Asset not found." }

    const existing = parseRelatedLinksFromNotes(asset.notes)
    const next = existing.filter(
      (link) => !(link.recordType === recordType && link.recordId === recordId),
    )
    const userNotes = stripRelatedLinksFromNotes(asset.notes)
    await upsertAsset({
      ...asset,
      notes: encodeRelatedLinksInNotes(userNotes, next),
      updatedAt: Date.now(),
    })
    revalidate()
    return { success: true, message: "Link removed." }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not remove link.",
    }
  }
}

export type AutoLinkPrettyWiseResult = {
  success: boolean
  message: string
  linked: number
  suggestionsNeedReview: number
  errors: number
  details: string[]
}

export async function autoLinkPrettyWiseAssets(
  applyHighConfidence = false,
): Promise<AutoLinkPrettyWiseResult> {
  const details: string[] = []
  let linked = 0
  let suggestionsNeedReview = 0
  let errors = 0

  try {
    const [assets, dataset, driveFiles] = await Promise.all([
      getAssets(),
      loadUniverseDataset(),
      getDriveFiles(),
    ])

    const candidates = assets.filter((asset) =>
      isPrettyWiseAssetCandidate(asset, getDrivePathForAsset(asset, driveFiles)),
    )

    for (const asset of candidates) {
      const drivePath = getDrivePathForAsset(asset, driveFiles)
      const existing = parseRelatedLinksFromNotes(asset.notes)
      const suggestions = suggestRelatedLinksForAsset(asset, dataset, drivePath).filter(
        (s) =>
          !existing.some(
            (l) => l.recordType === s.recordType && l.recordId === s.recordId,
          ),
      )

      if (!suggestions.length) continue

      const toApply = applyHighConfidence
        ? suggestions.filter((s) => s.confidence === "high")
        : []
      const pending = applyHighConfidence
        ? suggestions.filter((s) => s.confidence !== "high")
        : suggestions

      suggestionsNeedReview += pending.length

      if (!toApply.length) continue

      try {
        const next = dedupeRelatedLinks([
          ...existing,
          ...toApply.map(({ recordType, recordId, title }) => ({
            recordType,
            recordId,
            title,
          })),
        ])
        const userNotes = stripRelatedLinksFromNotes(asset.notes)
        await upsertAsset({
          ...asset,
          notes: encodeRelatedLinksInNotes(userNotes, next),
          updatedAt: Date.now(),
        })
        linked += toApply.length
        details.push(`${asset.assetName}: linked ${toApply.length}`)
      } catch {
        errors += 1
        details.push(`${asset.assetName}: error applying links`)
      }
    }

    revalidate()
    return {
      success: true,
      message: `${linked} assets linked · ${suggestionsNeedReview} suggestions need review · ${errors} errors`,
      linked,
      suggestionsNeedReview,
      errors,
      details,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Auto-link failed.",
      linked,
      suggestionsNeedReview,
      errors: errors + 1,
      details,
    }
  }
}

export async function mergeRelatedLinksOnAssetSave(
  assetId: string,
  userNotes: string,
): Promise<string> {
  const row = await prisma.asset.findUnique({ where: { id: assetId.trim() } })
  if (!row) return userNotes
  const asset = prismaAssetToAssetRecord(row)
  const links = parseRelatedLinksFromNotes(asset.notes)
  return encodeRelatedLinksInNotes(stripRelatedLinksFromNotes(userNotes), links)
}
