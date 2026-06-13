import { artistBibleCompletenessBreakdown } from "@/lib/artist-universe/summary"
import type {
  ArtistBibleRecord,
  LoreEntryRecord,
  ReleaseStoryArcRecord,
  SongConceptRecord,
  VisualIdentityProfileRecord,
} from "@/lib/artist-universe/types"
import {
  buildPublishedSongSummaries,
  type PublishedSongSummary,
} from "@/lib/artist-universe/published-songs"
import { parseRelatedLinksFromNotes } from "@/lib/asset-linking/asset-related-links"
import { legacySongConceptLinks } from "@/lib/related-records/legacy-links"
import type {
  AssetRecord,
  CampaignRecord,
  DriveFileRecord,
  DriveFolderRecord,
  MerchIdea,
  PlaybookRecord,
  PresetRecord,
  YouTubeVideoRecord,
} from "@/lib/types"

export type ArtistUniverseDashboardRecord = {
  id: string
  type: string
  title: string
  subtitle?: string
  status?: string
  summary?: string
  tags: string[]
  href: string
  updatedAt: number
}

export type ArtistUniverseReadinessItem = {
  key: string
  label: string
  complete: boolean
  points: number
}

export type ArtistUniverseRecommendation = {
  id: string
  title: string
  description: string
  href?: string
  tone: "info" | "action" | "optional"
}

export type ArtistUniverseActivityItem = {
  id: string
  label: string
  detail: string
  timestamp: number
  href?: string
}

export type ArtistUniverseDashboardData = {
  artistName: string
  bible: ArtistBibleRecord | null
  visualIdentity: VisualIdentityProfileRecord | null
  visualProfiles: VisualIdentityProfileRecord[]
  loreEntries: LoreEntryRecord[]
  songConcepts: SongConceptRecord[]
  storyArcs: ReleaseStoryArcRecord[]
  assets: AssetRecord[]
  campaigns: CampaignRecord[]
  youtubeVideos: YouTubeVideoRecord[]
  merchIdeas: MerchIdea[]
  driveFiles: DriveFileRecord[]
  driveFolders: DriveFolderRecord[]
  artistSetupTaskCount: number
  artistPreset: PresetRecord | null
  publishedSongPlaybook: PlaybookRecord | null
  readiness: {
    percent: number
    earnedPoints: number
    maxPoints: number
    items: ArtistUniverseReadinessItem[]
    complete: string[]
    missing: string[]
  }
  relationshipMap: Record<string, ArtistUniverseDashboardRecord[]>
  recommendations: ArtistUniverseRecommendation[]
  activity: ArtistUniverseActivityItem[]
  showPrettyWiseBanner: boolean
  prettyWiseNextActions: ArtistUniverseRecommendation[]
  publishedSongs: PublishedSongSummary[]
  relatedLinkSummary: {
    linked: number
    inferred: number
    suggested: number
    items: Array<{
      sourceTitle: string
      sourceType: string
      linked: number
      inferred: number
      suggested: number
      href: string
    }>
  }
}

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase()
}

function matchesArtist(value: string | undefined | null, artistName: string): boolean {
  return norm(value) === norm(artistName)
}

function hasBibleKeyFields(bible: ArtistBibleRecord | null): boolean {
  if (!bible) return false
  return Boolean(
    bible.brandPromise.trim() &&
      bible.shortBio.trim() &&
      bible.genre.trim() &&
      bible.mood.trim(),
  )
}

function hasDrivePresence(
  artistName: string,
  driveFiles: DriveFileRecord[],
  driveFolders: DriveFolderRecord[],
  assets: AssetRecord[],
): boolean {
  if (driveFolders.some((f) => matchesArtist(f.artistName, artistName))) return true
  if (
    driveFiles.some(
      (f) =>
        matchesArtist(f.artistName, artistName) ||
        f.tags.some((tag) => norm(tag).includes(norm(artistName))),
    )
  ) {
    return true
  }
  return assets.some(
    (a) =>
      a.platform === "Google Drive" ||
      a.sourceRecordType === "DriveFile" ||
      a.tags.some((tag) => tag === "google-drive"),
  )
}

