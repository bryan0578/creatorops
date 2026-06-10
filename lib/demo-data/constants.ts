/** Marker stored in notes fields — used to identify demo/test records. */
export const DEMO_DATA_MARKER = "DEMO_DATA_CREATOROPS"

/** Note added to campaign linkedRecords entries created by demo seed. */
export const DEMO_LINK_NOTE = "Created by PrettyWise demo data"

export const DEMO_ID_PREFIX = "demo-creatorops-"

export const DEMO_CAMPAIGN_NAME = "PrettyWise - Cotton Candy Skies Release"

export const DEMO_ARTIST_NAME = "PrettyWise"

export const DEMO_SONG_TITLE = "Cotton Candy Skies"

export const DEMO_IDS = {
  artist: `${DEMO_ID_PREFIX}prettywise-artist`,
  artistRelease: `${DEMO_ID_PREFIX}prettywise-artist-release`,
  artistProduct: `${DEMO_ID_PREFIX}prettywise-artist-product`,
  artistCampaign: `${DEMO_ID_PREFIX}prettywise-artist-campaign`,
  campaign: `${DEMO_ID_PREFIX}prettywise-campaign`,
  releasePlan: `${DEMO_ID_PREFIX}prettywise-release-plan`,
  youtubePackage: `${DEMO_ID_PREFIX}prettywise-youtube-package`,
  youtubeThumbnail: `${DEMO_ID_PREFIX}prettywise-youtube-thumbnail`,
  social: `${DEMO_ID_PREFIX}prettywise-social`,
  email: `${DEMO_ID_PREFIX}prettywise-email`,
  merch: `${DEMO_ID_PREFIX}prettywise-merch`,
  productListing: `${DEMO_ID_PREFIX}prettywise-product-listing`,
  mockup: `${DEMO_ID_PREFIX}prettywise-mockup`,
  analytics: `${DEMO_ID_PREFIX}prettywise-analytics`,
  experiment: `${DEMO_ID_PREFIX}prettywise-experiment`,
  promptRunYoutube: `${DEMO_ID_PREFIX}prettywise-prompt-run-youtube`,
  promptRunThumbnail: `${DEMO_ID_PREFIX}prettywise-prompt-run-thumbnail`,
  assetThumbnail: `${DEMO_ID_PREFIX}prettywise-asset-thumbnail`,
  assetMockup: `${DEMO_ID_PREFIX}prettywise-asset-mockup`,
} as const

export function isDemoDataNotes(notes: string | null | undefined): boolean {
  return Boolean(notes?.includes(DEMO_DATA_MARKER))
}

export function isDemoDataId(id: string | null | undefined): boolean {
  return Boolean(id?.startsWith(DEMO_ID_PREFIX))
}

export function isDemoRecord(
  id: string,
  notes: string | null | undefined,
): boolean {
  return isDemoDataId(id) || isDemoDataNotes(notes)
}

/** Only seed/overwrite when record is missing or clearly demo data. */
export function canSeedDemoRecord(
  existing: { id: string; notes: string } | null | undefined,
): boolean {
  if (!existing) return true
  return isDemoRecord(existing.id, existing.notes)
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function demoDates(now = new Date()) {
  const start = new Date(now)
  const launch = new Date(now)
  launch.setDate(launch.getDate() + 14)
  const end = new Date(now)
  end.setDate(end.getDate() + 30)
  return {
    startDate: formatDate(start),
    launchDate: formatDate(launch),
    endDate: formatDate(end),
    timestamp: now.getTime(),
  }
}
