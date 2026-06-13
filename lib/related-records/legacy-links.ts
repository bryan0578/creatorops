import type { CreatorOpsRecordType } from "@/lib/related-records/types"

export function legacySongConceptLinks(concept: {
  relatedLoreIds: string[]
  relatedAssetIds: string[]
  relatedYouTubeVideoId?: string
}): Array<{ targetType: CreatorOpsRecordType; targetId: string; relationshipType: string }> {
  const links: Array<{ targetType: CreatorOpsRecordType; targetId: string; relationshipType: string }> = []
  for (const id of concept.relatedLoreIds) {
    if (id.trim()) links.push({ targetType: "LoreEntry", targetId: id, relationshipType: "related-lore" })
  }
  for (const id of concept.relatedAssetIds) {
    if (id.trim()) links.push({ targetType: "Asset", targetId: id, relationshipType: "related-asset" })
  }
  if (concept.relatedYouTubeVideoId?.trim()) {
    links.push({
      targetType: "YouTubeVideo",
      targetId: concept.relatedYouTubeVideoId.trim(),
      relationshipType: "published-video",
    })
  }
  return links
}

export function legacyLoreLinks(lore: {
  relatedAssetIds: string[]
  relatedCampaignIds: string[]
}): Array<{ targetType: CreatorOpsRecordType; targetId: string; relationshipType: string }> {
  const links: Array<{ targetType: CreatorOpsRecordType; targetId: string; relationshipType: string }> = []
  for (const id of lore.relatedAssetIds) {
    if (id.trim()) links.push({ targetType: "Asset", targetId: id, relationshipType: "related-asset" })
  }
  for (const id of lore.relatedCampaignIds) {
    if (id.trim()) links.push({ targetType: "Campaign", targetId: id, relationshipType: "related-campaign" })
  }
  return links
}
