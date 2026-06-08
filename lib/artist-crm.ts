import type {
  AnalyticsRecord,
  ArtistCampaign,
  ArtistFormValues,
  ArtistMerchProduct,
  ArtistRecord,
  ArtistRelease,
  MerchIdeaFormValues,
  Prompt,
  ReleasePlan,
  ReleasePlanFormValues,
  SocialRepurposingFormValues,
  YouTubePackage,
  YouTubePackageFormValues,
  YouTubeThumbnailRecord,
} from "@/lib/types"
import {
  buildMerchIdeaCompletedPrompt,
  getMerchIdeaTemplate,
} from "@/lib/merch-ideas"
import {
  buildReleasePlannerCompletedPrompt,
  getReleasePlannerTemplate,
} from "@/lib/release-planner"
import {
  buildSocialRepurposingCompletedPrompt,
  getSocialRepurposingTemplate,
} from "@/lib/social-repurposing"
import {
  buildYouTubeCompletedPrompt,
  getYouTubeMetadataTemplate,
} from "@/lib/youtube-packaging"
import {
  buildFinalThumbnailText,
  buildYouTubeThumbnailCompletedPrompt,
  finalFieldsFromThumbnailRecord,
  getYouTubeThumbnailTemplate,
} from "@/lib/youtube-thumbnails"
import { createId } from "@/lib/storage"

export function emptyArtistForm(): ArtistFormValues {
  return {
    artistName: "",
    artistType: "AI Artist",
    genre: "",
    subGenres: "",
    mood: "",
    brandDescription: "",
    visualIdentity: "",
    targetAudience: "",
    contentStyle: "",
    youtubeChannel: "",
    spotifyLink: "",
    appleMusicLink: "",
    amazonMusicLink: "",
    websiteLink: "",
    merchStoreLink: "",
    socialLinks: "",
    notes: "",
  }
}

export function emptyArtistRelease(): ArtistRelease {
  return {
    id: createId("release"),
    songTitle: "",
    releaseDate: "",
    genre: "",
    mood: "",
    status: "Idea",
    youtubeUrl: "",
    streamingLinks: "",
    notes: "",
    thumbnailRecordId: "",
    youtubePackagingRecordId: "",
    releasePlanRecordId: "",
    analyticsRecordId: "",
  }
}

export function emptyArtistMerchProduct(): ArtistMerchProduct {
  return {
    id: createId("product"),
    productName: "",
    productType: "",
    status: "Idea",
    storeLink: "",
    notes: "",
  }
}

export function emptyArtistCampaign(): ArtistCampaign {
  return {
    id: createId("campaign"),
    campaignName: "",
    campaignType: "",
    status: "Idea",
    startDate: "",
    endDate: "",
    notes: "",
  }
}

function normalizeRelease(release: Partial<ArtistRelease>): ArtistRelease {
  const empty = emptyArtistRelease()
  return {
    id: release.id ?? empty.id,
    songTitle: release.songTitle ?? empty.songTitle,
    releaseDate: release.releaseDate ?? empty.releaseDate,
    genre: release.genre ?? empty.genre,
    mood: release.mood ?? empty.mood,
    status: release.status ?? empty.status,
    youtubeUrl: release.youtubeUrl ?? empty.youtubeUrl,
    streamingLinks: release.streamingLinks ?? empty.streamingLinks,
    notes: release.notes ?? empty.notes,
    thumbnailRecordId: release.thumbnailRecordId ?? empty.thumbnailRecordId,
    youtubePackagingRecordId:
      release.youtubePackagingRecordId ?? empty.youtubePackagingRecordId,
    releasePlanRecordId:
      release.releasePlanRecordId ?? empty.releasePlanRecordId,
    analyticsRecordId: release.analyticsRecordId ?? empty.analyticsRecordId,
  }
}

function normalizeMerchProduct(
  product: Partial<ArtistMerchProduct>,
): ArtistMerchProduct {
  const empty = emptyArtistMerchProduct()
  return {
    id: product.id ?? empty.id,
    productName: product.productName ?? empty.productName,
    productType: product.productType ?? empty.productType,
    status: product.status ?? empty.status,
    storeLink: product.storeLink ?? empty.storeLink,
    notes: product.notes ?? empty.notes,
  }
}