function hasPublishedYouTubeLink(
  artistName: string,
  songConcepts: SongConceptRecord[],
  videos: YouTubeVideoRecord[],
): boolean {
  const published = buildPublishedSongSummaries(songConcepts, [], [], videos)
  if (published.some((song) => song.publishedUrl.trim())) return true
  const songTitles = songConcepts.map((c) => c.songTitle || c.title).filter(Boolean)
  return videos.some((video) => {
    if (!matchesArtist(video.artistName, artistName) && !norm(video.title).includes(norm(artistName))) {
      return false
    }
    if (video.publishedAt) return true
    return songTitles.some((title) => norm(video.title).includes(norm(title)))
  })
}

export function computeArtistUniverseReadiness(input: {
  artistName: string
  bible: ArtistBibleRecord | null
  visualIdentity: VisualIdentityProfileRecord | null
  loreEntries: LoreEntryRecord[]
  songConcepts: SongConceptRecord[]
  storyArcs: ReleaseStoryArcRecord[]
  assets: AssetRecord[]
  driveFiles: DriveFileRecord[]
  driveFolders: DriveFolderRecord[]
  youtubeVideos: YouTubeVideoRecord[]
  merchIdeas: MerchIdea[]
  artistPreset: PresetRecord | null
  publishedSongPlaybook: PlaybookRecord | null
}): ArtistUniverseDashboardData["readiness"] {
  const items: ArtistUniverseReadinessItem[] = [
    {
      key: "bible",
      label: "Artist Bible",
      points: 20,
      complete: Boolean(input.bible),
    },
    {
      key: "bible-fields",
      label: "Artist Bible key fields",
      points: 10,
      complete: hasBibleKeyFields(input.bible),
    },
    {
      key: "visual-identity",
      label: "Visual Identity",
      points: 15,
      complete: Boolean(input.visualIdentity),
    },
    {
      key: "lore",
      label: "Lore entries (3+)",
      points: 15,
      complete: input.loreEntries.length >= 3,
    },
    {
      key: "song-concept",
      label: "Song concept",
      points: 15,
      complete: input.songConcepts.length >= 1,
    },
    {
      key: "assets",
      label: "Linked assets",
      points: 10,
      complete: input.assets.length >= 1,
    },
    {
      key: "drive",
      label: "Google Drive assets",
      points: 10,
      complete: hasDrivePresence(
        input.artistName,
        input.driveFiles,
        input.driveFolders,
        input.assets,
      ),
    },
    {
      key: "story-arc",
      label: "Story arc",
      points: 5,
      complete: input.storyArcs.length >= 1,
    },
  ]

  const earnedPoints = items.filter((item) => item.complete).reduce((sum, item) => sum + item.points, 0)
  const maxPoints = items.reduce((sum, item) => sum + item.points, 0)
  const percent = maxPoints ? Math.round((earnedPoints / maxPoints) * 100) : 0

  const complete = items.filter((item) => item.complete).map((item) => item.label)
  const missingFromScore = items.filter((item) => !item.complete).map((item) => item.label)

  const extendedMissing: string[] = [...missingFromScore]
  if (!input.storyArcs.length && !missingFromScore.includes("Story arc")) {
    extendedMissing.push("Story arc")
  }
  if (!hasPublishedYouTubeLink(input.artistName, input.songConcepts, input.youtubeVideos)) {
    extendedMissing.push("Published YouTube link")
  }
  if (!input.artistPreset) extendedMissing.push("Artist preset")
  if (!input.publishedSongPlaybook) extendedMissing.push("Playbook")
  if (!input.merchIdeas.length) extendedMissing.push("Merch / product ideas")

  const missing = [...new Set(extendedMissing)]

  return {
    percent,
    earnedPoints,
    maxPoints,
    items,
    complete,
    missing,
  }
}

