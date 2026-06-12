import type {
  ProductCollectionRecord,
  ProductResearchItemRecord,
  RevenueRecordItem,
} from "@/lib/commerce/types"
import type { LearningRecord } from "@/lib/types"
import {
  DEMO_ARTIST_NAME,
  DEMO_CAMPAIGN_NAME,
  DEMO_DATA_MARKER,
  DEMO_IDS,
  demoDates,
} from "@/lib/demo-data/constants"

export function buildPrettyWiseDemoCommerceRecords(now = new Date()): {
  research: ProductResearchItemRecord
  collection: ProductCollectionRecord
  revenue: RevenueRecordItem
  learning: LearningRecord
} {
  const { timestamp, launchDate } = demoDates(now)

  const research: ProductResearchItemRecord = {
    id: DEMO_IDS.productResearch,
    title: "Cotton Candy Skies creepy-cute shirt",
    productType: "Shirt",
    category: "Creepy-cute merch",
    niche: "Dark k-pop / creepy cute",
    audience: "Alt-pop fans who love candy horror aesthetics",
    platform: "Fourthwall",
    inspirationUrl: "https://example.com/inspo/creepy-cute-shirt",
    competitorName: "Indie creepy-cute merch shops",
    priceRange: "$28–$34",
    demandSignal: "Strong engagement on Cotton Candy Skies visual theme",
    difficulty: "Medium",
    opportunityScore: 78,
    status: "Validated",
    campaignId: DEMO_IDS.campaign,
    campaignName: DEMO_CAMPAIGN_NAME,
    artistName: DEMO_ARTIST_NAME,
    productName: "Cotton Candy Skies Creepy-Cute Shirt",
    notes: `${DEMO_DATA_MARKER} Product research for PrettyWise merch drop.`,
    tags: ["prettywise", "demo", "commerce", "shirt"],
    rawJson: "{}",
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const collection: ProductCollectionRecord = {
    id: DEMO_IDS.productCollection,
    name: "PrettyWise Cotton Candy Skies Collection",
    description: "Creepy-cute shirt and poster drop for the Cotton Candy Skies release.",
    collectionType: "Drop",
    status: "Building",
    campaignId: DEMO_IDS.campaign,
    campaignName: DEMO_CAMPAIGN_NAME,
    artistName: DEMO_ARTIST_NAME,
    theme: "Cotton candy horror / creepy cute",
    targetAudience: "PrettyWise fans and dark k-pop listeners",
    launchDate: Date.parse(launchDate),
    productIds: [DEMO_IDS.productListing],
    merchIdeaIds: [DEMO_IDS.merch],
    assetIds: [DEMO_IDS.assetMockup],
    externalLinkIds: [DEMO_IDS.extLinkFourthwall],
    notes: `${DEMO_DATA_MARKER} Demo commerce collection.`,
    tags: ["prettywise", "demo", "collection"],
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const revenue: RevenueRecordItem = {
    id: DEMO_IDS.revenueRecord,
    source: "Manual",
    platform: "Fourthwall",
    orderId: "demo-order-001",
    productName: "Cotton Candy Skies Creepy-Cute Shirt",
    productType: "Shirt",
    quantity: 2,
    grossRevenue: 58,
    netRevenue: 49.5,
    fees: 8.5,
    currency: "USD",
    saleDate: timestamp,
    campaignId: DEMO_IDS.campaign,
    campaignName: DEMO_CAMPAIGN_NAME,
    artistName: DEMO_ARTIST_NAME,
    productListingId: DEMO_IDS.productListing,
    collectionId: DEMO_IDS.productCollection,
    externalLinkId: DEMO_IDS.extLinkFourthwall,
    customerCountry: "US",
    notes: `${DEMO_DATA_MARKER} Demo sale for commerce dashboard.`,
    tags: ["demo", "commerce", "prettywise"],
    rawJson: "{}",
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const learning: LearningRecord = {
    id: DEMO_IDS.learningCommerce,
    title: "Cotton Candy Skies merch resonates with creepy-cute positioning",
    learningType: "Commerce Insight",
    category: "Product Performance",
    confidence: "Medium",
    impact: "Medium",
    status: "Active",
    campaignId: DEMO_IDS.campaign,
    campaignName: DEMO_CAMPAIGN_NAME,
    artistName: DEMO_ARTIST_NAME,
    songTitle: "Cotton Candy Skies",
    productName: "Cotton Candy Skies Creepy-Cute Shirt",
    platform: "Fourthwall",
    sourceType: "revenue-record",
    sourceId: DEMO_IDS.revenueRecord,
    analyticsRecordId: "",
    experimentId: "",
    qualityReviewId: "",
    assetId: DEMO_IDS.assetMockup,
    promptRunId: "",
    playbookId: "",
    insight:
      "Early shirt sales suggest fans respond to candy-horror visuals paired with the Cotton Candy Skies release narrative.",
    evidence: "Demo revenue record shows initial shirt sales from the collection drop.",
    recommendation:
      "Lead with creepy-cute mockups and bundle shirt + poster in the collection drop.",
    repeatWhen: "PrettyWise merch drops tied to horror-pop or creepy-cute releases.",
    avoidWhen: "Generic merch without a strong visual story or campaign tie-in.",
    tags: ["prettywise", "demo", "commerce", "product-performance"],
    notes: `${DEMO_DATA_MARKER} Collection retrospective opportunity.`,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  return { research, collection, revenue, learning }
}
