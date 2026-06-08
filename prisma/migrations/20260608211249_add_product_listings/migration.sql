-- CreateTable
CREATE TABLE "ProductListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productType" TEXT NOT NULL DEFAULT '',
    "niche" TEXT NOT NULL DEFAULT '',
    "audience" TEXT NOT NULL DEFAULT '',
    "designConcept" TEXT NOT NULL DEFAULT '',
    "tone" TEXT NOT NULL DEFAULT '',
    "primaryKeyword" TEXT NOT NULL DEFAULT '',
    "secondaryKeywords" TEXT NOT NULL DEFAULT '',
    "storeName" TEXT NOT NULL DEFAULT '',
    "productBenefits" TEXT NOT NULL DEFAULT '',
    "pricingNotes" TEXT NOT NULL DEFAULT '',
    "completedPrompt" TEXT NOT NULL DEFAULT '',
    "aiResponse" TEXT NOT NULL DEFAULT '',
    "finalTitle" TEXT NOT NULL DEFAULT '',
    "finalShortDescription" TEXT NOT NULL DEFAULT '',
    "finalLongDescription" TEXT NOT NULL DEFAULT '',
    "finalBulletPoints" TEXT NOT NULL DEFAULT '',
    "finalTags" TEXT NOT NULL DEFAULT '',
    "finalCollection" TEXT NOT NULL DEFAULT '',
    "finalCTA" TEXT NOT NULL DEFAULT '',
    "finalSocialCaption" TEXT NOT NULL DEFAULT '',
    "finalEmailSubject" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ProductListing_productType_idx" ON "ProductListing"("productType");

-- CreateIndex
CREATE INDEX "ProductListing_niche_idx" ON "ProductListing"("niche");

-- CreateIndex
CREATE INDEX "ProductListing_storeName_idx" ON "ProductListing"("storeName");

-- CreateIndex
CREATE INDEX "ProductListing_primaryKeyword_idx" ON "ProductListing"("primaryKeyword");

-- CreateIndex
CREATE INDEX "ProductListing_finalTitle_idx" ON "ProductListing"("finalTitle");

-- CreateIndex
CREATE INDEX "ProductListing_finalCollection_idx" ON "ProductListing"("finalCollection");

-- CreateIndex
CREATE INDEX "ProductListing_updatedAt_idx" ON "ProductListing"("updatedAt");
