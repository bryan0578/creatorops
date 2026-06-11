import {
  buildSuggestionId,
  combineSignals,
  containsPhrase,
  meetsSuggestionThreshold,
  mergeReasons,
  scoreAssetTypeMatch,
  scoreContainsPhrase,
  scoreExactNormalizedMatch,
  scoreIdMatch,
  scoreTagOverlap,
  scoreTokenOverlap,
  scoreUrlMatch,
} from "@/lib/asset-linking/scoring"
import type {
  AssetLinkSuggestion,
  AssetLinkSuggestionsInput,
} from "@/lib/asset-linking/types"
import type {
  AssetRecord,
  CampaignRecord,
  DriveFileRecord,
  DriveFolderRecord,
  MerchIdea,
  MockupPromptRecord,
  ProductListing,
  ReleasePlan,
  YouTubeVideoRecord,
} from "@/lib/types"

export interface AssetLinkingDataset {
  campaigns: CampaignRecord[]
  assets: AssetRecord[]
  driveFiles: DriveFileRecord[]
  driveFolders: DriveFolderRecord[]
  youtubeVideos: YouTubeVideoRecord[]
  productListings: ProductListing[]
  merchIdeas: MerchIdea[]
  mockupPrompts: MockupPromptRecord[]
  releasePlans: ReleasePlan[]
}

function campaignText(campaign: CampaignRecord): string {
  return [
    campaign.campaignName,
    campaign.songTitle,
    campaign.artistName,
    campaign.productName,
    campaign.niche,
  ]
    .filter(Boolean)
    .join(" ")
}

function fileText(file: DriveFileRecord): string {
  return [file.name, file.campaignName, file.artistName, file.songTitle, file.productName].join(" ")
}

function assetText(asset: AssetRecord): string {
  return [
    asset.assetName,
    asset.campaignName,
    asset.artistName,
    asset.songTitle,
    asset.productName,
    asset.assetType,
  ].join(" ")
}

function productText(product: ProductListing): string {
  return [product.finalTitle, product.designConcept, product.primaryKeyword, product.niche].join(" ")
}

function merchText(idea: MerchIdea): string {
  return [
    idea.selectedProductTitle,
    idea.selectedConceptName,
    idea.audience,
    idea.styleDirection,
  ].join(" ")
}

function mockupText(prompt: MockupPromptRecord): string {
  return [prompt.projectName, prompt.designConcept, prompt.mockupType, prompt.productType].join(" ")
}

function suggestionHref(type: string, id: string): string {
  switch (type) {
    case "campaign":
      return `/campaigns?campaignId=${encodeURIComponent(id)}`
    case "asset":
      return `/assets?recordId=${encodeURIComponent(id)}`
    case "drive-file":
      return `/integrations?tab=google-drive&fileId=${encodeURIComponent(id)}`
    case "drive-folder":
      return `/integrations?tab=google-drive&folderId=${encodeURIComponent(id)}`
    case "youtube-video":
      return `/videos?recordId=${encodeURIComponent(id)}`
    case "product-listing":
      return `/product-listings?recordId=${encodeURIComponent(id)}`
    case "merch-idea":
      return `/merch-ideas?recordId=${encodeURIComponent(id)}`
    case "mockup-prompt":
      return `/mockup-prompts?recordId=${encodeURIComponent(id)}`
    default:
      return "/assets"
  }
}

function pushSuggestion(
  bucket: AssetLinkSuggestion[],
  seen: Set<string>,
  suggestion: Omit<AssetLinkSuggestion, "id"> & { id?: string },
) {
  const id =
    suggestion.id ??
    buildSuggestionId([
      suggestion.suggestionType,
      suggestion.sourceType,
      suggestion.sourceId,
      suggestion.targetType,
      suggestion.targetId,
    ])
  if (seen.has(id)) return
  if (!meetsSuggestionThreshold(suggestion.score)) return
  seen.add(id)
  bucket.push({ ...suggestion, id })
}

