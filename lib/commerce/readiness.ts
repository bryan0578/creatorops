import type { ProductLaunchReadiness, ProductLaunchReadinessLabel, ProductCollectionRecord } from "@/lib/commerce/types"
import type {
  AssetRecord,
  CampaignRecord,
  ExternalLinkRecord,
  LearningRecord,
  MockupPromptRecord,
  ProductListing,
  QualityReviewRecord,
} from "@/lib/types"
import type { RevenueRecordItem } from "@/lib/commerce/types"

export interface ProductReadinessInput {
  listing?: ProductListing | null
  mockups?: MockupPromptRecord[]
  assets?: AssetRecord[]
  campaign?: CampaignRecord | null
  collection?: ProductCollectionRecord | null
  qualityReviews?: QualityReviewRecord[]
  externalLinks?: ExternalLinkRecord[]
  learnings?: LearningRecord[]
  revenue?: RevenueRecordItem[]
  hasLaunchTasks?: boolean
}

function labelFromScore(score: number, blockers: number): ProductLaunchReadinessLabel {
  if (blockers > 0) return "Blocked"
  if (score >= 80) return "Ready"
  if (score >= 60) return "Nearly Ready"
  return "Needs Work"
}

export function scoreProductLaunchReadiness(input: ProductReadinessInput): ProductLaunchReadiness {
  const blockers: string[] = []
  const warnings: string[] = []
  const strengths: string[] = []
  let score = 0

  const listing = input.listing
  if (listing) {
    score += 15
    strengths.push("Product listing exists")
    if (listing.finalTitle?.trim()) {
      score += 10
      strengths.push("Listing title set")
    } else {
      warnings.push("Listing title missing")
    }
    if (listing.finalLongDescription?.trim() || listing.finalShortDescription?.trim()) {
      score += 10
      strengths.push("Product description present")
    } else {
      warnings.push("Product description missing")
    }
    if (listing.pricingNotes?.trim()) {
      score += 5
    } else {
      warnings.push("Pricing notes missing")
    }
  } else {
    blockers.push("No product listing")
  }

  const mockups = input.mockups ?? []
  const readyMockup = mockups.some((m) => m.finalImagePrompt?.trim())
  if (readyMockup) {
    score += 15
    strengths.push("Mockup prompt ready")
  } else {
    warnings.push("No mockup prompt ready")
  }

  const assets = input.assets ?? []
  if (assets.length > 0) {
    score += 10
    strengths.push(`${assets.length} linked asset(s)`)
  } else {
    warnings.push("No product image/asset linked")
  }

  if (input.campaign?.id) {
    score += 10
    strengths.push("Campaign linked")
  } else {
    warnings.push("No campaign linked")
  }

  if (input.collection?.id) {
    score += 5
    strengths.push("Collection linked")
  }

  const reviews = input.qualityReviews ?? []
  const productReview = reviews.find(
    (r) =>
      r.sourceRecordType.toLowerCase().includes("product") ||
      r.reviewType.toLowerCase().includes("product"),
  )
  if (productReview) {
    score += 10
    strengths.push(`Quality review score: ${productReview.overallScore}`)
  } else if (listing) {
    warnings.push("No quality review for product listing")
  }

  const storeLinks = (input.externalLinks ?? []).filter((link) =>
    /fourthwall|gumroad|shopify|etsy|store|product/i.test(
      `${link.linkType} ${link.url} ${link.title}`,
    ),
  )
  if (storeLinks.length > 0) {
    score += 10
    strengths.push("Store/external link present")
  } else if (listing) {
    warnings.push("No store/external product link")
  }

  if (input.hasLaunchTasks) {
    score += 5
    strengths.push("Launch checklist/tasks present")
  }

  const revenue = input.revenue ?? []
  const learnings = input.learnings ?? []
  if (revenue.length > 0) {
    score += 5
    if (!learnings.some((l) => l.sourceType.includes("revenue") || l.tags.includes("commerce"))) {
      warnings.push("Revenue tracked but no product learning captured")
    } else {
      strengths.push("Post-launch learning captured")
    }
  }

  score = Math.min(100, score)
  return {
    score,
    label: labelFromScore(score, blockers.length),
    blockers,
    warnings,
    strengths,
  }
}

export function isProductCampaign(campaign: CampaignRecord): boolean {
  const type = campaign.campaignType.toLowerCase()
  const name = `${campaign.campaignName} ${campaign.productName}`.toLowerCase()
  return (
    type.includes("product") ||
    type.includes("merch") ||
    type.includes("commerce") ||
    name.includes("merch") ||
    Boolean(campaign.productName?.trim())
  )
}
