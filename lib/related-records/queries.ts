import { getArtistBibles } from "@/lib/actions/artist-bible"
import { getAssets } from "@/lib/actions/assets"
import { getCampaigns } from "@/lib/actions/campaigns"
import { getDriveFiles, getDriveFolders } from "@/lib/actions/drive-integration"
import { getLoreEntries } from "@/lib/actions/lore"
import { getMerchIdeas } from "@/lib/actions/merch-ideas"
import { getSongConcepts } from "@/lib/actions/song-concepts"
import { getStoryArcs } from "@/lib/actions/story-arcs"
import { getVisualIdentityProfiles } from "@/lib/actions/visual-identity"
import { getYouTubePackages } from "@/lib/actions/youtube-packages"
import { getYouTubeVideos } from "@/lib/actions/youtube-integration"
import { parseRelatedLinksFromNotes } from "@/lib/asset-linking/asset-related-links"
import { getDrivePathFromRawJson } from "@/lib/drive/classify"
import { prismaAssetToAssetRecord } from "@/lib/data/assets"
import { prismaLoreEntryToRecord } from "@/lib/data/lore"
import { prismaSongConceptToRecord } from "@/lib/data/song-concepts"
import { prisma } from "@/lib/prisma"
import {
  buildRecordHref,
  findCatalogOption,
  optionFromFields,
  type RelatedRecordCatalog,
} from "@/lib/related-records/catalog"
import {
  importLegacyLinksToCreatorOpsLink,
  prismaLinkToRecord,
  syncLegacyFieldsForLink,
  removeLegacyFieldsForLink,
} from "@/lib/related-records/legacy-sync"
import { legacyLoreLinks, legacySongConceptLinks } from "@/lib/related-records/legacy-links"
import { suggestLinksForContext } from "@/lib/related-records/suggestions"
import type {
  CreatorOpsRecordType,
  RelatedLinkDisplay,
  RelatedLinksBundle,
  RelatedRecordContext,
} from "@/lib/related-records/types"
import type { AssetRecord } from "@/lib/types"

function linkDisplayKey(type: string, id: string): string {
  return `${type}:${id}`
}

export async function loadRelatedRecordCatalog(): Promise<RelatedRecordCatalog> {
  const [
    artistBibles,
    visualIdentities,
    loreEntries,
    songConcepts,
    storyArcs,
    assets,
    campaigns,
    merchIdeas,
    youtubeVideos,
    youtubePackages,
    driveFiles,
    driveFolders,
  ] = await Promise.all([
    getArtistBibles().catch(() => []),
    getVisualIdentityProfiles().catch(() => []),
    getLoreEntries().catch(() => []),
    getSongConcepts().catch(() => []),
    getStoryArcs().catch(() => []),
    getAssets().catch(() => []),
    getCampaigns().catch(() => []),
    getMerchIdeas().catch(() => []),
    getYouTubeVideos().catch(() => []),
    getYouTubePackages().catch(() => []),
    getDriveFiles().catch(() => []),
    getDriveFolders().catch(() => []),
  ])

  return {
    artistBibles: artistBibles.map((b) =>
      optionFromFields("ArtistBible", b.id, b.artistName || b.projectName, {
        subtitle: b.genre,
        artistName: b.artistName,
        status: b.status,
        tags: b.tags,
      }),
    ),
    visualIdentities: visualIdentities.map((v) =>
      optionFromFields("VisualIdentityProfile", v.id, v.profileName || v.artistName, {
        subtitle: v.visualStyle,
        artistName: v.artistName,
        status: v.status,
        tags: v.tags,
      }),
    ),
    loreEntries: loreEntries.map((l) =>
      optionFromFields("LoreEntry", l.id, l.title, {
        subtitle: l.loreType,
        artistName: l.artistName,
        status: l.status,
        tags: l.tags,
      }),
    ),
    songConcepts: songConcepts.map((s) =>
      optionFromFields("SongConcept", s.id, s.songTitle || s.title, {
        subtitle: s.status,
        artistName: s.artistName,
        songTitle: s.songTitle || s.title,
        status: s.status,
        tags: s.tags,
      }),
    ),
    storyArcs: storyArcs.map((a) =>
      optionFromFields("ReleaseStoryArc", a.id, a.title, {
        subtitle: a.arcType,
        artistName: a.artistName,
        status: a.status,
        tags: a.tags,
      }),
    ),
    assets: assets.map((a) =>
      optionFromFields("Asset", a.id, a.assetName, {
        subtitle: a.assetType,
        artistName: a.artistName,
        songTitle: a.songTitle,
        status: a.status,
        tags: a.tags,
      }),
    ),
    campaigns: campaigns.map((c) =>
      optionFromFields("Campaign", c.id, c.campaignName, {
        subtitle: c.campaignType,
        artistName: c.artistName,
        songTitle: c.songTitle,
        status: c.status,
        tags: [],
      }),
    ),
    products: merchIdeas.map((m) =>
      optionFromFields("Product", m.id, m.selectedConceptName || m.noun || "Merch idea", {
        subtitle: m.productType,
        artistName: m.niche,
        status: m.primaryGoal,
        tags: m.selectedTags ? [m.selectedTags] : [],
      }),
    ),
    youtubeVideos: youtubeVideos.map((v) =>
      optionFromFields("YouTubeVideo", v.id, v.title, {
        subtitle: v.channelTitle,
        artistName: v.artistName,
        songTitle: v.songTitle,
        status: v.privacyStatus,
        tags: [],
      }),
    ),
    youtubePackages: youtubePackages.map((p) =>
      optionFromFields("YouTubePackage", p.id, [p.artistName, p.trackTitle].filter(Boolean).join(" — "), {
        subtitle: p.videoType,
        artistName: p.artistName,
        songTitle: p.trackTitle,
        status: p.primaryGoal,
        tags: p.keywords ? [p.keywords] : [],
      }),
    ),
    driveFiles: driveFiles.map((f) =>
      optionFromFields("DriveFile", f.id, f.name, {
        subtitle: f.detectedAssetType,
        artistName: f.artistName,
        status: f.status,
        tags: f.tags,
      }),
    ),
    driveFolders: driveFolders.map((f) =>
      optionFromFields("DriveFolder", f.id, f.name, {
        subtitle: f.campaignName,
        artistName: f.artistName,
        status: f.status,
        tags: f.tags,
      }),
    ),
    externalLinks: [],
  }
}

