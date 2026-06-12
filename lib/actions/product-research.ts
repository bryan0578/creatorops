"use server"

import { revalidatePath } from "next/cache"

import {
  normalizeProductResearchItem,
  prismaProductResearchToRecord,
  productResearchToPrismaCreate,
  productResearchToPrismaUpdate,
} from "@/lib/data/product-research"
import { upsertMerchIdea } from "@/lib/actions/merch-ideas"
import { upsertProductListing } from "@/lib/actions/product-listings"
import { createExperiment } from "@/lib/actions/experiments"
import { createLearning } from "@/lib/actions/learnings"
import { prisma } from "@/lib/prisma"
import { createId } from "@/lib/storage"
import type { ProductResearchItemRecord } from "@/lib/commerce/types"

const PATHS = [
  "/",
  "/product-research",
  "/product-factory",
  "/merch-ideas",
  "/product-listings",
  "/search",
  "/backups",
]

function revalidate() {
  for (const path of PATHS) revalidatePath(path)
}

function wrapDbError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("no such table") || message.includes("does not exist")) {
    return new Error(
      `${context} ProductResearchItem table is missing. Run npm run db:migrate, then restart.`,
    )
  }
  return new Error(`${context} ${message}`)
}

export async function getProductResearchItems(): Promise<ProductResearchItemRecord[]> {
  try {
    const rows = await prisma.productResearchItem.findMany({ orderBy: { updatedAt: "desc" } })
    return rows.map(prismaProductResearchToRecord)
  } catch (error) {
    throw wrapDbError(error, "Failed to load product research.")
  }
}

export async function getProductResearchItemById(
  id: string,
): Promise<ProductResearchItemRecord | null> {
  try {
    const row = await prisma.productResearchItem.findUnique({ where: { id: id.trim() } })
    return row ? prismaProductResearchToRecord(row) : null
  } catch {
    return null
  }
}