function normalizeCampaign(campaign: Partial<ArtistCampaign>): ArtistCampaign {
  const empty = emptyArtistCampaign()
  return {
    id: campaign.id ?? empty.id,
    campaignName: campaign.campaignName ?? empty.campaignName,
    campaignType: campaign.campaignType ?? empty.campaignType,
    status: campaign.status ?? empty.status,
    startDate: campaign.startDate ?? empty.startDate,
    endDate: campaign.endDate ?? empty.endDate,
    notes: campaign.notes ?? empty.notes,
  }
}

export function normalizeArtistRecord(
  record: Partial<ArtistRecord> & Pick<ArtistRecord, "id">,
): ArtistRecord {
  const form = emptyArtistForm()
  return {
    id: record.id,
    artistName: record.artistName ?? form.artistName,
    artistType: record.artistType ?? form.artistType,
    genre: record.genre ?? form.genre,
    subGenres: record.subGenres ?? form.subGenres,
    mood: record.mood ?? form.mood,
    brandDescription: record.brandDescription ?? form.brandDescription,
    visualIdentity: record.visualIdentity ?? form.visualIdentity,
    targetAudience: record.targetAudience ?? form.targetAudience,
    contentStyle: record.contentStyle ?? form.contentStyle,
    youtubeChannel: record.youtubeChannel ?? form.youtubeChannel,
    spotifyLink: record.spotifyLink ?? form.spotifyLink,
    appleMusicLink: record.appleMusicLink ?? form.appleMusicLink,
    amazonMusicLink: record.amazonMusicLink ?? form.amazonMusicLink,
    websiteLink: record.websiteLink ?? form.websiteLink,
    merchStoreLink: record.merchStoreLink ?? form.merchStoreLink,
    socialLinks: record.socialLinks ?? form.socialLinks,
    notes: record.notes ?? form.notes,
    releases: (record.releases ?? []).map(normalizeRelease),
    merchProducts: (record.merchProducts ?? []).map(normalizeMerchProduct),
    campaigns: (record.campaigns ?? []).map(normalizeCampaign),
    createdAt: record.createdAt ?? Date.now(),
    updatedAt: record.updatedAt ?? Date.now(),
  }
}

export function thumbnailRecordLabel(record: YouTubeThumbnailRecord): string {
  const title = record.videoTitle || record.trackTitle || "Untitled thumbnail"
  return `${title} · ${record.contentFormat || "Thumbnail"}`
}

export function youtubePackageLabel(record: YouTubePackage): string {
  const title = record.trackTitle || record.artistName || "Untitled package"
  return `${title} · YouTube Packaging`
}

export function releasePlanLabel(record: ReleasePlan): string {
  const title = record.songTitle || record.artistName || "Untitled release plan"
  return `${title} · Release Plan`
}

export function analyticsRecordLabel(record: AnalyticsRecord): string {
  const title = record.itemName || record.relatedSong || "Untitled analytics"
  return `${title} · ${record.platform || "Analytics"}`
}

function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function songTitleInReleases(
  trackTitle: string,
  releases: ArtistRelease[],
): boolean {
  const track = trackTitle.trim().toLowerCase()
  if (!track) return false
  return releases.some((r) => r.songTitle.trim().toLowerCase() === track)
}

export function findRelatedThumbnails(
  artistName: string,
  releases: ArtistRelease[],
  thumbnails: YouTubeThumbnailRecord[],
): YouTubeThumbnailRecord[] {
  const artist = artistName.trim()
  if (!artist) return []

  const linkedIds = new Set(
    releases.map((r) => r.thumbnailRecordId).filter(Boolean),
  )

  const matched = thumbnails.filter((thumbnail) => {
    if (linkedIds.has(thumbnail.id)) return true
    if (namesMatch(thumbnail.artistName, artist)) return true
    if (songTitleInReleases(thumbnail.trackTitle, releases)) return true
    return false
  })

  return [...matched].sort((a, b) => b.updatedAt - a.updatedAt)
}

