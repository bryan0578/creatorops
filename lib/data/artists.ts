import {
  normalizeArtistRecord as normalizeArtistRecordBase,
} from "@/lib/artist-crm"
import type {
  ArtistCampaign,
  ArtistMerchProduct,
  ArtistRecord,
  ArtistRelease,
} from "@/lib/types"
import type {
  Artist as PrismaArtist,
  ArtistCampaign as PrismaArtistCampaign,
  ArtistProduct as PrismaArtistProduct,
  ArtistRelease as PrismaArtistRelease,
} from "@/lib/generated/prisma/client"

/**
 * Shared artist CRM data layer — maps between app types and Prisma rows.
 * Releases, products, and campaigns are stored relationally with sort order.
 */

export type ArtistWithRelations = PrismaArtist & {
  releases: PrismaArtistRelease[]
  products: PrismaArtistProduct[]
  campaigns: PrismaArtistCampaign[]
}

function toPrismaChildId(artistId: string, childId: string): string {
  return `${artistId}__${childId}`
}

function fromPrismaChildId(artistId: string, prismaChildId: string): string {
  const prefix = `${artistId}__`
  return prismaChildId.startsWith(prefix)
    ? prismaChildId.slice(prefix.length)
    : prismaChildId
}

export { normalizeArtistRecordBase as normalizeArtistRecord }

