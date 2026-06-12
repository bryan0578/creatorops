-- CreateTable
CREATE TABLE "ProductResearchItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "productType" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "niche" TEXT NOT NULL DEFAULT '',
    "audience" TEXT NOT NULL DEFAULT '',
    "platform" TEXT NOT NULL DEFAULT '',
    "inspirationUrl" TEXT NOT NULL DEFAULT '',
    "competitorName" TEXT NOT NULL DEFAULT '',
    "priceRange" TEXT NOT NULL DEFAULT '',
    "demandSignal" TEXT NOT NULL DEFAULT '',
    "difficulty" TEXT NOT NULL DEFAULT '',
    "opportunityScore" REAL,
    "status" TEXT NOT NULL DEFAULT 'Idea',
    "campaignId" TEXT NOT NULL DEFAULT '',
    "campaignName" TEXT NOT NULL DEFAULT '',
    "artistName" TEXT NOT NULL DEFAULT '',
    "productName" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "rawJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductCollection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "collectionType" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Planning',
    "campaignId" TEXT NOT NULL DEFAULT '',
    "campaignName" TEXT NOT NULL DEFAULT '',
    "artistName" TEXT NOT NULL DEFAULT '',
    "theme" TEXT NOT NULL DEFAULT '',
    "targetAudience" TEXT NOT NULL DEFAULT '',
    "launchDate" DATETIME,
    "productIds" TEXT NOT NULL DEFAULT '[]',
    "merchIdeaIds" TEXT NOT NULL DEFAULT '[]',
    "assetIds" TEXT NOT NULL DEFAULT '[]',
    "externalLinkIds" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RevenueRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT '',
    "orderId" TEXT NOT NULL DEFAULT '',
    "productName" TEXT NOT NULL,
    "productType" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "grossRevenue" REAL NOT NULL DEFAULT 0,
    "netRevenue" REAL,
    "fees" REAL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "saleDate" DATETIME,
    "campaignId" TEXT NOT NULL DEFAULT '',
    "campaignName" TEXT NOT NULL DEFAULT '',
    "artistName" TEXT NOT NULL DEFAULT '',
    "productListingId" TEXT NOT NULL DEFAULT '',
    "collectionId" TEXT NOT NULL DEFAULT '',
    "externalLinkId" TEXT NOT NULL DEFAULT '',
    "customerCountry" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "rawJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ProductResearchItem_status_idx" ON "ProductResearchItem"("status");
CREATE INDEX "ProductResearchItem_productType_idx" ON "ProductResearchItem"("productType");
CREATE INDEX "ProductResearchItem_category_idx" ON "ProductResearchItem"("category");
CREATE INDEX "ProductResearchItem_campaignId_idx" ON "ProductResearchItem"("campaignId");
CREATE INDEX "ProductResearchItem_artistName_idx" ON "ProductResearchItem"("artistName");
CREATE INDEX "ProductResearchItem_updatedAt_idx" ON "ProductResearchItem"("updatedAt");

CREATE INDEX "ProductCollection_status_idx" ON "ProductCollection"("status");
CREATE INDEX "ProductCollection_collectionType_idx" ON "ProductCollection"("collectionType");
CREATE INDEX "ProductCollection_campaignId_idx" ON "ProductCollection"("campaignId");
CREATE INDEX "ProductCollection_artistName_idx" ON "ProductCollection"("artistName");
CREATE INDEX "ProductCollection_launchDate_idx" ON "ProductCollection"("launchDate");
CREATE INDEX "ProductCollection_updatedAt_idx" ON "ProductCollection"("updatedAt");

CREATE INDEX "RevenueRecord_platform_idx" ON "RevenueRecord"("platform");
CREATE INDEX "RevenueRecord_source_idx" ON "RevenueRecord"("source");
CREATE INDEX "RevenueRecord_productName_idx" ON "RevenueRecord"("productName");
CREATE INDEX "RevenueRecord_productListingId_idx" ON "RevenueRecord"("productListingId");
CREATE INDEX "RevenueRecord_campaignId_idx" ON "RevenueRecord"("campaignId");
CREATE INDEX "RevenueRecord_collectionId_idx" ON "RevenueRecord"("collectionId");
CREATE INDEX "RevenueRecord_artistName_idx" ON "RevenueRecord"("artistName");
CREATE INDEX "RevenueRecord_saleDate_idx" ON "RevenueRecord"("saleDate");
CREATE INDEX "RevenueRecord_updatedAt_idx" ON "RevenueRecord"("updatedAt");