export function buildArtistProfileText(
  artist: ArtistFormValues,
  related?: {
    releases?: ArtistRelease[]
    thumbnails?: YouTubeThumbnailRecord[]
    thumbnailRecords?: YouTubeThumbnailRecord[]
    youtubePackages?: YouTubePackage[]
    releasePlans?: ReleasePlan[]
    analyticsRecords?: AnalyticsRecord[]
    merchProducts?: ArtistMerchProduct[]
    campaigns?: ArtistCampaign[]
  },
): string {
  const sections: { label: string; value: string }[] = [
    { label: "Artist Name", value: artist.artistName },
    { label: "Genre", value: artist.genre },
    { label: "Sub-Genres", value: artist.subGenres },
    { label: "Mood", value: artist.mood },
    { label: "Brand Description", value: artist.brandDescription },
    { label: "Visual Identity", value: artist.visualIdentity },
    { label: "Target Audience", value: artist.targetAudience },
    { label: "Content Style", value: artist.contentStyle },
  ]

  const platformParts = [
    artist.youtubeChannel && `YouTube: ${artist.youtubeChannel}`,
    artist.spotifyLink && `Spotify: ${artist.spotifyLink}`,
    artist.appleMusicLink && `Apple Music: ${artist.appleMusicLink}`,
    artist.amazonMusicLink && `Amazon Music: ${artist.amazonMusicLink}`,
    artist.websiteLink && `Website: ${artist.websiteLink}`,
    artist.merchStoreLink && `Merch Store: ${artist.merchStoreLink}`,
    artist.socialLinks,
  ].filter(Boolean)

  if (platformParts.length) {
    sections.push({
      label: "Platform Links",
      value: platformParts.join("\n"),
    })
  }

  if (artist.notes.trim()) {
    sections.push({ label: "Notes", value: artist.notes })
  }

  let text = sections
    .filter((section) => section.value.trim())
    .map((section) => `${section.label}:\n${section.value.trim()}`)
    .join("\n\n")

  const thumbById = new Map(
    (related?.thumbnailRecords ?? []).map((t) => [t.id, t]),
  )
  const pkgById = new Map(
    (related?.youtubePackages ?? []).map((p) => [p.id, p]),
  )
  const planById = new Map(
    (related?.releasePlans ?? []).map((p) => [p.id, p]),
  )
  const analyticsById = new Map(
    (related?.analyticsRecords ?? []).map((a) => [a.id, a]),
  )

  if (related?.releases?.length) {
    const releaseText = related.releases
      .filter((r) => r.songTitle.trim())
      .map((r) => {
        let line = `- ${r.songTitle}${r.status ? ` (${r.status})` : ""}${r.releaseDate ? ` — ${r.releaseDate}` : ""}`
        const links: string[] = []
        if (r.thumbnailRecordId) {
          const t = thumbById.get(r.thumbnailRecordId)
          links.push(`Thumbnail: ${t ? thumbnailRecordLabel(t) : r.thumbnailRecordId}`)
        }
        if (r.youtubePackagingRecordId) {
          const p = pkgById.get(r.youtubePackagingRecordId)
          links.push(
            `YouTube Packaging: ${p ? youtubePackageLabel(p) : r.youtubePackagingRecordId}`,
          )
        }
        if (r.releasePlanRecordId) {
          const p = planById.get(r.releasePlanRecordId)
          links.push(
            `Release Plan: ${p ? releasePlanLabel(p) : r.releasePlanRecordId}`,
          )
        }
        if (r.analyticsRecordId) {
          const a = analyticsById.get(r.analyticsRecordId)
          links.push(
            `Analytics: ${a ? analyticsRecordLabel(a) : r.analyticsRecordId}`,
          )
        }
        if (links.length) line += `\n  ${links.join("\n  ")}`
        return line
      })
      .join("\n")
    if (releaseText) text += `\n\nRelated Releases:\n${releaseText}`
  }

  if (related?.thumbnails?.length) {
    const thumbText = related.thumbnails
      .map((t) => {
        const name = t.videoTitle || t.trackTitle || "Untitled"
        const overlay = t.finalTextOverlay.trim()
          ? ` · Text: ${t.finalTextOverlay.trim()}`
          : ""
        return `- ${name} (${t.contentFormat || "Thumbnail"} · ${t.videoType || "Video"})${overlay}`
      })
      .join("\n")
    if (thumbText) text += `\n\nRelated Thumbnails:\n${thumbText}`
  }

  if (related?.merchProducts?.length) {
    const merchText = related.merchProducts
      .filter((p) => p.productName.trim())
      .map(
        (p) =>
          `- ${p.productName}${p.productType ? ` (${p.productType})` : ""}${p.status ? ` — ${p.status}` : ""}`,
      )
      .join("\n")
    if (merchText) text += `\n\nMerch / Products:\n${merchText}`
  }

  if (related?.campaigns?.length) {
    const campaignText = related.campaigns
      .filter((c) => c.campaignName.trim())
      .map(
        (c) =>
          `- ${c.campaignName}${c.campaignType ? ` (${c.campaignType})` : ""}${c.status ? ` — ${c.status}` : ""}`,
      )
      .join("\n")
    if (campaignText) text += `\n\nCampaigns:\n${campaignText}`
  }

  return text
}

