-- CreateTable
CREATE TABLE "ReleasePlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artistName" TEXT NOT NULL DEFAULT '',
    "songTitle" TEXT NOT NULL DEFAULT '',
    "genre" TEXT NOT NULL DEFAULT '',
    "mood" TEXT NOT NULL DEFAULT '',
    "releaseDate" TEXT NOT NULL DEFAULT '',
    "youtubeChannel" TEXT NOT NULL DEFAULT '',
    "targetAudience" TEXT NOT NULL DEFAULT '',
    "visualTheme" TEXT NOT NULL DEFAULT '',
    "merchTieIn" TEXT NOT NULL DEFAULT '',
    "streamingPlatforms" TEXT NOT NULL DEFAULT '',
    "primaryGoal" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "completedPrompt" TEXT NOT NULL DEFAULT '',
    "aiResponse" TEXT NOT NULL DEFAULT '',
    "finalStrategySummary" TEXT NOT NULL DEFAULT '',
    "finalTargetListener" TEXT NOT NULL DEFAULT '',
    "finalPreReleasePlan" TEXT NOT NULL DEFAULT '',
    "finalReleaseDayChecklist" TEXT NOT NULL DEFAULT '',
    "finalPostReleasePlan" TEXT NOT NULL DEFAULT '',
    "finalYouTubePackage" TEXT NOT NULL DEFAULT '',
    "finalShortFormIdeas" TEXT NOT NULL DEFAULT '',
    "finalSocialCaptions" TEXT NOT NULL DEFAULT '',
    "finalEmailAnnouncement" TEXT NOT NULL DEFAULT '',
    "finalMerchTieIns" TEXT NOT NULL DEFAULT '',
    "finalPriorityTasks" TEXT NOT NULL DEFAULT '',
    "finalChecklist" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ReleasePlan_artistName_idx" ON "ReleasePlan"("artistName");

-- CreateIndex
CREATE INDEX "ReleasePlan_songTitle_idx" ON "ReleasePlan"("songTitle");

-- CreateIndex
CREATE INDEX "ReleasePlan_releaseDate_idx" ON "ReleasePlan"("releaseDate");

-- CreateIndex
CREATE INDEX "ReleasePlan_updatedAt_idx" ON "ReleasePlan"("updatedAt");