export async function createProductResearchItem(
  data: Omit<ProductResearchItemRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<ProductResearchItemRecord> {
  const record = normalizeProductResearchItem({
    ...data,
    id: data.id?.trim() || createId("product-research"),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  try {
    const row = await prisma.productResearchItem.create({
      data: productResearchToPrismaCreate(record) as Parameters<
        typeof prisma.productResearchItem.create
      >[0]["data"],
    })
    revalidate()
    return prismaProductResearchToRecord(row)
  } catch (error) {
    throw wrapDbError(error, "Could not create product research item.")
  }
}

export async function updateProductResearchItem(
  id: string,
  data: Partial<ProductResearchItemRecord>,
): Promise<ProductResearchItemRecord> {
  const existing = await getProductResearchItemById(id)
  if (!existing) throw new Error("Product research item not found.")
  const record = normalizeProductResearchItem({
    ...existing,
    ...data,
    id: existing.id,
    updatedAt: Date.now(),
  })
  try {
    const row = await prisma.productResearchItem.update({
      where: { id: existing.id },
      data: productResearchToPrismaUpdate(record),
    })
    revalidate()
    return prismaProductResearchToRecord(row)
  } catch (error) {
    throw wrapDbError(error, "Could not update product research item.")
  }
}

export async function deleteProductResearchItem(id: string): Promise<void> {
  try {
    await prisma.productResearchItem.delete({ where: { id: id.trim() } })
    revalidate()
  } catch (error) {
    throw wrapDbError(error, "Could not delete product research item.")
  }
}

export async function importProductResearchItems(
  records: ProductResearchItemRecord[],
): Promise<{ imported: number }> {
  let imported = 0
  for (const record of records) {
    await createProductResearchItem(record)
    imported++
  }
  return { imported }
}

export async function convertResearchToMerchIdea(researchId: string) {
  const research = await getProductResearchItemById(researchId)
  if (!research) return { success: false, message: "Research item not found." }

  const idea = await upsertMerchIdea({
    id: createId("merch"),
    niche: research.niche,
    audience: research.audience,
    productType: research.productType,
    tone: "",
    noun: research.productName || research.title,
    verb: "",
    designStyle: research.category,
    storeType: research.platform,
    primaryGoal: research.demandSignal,
    completedPrompt: "",
    aiResponse: "",
    selectedConceptName: research.title,
    selectedSlogan: "",
    selectedDesignDirection: research.notes,
    selectedProductTitle: research.title,
    selectedProductDescription: research.notes,
    selectedTags: research.tags.join(", "),
    selectedMockupIdea: research.inspirationUrl,
    selectedSocialCaption: "",
    notes: `Converted from product research ${research.id}. ${research.notes}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })

  await updateProductResearchItem(research.id, { status: "Converted" })
  return {
    success: true,
    message: "Merch idea created from research.",
    href: `/merch-ideas?recordId=${encodeURIComponent(idea.id)}`,
    record: idea,
  }
}

export async function convertResearchToProductListing(researchId: string) {
  const research = await getProductResearchItemById(researchId)
  if (!research) return { success: false, message: "Research item not found." }

  const listing = await upsertProductListing({
    id: createId("product-listing"),
    productType: research.productType,
    niche: research.niche,
    audience: research.audience,
    designConcept: research.title,
    tone: "",
    primaryKeyword: research.category,
    secondaryKeywords: research.tags.join(", "),
    storeName: research.platform,
    productBenefits: research.demandSignal,
    pricingNotes: research.priceRange,
    completedPrompt: "",
    aiResponse: "",
    finalTitle: research.title,
    finalShortDescription: research.notes.slice(0, 240),
    finalLongDescription: research.notes,
    finalBulletPoints: "",
    finalTags: research.tags.join(", "),
    finalCollection: research.campaignName,
    finalCTA: "",
    finalSocialCaption: "",
    finalEmailSubject: "",
    notes: `Converted from product research ${research.id}. ${research.notes}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })

  await updateProductResearchItem(research.id, { status: "Converted" })
  return {
    success: true,
    message: "Product listing created from research.",
    href: `/product-listings?recordId=${encodeURIComponent(listing.id)}`,
    record: listing,
  }
}

export async function createExperimentFromResearch(researchId: string) {
  const research = await getProductResearchItemById(researchId)
  if (!research) return { success: false, message: "Research item not found." }

  const record = await createExperiment({
    id: createId("experiment"),
    campaignId: research.campaignId,
    campaignName: research.campaignName,
    experimentName: `Product test: ${research.title}`,
    experimentType: "Product Listing",
    status: "Idea",
    platform: research.platform || "Store",
    hypothesis: `Testing product opportunity: ${research.title}. ${research.demandSignal}`,
    variantA: "",
    variantB: "",
    variantC: "",
    winner: "",
    resultSummary: "",
    metricFocus: "Sales",
    startDate: "",
    endDate: "",
    notes: research.notes,
    whatWorked: "",
    whatDidNotWork: "",
    nextTestIdea: "",
    relatedAnalyticsNotes: "",
    variantAMetric: "",
    variantBMetric: "",
    variantCMetric: "",
    analyticsRecordId: "",
    analyticsRecordName: "",
    confidenceNotes: "",
    learningSummary: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })

  return {
    success: true,
    message: "Experiment created from research.",
    href: `/experiments?recordId=${encodeURIComponent(record.id)}`,
    record,
  }
}

export async function createLearningFromResearch(researchId: string) {
  const research = await getProductResearchItemById(researchId)
  if (!research) return { success: false, message: "Research item not found." }

  const record = await createLearning({
    title: `Product research: ${research.title}`,
    learningType: "Product Listing",
    category: "Opportunity",
    confidence: "Medium",
    impact: "Medium",
    status: "Active",
    campaignId: research.campaignId,
    campaignName: research.campaignName,
    artistName: research.artistName,
    songTitle: "",
    productName: research.productName || research.title,
    platform: research.platform,
    sourceType: "product-research",
    sourceId: research.id,
    analyticsRecordId: "",
    experimentId: "",
    qualityReviewId: "",
    assetId: "",
    promptRunId: "",
    playbookId: "",
    insight: research.demandSignal || research.notes,
    evidence: `${research.competitorName} ${research.inspirationUrl}`.trim(),
    recommendation: `Convert to merch/listing when validated. Opportunity score: ${research.opportunityScore ?? "—"}`,
    repeatWhen: "",
    avoidWhen: "",
    tags: [...research.tags, "commerce", "product-research"],
    notes: research.notes,
  })

  return {
    success: true,
    message: "Learning created from research.",
    href: `/learnings?recordId=${encodeURIComponent(record.id)}`,
    record,
  }
}