function streamingPlatformsFromArtist(artist: ArtistFormValues): string {
  const links = [
    artist.spotifyLink && `Spotify: ${artist.spotifyLink}`,
    artist.appleMusicLink && `Apple Music: ${artist.appleMusicLink}`,
    artist.amazonMusicLink && `Amazon Music: ${artist.amazonMusicLink}`,
  ].filter(Boolean)
  return links.length
    ? links.join("\n")
    : "Spotify, Apple Music, YouTube Music, Amazon Music"
}

function latestRelease(releases: ArtistRelease[]): ArtistRelease | undefined {
  return releases.find((r) => r.songTitle.trim()) ?? releases[0]
}

export function artistToReleasePlanForm(
  artist: ArtistFormValues,
  release?: ArtistRelease,
): ReleasePlanFormValues {
  const r = release ?? latestRelease([])
  return {
    artistName: artist.artistName,
    songTitle: r?.songTitle ?? "",
    genre: r?.genre || artist.genre,
    mood: r?.mood || artist.mood,
    releaseDate: r?.releaseDate ?? "",
    youtubeChannel: artist.youtubeChannel,
    targetAudience: artist.targetAudience,
    visualTheme: artist.visualIdentity,
    merchTieIn: artist.merchStoreLink
      ? `Merch store: ${artist.merchStoreLink}`
      : "",
    streamingPlatforms: r?.streamingLinks || streamingPlatformsFromArtist(artist),
    primaryGoal: "Build Artist Awareness",
    notes: [artist.brandDescription, artist.notes].filter(Boolean).join("\n\n"),
  }
}

export function artistToYouTubeForm(
  artist: ArtistFormValues,
  release?: ArtistRelease,
): YouTubePackageFormValues {
  const r = release ?? latestRelease([])
  return {
    trackTitle: r?.songTitle ?? "",
    artistName: artist.artistName,
    channelName: artist.youtubeChannel,
    genre: r?.genre || artist.genre,
    mood: r?.mood || artist.mood,
    targetListener: artist.targetAudience,
    visualTheme: artist.visualIdentity,
    primaryGoal: "Views",
    merchTieIn: artist.merchStoreLink
      ? `Merch store: ${artist.merchStoreLink}`
      : "",
    streamingLink: r?.streamingLinks || artist.spotifyLink,
    releaseDate: r?.releaseDate ?? "",
    videoType: "Visualizer",
    keywords: [artist.genre, artist.subGenres, artist.mood]
      .filter(Boolean)
      .join(", "),
    notes: [artist.contentStyle, artist.brandDescription, artist.notes]
      .filter(Boolean)
      .join("\n\n"),
  }
}

export function artistToMerchIdeaForm(
  artist: ArtistFormValues,
): MerchIdeaFormValues {
  return {
    niche: [artist.artistName, artist.genre].filter(Boolean).join(" — "),
    audience: artist.targetAudience,
    productType: "T-shirt",
    tone: artist.mood,
    noun: artist.artistName,
    verb: "",
    designStyle: artist.visualIdentity,
    storeType: artist.merchStoreLink ? "Custom store" : "Fourthwall",
    primaryGoal: "Build brand awareness",
    notes: [artist.brandDescription, artist.contentStyle, artist.notes]
      .filter(Boolean)
      .join("\n\n"),
  }
}

