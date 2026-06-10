-- CreateTable
CREATE TABLE "Learning" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT '',
    "learningType" TEXT NOT NULL DEFAULT 'Other',
    "category" TEXT NOT NULL DEFAULT '',
    "confidence" TEXT NOT NULL DEFAULT 'Medium',
    "impact" TEXT NOT NULL DEFAULT 'Unknown',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "campaignId" TEXT NOT NULL DEFAULT '',
    "campaignName" TEXT NOT NULL DEFAULT '',
    "artistName" TEXT NOT NULL DEFAULT '',
    "songTitle" TEXT NOT NULL DEFAULT '',
    "productName" TEXT NOT NULL DEFAULT '',
    "platform" TEXT NOT NULL DEFAULT '',
    "sourceType" TEXT NOT NULL DEFAULT '',
    "sourceId" TEXT NOT NULL DEFAULT '',
    "analyticsRecordId" TEXT NOT NULL DEFAULT '',
    "experimentId" TEXT NOT NULL DEFAULT '',
    "qualityReviewId" TEXT NOT NULL DEFAULT '',
    "assetId" TEXT NOT NULL DEFAULT '',
    "promptRunId" TEXT NOT NULL DEFAULT '',
    "playbookId" TEXT NOT NULL DEFAULT '',
    "insight" TEXT NOT NULL DEFAULT '',
    "evidence" TEXT NOT NULL DEFAULT '',
    "recommendation" TEXT NOT NULL DEFAULT '',
    "repeatWhen" TEXT NOT NULL DEFAULT '',
    "avoidWhen" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Learning_title_idx" ON "Learning"("title");
CREATE INDEX "Learning_learningType_idx" ON "Learning"("learningType");
CREATE INDEX "Learning_category_idx" ON "Learning"("category");
CREATE INDEX "Learning_campaignId_idx" ON "Learning"("campaignId");
CREATE INDEX "Learning_campaignName_idx" ON "Learning"("campaignName");
CREATE INDEX "Learning_artistName_idx" ON "Learning"("artistName");
CREATE INDEX "Learning_songTitle_idx" ON "Learning"("songTitle");
CREATE INDEX "Learning_platform_idx" ON "Learning"("platform");
CREATE INDEX "Learning_confidence_idx" ON "Learning"("confidence");
CREATE INDEX "Learning_impact_idx" ON "Learning"("impact");
CREATE INDEX "Learning_status_idx" ON "Learning"("status");
CREATE INDEX "Learning_updatedAt_idx" ON "Learning"("updatedAt");
