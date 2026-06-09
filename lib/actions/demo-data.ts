"use server"

import { revalidatePath } from "next/cache"

import { deleteAnalyticsRecordById, upsertAnalyticsRecord } from "@/lib/actions/analytics-records"
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
import { buildPrettyWiseDemoRecords } from "@/lib/demo-data/prettywise-records"
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
  "/search",
  "/backups",
  "/activity",
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
    await upsertArtist(demo.artist)
    await upsertCampaign(demo.campaign)

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
      artists,
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
      prisma.artist.findMany({ where: { notes: { contains: DEMO_DATA_MARKER } } }),
    ])

    await deleteMarked(releasePlans, deleteReleasePlanById)
    await deleteMarked(youtubePackages, deleteYouTubePackageById)
    await deleteMarked(youtubeThumbnails, deleteYouTubeThumbnailById)
    await deleteMarked(social, deleteSocialRepurposingRecordById)
    await deleteMarked(email, deleteEmailCampaignRecordById)
    await deleteMarked(merch, deleteMerchIdeaById)
    await deleteMarked(productListings, deleteProductListingById)
    await deleteMarked(mockups, deleteMockupPromptRecordById)
    await deleteMarked(analytics, deleteAnalyticsRecordById)
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
