"use server"

import { revalidatePath } from "next/cache"

import {
  normalizeProductListing,
  prismaProductListingToProductListing,
  productListingToPrismaCreate,
  productListingToPrismaUpdate,
} from "@/lib/data/product-listings"
import { ProductListingDatabaseError } from "@/lib/errors/product-listing-database-error"
import { prisma } from "@/lib/prisma"
import type { ProductListing } from "@/lib/types"

const PRODUCT_LISTING_PATHS = ["/product-listings", "/"]

function assertProductListingPrismaReady(): void {
  const client = prisma as typeof prisma & { productListing?: unknown }

  if (client.productListing == null) {
    throw new ProductListingDatabaseError(
      "Prisma Client is missing the ProductListing delegate. Run `npx prisma generate` and `npm run db:migrate`, then restart the dev server.",
    )
  }
}

function wrapProductListingDbError(
  error: unknown,
  context: string,
): ProductListingDatabaseError {
  if (error instanceof ProductListingDatabaseError) return error

  const message = error instanceof Error ? error.message : String(error)

  if (message.includes("no such table") || message.includes("does not exist")) {
    return new ProductListingDatabaseError(
      `${context} ProductListing table is missing. Run \`npm run db:migrate\`, then restart the dev server.`,
      { cause: error },
    )
  }

  return new ProductListingDatabaseError(`${context} ${message}`, {
    cause: error,
  })
}

function revalidateProductListingRoutes() {
  for (const path of PRODUCT_LISTING_PATHS) {
    revalidatePath(path)
  }
}

async function listProductListingsFromDb(): Promise<ProductListing[]> {
  assertProductListingPrismaReady()
  const rows = await prisma.productListing.findMany({
    orderBy: { updatedAt: "desc" },
  })
  return rows.map(prismaProductListingToProductListing)
}

/**
 * Load all product listings from SQLite.
 * Throws ProductListingDatabaseError on failure — store falls back to localStorage.
 */
export async function getProductListings(): Promise<ProductListing[]> {
  try {
    return await listProductListingsFromDb()
  } catch (error) {
    throw wrapProductListingDbError(
      error,
      "Failed to load product listings from database.",
    )
  }
}

/** Create or replace a product listing. */
export async function upsertProductListing(
  listing: ProductListing,
): Promise<ProductListing> {
  assertProductListingPrismaReady()
  const normalized = normalizeProductListing(listing)

  try {
    const row = await prisma.productListing.upsert({
      where: { id: normalized.id },
      create: productListingToPrismaCreate(normalized),
      update: productListingToPrismaUpdate(normalized),
    })
    revalidateProductListingRoutes()
    return prismaProductListingToProductListing(row)
  } catch (error) {
    throw wrapProductListingDbError(error, "Could not save product listing.")
  }
}

/** Delete a product listing by id. */
export async function deleteProductListingById(id: string): Promise<void> {
  assertProductListingPrismaReady()
  try {
    await prisma.productListing.delete({ where: { id } })
    revalidateProductListingRoutes()
  } catch (error) {
    throw wrapProductListingDbError(error, "Could not delete product listing.")
  }
}

/** Import product listings (merge by id). */
export async function importProductListings(
  items: ProductListing[],
): Promise<ProductListing[]> {
  if (!Array.isArray(items)) {
    throw new ProductListingDatabaseError(
      "Import payload must be an array of product listings.",
    )
  }

  for (const item of items) {
    await upsertProductListing(normalizeProductListing(item))
  }
  revalidateProductListingRoutes()
  return listProductListingsFromDb()
}

/**
 * One-time migration: copy product listings from browser localStorage into SQLite.
 * Does not delete localStorage data — kept for rollback/export.
 */
export async function migrateLocalProductListingsToDatabase(
  items: ProductListing[],
): Promise<{ migrated: number; total: number }> {
  assertProductListingPrismaReady()

  if (!Array.isArray(items)) {
    throw new ProductListingDatabaseError(
      "Migration payload must be an array of product listings.",
    )
  }

  if (items.length === 0) {
    const total = await prisma.productListing.count()
    return { migrated: 0, total }
  }

  for (const item of items) {
    await upsertProductListing(normalizeProductListing(item))
  }

  revalidateProductListingRoutes()
  const total = await prisma.productListing.count()
  return { migrated: items.length, total }
}
