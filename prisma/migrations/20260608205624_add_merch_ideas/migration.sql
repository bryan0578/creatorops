-- CreateTable
CREATE TABLE "MerchIdea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "niche" TEXT NOT NULL DEFAULT '',
    "audience" TEXT NOT NULL DEFAULT '',
    "productType" TEXT NOT NULL DEFAULT '',
    "tone" TEXT NOT NULL DEFAULT '',
    "noun" TEXT NOT NULL DEFAULT '',
    "verb" TEXT NOT NULL DEFAULT '',
    "designStyle" TEXT NOT NULL DEFAULT '',
    "storeType" TEXT NOT NULL DEFAULT '',
    "primaryGoal" TEXT NOT NULL DEFAULT '',
    "completedPrompt" TEXT NOT NULL DEFAULT '',
    "aiResponse" TEXT NOT NULL DEFAULT '',
    "selectedConceptName" TEXT NOT NULL DEFAULT '',
    "selectedSlogan" TEXT NOT NULL DEFAULT '',
    "selectedDesignDirection" TEXT NOT NULL DEFAULT '',
    "selectedProductTitle" TEXT NOT NULL DEFAULT '',
    "selectedProductDescription" TEXT NOT NULL DEFAULT '',
    "selectedTags" TEXT NOT NULL DEFAULT '',
    "selectedMockupIdea" TEXT NOT NULL DEFAULT '',
    "selectedSocialCaption" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "MerchIdea_niche_idx" ON "MerchIdea"("niche");

-- CreateIndex
CREATE INDEX "MerchIdea_productType_idx" ON "MerchIdea"("productType");

-- CreateIndex
CREATE INDEX "MerchIdea_storeType_idx" ON "MerchIdea"("storeType");

-- CreateIndex
CREATE INDEX "MerchIdea_selectedConceptName_idx" ON "MerchIdea"("selectedConceptName");

-- CreateIndex
CREATE INDEX "MerchIdea_updatedAt_idx" ON "MerchIdea"("updatedAt");
