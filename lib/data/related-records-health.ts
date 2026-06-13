import { parseRelatedLinksFromNotes } from "@/lib/asset-linking/asset-related-links"
import type { SongConceptRecord, LoreEntryRecord } from "@/lib/artist-universe/types"
import type { DataHealthIssue, DataHealthScanInput } from "@/lib/data/data-health"
import type { AssetRecord } from "@/lib/types"

function issueId(parts: string[]): string {
  return parts.filter(Boolean).join(":")
}

function pushIssue(issues: DataHealthIssue[], issue: DataHealthIssue) {
  if (issues.some((item) => item.id === issue.id)) return
  issues.push(issue)
}

/** Related-record linking gaps across assets, songs, lore, and campaigns. */
export function scanRelatedRecordWarnings(
  input: DataHealthScanInput & {
    songConcepts?: SongConceptRecord[]
    loreEntries?: LoreEntryRecord[]
  },
  issues: DataHealthIssue[],
): void {
  const concepts = input.songConcepts ?? []
  const lore = input.loreEntries ?? []
  const assets = input.assets

  for (const asset of assets) {
    const hasContext = Boolean(asset.artistName.trim() || asset.songTitle.trim())
    const noteLinks = parseRelatedLinksFromNotes(asset.notes)
    const hasFormalLink =
      noteLinks.length > 0 || Boolean(asset.sourceRecordType.trim() && asset.sourceRecordId.trim())
    if (hasContext && !hasFormalLink) {
      pushIssue(issues, {
        id: issueId(["related-records", "asset-unlinked", asset.id]),
        severity: "info",
        category: "incomplete-records",
        title: `Asset missing linked record: ${asset.assetName}`,
        description: "Asset has artist/song context but no linked CreatorOps record.",
        sourceType: "asset",
        sourceId: asset.id,
        sourceTitle: asset.assetName,
        href: `/assets?recordId=${encodeURIComponent(asset.id)}&tab=related`,
        suggestedAction: "Open Related tab and apply a suggested link.",
      })
    }
  }

  for (const concept of concepts) {
    if (concept.relatedLoreIds.length && concept.relatedLoreIds.some((id) => !id.trim())) {
      pushIssue(issues, {
        id: issueId(["related-records", "concept-lore-text", concept.id]),
        severity: "info",
        category: "incomplete-records",
        title: `Song concept has lore IDs but no formal links: ${concept.songTitle || concept.title}`,
        description: "Use the Related tab to confirm lore links by name.",
        sourceType: "song-concept",
        sourceId: concept.id,
        sourceTitle: concept.title,
        href: `/song-vault?recordId=${encodeURIComponent(concept.id)}&tab=related`,
        suggestedAction: "Confirm related lore in Song Vault.",
      })
    }

    const published =
      /^(published|released)$/i.test(concept.status) ||
      Boolean(concept.publishedUrl.trim())
    if (published && !concept.relatedYouTubeVideoId.trim()) {
      pushIssue(issues, {
        id: issueId(["related-records", "published-no-youtube-link", concept.id]),
        severity: "info",
        category: "incomplete-records",
        title: `Published song missing linked YouTube video: ${concept.songTitle || concept.title}`,
        description: "Link the synced YouTube video in Related tab or archive form.",
        sourceType: "song-concept",
        sourceId: concept.id,
        sourceTitle: concept.title,
        href: `/song-vault?recordId=${encodeURIComponent(concept.id)}&tab=related`,
        suggestedAction: "Link YouTube video record.",
      })
    }
  }

  for (const entry of lore) {
    if (entry.relatedSongs.length && !entry.relatedAssetIds.length) {
      const hasMatchingConcept = concepts.some(
        (c) =>
          c.artistName.toLowerCase() === entry.artistName.toLowerCase() &&
          entry.relatedSongs.some(
            (song) =>
              song.toLowerCase() === (c.songTitle || c.title).toLowerCase(),
          ),
      )
      if (hasMatchingConcept) {
        pushIssue(issues, {
          id: issueId(["related-records", "lore-song-no-concept-link", entry.id]),
          severity: "info",
          category: "incomplete-records",
          title: `Lore entry has related songs but no formal song link: ${entry.title}`,
          description: "Confirm song concept links in Lore Related tab.",
          sourceType: "lore-entry",
          sourceId: entry.id,
          sourceTitle: entry.title,
          href: `/lore?recordId=${encodeURIComponent(entry.id)}&tab=related`,
          suggestedAction: "Link related song concept.",
        })
      }
    }
  }

  for (const campaign of input.campaigns) {
    if (!campaign.artistName?.trim() && !campaign.songTitle?.trim()) continue
    const campaignAssets = assets.filter(
      (asset: AssetRecord) =>
        asset.campaignId === campaign.id ||
        asset.campaignName.toLowerCase() === campaign.campaignName.toLowerCase() ||
        asset.tags.some((tag) => tag.toLowerCase().includes(campaign.campaignName.toLowerCase())),
    )
    const linkedAssets = campaignAssets.filter(
      (asset) =>
        parseRelatedLinksFromNotes(asset.notes).some((l) => l.recordType === "Campaign") ||
        asset.campaignId === campaign.id,
    )
    if (campaignAssets.length >= 2 && linkedAssets.length === 0) {
      pushIssue(issues, {
        id: issueId(["related-records", "campaign-tag-assets", campaign.id]),
        severity: "info",
        category: "incomplete-records",
        title: `Campaign has assets by tag but no formal links: ${campaign.campaignName}`,
        description: "Assets match this campaign by name/tag but lack confirmed links.",
        sourceType: "campaign",
        sourceId: campaign.id,
        sourceTitle: campaign.campaignName,
        href: `/campaigns?campaignId=${encodeURIComponent(campaign.id)}`,
        suggestedAction: "Link assets from Asset Library Related tab.",
      })
    }
  }
}
