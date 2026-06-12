"use server"

import { revalidatePath } from "next/cache"

import { deleteAnalyticsRecordById, upsertAnalyticsRecord } from "@/lib/actions/analytics-records"
import { createAsset, deleteAsset } from "@/lib/actions/assets"
import { createLearning, deleteLearning } from "@/lib/actions/learnings"
import { createQualityReview, deleteQualityReview } from "@/lib/actions/quality-reviews"
import { createExperiment, deleteExperiment } from "@/lib/actions/experiments"
import { createExternalLink, deleteExternalLink } from "@/lib/actions/external-links"
import { deleteArtistById, upsertArtist } from "@/lib/actions/artists"
import { deleteCampaignById, upsertCampaign } from "@/lib/actions/campaigns"
import {
  deleteEmailCampaignRecordById,
  upsertEmailCampaignRecord,
} from "@/lib/actions/email-campaigns"
import { deleteMerchIdeaById, upsertMerchIdea } from "@/lib/actions/merch-ideas"
import {
  deleteMockupPromptRecordById,
  upsertMockupPromptRecord,
} from "@/lib/actions/mockup-prompts"
import {
  deleteProductListingById,
  upsertProductListing,
} from "@/lib/actions/product-listings"
import { deletePromptRunById, upsertPromptRun } from "@/lib/actions/prompt-runs"
import { deleteReleasePlanById, upsertReleasePlan } from "@/lib/actions/release-plans"
import {
  deleteSocialRepurposingRecordById,
  upsertSocialRepurposingRecord,
} from "@/lib/actions/social-repurposing"
import {
  deleteYouTubePackageById,
  upsertYouTubePackage,
} from "@/lib/actions/youtube-packages"
import {
  deleteYouTubeThumbnailById,
  upsertYouTubeThumbnail,
} from "@/lib/actions/youtube-thumbnails"
import {
  canSeedDemoRecord,
  DEMO_DATA_MARKER,
  DEMO_IDS,
  isDemoRecord,
} from "@/lib/demo-data/constants"
import { buildPrettyWiseDemoCommerceRecords } from "@/lib/demo-data/commerce-records"
import { buildPrettyWiseDemoRecords } from "@/lib/demo-data/prettywise-records"
import { createProductResearchItem } from "@/lib/actions/product-research"
import { createCollection } from "@/lib/actions/collections"
import { createRevenueRecord, deleteRevenueRecord } from "@/lib/actions/revenue"
import { createArtistBible, deleteArtistBible } from "@/lib/actions/artist-bible"
import { createLoreEntry, deleteLoreEntry } from "@/lib/actions/lore"
import { createSongConcept, deleteSongConcept } from "@/lib/actions/song-concepts"
import { createStoryArc, deleteStoryArc } from "@/lib/actions/story-arcs"
import { createVisualIdentity, deleteVisualIdentity } from "@/lib/actions/visual-identity"
import {
  buildPrettyWiseArtistBible,
  buildPrettyWiseLoreEntries,
  buildPrettyWiseSongConcepts,
  buildPrettyWiseStoryArc,
  buildPrettyWiseVisualIdentity,
  DEMO_ARTIST_UNIVERSE_IDS,
} from "@/lib/demo-data/artist-universe-records"
import { deleteProductResearchItem } from "@/lib/actions/product-research"
import { deleteCollection } from "@/lib/actions/collections"
import { buildPrettyWiseDemoExternalLinks } from "@/lib/demo-data/external-links"
import { buildPrettyWiseDemoYouTubeVideo } from "@/lib/demo-data/youtube-videos"
import {
  buildPrettyWiseDemoDriveFiles,
  buildPrettyWiseDemoDriveFolder,
} from "@/lib/demo-data/drive-records"
import {
  importDriveFileRecords,
  importDriveFolderRecords,
} from "@/lib/actions/drive-integration"
import { importYouTubeVideoRecords } from "@/lib/actions/youtube-integration"
import { prisma } from "@/lib/prisma"