async function loadDbLinks(sourceType: CreatorOpsRecordType, sourceId: string) {
  const rows = await prisma.creatorOpsLink.findMany({
    where: { sourceType, sourceId },
    orderBy: { updatedAt: "desc" },
  })
  return rows.map(prismaLinkToRecord)
}

function toDisplay(
  catalog: RelatedRecordCatalog,
  targetType: CreatorOpsRecordType,
  targetId: string,
  relationshipType: string,
  linkId: string,
  origin: "linked" | "inferred",
): RelatedLinkDisplay | null {
  const option = findCatalogOption(catalog, targetType, targetId)
  if (!option) return null
  return {
    linkId,
    recordType: targetType,
    recordId: targetId,
    title: option.title,
    subtitle: option.subtitle,
    relationshipType,
    href: buildRecordHref(targetType, targetId),
    origin,
  }
}

async function loadInferredLinks(
  context: RelatedRecordContext,
  catalog: RelatedRecordCatalog,
): Promise<RelatedLinkDisplay[]> {
  const inferred: RelatedLinkDisplay[] = []
  const push = (item: RelatedLinkDisplay | null) => {
    if (!item) return
    if (inferred.some((x) => linkDisplayKey(x.recordType, x.recordId) === linkDisplayKey(item.recordType, item.recordId))) {
      return
    }
    inferred.push(item)
  }

  if (context.sourceType === "SongConcept") {
    const row = await prisma.songConcept.findUnique({ where: { id: context.sourceId } })
    if (row) {
      const concept = prismaSongConceptToRecord(row)
      for (const legacy of legacySongConceptLinks(concept)) {
        push(
          toDisplay(
            catalog,
            legacy.targetType,
            legacy.targetId,
            legacy.relationshipType,
            `legacy-${legacy.targetType}-${legacy.targetId}`,
            "inferred",
          ),
        )
      }
    }
  }

  if (context.sourceType === "LoreEntry") {
    const row = await prisma.loreEntry.findUnique({ where: { id: context.sourceId } })
    if (row) {
      const lore = prismaLoreEntryToRecord(row)
      for (const legacy of legacyLoreLinks(lore)) {
        push(
          toDisplay(
            catalog,
            legacy.targetType,
            legacy.targetId,
            legacy.relationshipType,
            `legacy-${legacy.targetType}-${legacy.targetId}`,
            "inferred",
          ),
        )
      }
      for (const songName of lore.relatedSongs) {
        const concept = catalog.songConcepts.find(
          (c) =>
            c.artistName.toLowerCase() === lore.artistName.toLowerCase() &&
            (c.title.toLowerCase() === songName.toLowerCase() ||
              c.songTitle.toLowerCase() === songName.toLowerCase()),
        )
        if (concept) {
          push(
            toDisplay(catalog, "SongConcept", concept.id, "related-song", `legacy-song-${concept.id}`, "inferred"),
          )
        }
      }
    }
  }

  if (context.sourceType === "Asset") {
    const row = await prisma.asset.findUnique({ where: { id: context.sourceId } })
    if (row) {
      const asset = prismaAssetToAssetRecord(row)
      for (const legacy of parseRelatedLinksFromNotes(asset.notes)) {
        push(
          toDisplay(
            catalog,
            legacy.recordType as CreatorOpsRecordType,
            legacy.recordId,
            "related",
            `legacy-${legacy.recordType}-${legacy.recordId}`,
            "inferred",
          ),
        )
      }
      if (asset.sourceRecordType && asset.sourceRecordId) {
        push(
          toDisplay(
            catalog,
            asset.sourceRecordType as CreatorOpsRecordType,
            asset.sourceRecordId,
            "source-file",
            `legacy-source-${asset.sourceRecordId}`,
            "inferred",
          ),
        )
      }
    }
  }

  return inferred
}