function recordHref(type: string, id: string): string {
  switch (type) {
    case "Artist Bible":
      return `/artist-bible?recordId=${encodeURIComponent(id)}`
    case "Visual Identity":
      return `/visual-identity?recordId=${encodeURIComponent(id)}`
    case "Lore Entry":
      return `/lore?recordId=${encodeURIComponent(id)}`
    case "Song Concept":
      return `/song-vault?recordId=${encodeURIComponent(id)}`
    case "Story Arc":
      return `/story-arcs?recordId=${encodeURIComponent(id)}`
    case "Asset":
      return `/assets?recordId=${encodeURIComponent(id)}`
    case "Campaign":
      return `/campaigns?campaignId=${encodeURIComponent(id)}`
    case "YouTube Video":
      return `/videos?recordId=${encodeURIComponent(id)}`
    case "Merch Idea":
      return `/merch-ideas?recordId=${encodeURIComponent(id)}`
    case "Drive File":
    case "Drive Folder":
      return `/integrations?tab=google-drive`
    default:
      return "/artist-universe"
  }
}

export function buildRelationshipMap(input: {
  bible: ArtistBibleRecord | null
  visualProfiles: VisualIdentityProfileRecord[]
  loreEntries: LoreEntryRecord[]
  songConcepts: SongConceptRecord[]
  storyArcs: ReleaseStoryArcRecord[]
  assets: AssetRecord[]
  campaigns: CampaignRecord[]
  youtubeVideos: YouTubeVideoRecord[]
  merchIdeas: MerchIdea[]
  driveFiles: DriveFileRecord[]
  driveFolders: DriveFolderRecord[]
}): Record<string, ArtistUniverseDashboardRecord[]> {
  const map: Record<string, ArtistUniverseDashboardRecord[]> = {
    "Artist Bible": [],
    "Visual Identity": [],
    "Lore Entries": [],
    "Song Concepts": [],
    "Story Arcs": [],
    Assets: [],
    YouTube: [],
    Campaigns: [],
    "Products / Merch": [],
  }

  if (input.bible) {
    map["Artist Bible"].push({
      id: input.bible.id,
      type: "Artist Bible",
      title: `${input.bible.artistName} Artist Bible`,
      status: input.bible.status,
      summary: input.bible.shortBio || input.bible.brandPromise,
      tags: input.bible.tags,
      href: recordHref("Artist Bible", input.bible.id),
      updatedAt: input.bible.updatedAt,
    })
  }

  for (const profile of input.visualProfiles) {
    map["Visual Identity"].push({
      id: profile.id,
      type: "Visual Identity",
      title: profile.profileName || profile.artistName,
      status: profile.status,
      summary: profile.visualStyle,
      tags: profile.tags,
      href: recordHref("Visual Identity", profile.id),
      updatedAt: profile.updatedAt,
    })
  }

  for (const lore of input.loreEntries) {
    map["Lore Entries"].push({
      id: lore.id,
      type: "Lore Entry",
      title: lore.title,
      status: lore.status,
      summary: lore.summary,
      tags: lore.tags,
      href: recordHref("Lore Entry", lore.id),
      updatedAt: lore.updatedAt,
    })
  }

  for (const concept of input.songConcepts) {
    map["Song Concepts"].push({
      id: concept.id,
      type: "Song Concept",
      title: concept.songTitle || concept.title,
      status: concept.status,
      summary: concept.conceptSummary,
      tags: concept.tags,
      href: recordHref("Song Concept", concept.id),
      updatedAt: concept.updatedAt,
    })
  }

  for (const arc of input.storyArcs) {
    map["Story Arcs"].push({
      id: arc.id,
      type: "Story Arc",
      title: arc.title,
      status: arc.status,
      summary: arc.summary,
      tags: arc.tags,
      href: recordHref("Story Arc", arc.id),
      updatedAt: arc.updatedAt,
    })
  }

  for (const asset of input.assets.slice(0, 24)) {
    map.Assets.push({
      id: asset.id,
      type: "Asset",
      title: asset.assetName,
      status: asset.status,
      summary: asset.assetType,
      tags: asset.tags,
      href: recordHref("Asset", asset.id),
      updatedAt: asset.updatedAt,
    })
  }

  for (const video of input.youtubeVideos) {
    map.YouTube.push({
      id: video.id,
      type: "YouTube Video",
      title: video.title,
      status: video.privacyStatus,
      summary: video.songTitle || video.channelTitle,
      tags: [],
      href: recordHref("YouTube Video", video.id),
      updatedAt: video.lastSyncedAt ?? video.publishedAt ?? 0,
    })
  }

  for (const campaign of input.campaigns) {
    map.Campaigns.push({
      id: campaign.id,
      type: "Campaign",
      title: campaign.campaignName,
      status: campaign.status,
      summary: campaign.songTitle || campaign.campaignType,
      tags: [],
      href: recordHref("Campaign", campaign.id),
      updatedAt: campaign.updatedAt,
    })
  }

  for (const merch of input.merchIdeas) {
    map["Products / Merch"].push({
      id: merch.id,
      type: "Merch Idea",
      title: merch.selectedConceptName || merch.noun || "Merch idea",
      status: merch.primaryGoal || undefined,
      summary: merch.selectedProductTitle || merch.productType,
      tags: merch.selectedTags ? [merch.selectedTags] : [],
      href: recordHref("Merch Idea", merch.id),
      updatedAt: merch.updatedAt,
    })
  }

  const driveRecords = [
    ...input.driveFolders.map((folder) => ({
      id: folder.id,
      type: "Drive Folder" as const,
      title: folder.name,
      status: folder.status,
      summary: folder.campaignName || "Google Drive folder",
      tags: folder.tags,
      href: recordHref("Drive Folder", folder.id),
      updatedAt: folder.lastSyncedAt ?? folder.updatedAt,
    })),
    ...input.driveFiles.slice(0, 12).map((file) => ({
      id: file.id,
      type: "Drive File" as const,
      title: file.name,
      status: file.status,
      summary: file.detectedAssetType,
      tags: file.tags,
      href: recordHref("Drive File", file.id),
      updatedAt: file.lastSyncedAt ?? file.updatedAt,
    })),
  ]

  for (const drive of driveRecords) {
    if (!map.Assets.some((asset) => asset.id === drive.id)) {
      map.Assets.push(drive)
    }
  }

  return map
}