function scoreCampaignMatch(
  sourceText: string,
  campaign: CampaignRecord,
  existingCampaignId?: string,
): ReturnType<typeof combineSignals> {
  return combineSignals([
    scoreIdMatch(existingCampaignId, campaign.id, 92, "Record is already linked to this campaign."),
    scoreExactNormalizedMatch(sourceText, campaign.campaignName, 85, "Name matches campaign name."),
    scoreContainsPhrase(sourceText, campaign.songTitle, 78, "Text contains the campaign song title."),
    scoreContainsPhrase(sourceText, campaign.artistName, 68, "Text contains the artist name."),
    scoreContainsPhrase(sourceText, campaign.productName, 62, "Text contains the product name."),
    {
      label: `Campaign name overlap (${scoreTokenOverlap(sourceText, campaign.campaignName)}%).`,
      score: scoreTokenOverlap(sourceText, campaign.campaignName),
    },
    {
      label: `Campaign context overlap (${scoreTokenOverlap(sourceText, campaignText(campaign))}%).`,
      score: scoreTokenOverlap(sourceText, campaignText(campaign)),
    },
  ])
}

function scoreDriveFileToAsset(file: DriveFileRecord, asset: AssetRecord) {
  return combineSignals([
    scoreUrlMatch(file.webViewLink || file.url, asset.externalUrl),
    scoreUrlMatch(file.webViewLink || file.url, asset.fileUrl),
    scoreIdMatch(file.assetId, asset.id, 96, "Drive file is already linked to this asset."),
    scoreAssetTypeMatch(file.detectedAssetType, asset.assetType),
    scoreExactNormalizedMatch(file.name, asset.assetName, 82, "File name matches asset name."),
    scoreContainsPhrase(file.name, asset.assetName, 70, "File name contains asset name."),
    scoreIdMatch(file.campaignId, asset.campaignId, 60, "Both records share the same campaign."),
    {
      label: `Name overlap (${scoreTokenOverlap(file.name, asset.assetName)}%).`,
      score: scoreTokenOverlap(file.name, asset.assetName),
    },
    scoreTagOverlap(asset.tags, file.name),
  ])
}