export function artistToSocialRepurposingForm(
  artist: ArtistFormValues,
  release?: ArtistRelease,
): SocialRepurposingFormValues {
  const r = release ?? latestRelease([])
  const sourceParts = [
    artist.brandDescription,
    r?.songTitle && `Latest release: ${r.songTitle}`,
    artist.contentStyle,
  ].filter(Boolean)

  return {
    campaignName: r?.songTitle
      ? `${artist.artistName} — ${r.songTitle}`
      : artist.artistName,
    sourceContent: sourceParts.join("\n\n"),
    businessArea: "AI Music",
    contentType: "Song Release",
    goal: "Build artist awareness and drive streams",
    audience: artist.targetAudience,
    tone: artist.mood,
    platforms: "TikTok, Instagram, X, YouTube Shorts, YouTube Community, Email",
    callToAction: "Listen now",
    productOrReleaseLink:
      r?.streamingLinks || r?.youtubeUrl || artist.spotifyLink,
    notes: artist.notes,
  }
}

export function buildReleasePlannerPromptFromArtist(
  prompts: Prompt[],
  artist: ArtistFormValues,
  releases: ArtistRelease[],
): string {
  const template = getReleasePlannerTemplate(prompts)
  const form = artistToReleasePlanForm(artist, latestRelease(releases))
  return buildReleasePlannerCompletedPrompt(template, form)
}

export function buildYouTubePromptFromArtist(
  prompts: Prompt[],
  artist: ArtistFormValues,
  releases: ArtistRelease[],
): string {
  const template = getYouTubeMetadataTemplate(prompts)
  const form = artistToYouTubeForm(artist, latestRelease(releases))
  return buildYouTubeCompletedPrompt(template, form)
}

export function buildMerchIdeaPromptFromArtist(
  prompts: Prompt[],
  artist: ArtistFormValues,
): string {
  const template = getMerchIdeaTemplate(prompts)
  const form = artistToMerchIdeaForm(artist)
  return buildMerchIdeaCompletedPrompt(template, form)
}

export function buildSocialRepurposingPromptFromArtist(
  prompts: Prompt[],
  artist: ArtistFormValues,
  releases: ArtistRelease[],
): string {
  const template = getSocialRepurposingTemplate(prompts)
  const form = artistToSocialRepurposingForm(artist, latestRelease(releases))
  return buildSocialRepurposingCompletedPrompt(template, form)
}

export function buildYouTubeThumbnailPromptFromArtist(
  prompts: Prompt[],
  artist: ArtistFormValues,
  releases: ArtistRelease[],
  release?: ArtistRelease,
): string {
  const template = getYouTubeThumbnailTemplate(prompts)
  const r = release ?? latestRelease(releases)
  const form = {
    trackTitle: r?.songTitle ?? "",
    artistName: artist.artistName,
    videoTitle: r?.songTitle
      ? `${artist.artistName} — ${r.songTitle}`.trim()
      : artist.artistName,
    contentFormat: "YouTube Video Thumbnail",
    videoType: "Music Visualizer",
    genre: r?.genre || artist.genre,
    mood: r?.mood || artist.mood,
    targetAudience: artist.targetAudience,
    visualTheme: artist.visualIdentity,
    hookAngle: "",
    mainSubject: artist.artistName,
    textOverlay: "",
    colorDirection: "",
    brandingNotes: artist.brandDescription,
    referenceStyle: artist.contentStyle,
    ctaGoal: "Increase Click-Through Rate",
    notes: artist.notes,
  }
  return buildYouTubeThumbnailCompletedPrompt(template, form)
}

export function buildArtistThumbnailHref(
  artist: ArtistFormValues,
  release?: ArtistRelease,
): string {
  const r = release
  const params = new URLSearchParams()
  if (artist.artistName.trim()) params.set("artistName", artist.artistName.trim())
  const track = r?.songTitle?.trim()
  if (track) params.set("trackTitle", track)
  const videoTitle = track
    ? `${artist.artistName} — ${track}`.trim()
    : artist.artistName.trim()
  if (videoTitle) params.set("videoTitle", videoTitle)
  const genre = r?.genre?.trim() || artist.genre.trim()
  if (genre) params.set("genre", genre)
  const mood = r?.mood?.trim() || artist.mood.trim()
  if (mood) params.set("mood", mood)
  if (artist.visualIdentity.trim()) {
    params.set("visualTheme", artist.visualIdentity.trim())
  }
  const qs = params.toString()
  return qs ? `/youtube-thumbnails?${qs}` : "/youtube-thumbnails"
}

