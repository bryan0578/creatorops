-- CreateTable
CREATE TABLE "QualityReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewName" TEXT NOT NULL DEFAULT '',
    "reviewType" TEXT NOT NULL DEFAULT 'Other',
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "campaignId" TEXT NOT NULL DEFAULT '',
    "campaignName" TEXT NOT NULL DEFAULT '',
    "artistName" TEXT NOT NULL DEFAULT '',
    "songTitle" TEXT NOT NULL DEFAULT '',
    "productName" TEXT NOT NULL DEFAULT '',
    "sourceRecordType" TEXT NOT NULL DEFAULT '',
    "sourceRecordId" TEXT NOT NULL DEFAULT '',
    "sourcePromptRunId" TEXT NOT NULL DEFAULT '',
    "sourceExperimentId" TEXT NOT NULL DEFAULT '',
    "platform" TEXT NOT NULL DEFAULT '',
    "rubricVersion" TEXT NOT NULL DEFAULT '1',
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "scoreBreakdown" TEXT NOT NULL DEFAULT '{}',
    "strengths" TEXT NOT NULL DEFAULT '',
    "weaknesses" TEXT NOT NULL DEFAULT '',
    "improvementIdeas" TEXT NOT NULL DEFAULT '',
    "recommendedActions" TEXT NOT NULL DEFAULT '',
    "readinessLabel" TEXT NOT NULL DEFAULT '',
    "reviewerNotes" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "QualityReview_reviewName_idx" ON "QualityReview"("reviewName");
CREATE INDEX "QualityReview_reviewType_idx" ON "QualityReview"("reviewType");
CREATE INDEX "QualityReview_status_idx" ON "QualityReview"("status");
CREATE INDEX "QualityReview_campaignId_idx" ON "QualityReview"("campaignId");
CREATE INDEX "QualityReview_campaignName_idx" ON "QualityReview"("campaignName");
CREATE INDEX "QualityReview_sourceRecordType_idx" ON "QualityReview"("sourceRecordType");
CREATE INDEX "QualityReview_sourceRecordId_idx" ON "QualityReview"("sourceRecordId");
CREATE INDEX "QualityReview_overallScore_idx" ON "QualityReview"("overallScore");
CREATE INDEX "QualityReview_updatedAt_idx" ON "QualityReview"("updatedAt");
