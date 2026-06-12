import { scoreProductLaunchReadiness, isProductCampaign } from "@/lib/commerce/readiness"
import type {
  CommerceDashboardSummary,
  ProductCollectionRecord,
  ProductFactorySummary,
  ProductLaunchOpportunity,
  ProductPerformanceInsight,
  ProductPipelineItem,
  ProductResearchItemRecord,
  RevenueRecordItem,
} from "@/lib/commerce/types"
import type {
  AssetRecord,
  CampaignRecord,
  ExternalLinkRecord,
  LearningRecord,
  MerchIdea,
  MockupPromptRecord,
  ProductListing,
  QualityReviewRecord,
} from "@/lib/types"

export interface CommerceDataset {
  research: ProductResearchItemRecord[]
  collections: ProductCollectionRecord[]
  revenue: RevenueRecordItem[]
  listings: ProductListing[]
  merchIdeas: MerchIdea[]
  mockups: MockupPromptRecord[]
  assets: AssetRecord[]
  campaigns: CampaignRecord[]
  qualityReviews: QualityReviewRecord[]
  learnings: LearningRecord[]
  externalLinks: ExternalLinkRecord[]
}

function monthStartTs(): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
}

export function buildProductFactorySummary(dataset: CommerceDataset): ProductFactorySummary {
  const activeListings = dataset.listings.filter((l) => l.finalTitle?.trim())
  const mockupsReady = dataset.mockups.filter((m) => m.finalImagePrompt?.trim())
  const productCampaigns = dataset.campaigns.filter(isProductCampaign)
  const totalGross = dataset.revenue.reduce((sum, r) => sum + (r.grossRevenue ?? 0), 0)

  let qualityGaps = 0
  for (const listing of activeListings) {
    const readiness = scoreProductLaunchReadiness({
      listing,
      mockups: dataset.mockups,
      assets: dataset.assets,
      qualityReviews: dataset.qualityReviews,
      externalLinks: dataset.externalLinks,
    })
    if (readiness.warnings.length > 0 || readiness.blockers.length > 0) qualityGaps++
  }

  const productsWithRevenue = new Set(
    dataset.revenue.filter((r) => r.grossRevenue > 0).map((r) => r.productListingId || r.productName),
  )
  const learningOpportunities = [...productsWithRevenue].filter((key) => {
    return !dataset.learnings.some(
      (l) =>
        l.sourceId === key ||
        l.title.toLowerCase().includes(key.toLowerCase()) ||
        l.tags.includes("commerce"),
    )
  }).length

  return {
    productIdeas: dataset.merchIdeas.length + dataset.research.filter((r) => r.status !== "Converted").length,
    researchItems: dataset.research.length,
    activeListings: activeListings.length,
    mockupsReady: mockupsReady.length,
    collections: dataset.collections.length,
    productCampaigns: productCampaigns.length,
    revenueTracked: dataset.revenue.length,
    totalGrossRevenue: totalGross,
    qualityGaps,
    learningOpportunities,
  }
}

export function buildCommerceDashboardSummary(dataset: CommerceDataset): CommerceDashboardSummary {
  const monthStart = monthStartTs()
  const gross = dataset.revenue.reduce((sum, r) => sum + r.grossRevenue, 0)
  const net = dataset.revenue.reduce((sum, r) => sum + (r.netRevenue ?? r.grossRevenue), 0)
  const qty = dataset.revenue.reduce((sum, r) => sum + r.quantity, 0)
  const monthRevenue = dataset.revenue
    .filter((r) => (r.saleDate ?? r.createdAt) >= monthStart)
    .reduce((sum, r) => sum + r.grossRevenue, 0)

  const byProduct = new Map<string, number>()
  const byCollection = new Map<string, number>()
  const byCampaign = new Map<string, number>()
  for (const row of dataset.revenue) {
    byProduct.set(row.productName, (byProduct.get(row.productName) ?? 0) + row.grossRevenue)
    if (row.collectionId) {
      const col = dataset.collections.find((c) => c.id === row.collectionId)
      const name = col?.name ?? row.collectionId
      byCollection.set(name, (byCollection.get(name) ?? 0) + row.grossRevenue)
    }
    if (row.campaignName) {
      byCampaign.set(row.campaignName, (byCampaign.get(row.campaignName) ?? 0) + row.grossRevenue)
    }
  }

  const topProduct = [...byProduct.entries()].sort((a, b) => b[1] - a[1])[0]
  const topCollection = [...byCollection.entries()].sort((a, b) => b[1] - a[1])[0]
  const topCampaign = [...byCampaign.entries()].sort((a, b) => b[1] - a[1])[0]

  const revenueProducts = new Set(dataset.revenue.map((r) => r.productListingId || r.productName))
  let productsWithoutLearning = 0
  for (const key of revenueProducts) {
    if (!key) continue
    const hasLearning = dataset.learnings.some(
      (l) => l.sourceId === key || l.title.toLowerCase().includes(String(key).toLowerCase()),
    )
    if (!hasLearning) productsWithoutLearning++
  }

  return {
    totalGrossRevenue: gross,
    totalNetRevenue: net,
    orderCount: dataset.revenue.length,
    quantitySold: qty,
    topProductName: topProduct?.[0] ?? "—",
    topCollectionName: topCollection?.[0] ?? "—",
    topCampaignName: topCampaign?.[0] ?? "—",
    revenueThisMonth: monthRevenue,
    productsWithoutLearning,
  }
}

