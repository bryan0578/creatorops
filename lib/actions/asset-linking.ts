"use server"

import { revalidatePath } from "next/cache"

import { getAssets, getAssetById, upsertAsset } from "@/lib/actions/assets"
import { getCampaigns } from "@/lib/actions/campaigns"
import {
  createAssetFromDriveFile,
  getDriveFiles,
  getDriveFolders,
  linkDriveFileToAsset,
  linkDriveFolderToCampaign,
} from "@/lib/actions/drive-integration"
import { getMerchIdeas } from "@/lib/actions/merch-ideas"
import { getMockupPromptRecords } from "@/lib/actions/mockup-prompts"
import { getProductListings } from "@/lib/actions/product-listings"
import { getReleasePlans } from "@/lib/actions/release-plans"
import { linkYouTubeVideoToCampaign } from "@/lib/actions/youtube-integration"
import { getYouTubeVideos } from "@/lib/actions/youtube-integration"
import {
  buildAssetLinkSuggestions,
  countLinkingCandidates,
  type AssetLinkingDataset,
} from "@/lib/asset-linking/matchers"
import type {
  AssetLinkSuggestionsInput,
  AssetLinkSuggestionsResponse,
} from "@/lib/asset-linking/types"
import { prismaDriveFileToRecord } from "@/lib/drive/mappers"
import { normalizeAssetRecord } from "@/lib/assets"
import { prisma } from "@/lib/prisma"
import type { AssetRecord } from "@/lib/types"

const REVALIDATE_PATHS = [
  "/",
  "/assets",
  "/integrations",
  "/campaigns",
  "/videos",
  "/product-listings",
  "/merch-ideas",
  "/mockup-prompts",
  "/data-health",
  "/automation",
  "/copilot",
  "/search",
]

function revalidateLinkingRoutes() {
  for (const path of REVALIDATE_PATHS) revalidatePath(path)
}

