import { scoreProductLaunchReadiness } from "@/lib/commerce/readiness"
import { researchNeedsConversion } from "@/lib/commerce/scoring"
import type {
  ProductCollectionRecord,
  ProductResearchItemRecord,
  RevenueRecordItem,
} from "@/lib/commerce/types"
import type { DataHealthIssue, DataHealthScanInput } from "@/lib/data/data-health"
import type { ProductListing } from "@/lib/types"

function issueId(parts: string[]): string {
  return parts.filter(Boolean).join(":")
}

function pushIssue(issues: DataHealthIssue[], issue: DataHealthIssue) {
  if (issues.some((item) => item.id === issue.id)) return
  issues.push(issue)
}

function listingTitle(listing: ProductListing): string {
  return listing.finalTitle || listing.designConcept || "Product listing"
}

/** Commerce / Product Factory data health checks (read-only). */
export function scanCommerceWarnings(
  input: DataHealthScanInput,
  issues: DataHealthIssue[],
): void {
  try {
    const research = input.productResearch ?? []
    const collections = input.productCollections ?? []
    const revenue = input.revenueRecords ?? []

    for (const listing of input.productListings) {
      const linkedMockups = input.mockupPrompts.filter(
        (m) => m.campaignId === listing.campaignId || m.productName === listing.finalTitle,
      )
      const linkedAssets = input.assets.filter(
        (a) =>
          a.campaignId === listing.campaignId ||
          a.sourceRecordId === listing.id ||
          a.sourceRecordType === "product-listing",
      )
      const reviews = input.qualityReviews.filter(
        (q) => q.sourceRecordId === listing.id || q.campaignId === listing.campaignId,
      )
      const campaign = input.campaigns.find((c) => c.id === listing.campaignId)
      const collection = collections.find((c) => c.productIds.includes(listing.id))
      const listingRevenue = revenue.filter((r) => r.productListingId === listing.id)
      const storeLinks = input.externalLinks.filter(
        (l) =>
          l.campaignId === listing.campaignId &&
          /fourthwall|gumroad|shopify|etsy|store|lemon/i.test(l.url || l.label || ""),
      )

      const readiness = scoreProductLaunchReadiness({
        listing,
        mockups: linkedMockups,
        assets: linkedAssets,
        campaign,
        collection,
        qualityReviews: reviews,
        externalLinks: storeLinks,
        revenue: listingRevenue,
      })

      if (!linkedMockups.length) {
        pushIssue(issues, {
          id: issueId(["commerce", "listing-mockup", listing.id]),
          severity: "warning",
          category: "missing-assets",
          title: `Product listing missing mockup: ${listingTitle(listing)}`,
          description: "Create a mockup prompt or link a mockup asset for this listing.",
          sourceType: "product-listing",
          sourceId: listing.id,
          sourceTitle: listingTitle(listing),
          href: `/product-listings?recordId=${encodeURIComponent(listing.id)}`,
          suggestedAction: "Create mockup prompt",
          relatedHref: "/mockup-prompts",
        })
      }

      if (!linkedAssets.length) {
        pushIssue(issues, {
          id: issueId(["commerce", "listing-asset", listing.id]),
          severity: "warning",
          category: "missing-assets",
          title: `Product listing missing image/asset: ${listingTitle(listing)}`,
          description: "Link a product image or mockup asset to this listing.",
          sourceType: "product-listing",
          sourceId: listing.id,
          sourceTitle: listingTitle(listing),
          href: `/product-listings?recordId=${encodeURIComponent(listing.id)}`,
          suggestedAction: "Open Assets",
          relatedHref: "/assets",
        })
      }

      if (!reviews.length) {
        pushIssue(issues, {
          id: issueId(["commerce", "listing-quality", listing.id]),
          severity: "info",
          category: "incomplete-records",
          title: `No quality review for listing: ${listingTitle(listing)}`,
          description: "Run a quality review before launch.",
          sourceType: "product-listing",
          sourceId: listing.id,
          sourceTitle: listingTitle(listing),
          href: `/quality?recordId=${encodeURIComponent(listing.id)}`,
          suggestedAction: "Create quality review",
        })
      }

      if (readiness.label === "Ready" && !listing.campaignId) {
        pushIssue(issues, {
          id: issueId(["commerce", "listing-campaign", listing.id]),
          severity: "info",
          category: "incomplete-records",
          title: `Listing ready but no campaign: ${listingTitle(listing)}`,
          description: "Link this product to a launch campaign.",
          sourceType: "product-listing",
          sourceId: listing.id,
          sourceTitle: listingTitle(listing),
          href: `/campaigns`,
          suggestedAction: "Link campaign",
        })
      }

      const gross = listingRevenue.reduce((sum, r) => sum + (r.grossRevenue ?? 0), 0)
      if (gross > 0) {
        const hasLearning = input.learnings.some(
          (l) =>
            l.sourceRecordId === listing.id ||
            l.tags.some((t) => t.toLowerCase().includes("product")),
        )
        if (!hasLearning) {
          pushIssue(issues, {
            id: issueId(["commerce", "listing-learning", listing.id]),
            severity: "info",
            category: "incomplete-records",
            title: `Product with revenue has no learning: ${listingTitle(listing)}`,
            description: `Tracked $${gross.toFixed(2)} gross revenue without a product performance learning.`,
            sourceType: "product-listing",
            sourceId: listing.id,
            sourceTitle: listingTitle(listing),
            href: `/feedback-loop`,
            suggestedAction: "Create product learning",
            relatedHref: `/revenue`,
          })
        }
      }
    }

    for (const collection of collections) {
      if (collection.productIds.length === 0 && collection.merchIdeaIds.length === 0) {
        pushIssue(issues, {
          id: issueId(["commerce", "collection-products", collection.id]),
          severity: "warning",
          category: "incomplete-records",
          title: `Collection has no products: ${collection.name}`,
          description: "Add product listings or merch ideas to this collection.",
          sourceType: "product-collection",
          sourceId: collection.id,
          sourceTitle: collection.name,
          href: `/collections?recordId=${encodeURIComponent(collection.id)}`,
          suggestedAction: "Add products",
        })
      }
      if (!collection.campaignId) {
        pushIssue(issues, {
          id: issueId(["commerce", "collection-campaign", collection.id]),
          severity: "info",
          category: "incomplete-records",
          title: `Collection has no campaign: ${collection.name}`,
          description: "Link or create a campaign for this drop.",
          sourceType: "product-collection",
          sourceId: collection.id,
          sourceTitle: collection.name,
          href: `/collections?recordId=${encodeURIComponent(collection.id)}`,
          suggestedAction: "Link campaign",
        })
      }
    }

    for (const campaign of input.campaigns) {
      const isCommerce = /merch|product|commerce|digital/i.test(
        `${campaign.campaignType} ${campaign.primaryGoal}`,
      )
      if (!isCommerce) continue
      const hasStore = input.externalLinks.some(
        (l) =>
          l.campaignId === campaign.id &&
          /fourthwall|gumroad|shopify|etsy|store|lemon/i.test(l.url || l.label || ""),
      )
      if (!hasStore) {
        pushIssue(issues, {
          id: issueId(["commerce", "campaign-store", campaign.id]),
          severity: "info",
          category: "broken-links",
          title: `Product campaign has no store link: ${campaign.campaignName}`,
          description: "Add a Fourthwall, Gumroad, Shopify, or Etsy link.",
          sourceType: "campaign",
          sourceId: campaign.id,
          sourceTitle: campaign.campaignName,
          href: `/integrations?campaignId=${encodeURIComponent(campaign.id)}`,
          suggestedAction: "Add store link",
        })
      }
    }

    for (const record of revenue) {
      if (!record.productListingId && !record.campaignId && !record.collectionId) {
        pushIssue(issues, {
          id: issueId(["commerce", "revenue-unlinked", record.id]),
          severity: "info",
          category: "incomplete-records",
          title: `Revenue not linked: ${record.productName}`,
          description: "Link this sale to a product listing, collection, or campaign.",
          sourceType: "revenue-record",
          sourceId: record.id,
          sourceTitle: record.productName,
          href: `/revenue?recordId=${encodeURIComponent(record.id)}`,
          suggestedAction: "Link revenue record",
        })
      }
    }

    const now = Date.now()
    for (const item of research) {
      if (item.status === "Converted" || item.status === "Archived") continue
      const ageDays = (now - item.updatedAt) / (1000 * 60 * 60 * 24)
      if (researchNeedsConversion(item, ageDays)) {
        pushIssue(issues, {
          id: issueId(["commerce", "research-stale", item.id]),
          severity: "info",
          category: "incomplete-records",
          title: `Research not converted: ${item.title}`,
          description: "This product research item has been idle — convert to merch idea or listing.",
          sourceType: "product-research",
          sourceId: item.id,
          sourceTitle: item.title,
          href: `/product-research?recordId=${encodeURIComponent(item.id)}`,
          suggestedAction: "Convert to product",
        })
      }
    }
  } catch {
    // must never break scan
  }
}