export function buildArtistUniverseActivity(input: {
  loreEntries: LoreEntryRecord[]
  songConcepts: SongConceptRecord[]
  assets: AssetRecord[]
  driveFiles: DriveFileRecord[]
  driveFolders: DriveFolderRecord[]
  youtubeVideos: YouTubeVideoRecord[]
  campaigns: CampaignRecord[]
  storyArcs: ReleaseStoryArcRecord[]
}): ArtistUniverseActivityItem[] {
  const items: ArtistUniverseActivityItem[] = []

  for (const lore of input.loreEntries) {
    items.push({
      id: `lore-${lore.id}`,
      label: "Lore entry updated",
      detail: lore.title,
      timestamp: lore.updatedAt,
      href: recordHref("Lore Entry", lore.id),
    })
  }
  for (const concept of input.songConcepts) {
    items.push({
      id: `concept-${concept.id}`,
      label: "Song concept updated",
      detail: concept.songTitle || concept.title,
      timestamp: concept.updatedAt,
      href: recordHref("Song Concept", concept.id),
    })
  }
  for (const asset of input.assets) {
    items.push({
      id: `asset-${asset.id}`,
      label: "Asset updated",
      detail: asset.assetName,
      timestamp: asset.updatedAt,
      href: recordHref("Asset", asset.id),
    })
  }
  for (const folder of input.driveFolders) {
    if (folder.lastSyncedAt) {
      items.push({
        id: `drive-folder-${folder.id}`,
        label: "Drive folder synced",
        detail: folder.name,
        timestamp: folder.lastSyncedAt,
        href: "/integrations?tab=google-drive",
      })
    }
  }
  for (const file of input.driveFiles) {
    if (file.lastSyncedAt) {
      items.push({
        id: `drive-file-${file.id}`,
        label: "Drive file synced",
        detail: file.name,
        timestamp: file.lastSyncedAt,
        href: "/integrations?tab=google-drive",
      })
    }
  }
  for (const video of input.youtubeVideos) {
    items.push({
      id: `video-${video.id}`,
      label: "YouTube video imported",
      detail: video.title,
      timestamp: video.lastSyncedAt ?? video.publishedAt ?? 0,
      href: recordHref("YouTube Video", video.id),
    })
  }
  for (const campaign of input.campaigns) {
    items.push({
      id: `campaign-${campaign.id}`,
      label: "Campaign updated",
      detail: campaign.campaignName,
      timestamp: campaign.updatedAt,
      href: recordHref("Campaign", campaign.id),
    })
  }
  for (const arc of input.storyArcs) {
    items.push({
      id: `arc-${arc.id}`,
      label: "Story arc updated",
      detail: arc.title,
      timestamp: arc.updatedAt,
      href: recordHref("Story Arc", arc.id),
    })
  }

  return items
    .filter((item) => item.timestamp > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 12)
}

