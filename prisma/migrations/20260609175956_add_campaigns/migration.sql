-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignName" TEXT NOT NULL DEFAULT '',
    "campaignType" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Idea',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "artistName" TEXT NOT NULL DEFAULT '',
    "songTitle" TEXT NOT NULL DEFAULT '',
    "productName" TEXT NOT NULL DEFAULT '',
    "niche" TEXT NOT NULL DEFAULT '',
    "primaryGoal" TEXT NOT NULL DEFAULT '',
    "targetAudience" TEXT NOT NULL DEFAULT '',
    "startDate" TEXT NOT NULL DEFAULT '',
    "launchDate" TEXT NOT NULL DEFAULT '',
    "endDate" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "lessonsLearned" TEXT NOT NULL DEFAULT '',
    "whatWorked" TEXT NOT NULL DEFAULT '',
    "whatToImprove" TEXT NOT NULL DEFAULT '',
    "linkedRecords" TEXT NOT NULL DEFAULT '[]',
    "tasks" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Campaign_campaignName_idx" ON "Campaign"("campaignName");

-- CreateIndex
CREATE INDEX "Campaign_campaignType_idx" ON "Campaign"("campaignType");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_priority_idx" ON "Campaign"("priority");

-- CreateIndex
CREATE INDEX "Campaign_artistName_idx" ON "Campaign"("artistName");

-- CreateIndex
CREATE INDEX "Campaign_songTitle_idx" ON "Campaign"("songTitle");

-- CreateIndex
CREATE INDEX "Campaign_productName_idx" ON "Campaign"("productName");

-- CreateIndex
CREATE INDEX "Campaign_niche_idx" ON "Campaign"("niche");

-- CreateIndex
CREATE INDEX "Campaign_updatedAt_idx" ON "Campaign"("updatedAt");