async function safeLoad<T>(label: string, loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader()
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[AssetLinking] Failed to load ${label}:`,
        error instanceof Error ? error.message : String(error),
      )
    }
    return fallback
  }
}

export async function loadAssetLinkingDataset(): Promise<AssetLinkingDataset> {
  const [
    campaigns,
    assets,
    driveFiles,
    driveFolders,
    youtubeVideos,
    productListings,
    merchIdeas,
    mockupPrompts,
    releasePlans,
  ] = await Promise.all([
    safeLoad("campaigns", () => getCampaigns(), []),
    safeLoad("assets", () => getAssets(), []),
    safeLoad("driveFiles", () => getDriveFiles(), []),
    safeLoad("driveFolders", () => getDriveFolders(), []),
    safeLoad("youtubeVideos", () => getYouTubeVideos(), []),
    safeLoad("productListings", () => getProductListings(), []),
    safeLoad("merchIdeas", () => getMerchIdeas(), []),
    safeLoad("mockupPrompts", () => getMockupPromptRecords(), []),
    safeLoad("releasePlans", () => getReleasePlans(), []),
  ])

  return {
    campaigns,
    assets,
    driveFiles,
    driveFolders,
    youtubeVideos,
    productListings,
    merchIdeas,
    mockupPrompts,
    releasePlans,
  }
}

/** Derive deterministic asset link suggestions from local records (no persistence). */
export async function getAssetLinkSuggestions(
  input: AssetLinkSuggestionsInput = {},
): Promise<AssetLinkSuggestionsResponse> {
  try {
    const dataset = await loadAssetLinkingDataset()
    const suggestions = buildAssetLinkSuggestions(dataset, input)
    return {
      suggestions,
      scannedAt: Date.now(),
      totalCandidates: countLinkingCandidates(dataset),
    }
  } catch {
    return { suggestions: [], scannedAt: Date.now(), totalCandidates: 0 }
  }
}

async function resolveCampaignFields(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId.trim() } })
  if (!campaign) return null
  return {
    campaignId: campaign.id,
    campaignName: campaign.campaignName,
    artistName: campaign.artistName,
    songTitle: campaign.songTitle,
    productName: campaign.productName,
  }
}

export async function applyDriveFileToCampaign(
  driveFileId: string,
  campaignId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const row = await prisma.driveFile.findFirst({
      where: { OR: [{ id: driveFileId }, { driveFileId }] },
    })
    if (!row) return { success: false, message: "Drive file not found." }

    const fields = await resolveCampaignFields(campaignId)
    if (!fields) return { success: false, message: "Campaign not found." }

    const file = prismaDriveFileToRecord(row)
    await prisma.driveFile.update({
      where: { id: file.id },
      data: {
        campaignId: fields.campaignId,
        campaignName: fields.campaignName,
        artistName: file.artistName || fields.artistName,
        songTitle: file.songTitle || fields.songTitle,
        productName: file.productName || fields.productName,
        updatedAt: new Date(),
      },
    })

    revalidateLinkingRoutes()
    return { success: true, message: `Linked "${file.name}" to ${fields.campaignName}.` }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not link Drive file to campaign.",
    }
  }
}

export async function applyDriveFileToAsset(
  driveFileId: string,
  assetId: string,
): Promise<{ success: boolean; message: string }> {
  const result = await linkDriveFileToAsset(driveFileId, assetId)
  if (!result.success) return result

  try {
    const asset = await getAssetById(assetId)
    if (asset && !asset.sourceRecordType?.trim()) {
      const fileRow = await prisma.driveFile.findFirst({
        where: { OR: [{ id: driveFileId }, { driveFileId }] },
      })
      if (fileRow) {
        await upsertAsset(
          normalizeAssetRecord({
            ...asset,
            sourceRecordType: asset.sourceRecordType || "DriveFile",
            sourceRecordId: asset.sourceRecordId || fileRow.id,
            sourceTool: asset.sourceTool || "Google Drive",
            updatedAt: Date.now(),
          }),
        )
      }
    }
  } catch {
    // Non-fatal — link succeeded
  }

  revalidateLinkingRoutes()
  return result
}

export async function createAssetFromDriveFileSuggestion(
  driveFileId: string,
  campaignId?: string,
): Promise<{ success: boolean; message: string; assetId?: string }> {
  try {
    if (campaignId?.trim()) {
      await applyDriveFileToCampaign(driveFileId, campaignId)
    }
    const result = await createAssetFromDriveFile(driveFileId)
    revalidateLinkingRoutes()
    return {
      success: result.success,
      message: result.message,
      assetId: result.asset?.id,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not create asset from Drive file.",
    }
  }
}

export async function applyDriveFileToYouTubeVideo(
  driveFileId: string,
  youtubeVideoId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const [fileRow, videoRow] = await Promise.all([
      prisma.driveFile.findFirst({
        where: { OR: [{ id: driveFileId }, { driveFileId }] },
      }),
      prisma.youTubeVideo.findUnique({ where: { id: youtubeVideoId.trim() } }),
    ])
    if (!fileRow) return { success: false, message: "Drive file not found." }
    if (!videoRow) return { success: false, message: "YouTube video not found." }

    const file = prismaDriveFileToRecord(fileRow)
    const updates: Record<string, string> = {}
    if (videoRow.campaignId && !file.campaignId) {
      updates.campaignId = videoRow.campaignId
      updates.campaignName = videoRow.campaignName
    }
    if (videoRow.artistName && !file.artistName) updates.artistName = videoRow.artistName
    if (videoRow.songTitle && !file.songTitle) updates.songTitle = videoRow.songTitle

    const noteSuffix = `Linked to YouTube video ${videoRow.title} (${youtubeVideoId}).`
    const notes = file.notes?.includes(noteSuffix)
      ? file.notes
      : [file.notes, noteSuffix].filter(Boolean).join("\n")

    await prisma.driveFile.update({
      where: { id: file.id },
      data: { ...updates, notes, updatedAt: new Date() },
    })

    if (videoRow.campaignId && !file.campaignId) {
      await applyDriveFileToCampaign(file.id, videoRow.campaignId)
    }

    revalidateLinkingRoutes()
    return {
      success: true,
      message: `Associated "${file.name}" with YouTube video "${videoRow.title}".`,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not link Drive file to video.",
    }
  }
}

export async function applyAssetToCampaign(
  assetId: string,
  campaignId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const [asset, fields] = await Promise.all([
      getAssetById(assetId),
      resolveCampaignFields(campaignId),
    ])
    if (!asset) return { success: false, message: "Asset not found." }
    if (!fields) return { success: false, message: "Campaign not found." }

    await upsertAsset(
      normalizeAssetRecord({
        ...asset,
        campaignId: fields.campaignId,
        campaignName: fields.campaignName,
        artistName: asset.artistName || fields.artistName,
        songTitle: asset.songTitle || fields.songTitle,
        productName: asset.productName || fields.productName,
        updatedAt: Date.now(),
      }),
    )

    revalidateLinkingRoutes()
    return { success: true, message: `Linked asset to ${fields.campaignName}.` }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not link asset to campaign.",
    }
  }
}

export async function applyAssetToYouTubeVideo(
  assetId: string,
  youtubeVideoId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const [asset, videoRow] = await Promise.all([
      getAssetById(assetId),
      prisma.youTubeVideo.findUnique({ where: { id: youtubeVideoId.trim() } }),
    ])
    if (!asset) return { success: false, message: "Asset not found." }
    if (!videoRow) return { success: false, message: "YouTube video not found." }

    const patch: Partial<AssetRecord> = { ...asset, updatedAt: Date.now() }
    if (videoRow.campaignId && !asset.campaignId?.trim()) {
      patch.campaignId = videoRow.campaignId
      patch.campaignName = videoRow.campaignName
      patch.artistName = asset.artistName || videoRow.artistName
      patch.songTitle = asset.songTitle || videoRow.songTitle
    }
    if (!asset.externalUrl?.trim() && videoRow.videoUrl) {
      patch.externalUrl = videoRow.videoUrl
    }
    if (!asset.sourceRecordType?.trim()) {
      patch.sourceRecordType = "YouTubeVideo"
      patch.sourceRecordId = videoRow.id
    }

    await upsertAsset(normalizeAssetRecord(patch as AssetRecord))
    revalidateLinkingRoutes()
    return { success: true, message: `Linked asset to YouTube video "${videoRow.title}".` }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not link asset to video.",
    }
  }
}

export async function applyFolderToCampaign(
  driveFolderId: string,
  campaignId: string,
): Promise<{ success: boolean; message: string }> {
  const result = await linkDriveFolderToCampaign(driveFolderId, campaignId)
  revalidateLinkingRoutes()
  return result
}

export async function applyYouTubeVideoToCampaign(
  youtubeVideoId: string,
  campaignId: string,
): Promise<{ success: boolean; message: string }> {
  const result = await linkYouTubeVideoToCampaign(youtubeVideoId, campaignId)
  revalidateLinkingRoutes()
  return result
}

export { loadAssetLinkingDataset as loadAssetLinkingDatasetForScans }