export function artistToPrismaCreate(record: ArtistRecord) {
  const normalized = normalizeArtistRecordBase(record)
  return {
    id: normalized.id,
    artistName: normalized.artistName,
    artistType: normalized.artistType,
    genre: normalized.genre,
    subGenres: normalized.subGenres,
    mood: normalized.mood,
    brandDescription: normalized.brandDescription,
    visualIdentity: normalized.visualIdentity,
    targetAudience: normalized.targetAudience,
    contentStyle: normalized.contentStyle,
    youtubeChannel: normalized.youtubeChannel,
    spotifyLink: normalized.spotifyLink,
    appleMusicLink: normalized.appleMusicLink,
    amazonMusicLink: normalized.amazonMusicLink,
    websiteLink: normalized.websiteLink,
    merchStoreLink: normalized.merchStoreLink,
    socialLinks: normalized.socialLinks,
    notes: normalized.notes,
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function artistToPrismaUpdate(record: ArtistRecord) {
  const normalized = normalizeArtistRecordBase(record)
  return {
    artistName: normalized.artistName,
    artistType: normalized.artistType,
    genre: normalized.genre,
    subGenres: normalized.subGenres,
    mood: normalized.mood,
    brandDescription: normalized.brandDescription,
    visualIdentity: normalized.visualIdentity,
    targetAudience: normalized.targetAudience,
    contentStyle: normalized.contentStyle,
    youtubeChannel: normalized.youtubeChannel,
    spotifyLink: normalized.spotifyLink,
    appleMusicLink: normalized.appleMusicLink,
    amazonMusicLink: normalized.amazonMusicLink,
    websiteLink: normalized.websiteLink,
    merchStoreLink: normalized.merchStoreLink,
    socialLinks: normalized.socialLinks,
    notes: normalized.notes,
    updatedAt: new Date(normalized.updatedAt),
  }
}

function releaseToNestedCreate(artistId: string, release: ArtistRelease, sortOrder: number) {
  return {
    id: toPrismaChildId(artistId, release.id),
    sortOrder,
    songTitle: release.songTitle,
    releaseDate: release.releaseDate,
    genre: release.genre,
    mood: release.mood,
    status: release.status,
    youtubeUrl: release.youtubeUrl,
    streamingLinks: release.streamingLinks,
    notes: release.notes,
    thumbnailRecordId: release.thumbnailRecordId ?? "",
    youtubePackagingRecordId: release.youtubePackagingRecordId ?? "",
    releasePlanRecordId: release.releasePlanRecordId ?? "",
    analyticsRecordId: release.analyticsRecordId ?? "",
  }
}

function productToNestedCreate(
  artistId: string,
  product: ArtistMerchProduct,
  sortOrder: number,
) {
  return {
    id: toPrismaChildId(artistId, product.id),
    sortOrder,
    productName: product.productName,
    productType: product.productType,
    status: product.status,
    storeLink: product.storeLink,
    notes: product.notes,
  }
}

function campaignToNestedCreate(
  artistId: string,
  campaign: ArtistCampaign,
  sortOrder: number,
) {
  return {
    id: toPrismaChildId(artistId, campaign.id),
    sortOrder,
    campaignName: campaign.campaignName,
    campaignType: campaign.campaignType,
    status: campaign.status,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    notes: campaign.notes,
  }
}

/** Nested creates for `releases`, `products`, `campaigns` — omit artistId (set by relation). */
export function artistRelationsToNestedCreate(record: ArtistRecord) {
  const normalized = normalizeArtistRecordBase(record)
  return {
    releases: {
      create: normalized.releases.map((release, index) =>
        releaseToNestedCreate(normalized.id, release, index),
      ),
    },
    products: {
      create: normalized.merchProducts.map((product, index) =>
        productToNestedCreate(normalized.id, product, index),
      ),
    },
    campaigns: {
      create: normalized.campaigns.map((campaign, index) =>
        campaignToNestedCreate(normalized.id, campaign, index),
      ),
    },
  }
}

export function releasesToPrismaCreate(artistId: string, releases: ArtistRelease[]) {
  return normalizeArtistRecordBase({ id: artistId, releases }).releases.map(
    (release, index) => ({
      ...releaseToNestedCreate(artistId, release, index),
      artistId,
    }),
  )
}

export function productsToPrismaCreate(
  artistId: string,
  products: ArtistMerchProduct[],
) {
  return normalizeArtistRecordBase({ id: artistId, merchProducts: products })
    .merchProducts.map((product, index) => ({
      ...productToNestedCreate(artistId, product, index),
      artistId,
    }))
}

export function campaignsToPrismaCreate(
  artistId: string,
  campaigns: ArtistCampaign[],
) {
  return normalizeArtistRecordBase({ id: artistId, campaigns }).campaigns.map(
    (campaign, index) => ({
      ...campaignToNestedCreate(artistId, campaign, index),
      artistId,
    }),
  )
}

export function prismaArtistToArtistRecord(row: ArtistWithRelations): ArtistRecord {
  const releases = [...row.releases]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((release) => ({
      id: fromPrismaChildId(row.id, release.id),
      songTitle: release.songTitle,
      releaseDate: release.releaseDate,
      genre: release.genre,
      mood: release.mood,
      status: release.status,
      youtubeUrl: release.youtubeUrl,
      streamingLinks: release.streamingLinks,
      notes: release.notes,
      thumbnailRecordId: release.thumbnailRecordId,
      youtubePackagingRecordId: release.youtubePackagingRecordId,
      releasePlanRecordId: release.releasePlanRecordId,
      analyticsRecordId: release.analyticsRecordId,
    }))

  const merchProducts = [...row.products]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((product) => ({
      id: fromPrismaChildId(row.id, product.id),
      productName: product.productName,
      productType: product.productType,
      status: product.status,
      storeLink: product.storeLink,
      notes: product.notes,
    }))

  const campaigns = [...row.campaigns]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((campaign) => ({
      id: fromPrismaChildId(row.id, campaign.id),
      campaignName: campaign.campaignName,
      campaignType: campaign.campaignType,
      status: campaign.status,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      notes: campaign.notes,
    }))

  return normalizeArtistRecordBase({
    id: row.id,
    artistName: row.artistName,
    artistType: row.artistType,
    genre: row.genre,
    subGenres: row.subGenres,
    mood: row.mood,
    brandDescription: row.brandDescription,
    visualIdentity: row.visualIdentity,
    targetAudience: row.targetAudience,
    contentStyle: row.contentStyle,
    youtubeChannel: row.youtubeChannel,
    spotifyLink: row.spotifyLink,
    appleMusicLink: row.appleMusicLink,
    amazonMusicLink: row.amazonMusicLink,
    websiteLink: row.websiteLink,
    merchStoreLink: row.merchStoreLink,
    socialLinks: row.socialLinks,
    notes: row.notes,
    releases,
    merchProducts,
    campaigns,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}