function generateDriveFileSuggestions(
  dataset: AssetLinkingDataset,
  file: DriveFileRecord,
  bucket: AssetLinkSuggestion[],
  seen: Set<string>,
  filters: AssetLinkSuggestionsInput,
) {
  if (file.status === "Ignored") return
  const text = fileText(file)
  const detected = (file.detectedAssetType ?? "").toLowerCase()

  if (!file.campaignId?.trim()) {
    for (const campaign of dataset.campaigns) {
      if (filters.campaignId && campaign.id !== filters.campaignId) continue
      const result = scoreCampaignMatch(text, campaign, file.campaignId)
      if (!meetsSuggestionThreshold(result.score)) continue
      pushSuggestion(bucket, seen, {
        suggestionType: "drive-file-to-campaign",
        confidence: result.confidence,
        score: result.score,
        reason: mergeReasons(result, "Drive file is not linked to a campaign yet."),
        sourceType: "drive-file",
        sourceId: file.id,
        sourceName: file.name,
        targetType: "campaign",
        targetId: campaign.id,
        targetName: campaign.campaignName,
        suggestedAction: "Link to Campaign",
        href: suggestionHref("drive-file", file.id),
      })
    }
  }

  if (!file.assetId?.trim()) {
    let matchedAsset = false
    for (const asset of dataset.assets) {
      if (filters.assetId && asset.id !== filters.assetId) continue
      const result = scoreDriveFileToAsset(file, asset)
      if (!meetsSuggestionThreshold(result.score)) continue
      matchedAsset = true
      pushSuggestion(bucket, seen, {
        suggestionType: "drive-file-to-asset",
        confidence: result.confidence,
        score: result.score,
        reason: mergeReasons(result),
        sourceType: "drive-file",
        sourceId: file.id,
        sourceName: file.name,
        targetType: "asset",
        targetId: asset.id,
        targetName: asset.assetName,
        suggestedAction: "Link to Existing Asset",
        href: suggestionHref("asset", asset.id),
      })
    }

    const campaign =
      dataset.campaigns.find((item) => item.id === file.campaignId) ??
      dataset.campaigns.find(
        (item) =>
          item.campaignName.trim().toLowerCase() === file.campaignName.trim().toLowerCase(),
      )
    const campaignResult = campaign ? scoreCampaignMatch(text, campaign, file.campaignId) : null
    if (
      !matchedAsset &&
      campaignResult &&
      meetsSuggestionThreshold(campaignResult.score) &&
      (file.detectedAssetType || containsPhrase(text, campaign?.songTitle))
    ) {
      pushSuggestion(bucket, seen, {
        suggestionType: "create-asset-from-drive-file",
        confidence: campaignResult.confidence,
        score: Math.max(campaignResult.score, 40),
        reason: mergeReasons(
          campaignResult,
          "No matching asset exists yet — create one from this Drive file.",
        ),
        sourceType: "drive-file",
        sourceId: file.id,
        sourceName: file.name,
        targetType: "campaign",
        targetId: campaign?.id ?? "",
        targetName: campaign?.campaignName ?? "Campaign",
        suggestedAction: "Create Asset",
        href: suggestionHref("drive-file", file.id),
      })
    }
  }

  if (detected.includes("thumbnail") || detected.includes("video")) {
    for (const video of dataset.youtubeVideos) {
      if (filters.youtubeVideoId && video.id !== filters.youtubeVideoId) continue
      const result = combineSignals([
        scoreIdMatch(file.campaignId, video.campaignId, 70, "Drive file and video share a campaign."),
        scoreContainsPhrase(file.name, video.title, 75, "File name matches video title."),
        scoreContainsPhrase(file.name, video.songTitle, 72, "File name contains the song title."),
        scoreContainsPhrase(file.name, video.artistName, 62, "File name contains the artist name."),
        scoreAssetTypeMatch(
          file.detectedAssetType,
          detected.includes("thumbnail") ? "YouTube Thumbnail" : "Video File",
        ),
        {
          label: `Video title overlap (${scoreTokenOverlap(file.name, video.title)}%).`,
          score: scoreTokenOverlap(file.name, video.title),
        },
      ])
      if (!meetsSuggestionThreshold(result.score)) continue
      pushSuggestion(bucket, seen, {
        suggestionType: "drive-file-to-youtube-video",
        confidence: result.confidence,
        score: result.score,
        reason: mergeReasons(
          result,
          detected.includes("thumbnail")
            ? "Detected asset type is YouTube Thumbnail and video title matches."
            : "Detected asset type is Video File and video title matches.",
        ),
        sourceType: "drive-file",
        sourceId: file.id,
        sourceName: file.name,
        targetType: "youtube-video",
        targetId: video.id,
        targetName: video.title,
        suggestedAction: detected.includes("thumbnail") ? "Link Thumbnail to Video" : "Link Video File",
        href: suggestionHref("youtube-video", video.id),
      })
    }
  }

  if (detected.includes("mockup") || detected.includes("product image")) {
    for (const product of dataset.productListings) {
      if (filters.productId && product.id !== filters.productId) continue
      const result = combineSignals([
        scoreContainsPhrase(file.name, product.finalTitle, 74, "Product name appears in file name."),
        scoreContainsPhrase(file.name, product.designConcept, 66, "Design concept appears in file name."),
        scoreAssetTypeMatch(file.detectedAssetType, "Product Image"),
        {
          label: `Product overlap (${scoreTokenOverlap(file.name, productText(product))}%).`,
          score: scoreTokenOverlap(file.name, productText(product)),
        },
      ])
      if (!meetsSuggestionThreshold(result.score)) continue
      pushSuggestion(bucket, seen, {
        suggestionType: "drive-file-to-product-listing",
        confidence: result.confidence,
        score: result.score,
        reason: mergeReasons(result),
        sourceType: "drive-file",
        sourceId: file.id,
        sourceName: file.name,
        targetType: "product-listing",
        targetId: product.id,
        targetName: product.finalTitle || product.designConcept || "Product listing",
        suggestedAction: "Link to Product Listing",
        href: suggestionHref("product-listing", product.id),
      })
    }
  }

  if (detected.includes("mockup")) {
    for (const idea of dataset.merchIdeas) {
      const result = combineSignals([
        scoreContainsPhrase(file.name, idea.selectedProductTitle, 72, "Merch product title appears in file name."),
        scoreContainsPhrase(file.name, idea.selectedConceptName, 64, "Merch concept appears in file name."),
        scoreAssetTypeMatch(file.detectedAssetType, "Merch Mockup"),
        {
          label: `Merch overlap (${scoreTokenOverlap(file.name, merchText(idea))}%).`,
          score: scoreTokenOverlap(file.name, merchText(idea)),
        },
      ])
      if (!meetsSuggestionThreshold(result.score)) continue
      pushSuggestion(bucket, seen, {
        suggestionType: "drive-file-to-merch-idea",
        confidence: result.confidence,
        score: result.score,
        reason: mergeReasons(result),
        sourceType: "drive-file",
        sourceId: file.id,
        sourceName: file.name,
        targetType: "merch-idea",
        targetId: idea.id,
        targetName: idea.selectedProductTitle || idea.selectedConceptName || "Merch idea",
        suggestedAction: "Link to Merch Idea",
        href: suggestionHref("merch-idea", idea.id),
      })
    }

    for (const prompt of dataset.mockupPrompts) {
      const result = combineSignals([
        scoreContainsPhrase(file.name, prompt.projectName, 70, "Mockup project name appears in file name."),
        scoreContainsPhrase(file.name, prompt.designConcept, 62, "Mockup concept appears in file name."),
        scoreAssetTypeMatch(file.detectedAssetType, "Merch Mockup"),
        {
          label: `Mockup overlap (${scoreTokenOverlap(file.name, mockupText(prompt))}%).`,
          score: scoreTokenOverlap(file.name, mockupText(prompt)),
        },
      ])
      if (!meetsSuggestionThreshold(result.score)) continue
      pushSuggestion(bucket, seen, {
        suggestionType: "drive-file-to-mockup-prompt",
        confidence: result.confidence,
        score: result.score,
        reason: mergeReasons(result),
        sourceType: "drive-file",
        sourceId: file.id,
        sourceName: file.name,
        targetType: "mockup-prompt",
        targetId: prompt.id,
        targetName: prompt.projectName || prompt.mockupType || "Mockup prompt",
        suggestedAction: "Link to Mockup Prompt",
        href: suggestionHref("mockup-prompt", prompt.id),
      })
    }
  }
}

