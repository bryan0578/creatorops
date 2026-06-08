-- CreateTable
CREATE TABLE "MockupPrompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectName" TEXT NOT NULL DEFAULT '',
    "mockupType" TEXT NOT NULL DEFAULT '',
    "productType" TEXT NOT NULL DEFAULT '',
    "niche" TEXT NOT NULL DEFAULT '',
    "audience" TEXT NOT NULL DEFAULT '',
    "designConcept" TEXT NOT NULL DEFAULT '',
    "visualStyle" TEXT NOT NULL DEFAULT '',
    "colors" TEXT NOT NULL DEFAULT '',
    "setting" TEXT NOT NULL DEFAULT '',
    "modelDescription" TEXT NOT NULL DEFAULT '',
    "cameraAngle" TEXT NOT NULL DEFAULT '',
    "lighting" TEXT NOT NULL DEFAULT '',
    "mood" TEXT NOT NULL DEFAULT '',
    "platformUse" TEXT NOT NULL DEFAULT '',
    "aspectRatio" TEXT NOT NULL DEFAULT '',
    "textToInclude" TEXT NOT NULL DEFAULT '',
    "textToAvoid" TEXT NOT NULL DEFAULT '',
    "brandNotes" TEXT NOT NULL DEFAULT '',
    "completedPrompt" TEXT NOT NULL DEFAULT '',
    "aiResponse" TEXT NOT NULL DEFAULT '',
    "finalImagePrompt" TEXT NOT NULL DEFAULT '',
    "finalNegativePrompt" TEXT NOT NULL DEFAULT '',
    "finalLayoutNotes" TEXT NOT NULL DEFAULT '',
    "finalTextPlacement" TEXT NOT NULL DEFAULT '',
    "finalUsageNotes" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "MockupPrompt_projectName_idx" ON "MockupPrompt"("projectName");

-- CreateIndex
CREATE INDEX "MockupPrompt_mockupType_idx" ON "MockupPrompt"("mockupType");

-- CreateIndex
CREATE INDEX "MockupPrompt_productType_idx" ON "MockupPrompt"("productType");

-- CreateIndex
CREATE INDEX "MockupPrompt_niche_idx" ON "MockupPrompt"("niche");

-- CreateIndex
CREATE INDEX "MockupPrompt_platformUse_idx" ON "MockupPrompt"("platformUse");

-- CreateIndex
CREATE INDEX "MockupPrompt_visualStyle_idx" ON "MockupPrompt"("visualStyle");

-- CreateIndex
CREATE INDEX "MockupPrompt_updatedAt_idx" ON "MockupPrompt"("updatedAt");
