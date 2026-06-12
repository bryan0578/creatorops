import type {
  ArtistBibleRecord,
  LoreEntryRecord,
  ReleaseStoryArcRecord,
  SongConceptRecord,
  VisualIdentityProfileRecord,
} from "@/lib/artist-universe/types"
import type { DataHealthIssue, DataHealthScanInput } from "@/lib/data/data-health"
import type { CampaignRecord } from "@/lib/types"

function issueId(parts: string[]): string {
  return parts.filter(Boolean).join(":")
}

function pushIssue(issues: DataHealthIssue[], issue: DataHealthIssue) {
  if (issues.some((item) => item.id === issue.id)) return
  issues.push(issue)
}

export type ArtistUniverseHealthInput = DataHealthScanInput & {
  artistBibles?: ArtistBibleRecord[]
  loreEntries?: LoreEntryRecord[]
  songConcepts?: SongConceptRecord[]
  storyArcs?: ReleaseStoryArcRecord[]
  visualIdentities?: VisualIdentityProfileRecord[]
}

/** Artist Universe gap checks — low/medium severity, non-noisy. */
export function scanArtistUniverseWarnings(
  input: ArtistUniverseHealthInput,
  issues: DataHealthIssue[],
): void {
  const bibles = input.artistBibles ?? []
  const lore = input.loreEntries ?? []
  const concepts = input.songConcepts ?? []
  const arcs = input.storyArcs ?? []
  const visual = input.visualIdentities ?? []
  const collections = input.productCollections ?? []

  const bibleByArtist = new Map(
    bibles.map((b) => [b.artistName.trim().toLowerCase(), b]),
  )

  for (const campaign of input.campaigns) {
    if (!campaign.artistName?.trim()) continue
    const key = campaign.artistName.trim().toLowerCase()
    if (!bibleByArtist.has(key)) {
      pushIssue(issues, {
        id: issueId(["artist-universe", "no-bible", campaign.id]),
        severity: "warning",
        category: "incomplete-records",
        title: `Campaign missing Artist Bible: ${campaign.campaignName || campaign.artistName}`,
        description: `Campaign has artistName "${campaign.artistName}" but no matching Artist Bible exists.`,
        sourceType: "campaign",
        sourceId: campaign.id,
        sourceTitle: campaign.campaignName || "Campaign",
        href: `/campaigns?campaignId=${encodeURIComponent(campaign.id)}`,
        suggestedAction: "Create an Artist Bible for this artist.",
        relatedHref: "/artist-bible",
      })
    }
  }

  for (const concept of concepts) {
    if (!concept.visualConcept.trim()) {
      pushIssue(issues, {
        id: issueId(["artist-universe", "concept-visual", concept.id]),
        severity: "info",
        category: "incomplete-records",
        title: `Song concept missing visual concept: ${concept.title}`,
        description: "Add a visual concept to align packaging and thumbnails.",
        sourceType: "song-concept",
        sourceId: concept.id,
        sourceTitle: concept.title,
        href: `/song-vault?recordId=${encodeURIComponent(concept.id)}`,
        suggestedAction: "Add visual concept in Song Vault.",
      })
    }
    if (["Planned", "Selected", "Ready"].includes(concept.status) && !concept.releasePlanId && !concept.campaignId) {
      pushIssue(issues, {
        id: issueId(["artist-universe", "concept-release", concept.id]),
        severity: "warning",
        category: "incomplete-records",
        title: `Planned song concept missing release link: ${concept.title}`,
        description: "Convert to a release plan or campaign when ready.",
        sourceType: "song-concept",
        sourceId: concept.id,
        sourceTitle: concept.title,
        href: `/song-vault?recordId=${encodeURIComponent(concept.id)}`,
        suggestedAction: "Convert to Release Plan or Campaign.",
      })
    }
  }

  for (const profile of visual) {
    if (!profile.referenceAssetIds.length && !profile.referenceDriveFileIds.length) {
      pushIssue(issues, {
        id: issueId(["artist-universe", "visual-refs", profile.id]),
        severity: "info",
        category: "missing-assets",
        title: `Visual identity has no reference assets: ${profile.profileName}`,
        description: "Link reference assets or Drive files for consistency checks.",
        sourceType: "visual-identity",
        sourceId: profile.id,
        sourceTitle: profile.profileName,
        href: `/visual-identity?recordId=${encodeURIComponent(profile.id)}`,
        suggestedAction: "Link reference assets.",
        relatedHref: "/assets",
      })
    }
  }

  for (const arc of arcs) {
    if (!arc.songConceptIds.length && !arc.campaignIds.length) {
      pushIssue(issues, {
        id: issueId(["artist-universe", "arc-links", arc.id]),
        severity: "info",
        category: "incomplete-records",
        title: `Story arc has no linked songs or campaigns: ${arc.title}`,
        description: "Connect song concepts or campaigns to make the arc actionable.",
        sourceType: "story-arc",
        sourceId: arc.id,
        sourceTitle: arc.title,
        href: `/story-arcs?recordId=${encodeURIComponent(arc.id)}`,
        suggestedAction: "Add song concept or campaign to arc.",
      })
    }
  }

  const activeVisualByArtist = new Map<string, VisualIdentityProfileRecord[]>()
  for (const profile of visual.filter((p) => p.status === "Active")) {
    const key = profile.artistName.trim().toLowerCase()
    activeVisualByArtist.set(key, [...(activeVisualByArtist.get(key) ?? []), profile])
  }
  for (const [artist, profiles] of activeVisualByArtist) {
    if (profiles.length > 1) {
      pushIssue(issues, {
        id: issueId(["artist-universe", "visual-conflict", artist]),
        severity: "warning",
        category: "duplicates",
        title: `Multiple active visual identity profiles for ${profiles[0]?.artistName}`,
        description: `${profiles.length} active profiles may cause inconsistent visuals.`,
        sourceType: "visual-identity",
        sourceId: profiles[0]?.id ?? artist,
        sourceTitle: profiles[0]?.artistName ?? artist,
        href: "/visual-identity",
        suggestedAction: "Archive or deactivate extra profiles.",
      })
    }
  }

  for (const collection of collections) {
    if (!collection.artistName?.trim()) continue
    const key = collection.artistName.trim().toLowerCase()
    const hasVisual = visual.some((v) => v.artistName.trim().toLowerCase() === key)
    if (!hasVisual) {
      pushIssue(issues, {
        id: issueId(["artist-universe", "collection-visual", collection.id]),
        severity: "info",
        category: "incomplete-records",
        title: `Collection missing visual identity: ${collection.name}`,
        description: "Create a visual identity profile for consistent merch and mockups.",
        sourceType: "product-collection",
        sourceId: collection.id,
        sourceTitle: collection.name,
        href: `/collections?recordId=${encodeURIComponent(collection.id)}`,
        suggestedAction: "Create Visual Identity profile.",
        relatedHref: "/visual-identity",
      })
    }
  }

  for (const campaign of input.campaigns.filter((c: CampaignRecord) => /released|complete/i.test(c.status))) {
    if (!campaign.artistName?.trim()) continue
    const hasLore = lore.some((l) => l.artistName.toLowerCase() === campaign.artistName.toLowerCase())
    const hasLearning = input.learnings.some(
      (l) =>
        l.title.toLowerCase().includes(campaign.artistName.toLowerCase()) ||
        l.campaignId === campaign.id,
    )
    if (!hasLore && !hasLearning) {
      pushIssue(issues, {
        id: issueId(["artist-universe", "retrospective", campaign.id]),
        severity: "info",
        category: "incomplete-records",
        title: `Released campaign missing story/lore retrospective: ${campaign.campaignName}`,
        description: "Capture lore updates or learnings after release.",
        sourceType: "campaign",
        sourceId: campaign.id,
        sourceTitle: campaign.campaignName || "Campaign",
        href: `/campaigns?campaignId=${encodeURIComponent(campaign.id)}`,
        suggestedAction: "Add learning or lore retrospective.",
      })
    }
  }
}