function generateAssetSuggestions(
  dataset: AssetLinkingDataset,
  asset: AssetRecord,
  bucket: AssetLinkSuggestion[],
  seen: Set<string>,
  filters: AssetLinkSuggestionsInput,
) {
  const text = assetText(asset)

  if (!asset.campaignId?.trim()) {
    for (const campaign of dataset.campaigns) {
      if (filters.campaignId && campaign.id !== filters.campaignId) continue
      const result = scoreCampaignMatch(text, campaign, asset.campaignId)
      if (!meetsSuggestionThreshold(result.score)) continue
      pushSuggestion(bucket, seen, {
        suggestionType: "asset-to-campaign",
        confidence: result.confidence,
        score: result.score,
        reason: mergeReasons(result, "Asset is not linked to a campaign yet."),
        sourceType: "asset",
        sourceId: asset.id,
        sourceName: asset.assetName,
        targetType: "campaign",
        targetId: campaign.id,
        targetName: campaign.campaignName,
        suggestedAction: "Link Asset to Campaign",
        href: suggestionHref("asset", asset.id),
      })
    }
  }

  const assetType = (asset.assetType ?? "").toLowerCase()
  if (assetType.includes("thumbnail") || assetType.includes("video")) {
    for (const video of dataset.youtubeVideos) {
      if (filters.youtubeVideoId && video.id !== filters.youtubeVideoId) continue
      const result = combineSignals([
        scoreUrlMatch(asset.externalUrl, video.videoUrl),
        scoreUrlMatch(asset.fileUrl, video.thumbnailUrl),
        scoreContainsPhrase(asset.assetName, video.title, 72, "Asset name matches video title."),
        scoreIdMatch(asset.campaignId, video.campaignId, 65, "Asset and video share a campaign."),
        {
          label: `Video overlap (${scoreTokenOverlap(text, video.title)}%).`,
          score: scoreTokenOverlap(text, video.title),
        },
      ])
      if (!meetsSuggestionThreshold(result.score)) continue
      pushSuggestion(bucket, seen, {
        suggestionType: "asset-to-youtube-video",
        confidence: result.confidence,
        score: result.score,
        reason: mergeReasons(result),
        sourceType: "asset",
        sourceId: asset.id,
        sourceName: asset.assetName,
        targetType: "youtube-video",
        targetId: video.id,
        targetName: video.title,
        suggestedAction: "Link Asset to Video",
        href: suggestionHref("youtube-video", video.id),
      })
    }
  }

  if (assetType.includes("product") || assetType.includes("mockup")) {
    for (const product of dataset.productListings) {
      if (filters.productId && product.id !== filters.productId) continue
      const result = combineSignals([
        scoreContainsPhrase(asset.assetName, product.finalTitle, 70, "Asset name matches product title."),
        scoreAssetTypeMatch(asset.assetType, "Product Image"),
        {
          label: `Product overlap (${scoreTokenOverlap(text, productText(product))}%).`,
          score: scoreTokenOverlap(text, productText(product)),
        },
      ])
      if (!meetsSuggestionThreshold(result.score)) continue
      pushSuggestion(bucket, seen, {
        suggestionType: "asset-to-product-listing",
        confidence: result.confidence,
        score: result.score,
        reason: mergeReasons(result),
        sourceType: "asset",
        sourceId: asset.id,
        sourceName: asset.assetName,
        targetType: "product-listing",
        targetId: product.id,
        targetName: product.finalTitle || product.designConcept || "Product listing",
        suggestedAction: "Link Asset to Product",
        href: suggestionHref("product-listing", product.id),
      })
    }
  }

  if (filters.assetId) {
    for (const file of dataset.driveFiles) {
      if (file.assetId === asset.id) continue
      const result = scoreDriveFileToAsset(file, asset)
      if (!meetsSuggestionThreshold(result.score)) continue
      pushSuggestion(bucket, seen, {
        suggestionType: "drive-file-to-asset",
        confidence: result.confidence,
        score: result.score,
        reason: mergeReasons(result),
        sourceType: "drive-file",
        sourceId: file.id,
        sourceName: file.name,
        targetType: "asset",
        targetId: asset.id,
        targetName: asset.assetName,
        suggestedAction: "Link Drive File",
        href: suggestionHref("drive-file", file.id),
      })
    }
  }
}