const REVALIDATE_PATHS = [
  "/",
  "/campaigns",
  "/artist-crm",
  "/release-planner",
  "/youtube-packaging",
  "/youtube-thumbnails",
  "/social-repurposing",
  "/email-campaigns",
  "/merch-ideas",
  "/product-listings",
  "/mockup-prompts",
  "/analytics",
  "/experiments",
  "/runner",
  "/search",
  "/backups",
  "/assets",
  "/quality",
  "/learnings",
  "/activity",
  "/integrations",
  "/product-factory",
  "/product-research",
  "/collections",
  "/revenue",
  "/feedback-loop",
  "/artist-bible",
  "/lore",
  "/song-vault",
  "/story-arcs",
  "/visual-identity",
]

export type DemoDataStatus = {
  installed: boolean
  totalRecords: number
  recordCounts: {
    artist: number
    campaign: number
    releasePlan: number
    youtubePackage: number
    youtubeThumbnail: number
    social: number
    email: number
    merch: number
    productListing: number
    mockup: number
    analytics: number
    experiment: number
    promptRun: number
    asset: number
    qualityReview: number
    learning: number
  }
  lastSeededAt: number | null
}

function revalidateDemoRoutes() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path)
  }
}

async function countDemoRows() {
  const [
    artists,
    campaigns,
    releasePlans,
    youtubePackages,
    youtubeThumbnails,
    social,
    email,
    merch,
    productListings,
    mockups,
    analytics,
    experiments,
    promptRuns,
    assets,
    qualityReviews,
    learnings,
  ] = await Promise.all([
    prisma.artist.count({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
    prisma.campaign.count({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
    prisma.releasePlan.count({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
    prisma.youTubePackage.count({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
    prisma.youTubeThumbnail.count({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
    prisma.socialRepurposing.count({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
    prisma.emailCampaign.count({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
    prisma.merchIdea.count({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
    prisma.productListing.count({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
    prisma.mockupPrompt.count({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
    prisma.analyticsRecord.count({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
    prisma.experiment.count({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
    prisma.promptRun.count({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
    prisma.asset.count({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
    prisma.qualityReview.count({ where: { reviewerNotes: { contains: DEMO_DATA_MARKER } } }),
    prisma.learning.count({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
  ])

  const recordCounts = {
    artist: artists,
    campaign: campaigns,
    releasePlan: releasePlans,
    youtubePackage: youtubePackages,
    youtubeThumbnail: youtubeThumbnails,
    social,
    email,
    merch,
    productListing: productListings,
    mockup: mockups,
    analytics,
    experiment: experiments,
    promptRun: promptRuns,
    asset: assets,
    qualityReview: qualityReviews,
    learning: learnings,
  }

  const totalRecords = Object.values(recordCounts).reduce((sum, n) => sum + n, 0)

  return { recordCounts, totalRecords }
}

export async function getDemoDataStatus(): Promise<DemoDataStatus> {
  const { recordCounts, totalRecords } = await countDemoRows()
  const campaign = await prisma.campaign.findUnique({
    where: { id: DEMO_IDS.campaign },
    select: { updatedAt: true, notes: true },
  })

  const installed =
    totalRecords > 0 ||
    Boolean(campaign && isDemoRecord(DEMO_IDS.campaign, campaign.notes))

  return {
    installed,
    totalRecords,
    recordCounts,
    lastSeededAt: campaign?.updatedAt?.getTime() ?? null,
  }
}

async function canSeedDemoCommerce(id: string): Promise<boolean> {
  try {
    const research = await prisma.productResearchItem.findUnique({
      where: { id },
      select: { id: true, notes: true },
    })
    return canSeedDemoRecord(research)
  } catch {
    return false
  }
}

async function canSeedDemoCommerceCollection(id: string): Promise<boolean> {
  try {
    const row = await prisma.productCollection.findUnique({
      where: { id },
      select: { id: true, notes: true },
    })
    return canSeedDemoRecord(row)
  } catch {
    return false
  }
}

async function canSeedDemoCommerceRevenue(id: string): Promise<boolean> {
  try {
    const row = await prisma.revenueRecord.findUnique({
      where: { id },
      select: { id: true, notes: true },
    })
    return canSeedDemoRecord(row)
  } catch {
    return false
  }
}

async function findRowNotesById(
  id: string,
): Promise<{ id: string; notes: string } | null> {
  const queries = [
    prisma.artist.findUnique({ where: { id }, select: { id: true, notes: true } }),
    prisma.campaign.findUnique({ where: { id }, select: { id: true, notes: true } }),
    prisma.releasePlan.findUnique({ where: { id }, select: { id: true, notes: true } }),
    prisma.youTubePackage.findUnique({ where: { id }, select: { id: true, notes: true } }),
    prisma.youTubeThumbnail.findUnique({ where: { id }, select: { id: true, notes: true } }),
    prisma.socialRepurposing.findUnique({ where: { id }, select: { id: true, notes: true } }),
    prisma.emailCampaign.findUnique({ where: { id }, select: { id: true, notes: true } }),
    prisma.merchIdea.findUnique({ where: { id }, select: { id: true, notes: true } }),
    prisma.productListing.findUnique({ where: { id }, select: { id: true, notes: true } }),
    prisma.mockupPrompt.findUnique({ where: { id }, select: { id: true, notes: true } }),
    prisma.analyticsRecord.findUnique({ where: { id }, select: { id: true, notes: true } }),
    prisma.experiment.findUnique({ where: { id }, select: { id: true, notes: true } }),
    prisma.promptRun.findUnique({ where: { id }, select: { id: true, notes: true } }),
    prisma.asset.findUnique({ where: { id }, select: { id: true, notes: true } }),
    prisma.qualityReview.findUnique({
      where: { id },
      select: { id: true, reviewerNotes: true },
    }).then((row) => (row ? { id: row.id, notes: row.reviewerNotes } : null)),
    prisma.learning.findUnique({ where: { id }, select: { id: true, notes: true } }),
  ]

  for (const query of queries) {
    const row = await query
    if (row) return row
  }
  return null
}

export async function seedDemoData(): Promise<{
  success: boolean
  message: string
  skipped?: boolean
}> {
  try {
    const demoIds = [
      DEMO_IDS.artist,
      DEMO_IDS.campaign,
      DEMO_IDS.releasePlan,
      DEMO_IDS.youtubePackage,
      DEMO_IDS.youtubeThumbnail,
      DEMO_IDS.social,
      DEMO_IDS.email,
      DEMO_IDS.merch,
      DEMO_IDS.productListing,
      DEMO_IDS.mockup,
      DEMO_IDS.analytics,
      DEMO_IDS.experiment,
      DEMO_IDS.promptRunYoutube,
      DEMO_IDS.promptRunThumbnail,
      DEMO_IDS.assetThumbnail,
      DEMO_IDS.assetMockup,
      DEMO_IDS.qualityReviewYoutube,
      DEMO_IDS.qualityReviewThumbnail,
      DEMO_IDS.learningThumbnailText,
      DEMO_IDS.learningVisualStyle,
      DEMO_IDS.extLinkYoutube,
      DEMO_IDS.extLinkDrive,
      DEMO_IDS.extLinkSuno,
      DEMO_IDS.extLinkFourthwall,
      DEMO_IDS.youtubeVideo,
      DEMO_IDS.driveFolder,
      DEMO_IDS.driveFileThumbnail,
      DEMO_IDS.driveFileVideo,
      DEMO_IDS.driveFileMockup,
      DEMO_IDS.driveFileSocial,
      DEMO_IDS.productResearch,
      DEMO_IDS.productCollection,
      DEMO_IDS.revenueRecord,
      DEMO_IDS.learningCommerce,
    ]

    for (const id of demoIds) {
      const existing = await findRowNotesById(id)
      if (existing && !canSeedDemoRecord(existing)) {
        return {
          success: false,
          skipped: true,
          message:
            "Demo seed skipped — a record with the same ID exists and is not marked as demo data.",
        }
      }
    }

    const demo = buildPrettyWiseDemoRecords()

    await upsertReleasePlan(demo.releasePlan)
    await upsertYouTubePackage(demo.youtubePackage)
    await upsertYouTubeThumbnail(demo.youtubeThumbnail)
    await upsertSocialRepurposingRecord(demo.social)
    await upsertEmailCampaignRecord(demo.email)
    await upsertMerchIdea(demo.merch)
    await upsertProductListing(demo.productListing)
    await upsertMockupPromptRecord(demo.mockup)
    await upsertAnalyticsRecord(demo.analytics)
    await createExperiment(demo.experiment)
    await upsertArtist(demo.artist)
    await upsertCampaign(demo.campaign)
    for (const run of demo.promptRuns) {
      await upsertPromptRun(run)
    }
    for (const asset of demo.assets) {
      await createAsset(asset)
    }
    for (const review of demo.qualityReviews) {
      await createQualityReview(review)
    }
    for (const learning of demo.learnings) {
      await createLearning(learning)
    }
    const commerce = buildPrettyWiseDemoCommerceRecords()
    if (await canSeedDemoCommerce(DEMO_IDS.productResearch)) {
      await createProductResearchItem(commerce.research)
    }
    if (await canSeedDemoCommerceCollection(DEMO_IDS.productCollection)) {
      await createCollection(commerce.collection)
    }
    if (await canSeedDemoCommerceRevenue(DEMO_IDS.revenueRecord)) {
      await createRevenueRecord(commerce.revenue)
    }
    if (canSeedDemoRecord(await findRowNotesById(DEMO_IDS.learningCommerce))) {
      await createLearning(commerce.learning)
    }
    for (const link of buildPrettyWiseDemoExternalLinks()) {
      await createExternalLink(link)
    }
    await importYouTubeVideoRecords([buildPrettyWiseDemoYouTubeVideo()])
    await importDriveFolderRecords([buildPrettyWiseDemoDriveFolder()])
    await importDriveFileRecords(buildPrettyWiseDemoDriveFiles())

    const universeIds = Object.values(DEMO_ARTIST_UNIVERSE_IDS)
    for (const id of universeIds) {
      const existing = await findRowNotesById(id)
      if (existing && !canSeedDemoRecord(existing)) {
        return {
          success: false,
          skipped: true,
          message:
            "Demo seed skipped — artist universe record exists and is not marked as demo data.",
        }
      }
    }
    const bible = buildPrettyWiseArtistBible()
    if (canSeedDemoRecord(await findRowNotesById(bible.id))) {
      await createArtistBible(bible)
    }
    for (const lore of buildPrettyWiseLoreEntries()) {
      if (canSeedDemoRecord(await findRowNotesById(lore.id))) {
        await createLoreEntry(lore)
      }
    }
    for (const concept of buildPrettyWiseSongConcepts()) {
      if (canSeedDemoRecord(await findRowNotesById(concept.id))) {
        await createSongConcept(concept)
      }
    }
    const arc = buildPrettyWiseStoryArc()
    if (canSeedDemoRecord(await findRowNotesById(arc.id))) {
      await createStoryArc(arc)
    }
    const visual = buildPrettyWiseVisualIdentity()
    if (canSeedDemoRecord(await findRowNotesById(visual.id))) {
      await createVisualIdentity(visual)
    }

    revalidateDemoRoutes()

    return {
      success: true,
      message: "PrettyWise demo data seeded successfully.",
    }
  } catch (error) {
    console.error("[CreatorOps] seedDemoData failed", error)
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Error seeding demo data.",
    }
  }
}

export async function deleteDemoData(): Promise<{
  success: boolean
  message: string
  deletedCount: number
}> {
  try {
    let deletedCount = 0

    const campaign = await prisma.campaign.findUnique({
      where: { id: DEMO_IDS.campaign },
    })
    if (campaign && isDemoRecord(campaign.id, campaign.notes)) {
      await deleteCampaignById(campaign.id)
      deletedCount += 1
    }

    const deleteMarked = async <T extends { id: string; notes: string }>(
      rows: T[],
      deleter: (id: string) => Promise<void>,
    ) => {
      for (const row of rows) {
        if (!isDemoRecord(row.id, row.notes)) continue
        await deleter(row.id)
        deletedCount += 1
      }
    }

    const [
      releasePlans,
      youtubePackages,
      youtubeThumbnails,
      social,
      email,
      merch,
      productListings,
      mockups,
      analytics,
      experiments,
      artists,
      promptRunRows,
      assetRows,
      qualityReviewRows,
      learningRows,
      externalLinkRows,
      youtubeVideoRows,
      driveFolderRows,
      driveFileRows,
    ] = await Promise.all([
      prisma.releasePlan.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
      prisma.youTubePackage.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
      prisma.youTubeThumbnail.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
      prisma.socialRepurposing.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
      prisma.emailCampaign.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
      prisma.merchIdea.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
      prisma.productListing.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
      prisma.mockupPrompt.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
      prisma.analyticsRecord.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
      prisma.experiment.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
      prisma.artist.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
      prisma.promptRun.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
      prisma.asset.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
      prisma.qualityReview.findMany({
        where: { reviewerNotes: { contains: DEMO_DATA_MARKER } },
      }),
      prisma.learning.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
      prisma.externalLink.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
      prisma.youTubeVideo.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
      prisma.driveFolder.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
      prisma.driveFile.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
    ])

    const [researchRows, collectionRows, revenueRows] = await Promise.all([
      prisma.productResearchItem.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }).catch(() => []),
      prisma.productCollection.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }).catch(() => []),
      prisma.revenueRecord.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }).catch(() => []),
    ])

    await deleteMarked(revenueRows, deleteRevenueRecord)
    await deleteMarked(collectionRows, deleteCollection)
    await deleteMarked(researchRows, deleteProductResearchItem)

    const [bibleRows, loreRows, conceptRows, arcRows, visualRows] = await Promise.all([
      prisma.artistBible.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }).catch(() => []),
      prisma.loreEntry.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }).catch(() => []),
      prisma.songConcept.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }).catch(() => []),
      prisma.releaseStoryArc.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }).catch(() => []),
      prisma.visualIdentityProfile.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }).catch(() => []),
    ])
    await deleteMarked(visualRows, deleteVisualIdentity)
    await deleteMarked(arcRows, deleteStoryArc)
    await deleteMarked(conceptRows, deleteSongConcept)
    await deleteMarked(loreRows, deleteLoreEntry)
    await deleteMarked(bibleRows, deleteArtistBible)

    await deleteMarked(learningRows, async (id) => {
      await deleteLearning(id)
    })
    await deleteMarked(externalLinkRows, deleteExternalLink)
    await deleteMarked(youtubeVideoRows, async (id) => {
      await prisma.youTubeVideo.delete({ where: { id } })
    })
    await deleteMarked(driveFileRows, async (id) => {
      await prisma.driveFile.delete({ where: { id } })
    })
    await deleteMarked(driveFolderRows, async (id) => {
      await prisma.driveFolder.delete({ where: { id } })
    })
    await deleteMarked(qualityReviewRows, async (id) => {
      await deleteQualityReview(id)
    })
    await deleteMarked(assetRows, async (id) => {
      await deleteAsset(id)
    })
    await deleteMarked(promptRunRows, deletePromptRunById)
    await deleteMarked(releasePlans, deleteReleasePlanById)
    await deleteMarked(youtubePackages, deleteYouTubePackageById)
    await deleteMarked(youtubeThumbnails, deleteYouTubeThumbnailById)
    await deleteMarked(social, deleteSocialRepurposingRecordById)
    await deleteMarked(email, deleteEmailCampaignRecordById)
    await deleteMarked(merch, deleteMerchIdeaById)
    await deleteMarked(productListings, deleteProductListingById)
    await deleteMarked(mockups, deleteMockupPromptRecordById)
    await deleteMarked(analytics, deleteAnalyticsRecordById)
    await deleteMarked(experiments, deleteExperiment)
    await deleteMarked(artists, deleteArtistById)

    revalidateDemoRoutes()

    return {
      success: true,
      message: `Removed ${deletedCount} demo record${deletedCount === 1 ? "" : "s"}.`,
      deletedCount,
    }
  } catch (error) {
    console.error("[CreatorOps] deleteDemoData failed", error)
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Error deleting demo data.",
      deletedCount: 0,
    }
  }
}
