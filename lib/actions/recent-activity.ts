"use server"

import {
  buildActivityItem,
  mergeAndLimitActivities,
  RECENT_ACTIVITY_LIMIT,
  RECENT_ACTIVITY_PER_MODULE,
  type RecentActivityItem,
} from "@/lib/data/recent-activity"
import { prisma } from "@/lib/prisma"

async function fetchPromptActivities() {
  const rows = await prisma.prompt.findMany({
    orderBy: { updatedAt: "desc" },
    take: RECENT_ACTIVITY_PER_MODULE,
  })
  return rows.map((row) =>
    buildActivityItem({
      id: row.id,
      type: "prompt",
      title: row.name,
      subtitle: row.category,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
  )
}

async function fetchWorkflowActivities() {
  const rows = await prisma.workflow.findMany({
    orderBy: { updatedAt: "desc" },
    take: RECENT_ACTIVITY_PER_MODULE,
  })
  return rows.map((row) =>
    buildActivityItem({
      id: row.id,
      type: "workflow",
      title: row.name,
      subtitle: `${row.category} · ${row.status}`,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
  )
}

async function fetchPromptRunActivities() {
  const rows = await prisma.promptRun.findMany({
    orderBy: { updatedAt: "desc" },
    take: RECENT_ACTIVITY_PER_MODULE,
  })
  return rows.map((row) =>
    buildActivityItem({
      id: row.id,
      type: "prompt-run",
      title: row.promptName,
      subtitle: row.category,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
  )
}

async function fetchWorkflowRunActivities() {
  const rows = await prisma.workflowRun.findMany({
    orderBy: { updatedAt: "desc" },
    take: RECENT_ACTIVITY_PER_MODULE,
  })
  return rows.map((row) =>
    buildActivityItem({
      id: row.id,
      type: "workflow-run",
      title: row.workflowName,
      subtitle: `${row.category} · ${row.status}`,
      createdAt: row.startedAt,
      updatedAt: row.updatedAt,
    }),
  )
}

async function fetchCampaignActivities() {
  const rows = await prisma.campaign.findMany({
    orderBy: { updatedAt: "desc" },
    take: RECENT_ACTIVITY_PER_MODULE,
  })
  return rows.map((row) =>
    buildActivityItem({
      id: row.id,
      type: "campaign",
      title: row.campaignName || "Untitled campaign",
      subtitle: [row.campaignType, row.status].filter(Boolean).join(" · "),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
  )
}

async function fetchYouTubePackageActivities() {
  const rows = await prisma.youTubePackage.findMany({
    orderBy: { updatedAt: "desc" },
    take: RECENT_ACTIVITY_PER_MODULE,
  })
  return rows.map((row) =>
    buildActivityItem({
      id: row.id,
      type: "youtube-package",
      title: row.finalTitle || row.trackTitle || "YouTube package",
      subtitle: [row.artistName, row.channelName].filter(Boolean).join(" · "),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
  )
}

async function fetchYouTubeThumbnailActivities() {
  const rows = await prisma.youTubeThumbnail.findMany({
    orderBy: { updatedAt: "desc" },
    take: RECENT_ACTIVITY_PER_MODULE,
  })
  return rows.map((row) =>
    buildActivityItem({
      id: row.id,
      type: "youtube-thumbnail",
      title: row.videoTitle || row.trackTitle || "YouTube thumbnail",
      subtitle: [row.artistName, row.contentFormat].filter(Boolean).join(" · "),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
  )
}

async function fetchReleasePlanActivities() {
  const rows = await prisma.releasePlan.findMany({
    orderBy: { updatedAt: "desc" },
    take: RECENT_ACTIVITY_PER_MODULE,
  })
  return rows.map((row) =>
    buildActivityItem({
      id: row.id,
      type: "release-plan",
      title: row.songTitle || "Release plan",
      subtitle: [row.artistName, row.releaseDate].filter(Boolean).join(" · "),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
  )
}

async function fetchArtistActivities() {
  const rows = await prisma.artist.findMany({
    orderBy: { updatedAt: "desc" },
    take: RECENT_ACTIVITY_PER_MODULE,
  })
  return rows.map((row) =>
    buildActivityItem({
      id: row.id,
      type: "artist",
      title: row.artistName || "Artist",
      subtitle: [row.artistType, row.genre].filter(Boolean).join(" · "),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
  )
}

async function fetchMerchIdeaActivities() {
  const rows = await prisma.merchIdea.findMany({
    orderBy: { updatedAt: "desc" },
    take: RECENT_ACTIVITY_PER_MODULE,
  })
  return rows.map((row) =>
    buildActivityItem({
      id: row.id,
      type: "merch-idea",
      title: row.selectedConceptName || row.noun || "Merch idea",
      subtitle: [row.niche, row.productType].filter(Boolean).join(" · "),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
  )
}

async function fetchProductListingActivities() {
  const rows = await prisma.productListing.findMany({
    orderBy: { updatedAt: "desc" },
    take: RECENT_ACTIVITY_PER_MODULE,
  })
  return rows.map((row) =>
    buildActivityItem({
      id: row.id,
      type: "product-listing",
      title: row.finalTitle || row.designConcept || "Product listing",
      subtitle: [row.niche, row.productType].filter(Boolean).join(" · "),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
  )
}

async function fetchSocialRepurposingActivities() {
  const rows = await prisma.socialRepurposing.findMany({
    orderBy: { updatedAt: "desc" },
    take: RECENT_ACTIVITY_PER_MODULE,
  })
  return rows.map((row) =>
    buildActivityItem({
      id: row.id,
      type: "social-repurposing",
      title: row.campaignName || row.contentType || "Social content",
      subtitle: [row.businessArea, row.platforms].filter(Boolean).join(" · "),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
  )
}

async function fetchAnalyticsActivities() {
  const rows = await prisma.analyticsRecord.findMany({
    orderBy: { updatedAt: "desc" },
    take: RECENT_ACTIVITY_PER_MODULE,
  })
  return rows.map((row) =>
    buildActivityItem({
      id: row.id,
      type: "analytics",
      title: row.itemName || "Analytics record",
      subtitle: [row.itemType, row.platform].filter(Boolean).join(" · "),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
  )
}

async function fetchMockupPromptActivities() {
  const rows = await prisma.mockupPrompt.findMany({
    orderBy: { updatedAt: "desc" },
    take: RECENT_ACTIVITY_PER_MODULE,
  })
  return rows.map((row) =>
    buildActivityItem({
      id: row.id,
      type: "mockup-prompt",
      title: row.projectName || row.mockupType || "Mockup prompt",
      subtitle: [row.niche, row.productType].filter(Boolean).join(" · "),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
  )
}

async function fetchEmailCampaignActivities() {
  const rows = await prisma.emailCampaign.findMany({
    orderBy: { updatedAt: "desc" },
    take: RECENT_ACTIVITY_PER_MODULE,
  })
  return rows.map((row) =>
    buildActivityItem({
      id: row.id,
      type: "email-campaign",
      title: row.campaignName || "Email campaign",
      subtitle: [row.campaignType, row.productOrReleaseName]
        .filter(Boolean)
        .join(" · "),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
  )
}

/** Load recent activity across all major CreatorOps modules. */
export async function getRecentActivity(
  limit = RECENT_ACTIVITY_LIMIT,
): Promise<RecentActivityItem[]> {
  const batches = await Promise.all([
    fetchPromptActivities(),
    fetchWorkflowActivities(),
    fetchPromptRunActivities(),
    fetchWorkflowRunActivities(),
    fetchCampaignActivities(),
    fetchYouTubePackageActivities(),
    fetchYouTubeThumbnailActivities(),
    fetchReleasePlanActivities(),
    fetchArtistActivities(),
    fetchMerchIdeaActivities(),
    fetchProductListingActivities(),
    fetchSocialRepurposingActivities(),
    fetchAnalyticsActivities(),
    fetchMockupPromptActivities(),
    fetchEmailCampaignActivities(),
  ])

  return mergeAndLimitActivities(batches.flat(), limit)
}
