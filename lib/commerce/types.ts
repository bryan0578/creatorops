export type ProductResearchStatus =
  | "Idea"
  | "Researching"
  | "Validated"
  | "Converted"
  | "Archived"

export type ProductCollectionStatus =
  | "Planning"
  | "Building"
  | "Ready"
  | "Launched"
  | "Archived"

export type ProductLaunchReadinessLabel = "Ready" | "Nearly Ready" | "Needs Work" | "Blocked"

export interface ProductResearchItemRecord {
  id: string
  title: string
  productType: string
  category: string
  niche: string
  audience: string
  platform: string
  inspirationUrl: string
  competitorName: string
  priceRange: string
  demandSignal: string
  difficulty: string
  opportunityScore: number | null
  status: string
  campaignId: string
  campaignName: string
  artistName: string
  productName: string
  notes: string
  tags: string[]
  rawJson: string
  createdAt: number
  updatedAt: number
}

export interface ProductCollectionRecord {
  id: string
  name: string
  description: string
  collectionType: string
  status: string
  campaignId: string
  campaignName: string
  artistName: string
  theme: string
  targetAudience: string
  launchDate: number | null
  productIds: string[]
  merchIdeaIds: string[]
  assetIds: string[]
  externalLinkIds: string[]
  notes: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface RevenueRecordItem {
  id: string
  source: string
  platform: string
  orderId: string
  productName: string
  productType: string
  quantity: number
  grossRevenue: number
  netRevenue: number | null
  fees: number | null
  currency: string
  saleDate: number | null
  campaignId: string
  campaignName: string
  artistName: string
  productListingId: string
  collectionId: string
  externalLinkId: string
  customerCountry: string
  notes: string
  tags: string[]
  rawJson: string
  createdAt: number
  updatedAt: number
}

export interface ProductFactorySummary {
  productIdeas: number
  researchItems: number
  activeListings: number
  mockupsReady: number
  collections: number
  productCampaigns: number
  revenueTracked: number
  totalGrossRevenue: number
  qualityGaps: number
  learningOpportunities: number
}

export interface CommerceDashboardSummary {
  totalGrossRevenue: number
  totalNetRevenue: number
  orderCount: number
  quantitySold: number
  topProductName: string
  topCollectionName: string
  topCampaignName: string
  revenueThisMonth: number
  productsWithoutLearning: number
}

export interface ProductLaunchReadiness {
  score: number
  label: ProductLaunchReadinessLabel
  blockers: string[]
  warnings: string[]
  strengths: string[]
}

export interface ProductPipelineItem {
  id: string
  kind: "research" | "merch" | "listing" | "mockup"
  title: string
  productType: string
  category: string
  campaignName: string
  artistName: string
  stage: string
  readiness?: ProductLaunchReadiness
  qualityScore?: number
  revenue?: number
  href: string
}

export interface ProductLaunchOpportunity {
  id: string
  title: string
  summary: string
  href: string
  priority: "high" | "medium" | "low"
}

export interface ProductPerformanceInsight {
  id: string
  title: string
  summary: string
  href: string
}

export interface RevenueCsvPreviewRow {
  rowIndex: number
  saleDate: string
  platform: string
  productName: string
  quantity: number
  grossRevenue: number
  netRevenue: number | null
  fees: number | null
  orderId: string
  campaignName: string
  artistName: string
  warnings: string[]
}

export interface RevenueCsvImportResult {
  success: boolean
  imported: number
  skipped: number
  preview: RevenueCsvPreviewRow[]
  errors: string[]
  message: string
}
