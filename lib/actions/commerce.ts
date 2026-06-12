"use server"

import { getAssets } from "@/lib/actions/assets"
import { getCampaigns } from "@/lib/actions/campaigns"
import { getCollections } from "@/lib/actions/collections"
import { getExternalLinks } from "@/lib/actions/external-links"
import { getLearnings } from "@/lib/actions/learnings"
import { getMerchIdeas } from "@/lib/actions/merch-ideas"
import { getMockupPromptRecords } from "@/lib/actions/mockup-prompts"
import { getProductListings } from "@/lib/actions/product-listings"
import { getProductResearchItems } from "@/lib/actions/product-research"
import { getQualityReviews } from "@/lib/actions/quality-reviews"
import { getRevenueRecords } from "@/lib/actions/revenue"
import {
  buildCommerceDashboardSummary,
  buildProductFactorySummary,
  buildProductLaunchOpportunities,
  buildProductPerformanceInsights,
  buildProductPipeline,
  type CommerceDataset,
} from "@/lib/commerce/summary"
import type {
  CommerceDashboardSummary,
  ProductFactorySummary,
  ProductLaunchOpportunity,
  ProductPerformanceInsight,
  ProductPipelineItem,
} from "@/lib/commerce/types"

async function safeLoad<T>(label: string, loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader()
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[Commerce] Failed to load ${label}:`, error instanceof Error ? error.message : String(error))
    }
    return fallback
  }
}

export async function loadCommerceDataset(): Promise<CommerceDataset> {
  const [
    research,
    collections,
    revenue,
    listings,
    merchIdeas,
    mockups,
    assets,
    campaigns,
    qualityReviews,
    learnings,
    externalLinks,
  ] = await Promise.all([
    safeLoad("research", () => getProductResearchItems(), []),
    safeLoad("collections", () => getCollections(), []),
    safeLoad("revenue", () => getRevenueRecords(), []),
    safeLoad("listings", () => getProductListings(), []),
    safeLoad("merchIdeas", () => getMerchIdeas(), []),
    safeLoad("mockups", () => getMockupPromptRecords(), []),
    safeLoad("assets", () => getAssets(), []),
    safeLoad("campaigns", () => getCampaigns(), []),
    safeLoad("qualityReviews", () => getQualityReviews(), []),
    safeLoad("learnings", () => getLearnings(), []),
    safeLoad("externalLinks", () => getExternalLinks(), []),
  ])

  return {
    research,
    collections,
    revenue,
    listings,
    merchIdeas,
    mockups,
    assets,
    campaigns,
    qualityReviews,
    learnings,
    externalLinks,
  }
}

export async function getProductFactorySummary(): Promise<ProductFactorySummary> {
  const dataset = await loadCommerceDataset()
  return buildProductFactorySummary(dataset)
}

export async function getCommerceDashboardSummary(): Promise<CommerceDashboardSummary> {
  const dataset = await loadCommerceDataset()
  return buildCommerceDashboardSummary(dataset)
}

export async function getProductLaunchOpportunities(): Promise<ProductLaunchOpportunity[]> {
  const dataset = await loadCommerceDataset()
  return buildProductLaunchOpportunities(dataset)
}

export async function getProductPerformanceInsights(): Promise<ProductPerformanceInsight[]> {
  const dataset = await loadCommerceDataset()
  return buildProductPerformanceInsights(dataset)
}

export async function getProductPipeline(): Promise<ProductPipelineItem[]> {
  const dataset = await loadCommerceDataset()
  return buildProductPipeline(dataset)
}

export async function getProductFactoryPageData() {
  const dataset = await loadCommerceDataset()
  return {
    summary: buildProductFactorySummary(dataset),
    pipeline: buildProductPipeline(dataset),
    opportunities: buildProductLaunchOpportunities(dataset),
    insights: buildProductPerformanceInsights(dataset),
    dataset,
  }
}

export async function getCampaignCommerceSnapshot(campaignId: string) {
  const dataset = await loadCommerceDataset()
  const id = campaignId.trim()
  const campaign = dataset.campaigns.find((c) => c.id === id)
  const collections = dataset.collections.filter((c) => c.campaignId === id)
  const listings = dataset.listings.filter(
    (l) =>
      l.notes?.includes(id) ||
      (campaign?.campaignName &&
        l.finalCollection?.toLowerCase().includes(campaign.campaignName.toLowerCase())),
  )
  const revenue = dataset.revenue.filter((r) => r.campaignId === id)
  const mockups = dataset.mockups.filter((m) => m.campaignId === id)
  const storeLinks = dataset.externalLinks.filter(
    (l) =>
      l.campaignId === id &&
      /fourthwall|gumroad|shopify|etsy|store|lemon/i.test(`${l.url} ${l.label}`),
  )
  const grossRevenue = revenue.reduce((sum, r) => sum + (r.grossRevenue ?? 0), 0)
  const isCommerce =
    collections.length > 0 ||
    listings.length > 0 ||
    revenue.length > 0 ||
    mockups.length > 0

  return {
    isCommerce,
    collections,
    listings,
    mockups,
    storeLinks,
    grossRevenue,
    revenueCount: revenue.length,
  }
}