export function buildArtistUniverseRecommendations(input: {
  artistName: string
  readiness: ArtistUniverseDashboardData["readiness"]
  storyArcs: ReleaseStoryArcRecord[]
  songConcepts: SongConceptRecord[]
  youtubeVideos: YouTubeVideoRecord[]
  merchIdeas: MerchIdea[]
  artistSetupTaskCount: number
  campaigns: CampaignRecord[]
  artistPreset: PresetRecord | null
  publishedSongPlaybook: PlaybookRecord | null
}): ArtistUniverseRecommendation[] {
  const recs: ArtistUniverseRecommendation[] = []
  const artist = input.artistName
  const primarySong = input.songConcepts[0]?.songTitle || input.songConcepts[0]?.title || "No Exit"

  if (!input.storyArcs.length) {
    recs.push({
      id: "story-arc",
      title: `Create ${artist} story arc`,
      description: "Define an era or release narrative before you need a campaign.",
      href: `/story-arcs?artist=${encodeURIComponent(artist)}`,
      tone: "action",
    })
  }

  if (!hasPublishedYouTubeLink(artist, input.songConcepts, input.youtubeVideos) && input.songConcepts.length) {
    recs.push({
      id: "youtube-link",
      title: `Link published YouTube video to ${primarySong}`,
      description: "Connect your live release to the song concept vault and artist universe.",
      href: `/videos?artist=${encodeURIComponent(artist)}`,
      tone: "action",
    })
  }

  if (!input.merchIdeas.length && input.songConcepts.length) {
    recs.push({
      id: "merch",
      title: `Create merch ideas for ${primarySong}`,
      description: "Capture product tie-ins without starting a full campaign.",
      href: `/merch-ideas?artist=${encodeURIComponent(artist)}`,
      tone: "optional",
    })
  }

  if (input.artistSetupTaskCount === 0) {
    recs.push({
      id: "setup-tasks",
      title: "Create artist setup checklist",
      description: "Track Drive uploads, lore, visual identity, and universe setup tasks.",
      href: `/tasks?artist=${encodeURIComponent(artist)}&tab=artist-setup`,
      tone: "action",
    })
  }

  if (!input.artistPreset) {
    recs.push({
      id: "preset",
      title: `Install ${artist} preset`,
      description: "Save reusable defaults for prompts, campaigns, and creative workflows.",
      href: "/presets",
      tone: "optional",
    })
  }

  if (!input.publishedSongPlaybook) {
    recs.push({
      id: "playbook",
      title: "Install Published Song Archive playbook",
      description: "Use a repeatable launch checklist when you are ready to promote a release.",
      href: "/playbooks",
      tone: "optional",
    })
  }

  if (!input.readiness.items.find((item) => item.key === "lore")?.complete) {
    recs.push({
      id: "lore",
      title: "Add more lore entries",
      description: "Aim for at least three canon or active lore entries to anchor the universe.",
      href: `/lore?artist=${encodeURIComponent(artist)}`,
      tone: "action",
    })
  }

  if (!input.campaigns.length) {
    recs.push({
      id: "no-campaign",
      title: "No campaign needed yet",
      description:
        "Create a campaign when you are ready for merch, relaunch, or a new release — not required for universe building.",
      tone: "info",
    })
  }

  return recs
}