export function buildArtistYouTubePackagingHref(
  artist: ArtistFormValues,
  release?: ArtistRelease,
): string {
  const r = release
  const params = new URLSearchParams()
  if (artist.artistName.trim()) params.set("artistName", artist.artistName.trim())
  const track = r?.songTitle?.trim()
  if (track) params.set("trackTitle", track)
  const genre = r?.genre?.trim() || artist.genre.trim()
  if (genre) params.set("genre", genre)
  const mood = r?.mood?.trim() || artist.mood.trim()
  if (mood) params.set("mood", mood)
  if (artist.visualIdentity.trim()) {
    params.set("visualTheme", artist.visualIdentity.trim())
  }
  if (artist.youtubeChannel.trim()) {
    params.set("channelName", artist.youtubeChannel.trim())
  }
  if (artist.targetAudience.trim()) {
    params.set("targetListener", artist.targetAudience.trim())
  }
  if (r?.releaseDate?.trim()) params.set("releaseDate", r.releaseDate.trim())
  if (r?.streamingLinks?.trim()) {
    params.set("streamingLink", r.streamingLinks.trim())
  } else if (artist.spotifyLink.trim()) {
    params.set("streamingLink", artist.spotifyLink.trim())
  }
  const qs = params.toString()
  return qs ? `/youtube-packaging?${qs}` : "/youtube-packaging"
}

export function buildArtistReleasePlannerHref(
  artist: ArtistFormValues,
  release?: ArtistRelease,
): string {
  const r = release
  const params = new URLSearchParams()
  if (artist.artistName.trim()) params.set("artistName", artist.artistName.trim())
  const song = r?.songTitle?.trim()
  if (song) params.set("songTitle", song)
  const genre = r?.genre?.trim() || artist.genre.trim()
  if (genre) params.set("genre", genre)
  const mood = r?.mood?.trim() || artist.mood.trim()
  if (mood) params.set("mood", mood)
  if (artist.visualIdentity.trim()) {
    params.set("visualTheme", artist.visualIdentity.trim())
  }
  if (artist.targetAudience.trim()) {
    params.set("targetAudience", artist.targetAudience.trim())
  }
  if (artist.youtubeChannel.trim()) {
    params.set("youtubeChannel", artist.youtubeChannel.trim())
  }
  if (r?.releaseDate?.trim()) params.set("releaseDate", r.releaseDate.trim())
  const qs = params.toString()
  return qs ? `/release-planner?${qs}` : "/release-planner"
}

export function buildArtistSocialCampaignHref(
  artist: ArtistFormValues,
  release?: ArtistRelease,
): string {
  const r = release
  const params = new URLSearchParams()
  const song = r?.songTitle?.trim()
  const campaignName = song
    ? `${artist.artistName} — ${song}`.trim()
    : artist.artistName.trim()
  if (campaignName) params.set("campaignName", campaignName)
  if (artist.targetAudience.trim()) {
    params.set("audience", artist.targetAudience.trim())
  }
  if (artist.mood.trim()) params.set("tone", artist.mood.trim())
  if (artist.brandDescription.trim()) {
    params.set("sourceContent", artist.brandDescription.trim())
  }
  const link =
    r?.streamingLinks?.trim() ||
    r?.youtubeUrl?.trim() ||
    artist.spotifyLink.trim()
  if (link) params.set("productOrReleaseLink", link)
  const qs = params.toString()
  return qs ? `/social-repurposing?${qs}` : "/social-repurposing"
}

export function buildArtistAnalyticsHref(
  artist: ArtistFormValues,
  release?: ArtistRelease,
): string {
  const r = release
  const params = new URLSearchParams()
  if (artist.artistName.trim()) {
    params.set("relatedArtist", artist.artistName.trim())
  }
  const song = r?.songTitle?.trim()
  if (song) {
    params.set("relatedSong", song)
    params.set("itemName", `${artist.artistName} — ${song}`.trim())
  }
  const genre = r?.genre?.trim() || artist.genre.trim()
  if (genre) params.set("genre", genre)
  const mood = r?.mood?.trim() || artist.mood.trim()
  if (mood) params.set("mood", mood)
  if (r?.youtubeUrl?.trim()) params.set("url", r.youtubeUrl.trim())
  const qs = params.toString()
  return qs ? `/analytics?${qs}` : "/analytics"
}