export async function getRelatedLinksBundle(context: RelatedRecordContext): Promise<RelatedLinksBundle> {
  await importLegacyLinksToCreatorOpsLink(context.sourceType, context.sourceId).catch(() => 0)

  const catalog = await loadRelatedRecordCatalog()
  const dbLinks = await loadDbLinks(context.sourceType, context.sourceId)

  const linked: RelatedLinkDisplay[] = []
  for (const link of dbLinks) {
    const display = toDisplay(
      catalog,
      link.targetType,
      link.targetId,
      link.relationshipType,
      link.id,
      "linked",
    )
    if (display) linked.push(display)
  }

  const linkedKeys = new Set(linked.map((l) => linkDisplayKey(l.recordType, l.recordId)))
  const inferred = (await loadInferredLinks(context, catalog)).filter(
    (item) => !linkedKeys.has(linkDisplayKey(item.recordType, item.recordId)),
  )
  const excludeKeys = new Set([
    ...linkedKeys,
    ...inferred.map((item) => linkDisplayKey(item.recordType, item.recordId)),
  ])
  const suggested = suggestLinksForContext(context, catalog, excludeKeys)

  return { linked, inferred, suggested }
}

export async function buildContextForRecord(
  sourceType: CreatorOpsRecordType,
  sourceId: string,
): Promise<RelatedRecordContext | null> {
  switch (sourceType) {
    case "Asset": {
      const row = await prisma.asset.findUnique({ where: { id: sourceId } })
      if (!row) return null
      const asset = prismaAssetToAssetRecord(row)
      return {
        sourceType,
        sourceId,
        title: asset.assetName,
        artistName: asset.artistName,
        songTitle: asset.songTitle,
        tags: asset.tags,
        fileName: asset.assetName,
        filePath: asset.filePath,
      }
    }
    case "SongConcept": {
      const row = await prisma.songConcept.findUnique({ where: { id: sourceId } })
      if (!row) return null
      const concept = prismaSongConceptToRecord(row)
      return {
        sourceType,
        sourceId,
        title: concept.songTitle || concept.title,
        artistName: concept.artistName,
        songTitle: concept.songTitle || concept.title,
        tags: concept.tags,
      }
    }
    case "LoreEntry": {
      const row = await prisma.loreEntry.findUnique({ where: { id: sourceId } })
      if (!row) return null
      const lore = prismaLoreEntryToRecord(row)
      return {
        sourceType,
        sourceId,
        title: lore.title,
        artistName: lore.artistName,
        tags: lore.tags,
      }
    }
    default:
      return { sourceType, sourceId }
  }
}

export function drivePathMap(
  assets: AssetRecord[],
  driveFiles: { id: string; rawJson: string }[],
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const asset of assets) {
    if (asset.filePath.trim()) {
      map[asset.id] = asset.filePath
      continue
    }
    if (asset.sourceRecordType === "DriveFile" && asset.sourceRecordId) {
      const file = driveFiles.find((f) => f.id === asset.sourceRecordId)
      if (file) map[asset.id] = getDrivePathFromRawJson(file.rawJson)
    }
  }
  return map
}
