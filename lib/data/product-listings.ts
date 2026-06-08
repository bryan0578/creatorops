import { normalizeProductListing } from "@/lib/product-listings"
import type { ProductListing } from "@/lib/types"
import type { ProductListing as PrismaProductListing } from "@/lib/generated/prisma/client"

/**
 * Shared product listing data layer — maps between app types and Prisma rows.
 */

export { normalizeProductListing } from "@/lib/product-listings"

export function productListingToPrismaCreate(listing: ProductListing) {
  const normalized = normalizeProductListing(listing)
  return {
    id: normalized.id,
    productType: normalized.productType,
    niche: normalized.niche,
    audience: normalized.audience,
    designConcept: normalized.designConcept,
    tone: normalized.tone,
    primaryKeyword: normalized.primaryKeyword,
    secondaryKeywords: normalized.secondaryKeywords,
    storeName: normalized.storeName,
    productBenefits: normalized.productBenefits,
    pricingNotes: normalized.pricingNotes,
    completedPrompt: normalized.completedPrompt,
    aiResponse: normalized.aiResponse,
    finalTitle: normalized.finalTitle,
    finalShortDescription: normalized.finalShortDescription,
    finalLongDescription: normalized.finalLongDescription,
    finalBulletPoints: normalized.finalBulletPoints,
    finalTags: normalized.finalTags,
    finalCollection: normalized.finalCollection,
    finalCTA: normalized.finalCTA,
    finalSocialCaption: normalized.finalSocialCaption,
    finalEmailSubject: normalized.finalEmailSubject,
    notes: normalized.notes,
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function productListingToPrismaUpdate(listing: ProductListing) {
  const normalized = normalizeProductListing(listing)
  return {
    productType: normalized.productType,
    niche: normalized.niche,
    audience: normalized.audience,
    designConcept: normalized.designConcept,
    tone: normalized.tone,
    primaryKeyword: normalized.primaryKeyword,
    secondaryKeywords: normalized.secondaryKeywords,
    storeName: normalized.storeName,
    productBenefits: normalized.productBenefits,
    pricingNotes: normalized.pricingNotes,
    completedPrompt: normalized.completedPrompt,
    aiResponse: normalized.aiResponse,
    finalTitle: normalized.finalTitle,
    finalShortDescription: normalized.finalShortDescription,
    finalLongDescription: normalized.finalLongDescription,
    finalBulletPoints: normalized.finalBulletPoints,
    finalTags: normalized.finalTags,
    finalCollection: normalized.finalCollection,
    finalCTA: normalized.finalCTA,
    finalSocialCaption: normalized.finalSocialCaption,
    finalEmailSubject: normalized.finalEmailSubject,
    notes: normalized.notes,
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function prismaProductListingToProductListing(
  row: PrismaProductListing,
): ProductListing {
  return normalizeProductListing({
    id: row.id,
    productType: row.productType,
    niche: row.niche,
    audience: row.audience,
    designConcept: row.designConcept,
    tone: row.tone,
    primaryKeyword: row.primaryKeyword,
    secondaryKeywords: row.secondaryKeywords,
    storeName: row.storeName,
    productBenefits: row.productBenefits,
    pricingNotes: row.pricingNotes,
    completedPrompt: row.completedPrompt,
    aiResponse: row.aiResponse,
    finalTitle: row.finalTitle,
    finalShortDescription: row.finalShortDescription,
    finalLongDescription: row.finalLongDescription,
    finalBulletPoints: row.finalBulletPoints,
    finalTags: row.finalTags,
    finalCollection: row.finalCollection,
    finalCTA: row.finalCTA,
    finalSocialCaption: row.finalSocialCaption,
    finalEmailSubject: row.finalEmailSubject,
    notes: row.notes,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}
