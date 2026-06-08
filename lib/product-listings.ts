import type {
  ProductListing,
  ProductListingFormValues,
  Prompt,
} from "@/lib/types"
import {
  buildCompletedPrompt,
  mergePromptVariables,
} from "@/lib/prompt-variables"

export const PRODUCT_LISTING_PROMPT_ID = "p-product-listing"
export const PRODUCT_LISTING_PROMPT_NAME = "Product Listing Generator"

export const FALLBACK_PRODUCT_LISTING_TEMPLATE = `You are an ecommerce copywriter and product listing strategist for creators, artists, and digital product sellers.

Generate a complete product listing based on the following:

Product type: {{productType}}
Niche: {{niche}}
Audience: {{audience}}
Design concept: {{designConcept}}
Tone: {{tone}}
Primary keyword: {{primaryKeyword}}
Secondary keywords: {{secondaryKeywords}}
Store name: {{storeName}}
Product benefits: {{productBenefits}}
Pricing notes: {{pricingNotes}}

Additional notes: {{notes}}

Generate:
1. Three product title options optimized for search and conversion
2. A short description (1-2 sentences) for listing previews
3. A long description (2-3 paragraphs) with benefits and use cases
4. Five bullet points highlighting key features and benefits
5. 10-15 relevant tags for search and discovery
6. A suggested collection or category name
7. A compelling call-to-action line
8. A social media caption to promote the product
9. An email subject line for a product launch announcement

Match tone to the audience. Optimize for the store platform when relevant.`

export interface ProductListingFinalFields {
  finalTitle: string
  finalShortDescription: string
  finalLongDescription: string
  finalBulletPoints: string
  finalTags: string
  finalCollection: string
  finalCTA: string
  finalSocialCaption: string
  finalEmailSubject: string
}

export function emptyProductListingForm(): ProductListingFormValues {
  return {
    productType: "T-shirt",
    niche: "",
    audience: "",
    designConcept: "",
    tone: "",
    primaryKeyword: "",
    secondaryKeywords: "",
    storeName: "",
    productBenefits: "",
    pricingNotes: "",
    notes: "",
  }
}

export function emptyFinalListingFields(): ProductListingFinalFields {
  return {
    finalTitle: "",
    finalShortDescription: "",
    finalLongDescription: "",
    finalBulletPoints: "",
    finalTags: "",
    finalCollection: "",
    finalCTA: "",
    finalSocialCaption: "",
    finalEmailSubject: "",
  }
}

export function normalizeProductListing(
  listing: Partial<ProductListing> & Pick<ProductListing, "id">,
): ProductListing {
  const form = emptyProductListingForm()
  const finals = emptyFinalListingFields()
  return {
    id: listing.id,
    productType: listing.productType ?? form.productType,
    niche: listing.niche ?? form.niche,
    audience: listing.audience ?? form.audience,
    designConcept: listing.designConcept ?? form.designConcept,
    tone: listing.tone ?? form.tone,
    primaryKeyword: listing.primaryKeyword ?? form.primaryKeyword,
    secondaryKeywords: listing.secondaryKeywords ?? form.secondaryKeywords,
    storeName: listing.storeName ?? form.storeName,
    productBenefits: listing.productBenefits ?? form.productBenefits,
    pricingNotes: listing.pricingNotes ?? form.pricingNotes,
    completedPrompt: listing.completedPrompt ?? "",
    aiResponse: listing.aiResponse ?? "",
    finalTitle: listing.finalTitle ?? finals.finalTitle,
    finalShortDescription:
      listing.finalShortDescription ?? finals.finalShortDescription,
    finalLongDescription:
      listing.finalLongDescription ?? finals.finalLongDescription,
    finalBulletPoints: listing.finalBulletPoints ?? finals.finalBulletPoints,
    finalTags: listing.finalTags ?? finals.finalTags,
    finalCollection: listing.finalCollection ?? finals.finalCollection,
    finalCTA: listing.finalCTA ?? finals.finalCTA,
    finalSocialCaption: listing.finalSocialCaption ?? finals.finalSocialCaption,
    finalEmailSubject: listing.finalEmailSubject ?? finals.finalEmailSubject,
    notes: listing.notes ?? form.notes,
    createdAt: listing.createdAt ?? Date.now(),
    updatedAt: listing.updatedAt ?? Date.now(),
  }
}

export function getProductListingTemplate(prompts: Prompt[]): string {
  const saved = prompts.find(
    (p) =>
      p.id === PRODUCT_LISTING_PROMPT_ID ||
      p.name === PRODUCT_LISTING_PROMPT_NAME,
  )
  if (saved?.promptText) return saved.promptText
  return FALLBACK_PRODUCT_LISTING_TEMPLATE
}

export function formValuesToRecord(
  form: ProductListingFormValues,
): Record<string, string> {
  return { ...form }
}

export function buildProductListingCompletedPrompt(
  template: string,
  form: ProductListingFormValues,
): string {
  const values = formValuesToRecord(form)
  const variables = mergePromptVariables(Object.keys(values), template)
  return buildCompletedPrompt(template, values, variables)
}

export function buildFinalListingText(
  listing: ProductListingFinalFields,
): string {
  const sections: { label: string; value: string }[] = [
    { label: "Product Title", value: listing.finalTitle },
    { label: "Short Description", value: listing.finalShortDescription },
    { label: "Long Description", value: listing.finalLongDescription },
    { label: "Bullet Points", value: listing.finalBulletPoints },
    { label: "Tags", value: listing.finalTags },
    { label: "Collection/Category", value: listing.finalCollection },
    { label: "CTA", value: listing.finalCTA },
    { label: "Social Caption", value: listing.finalSocialCaption },
    { label: "Email Subject", value: listing.finalEmailSubject },
  ]

  return sections
    .filter((section) => section.value.trim())
    .map((section) => `${section.label}:\n${section.value.trim()}`)
    .join("\n\n")
}

export function finalFieldsFromProductListing(
  listing: Pick<ProductListing, keyof ProductListingFinalFields>,
): ProductListingFinalFields {
  return {
    finalTitle: listing.finalTitle ?? "",
    finalShortDescription: listing.finalShortDescription ?? "",
    finalLongDescription: listing.finalLongDescription ?? "",
    finalBulletPoints: listing.finalBulletPoints ?? "",
    finalTags: listing.finalTags ?? "",
    finalCollection: listing.finalCollection ?? "",
    finalCTA: listing.finalCTA ?? "",
    finalSocialCaption: listing.finalSocialCaption ?? "",
    finalEmailSubject: listing.finalEmailSubject ?? "",
  }
}