export function buildPrettyWiseNextActions(
  songConcepts: SongConceptRecord[],
): ArtistUniverseRecommendation[] {
  const primarySong = songConcepts.find((c) => norm(c.songTitle).includes("no exit"))?.songTitle || "No Exit"
  return [
    {
      id: "pw-arc",
      title: "Create PrettyWise: The Candy Horror Era story arc",
      description: "Frame the current era before individual song campaigns.",
      href: "/story-arcs?artist=PrettyWise",
      tone: "action",
    },
    {
      id: "pw-youtube",
      title: `Link ${primarySong} YouTube URL`,
      description: "Attach the published video to your song concept and asset map.",
      href: "/videos?artist=PrettyWise",
      tone: "action",
    },
    {
      id: "pw-context",
      title: "Build PrettyWise AI Context Pack",
      description: "Generate a compact artist universe context bundle for agents and prompts.",
      href: "/agents?artist=PrettyWise",
      tone: "action",
    },
    {
      id: "pw-merch",
      title: `Create ${primarySong} merch idea records`,
      description: "Capture product concepts tied to the song without launching a campaign.",
      href: "/merch-ideas?artist=PrettyWise",
      tone: "optional",
    },
    {
      id: "pw-preset",
      title: "Install PrettyWise preset",
      description: "Save reusable PrettyWise defaults across the workspace.",
      href: "/presets",
      tone: "optional",
    },
    {
      id: "pw-playbook",
      title: "Install Published Song Archive playbook",
      description: "Ready a launch checklist for when promotion begins.",
      href: "/playbooks",
      tone: "optional",
    },
  ]
}