function listingStage(listing: ProductListing, revenue: RevenueRecordItem[]): string {
  const hasRevenue = revenue.some(
    (r) => r.productListingId === listing.id || r.productName === listing.finalTitle,
  )
  if (hasRevenue) return "Learning Review"
  if (listing.finalTitle?.trim()) return "Ready to Launch"
  return "Listing Draft"
}

export function buildProductPipeline(dataset: CommerceDataset): ProductPipelineItem[] {
  const items: ProductPipelineItem[] = []

  for (const item of dataset.research) {
    const stage =
      item.status === "Researching"
        ? "Researching"
        : item.status === "Converted"
          ? "Published"
          : "Idea"
    items.push({
      id: item.id,
      kind: "research",
      title: item.title,
      productType: item.productType,
      category: item.category,
      campaignName: item.campaignName,
      artistName: item.artistName,
      stage,
      href: `/product-research?recordId=${encodeURIComponent(item.id)}`,
    })
  }

  for (const idea of dataset.merchIdeas) {
    items.push({
      id: idea.id,
      kind: "merch",
      title: idea.selectedProductTitle || idea.selectedConceptName || "Merch idea",
      productType: idea.productType,
      category: idea.niche,
      campaignName: "",
      artistName: "",
      stage: "Idea",
      href: `/merch-ideas?recordId=${encodeURIComponent(idea.id)}`,
    })
  }

  for (const listing of dataset.listings) {
    const relatedRevenue = dataset.revenue.filter(
      (r) => r.productListingId === listing.id || r.productName === listing.finalTitle,
    )
    const readiness = scoreProductLaunchReadiness({
      listing,
      mockups: dataset.mockups,
      assets: dataset.assets,
      qualityReviews: dataset.qualityReviews,
      externalLinks: dataset.externalLinks,
      revenue: relatedRevenue,
    })
    const review = dataset.qualityReviews.find((r) => r.sourceRecordId === listing.id)
    items.push({
      id: listing.id,
      kind: "listing",
      title: listing.finalTitle || listing.designConcept || "Product listing",
      productType: listing.productType,
      category: listing.niche,
      campaignName: listing.finalCollection,
      artistName: "",
      stage: listingStage(listing, dataset.revenue),
      readiness,
      qualityScore: review?.overallScore,
      revenue: relatedRevenue.reduce((s, r) => s + r.grossRevenue, 0),
      href: `/product-listings?recordId=${encodeURIComponent(listing.id)}`,
    })
  }

  for (const mockup of dataset.mockups) {
    items.push({
      id: mockup.id,
      kind: "mockup",
      title: mockup.projectName || mockup.productType || "Mockup",
      productType: mockup.productType,
      category: mockup.niche,
      campaignName: "",
      artistName: "",
      stage: mockup.finalImagePrompt?.trim() ? "Mockup Ready" : "Designing",
      href: `/mockup-prompts?recordId=${encodeURIComponent(mockup.id)}`,
    })
  }

  return items
}

export function buildProductLaunchOpportunities(dataset: CommerceDataset): ProductLaunchOpportunity[] {
  const opportunities: ProductLaunchOpportunity[] = []

  for (const listing of dataset.listings) {
    const readiness = scoreProductLaunchReadiness({
      listing,
      mockups: dataset.mockups,
      assets: dataset.assets,
      qualityReviews: dataset.qualityReviews,
      externalLinks: dataset.externalLinks,
    })
    if (readiness.label === "Ready" || readiness.label === "Nearly Ready") {
      opportunities.push({
        id: `launch-${listing.id}`,
        title: `Launch ready: ${listing.finalTitle || "Product listing"}`,
        summary: readiness.strengths.slice(0, 2).join(" · ") || "Listing is close to launch.",
        href: `/product-listings?recordId=${encodeURIComponent(listing.id)}`,
        priority: readiness.label === "Ready" ? "high" : "medium",
      })
    }
  }

  for (const collection of dataset.collections.filter((c) => c.status !== "Launched")) {
    if (collection.productIds.length === 0) {
      opportunities.push({
        id: `collection-products-${collection.id}`,
        title: `Add products to ${collection.name}`,
        summary: "Collection has no linked product listings yet.",
        href: `/collections?recordId=${encodeURIComponent(collection.id)}`,
        priority: "medium",
      })
    }
  }

  return opportunities.slice(0, 12)
}

export function buildProductPerformanceInsights(dataset: CommerceDataset): ProductPerformanceInsight[] {
  const insights: ProductPerformanceInsight[] = []

  for (const row of dataset.revenue.filter((r) => r.grossRevenue > 0).slice(0, 8)) {
    const hasLearning = dataset.learnings.some((l) => l.sourceId === row.id)
    if (!hasLearning) {
      insights.push({
        id: `revenue-learning-${row.id}`,
        title: `Capture learning from ${row.productName}`,
        summary: `Revenue of $${row.grossRevenue.toFixed(2)} on ${row.platform || row.source} with no learning yet.`,
        href: `/revenue?recordId=${encodeURIComponent(row.id)}`,
      })
    }
  }

  for (const listing of dataset.listings) {
    const review = dataset.qualityReviews.find((r) => r.sourceRecordId === listing.id)
    const rev = dataset.revenue
      .filter((r) => r.productListingId === listing.id)
      .reduce((s, r) => s + r.grossRevenue, 0)
    if (review && review.overallScore >= 80 && rev === 0) {
      insights.push({
        id: `qp-listing-${listing.id}`,
        title: `High-quality listing with no sales: ${listing.finalTitle}`,
        summary: `Quality score ${review.overallScore} but no tracked revenue yet.`,
        href: `/quality-performance?tab=gaps`,
      })
    }
  }

  return insights.slice(0, 12)
}
