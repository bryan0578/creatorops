import { classifyDriveFileByPath } from "@/lib/drive/classify"
import {
  fuzzyTitleMatch,
  norm,
  normalizeLinkText,
  titleFromFileName,
} from "@/lib/related-records/normalize"
import type {
  BulkAutoLinkSuggestion,
  CreatorOpsRecordType,
  RelatedLinkSuggestion,
  RelatedRecordContext,
  RelationshipType,
} from "@/lib/related-records/types"
import type { RelatedRecordCatalog } from "@/lib/related-records/catalog"
import { buildRecordHref } from "@/lib/related-records/catalog"
import type { AssetRecord } from "@/lib/types"

function linkKey(type: string, id: string): string {
  return `${type}:${id}`
}

function suggestion(
  source: RelatedRecordContext,
  targetType: CreatorOpsRecordType,
  targetId: string,
  targetTitle: string,
  reason: string,
  confidence: "high" | "medium" | "low",
  relationshipType: RelationshipType | string = "related",
  subtitle = "",
): RelatedLinkSuggestion {
  return {
    linkId: `suggest-${source.sourceType}-${source.sourceId}-${targetType}-${targetId}`,
    recordType: targetType,
    recordId: targetId,
    title: targetTitle,
    subtitle,
    relationshipType,
    href: buildRecordHref(targetType, targetId),
    origin: "suggested",
    reason,
    confidence,
  }
}

function bulkSuggestion(
  sourceType: CreatorOpsRecordType,
  sourceId: string,
  sourceTitle: string,
  targetType: CreatorOpsRecordType,
  targetId: string,
  targetTitle: string,
  reason: string,
  confidence: "high" | "medium" | "low",
  relationshipType: RelationshipType | string = "related",
): BulkAutoLinkSuggestion {
  return {
    id: `${sourceType}:${sourceId}->${targetType}:${targetId}`,
    sourceType,
    sourceId,
    sourceTitle,
    targetType,
    targetId,
    targetTitle,
    reason,
    confidence,
    relationshipType,
  }
}