export function assembleArtistUniverseDashboard(input: {
  artistName: string
  bible: ArtistBibleRecord | null
  visualProfiles: VisualIdentityProfileRecord[]
  loreEntries: LoreEntryRecord[]
  songConcepts: SongConceptRecord[]
  storyArcs: ReleaseStoryArcRecord[]
  assets: AssetRecord[]
  campaigns: CampaignRecord[]
  youtubeVideos: YouTubeVideoRecord[]
  merchIdeas: MerchIdea[]
  driveFiles: DriveFileRecord[]
  driveFolders: DriveFolderRecord[]
  artistSetupTaskCount: number
  artistPreset: PresetRecord | null
  publishedSongPlaybook: PlaybookRecord | null
}): ArtistUniverseDashboardData {
  const visualIdentity =
    input.visualProfiles.find((profile) => profile.status === "Active") ??
    input.visualProfiles[0] ??
    null

  const readiness = computeArtistUniverseReadiness({
    artistName: input.artistName,
    bible: input.bible,
    visualIdentity,
    loreEntries: input.loreEntries,
    songConcepts: input.songConcepts,
    storyArcs: input.storyArcs,
    assets: input.assets,
    driveFiles: input.driveFiles,
    driveFolders: input.driveFolders,
    youtubeVideos: input.youtubeVideos,
    merchIdeas: input.merchIdeas,
    artistPreset: input.artistPreset,
    publishedSongPlaybook: input.publishedSongPlaybook,
  })

  const relationshipMap = buildRelationshipMap({
    bible: input.bible,
    visualProfiles: input.visualProfiles,
    loreEntries: input.loreEntries,
    songConcepts: input.songConcepts,
    storyArcs: input.storyArcs,
    assets: input.assets,
    campaigns: input.campaigns,
    youtubeVideos: input.youtubeVideos,
    merchIdeas: input.merchIdeas,
    driveFiles: input.driveFiles,
    driveFolders: input.driveFolders,
  })

  const activity = buildArtistUniverseActivity({
    loreEntries: input.loreEntries,
    songConcepts: input.songConcepts,
    assets: input.assets,
    driveFiles: input.driveFiles,
    driveFolders: input.driveFolders,
    youtubeVideos: input.youtubeVideos,
    campaigns: input.campaigns,
    storyArcs: input.storyArcs,
  })

  const recommendations = buildArtistUniverseRecommendations({
    artistName: input.artistName,
    readiness,
    storyArcs: input.storyArcs,
    songConcepts: input.songConcepts,
    youtubeVideos: input.youtubeVideos,
    merchIdeas: input.merchIdeas,
    artistSetupTaskCount: input.artistSetupTaskCount,
    campaigns: input.campaigns,
    artistPreset: input.artistPreset,
    publishedSongPlaybook: input.publishedSongPlaybook,
  })

  const showPrettyWiseBanner =
    norm(input.artistName) === "prettywise" && Boolean(input.bible) && readiness.percent >= 60

  const publishedSongs = buildPublishedSongSummaries(
    input.songConcepts,
    input.loreEntries,
    input.assets,
    input.youtubeVideos,
  )

  const relatedItems = input.songConcepts.slice(0, 6).map((concept) => {
    const legacyLinks = legacySongConceptLinks(concept).length
    const assetLinks = input.assets.filter((asset) => {
      const noteLinks = parseRelatedLinksFromNotes(asset.notes)
      return (
        concept.relatedAssetIds.includes(asset.id) ||
        noteLinks.some((l) => l.recordType === "SongConcept" && l.recordId === concept.id)
      )
    }).length
    const linked = legacyLinks + assetLinks
    const inferred = legacyLinks
    const suggested = Math.max(0, input.loreEntries.length - concept.relatedLoreIds.length)
    return {
      sourceTitle: concept.songTitle || concept.title,
      sourceType: "SongConcept",
      linked,
      inferred,
      suggested,
      href: `/song-vault?recordId=${encodeURIComponent(concept.id)}&tab=related`,
    }
  })

  const relatedLinkSummary = {
    linked: relatedItems.reduce((sum, item) => sum + item.linked, 0),
    inferred: relatedItems.reduce((sum, item) => sum + item.inferred, 0),
    suggested: relatedItems.reduce((sum, item) => sum + item.suggested, 0),
    items: relatedItems,
  }

  return {
    artistName: input.artistName,
    bible: input.bible,
    visualIdentity,
    visualProfiles: input.visualProfiles,
    loreEntries: input.loreEntries,
    songConcepts: input.songConcepts,
    storyArcs: input.storyArcs,
    assets: input.assets,
    campaigns: input.campaigns,
    youtubeVideos: input.youtubeVideos,
    merchIdeas: input.merchIdeas,
    driveFiles: input.driveFiles,
    driveFolders: input.driveFolders,
    artistSetupTaskCount: input.artistSetupTaskCount,
    artistPreset: input.artistPreset,
    publishedSongPlaybook: input.publishedSongPlaybook,
    readiness,
    relationshipMap,
    recommendations,
    activity,
    showPrettyWiseBanner,
    prettyWiseNextActions: showPrettyWiseBanner
      ? buildPrettyWiseNextActions(input.songConcepts)
      : [],
    publishedSongs,
    relatedLinkSummary,
  }
}

export function pickArtistBibleCompletenessLabel(bible: ArtistBibleRecord | null): string {
  if (!bible) return "Not started"
  const { score } = artistBibleCompletenessBreakdown(bible)
  return `${score}% complete`
}
