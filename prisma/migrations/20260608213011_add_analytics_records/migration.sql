-- CreateTable
CREATE TABLE "AnalyticsRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemName" TEXT NOT NULL DEFAULT '',
    "itemType" TEXT NOT NULL DEFAULT '',
    "relatedArtist" TEXT NOT NULL DEFAULT '',
    "relatedSong" TEXT NOT NULL DEFAULT '',
    "relatedCampaign" TEXT NOT NULL DEFAULT '',
    "platform" TEXT NOT NULL DEFAULT '',
    "publishDate" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL DEFAULT '',
    "niche" TEXT NOT NULL DEFAULT '',
    "genre" TEXT NOT NULL DEFAULT '',
    "mood" TEXT NOT NULL DEFAULT '',
    "titleUsed" TEXT NOT NULL DEFAULT '',
    "thumbnailText" TEXT NOT NULL DEFAULT '',
    "descriptionNotes" TEXT NOT NULL DEFAULT '',
    "tagsUsed" TEXT NOT NULL DEFAULT '',
    "callToAction" TEXT NOT NULL DEFAULT '',
    "views" REAL NOT NULL DEFAULT 0,
    "impressions" REAL NOT NULL DEFAULT 0,
    "clicks" REAL NOT NULL DEFAULT 0,
    "clickThroughRate" REAL NOT NULL DEFAULT 0,
    "likes" REAL NOT NULL DEFAULT 0,
    "comments" REAL NOT NULL DEFAULT 0,
    "shares" REAL NOT NULL DEFAULT 0,
    "saves" REAL NOT NULL DEFAULT 0,
    "subscribersGained" REAL NOT NULL DEFAULT 0,
    "watchTimeHours" REAL NOT NULL DEFAULT 0,
    "averageViewDuration" REAL NOT NULL DEFAULT 0,
    "retentionNotes" TEXT NOT NULL DEFAULT '',
    "revenue" REAL NOT NULL DEFAULT 0,
    "sales" REAL NOT NULL DEFAULT 0,
    "conversionRate" REAL NOT NULL DEFAULT 0,
    "whatWorked" TEXT NOT NULL DEFAULT '',
    "whatDidNotWork" TEXT NOT NULL DEFAULT '',
    "improvementIdeas" TEXT NOT NULL DEFAULT '',
    "nextActions" TEXT NOT NULL DEFAULT '',
    "rating" REAL NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "AnalyticsRecord_itemName_idx" ON "AnalyticsRecord"("itemName");

-- CreateIndex
CREATE INDEX "AnalyticsRecord_itemType_idx" ON "AnalyticsRecord"("itemType");

-- CreateIndex
CREATE INDEX "AnalyticsRecord_platform_idx" ON "AnalyticsRecord"("platform");

-- CreateIndex
CREATE INDEX "AnalyticsRecord_relatedArtist_idx" ON "AnalyticsRecord"("relatedArtist");

-- CreateIndex
CREATE INDEX "AnalyticsRecord_relatedSong_idx" ON "AnalyticsRecord"("relatedSong");

-- CreateIndex
CREATE INDEX "AnalyticsRecord_relatedCampaign_idx" ON "AnalyticsRecord"("relatedCampaign");

-- CreateIndex
CREATE INDEX "AnalyticsRecord_views_idx" ON "AnalyticsRecord"("views");

-- CreateIndex
CREATE INDEX "AnalyticsRecord_updatedAt_idx" ON "AnalyticsRecord"("updatedAt");