export function suggestLinksForContext(
  context: RelatedRecordContext & { campaignName?: string },
  catalog: RelatedRecordCatalog,
  excludeKeys: Set<string> = new Set(),
): RelatedLinkSuggestion[] {
  const out: RelatedLinkSuggestion[] = []
  const push = (item: RelatedLinkSuggestion) => {
    const key = linkKey(item.recordType, item.recordId)
    if (excludeKeys.has(key)) return
    if (out.some((existing) => linkKey(existing.recordType, existing.recordId) === key)) return
    out.push(item)
  }

  const haystack = normalizeLinkText(
    `${context.title ?? ""} ${context.fileName ?? ""} ${context.filePath ?? ""} ${(context.tags ?? []).join(" ")}`,
  )
  const artist = norm(context.artistName)
  const song = normalizeLinkText(context.songTitle ?? "")

  if (haystack.includes("artist bible") || haystack.includes("artistbible")) {
    for (const bible of catalog.artistBibles) {
      if (artist && norm(bible.artistName) !== artist) continue
      push(
        suggestion(
          context,
          "ArtistBible",
          bible.id,
          bible.title,
          "Filename/path matches artist bible",
          artist ? "high" : "medium",
          "source-file",
          bible.subtitle,
        ),
      )
    }
  }

  if (haystack.includes("visual identity")) {
    for (const profile of catalog.visualIdentities) {
      if (artist && norm(profile.artistName) !== artist) continue
      push(
        suggestion(
          context,
          "VisualIdentityProfile",
          profile.id,
          profile.title,
          "Filename/path matches visual identity",
          "high",
          "visual-reference",
          profile.subtitle,
        ),
      )
    }
  }

  if (haystack.includes("lore") || context.sourceType === "Asset") {
    const fileTitle = titleFromFileName(context.fileName ?? context.title ?? "")
    if (fileTitle && !normalizeLinkText(fileTitle).includes("lore index")) {
      for (const lore of catalog.loreEntries) {
        if (artist && norm(lore.artistName) !== artist) continue
        if (fuzzyTitleMatch(lore.title, fileTitle)) {
          push(
            suggestion(
              context,
              "LoreEntry",
              lore.id,
              lore.title,
              "Filename matches lore entry title",
              "high",
              "related-lore",
              lore.subtitle,
            ),
          )
        }
      }
    }
  }

  const songHints = [
    song,
    ...catalog.songConcepts.map((c) => normalizeLinkText(c.songTitle || c.title)),
  ].filter(Boolean)

  for (const concept of catalog.songConcepts) {
    const conceptTitle = normalizeLinkText(concept.songTitle || concept.title)
    if (!conceptTitle) continue
    const matchesSong =
      songHints.some((hint) => hint === conceptTitle || haystack.includes(conceptTitle)) ||
      haystack.includes("lyrics") && haystack.includes(conceptTitle.replace(/\s+/g, "")) ||
      haystack.includes("song concept") && fuzzyTitleMatch(haystack, conceptTitle)
    if (!matchesSong) continue
    if (artist && norm(concept.artistName) !== artist && artist !== "prettywise") continue
    push(
      suggestion(
        context,
        "SongConcept",
        concept.id,
        concept.title,
        "Song title matches concept vault",
        fuzzyTitleMatch(context.fileName ?? "", concept.title) ? "high" : "medium",
        "related-song",
        concept.subtitle,
      ),
    )
  }

  if (haystack.includes("youtube metadata") || haystack.includes("youtube packaging")) {
    for (const concept of catalog.songConcepts) {
      if (song && !fuzzyTitleMatch(concept.songTitle || concept.title, song)) continue
      push(
        suggestion(
          context,
          "SongConcept",
          concept.id,
          concept.title,
          "YouTube metadata for song",
          "high",
          "metadata-source",
        ),
      )
    }
    for (const pkg of catalog.youtubePackages) {
      if (song && !fuzzyTitleMatch(pkg.songTitle || pkg.title, song)) continue
      push(
        suggestion(
          context,
          "YouTubePackage",
          pkg.id,
          pkg.title,
          "YouTube packaging for track",
          "medium",
          "metadata-source",
        ),
      )
    }
  }

  if (haystack.includes("merch")) {
    for (const product of catalog.products) {
      if (song && !fuzzyTitleMatch(product.title, song)) continue
      push(
        suggestion(
          context,
          "Product",
          product.id,
          product.title,
          "Merch/product ideas match song",
          "medium",
          "merch-source",
        ),
      )
    }
  }

  for (const campaign of catalog.campaigns) {
    if (context.campaignName && fuzzyTitleMatch(campaign.title, context.campaignName)) {
      push(
        suggestion(
          context,
          "Campaign",
          campaign.id,
          campaign.title,
          "Campaign name matches",
          "high",
          "related-campaign",
        ),
      )
    }
  }

  for (const video of catalog.youtubeVideos) {
    if (song && fuzzyTitleMatch(video.title, song)) {
      push(
        suggestion(
          context,
          "YouTubeVideo",
          video.id,
          video.title,
          "YouTube video title matches song",
          "medium",
          "published-video",
        ),
      )
    }
  }

  if (context.sourceType === "SongConcept") {
    const songNorm = normalizeLinkText(context.songTitle ?? context.title ?? "")
    for (const lore of catalog.loreEntries) {
      if (norm(lore.artistName) !== norm(context.artistName)) continue
      const loreNorm = normalizeLinkText(lore.title)
      const relatedByTheme =
        (songNorm.includes("no exit") &&
          (loreNorm.includes("no exit") ||
            loreNorm.includes("red eye") ||
            loreNorm.includes("candy static") ||
            loreNorm.includes("sugar trap"))) ||
        (songNorm.includes("red light") && loreNorm.includes("red eye"))
      if (relatedByTheme) {
        push(
          suggestion(
            context,
            "LoreEntry",
            lore.id,
            lore.title,
            "Lore entry thematically linked to this song",
            "medium",
            "related-lore",
            lore.subtitle,
          ),
        )
      }
    }
    for (const asset of catalog.assets) {
      const assetHay = normalizeLinkText(`${asset.title} ${asset.tags.join(" ")}`)
      if (songNorm && assetHay.includes(songNorm.replace(/\s+/g, ""))) {
        push(
          suggestion(
            context,
            "Asset",
            asset.id,
            asset.title,
            "Asset name/tags match song",
            "medium",
            "related-asset",
            asset.subtitle,
          ),
        )
      }
    }
  }

  if (context.sourceType === "LoreEntry") {
    const loreTitle = normalizeLinkText(context.title ?? "")
    for (const concept of catalog.songConcepts) {
      if (norm(concept.artistName) !== norm(context.artistName)) continue
      if (loreTitle.includes("no exit") && fuzzyTitleMatch(concept.title, "no exit")) {
        push(
          suggestion(context, "SongConcept", concept.id, concept.title, "No Exit Corridor → No Exit song", "high", "related-song"),
        )
      }
      if (loreTitle.includes("red eye") && fuzzyTitleMatch(concept.title, "red light lullaby")) {
        push(
          suggestion(context, "SongConcept", concept.id, concept.title, "Red Eye Signal → Red Light Lullaby", "medium", "related-song"),
        )
      }
    }
    for (const asset of catalog.assets) {
      const assetHay = normalizeLinkText(`${asset.title} ${asset.tags.join(" ")}`)
      const loreSlug = loreTitle.replace(/\s+/g, "-")
      if (assetHay.includes(loreSlug) || context.tags?.some((tag) => assetHay.includes(norm(tag)))) {
        push(
          suggestion(context, "Asset", asset.id, asset.title, "Asset tags match lore entry", "medium", "related-asset"),
        )
      }
    }
  }

  return out
}

export function suggestLinksForAsset(
  asset: AssetRecord,
  catalog: RelatedRecordCatalog,
  drivePath = "",
  excludeKeys: Set<string> = new Set(),
): RelatedLinkSuggestion[] {
  const path = drivePath || asset.filePath || ""
  const classification = classifyDriveFileByPath(asset.assetName, path)
  return suggestLinksForContext(
    {
      sourceType: "Asset",
      sourceId: asset.id,
      title: asset.assetName,
      artistName: asset.artistName || classification.artistName,
      songTitle: asset.songTitle || classification.songTitle,
      tags: asset.tags,
      fileName: asset.assetName,
      filePath: path,
    },
    catalog,
    excludeKeys,
  )
}

export function buildBulkAutoLinkSuggestions(
  assets: AssetRecord[],
  catalog: RelatedRecordCatalog,
  drivePathByAssetId: Record<string, string> = {},
): BulkAutoLinkSuggestion[] {
  const out: BulkAutoLinkSuggestion[] = []
  for (const asset of assets) {
    const suggestions = suggestLinksForAsset(
      asset,
      catalog,
      drivePathByAssetId[asset.id] ?? "",
    )
    for (const item of suggestions) {
      out.push(
        bulkSuggestion(
          "Asset",
          asset.id,
          asset.assetName,
          item.recordType,
          item.recordId,
          item.title,
          item.reason,
          item.confidence,
          item.relationshipType,
        ),
      )
    }
  }
  return out
}