function generateFolderSuggestions(
  dataset: AssetLinkingDataset,
  folder: DriveFolderRecord,
  bucket: AssetLinkSuggestion[],
  seen: Set<string>,
  filters: AssetLinkSuggestionsInput,
) {
  if (folder.campaignId?.trim()) return
  const text = [folder.name, folder.artistName, folder.songTitle, folder.productName].join(" ")
  for (const campaign of dataset.campaigns) {
    if (filters.campaignId && campaign.id !== filters.campaignId) continue
    const result = scoreCampaignMatch(text, campaign, folder.campaignId)
    if (!meetsSuggestionThreshold(result.score)) continue
    pushSuggestion(bucket, seen, {
      suggestionType: "folder-to-campaign",
      confidence: result.confidence,
      score: result.score,
      reason: mergeReasons(result, "Drive folder is not linked to a campaign yet."),
      sourceType: "drive-folder",
      sourceId: folder.id,
      sourceName: folder.name,
      targetType: "campaign",
      targetId: campaign.id,
      targetName: campaign.campaignName,
      suggestedAction: "Link Folder to Campaign",
      href: suggestionHref("drive-folder", folder.id),
    })
  }
}

function generateYouTubeVideoSuggestions(
  dataset: AssetLinkingDataset,
  video: YouTubeVideoRecord,
  bucket: AssetLinkSuggestion[],
  seen: Set<string>,
  filters: AssetLinkSuggestionsInput,
) {
  if (video.campaignId?.trim()) return
  for (const campaign of dataset.campaigns) {
    if (filters.campaignId && campaign.id !== filters.campaignId) continue
    const result = combineSignals([
      scoreContainsPhrase(video.title, campaign.songTitle, 80, "Video title contains the campaign song title."),
      scoreContainsPhrase(video.title, campaign.artistName, 68, "Video title contains the artist name."),
      scoreContainsPhrase(video.title, campaign.campaignName, 60, "Video title contains the campaign name."),
      {
        label: `Campaign overlap (${scoreTokenOverlap(video.title, campaignText(campaign))}%).`,
        score: scoreTokenOverlap(video.title, campaignText(campaign)),
      },
    ])
    if (!meetsSuggestionThreshold(result.score)) continue
    pushSuggestion(bucket, seen, {
      suggestionType: "youtube-video-to-campaign",
      confidence: result.confidence,
      score: result.score,
      reason: mergeReasons(result, "Imported video is not linked to a campaign yet."),
      sourceType: "youtube-video",
      sourceId: video.id,
      sourceName: video.title,
      targetType: "campaign",
      targetId: campaign.id,
      targetName: campaign.campaignName,
      suggestedAction: "Link Video to Campaign",
      href: suggestionHref("youtube-video", video.id),
    })
  }
}

