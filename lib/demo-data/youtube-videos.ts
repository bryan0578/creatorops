import { DEMO_ARTIST_NAME, DEMO_CAMPAIGN_NAME, DEMO_DATA_MARKER, DEMO_IDS, DEMO_SONG_TITLE, demoDates } from "@/lib/demo-data/constants"
import type { YouTubeVideoRecord } from "@/lib/types"

export function buildPrettyWiseDemoYouTubeVideo(): YouTubeVideoRecord {
  const { timestamp: ts } = demoDates()
  return {
    id: DEMO_IDS.youtubeVideo,
    youtubeVideoId: "demo-cotton-candy-skies",
    title: "PrettyWise - Cotton Candy Skies",
    description: "Demo YouTube video for PrettyWise release campaign.",
    channelId: "demo-dorsyth-records",
    channelTitle: "Dorsyth Records",
    publishedAt: ts,
    thumbnailUrl: "",
    videoUrl: "https://youtube.com/watch?v=demo-cotton-candy-skies",
    duration: "PT3M45S",
    privacyStatus: "public",
    campaignId: DEMO_IDS.campaign,
    campaignName: DEMO_CAMPAIGN_NAME,
    artistName: DEMO_ARTIST_NAME,
    songTitle: DEMO_SONG_TITLE,
    externalLinkId: DEMO_IDS.extLinkYoutube,
    analyticsRecordId: DEMO_IDS.analytics,
    rawJson: JSON.stringify({
      statistics: { viewCount: "1240", likeCount: "89", commentCount: "12" },
      marker: DEMO_DATA_MARKER,
    }),
    lastSyncedAt: ts,
    notes: DEMO_DATA_MARKER,
    createdAt: ts,
    updatedAt: ts,
    viewCount: 1240,
    likeCount: 89,
    commentCount: 12,
  }
}