function scopeDataset(dataset: AssetLinkingDataset, input: AssetLinkSuggestionsInput): AssetLinkingDataset {
  const campaign =
    input.campaignId != null
      ? dataset.campaigns.find((item) => item.id === input.campaignId)
      : undefined

  return {
    ...dataset,
    driveFiles: input.driveFileId
      ? dataset.driveFiles.filter((file) => file.id === input.driveFileId)
      : input.campaignId
        ? dataset.driveFiles.filter(
            (file) =>
              file.campaignId === input.campaignId ||
              (campaign &&
                file.campaignName.trim().toLowerCase() ===
                  campaign.campaignName.trim().toLowerCase()) ||
              !file.campaignId?.trim(),
          )
        : dataset.driveFiles,
    driveFolders: input.campaignId
      ? dataset.driveFolders.filter(
          (folder) =>
            folder.campaignId === input.campaignId ||
            (campaign &&
              folder.campaignName.trim().toLowerCase() ===
                campaign.campaignName.trim().toLowerCase()) ||
            !folder.campaignId?.trim(),
        )
      : dataset.driveFolders,
    assets: input.assetId
      ? dataset.assets.filter((asset) => asset.id === input.assetId)
      : input.campaignId
        ? dataset.assets.filter(
            (asset) =>
              asset.campaignId === input.campaignId ||
              (campaign &&
                asset.campaignName.trim().toLowerCase() ===
                  campaign.campaignName.trim().toLowerCase()) ||
              !asset.campaignId?.trim(),
          )
        : dataset.assets,
    youtubeVideos: input.youtubeVideoId
      ? dataset.youtubeVideos.filter((video) => video.id === input.youtubeVideoId)
      : input.campaignId
        ? dataset.youtubeVideos.filter(
            (video) =>
              video.campaignId === input.campaignId ||
              (campaign &&
                video.campaignName.trim().toLowerCase() ===
                  campaign.campaignName.trim().toLowerCase()) ||
              !video.campaignId?.trim(),
          )
        : dataset.youtubeVideos,
  }
}

export function buildAssetLinkSuggestions(
  dataset: AssetLinkingDataset,
  input: AssetLinkSuggestionsInput = {},
): AssetLinkSuggestion[] {
  const scoped = scopeDataset(dataset, input)
  const bucket: AssetLinkSuggestion[] = []
  const seen = new Set<string>()

  for (const file of scoped.driveFiles) {
    generateDriveFileSuggestions(scoped, file, bucket, seen, input)
  }
  for (const asset of scoped.assets) {
    generateAssetSuggestions(scoped, asset, bucket, seen, input)
  }
  for (const folder of scoped.driveFolders) {
    generateFolderSuggestions(scoped, folder, bucket, seen, input)
  }
  for (const video of scoped.youtubeVideos) {
    generateYouTubeVideoSuggestions(scoped, video, bucket, seen, input)
  }

  const filtered = bucket
    .filter((suggestion) => {
      if (input.campaignId && suggestion.targetType === "campaign" && suggestion.targetId !== input.campaignId) {
        return false
      }
      if (input.assetId) {
        return (
          suggestion.sourceId === input.assetId ||
          suggestion.targetId === input.assetId ||
          (suggestion.sourceType === "drive-file" && suggestion.targetType === "asset")
        )
      }
      if (input.driveFileId) {
        return suggestion.sourceId === input.driveFileId
      }
      if (input.youtubeVideoId) {
        return (
          suggestion.sourceId === input.youtubeVideoId ||
          suggestion.targetId === input.youtubeVideoId
        )
      }
      if (input.productId) {
        return suggestion.targetId === input.productId || suggestion.sourceId === input.productId
      }
      return true
    })
    .sort((a, b) => b.score - a.score)

  return filtered.slice(0, input.limit ?? 50)
}

export function countLinkingCandidates(dataset: AssetLinkingDataset): number {
  return (
    dataset.driveFiles.length +
    dataset.assets.length +
    dataset.driveFolders.length +
    dataset.youtubeVideos.length
  )
}

export function topSuggestionsForCampaign(
  dataset: AssetLinkingDataset,
  campaignId: string,
  limit = 8,
): AssetLinkSuggestion[] {
  return buildAssetLinkSuggestions(dataset, { campaignId, limit })
}
