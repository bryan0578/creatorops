-- CreateTable
CREATE TABLE "YouTubePackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackTitle" TEXT NOT NULL DEFAULT '',
    "artistName" TEXT NOT NULL DEFAULT '',
    "channelName" TEXT NOT NULL DEFAULT '',
    "genre" TEXT NOT NULL DEFAULT '',
    "mood" TEXT NOT NULL DEFAULT '',
    "targetListener" TEXT NOT NULL DEFAULT '',
    "visualTheme" TEXT NOT NULL DEFAULT '',
    "primaryGoal" TEXT NOT NULL DEFAULT '',
    "merchTieIn" TEXT NOT NULL DEFAULT '',
    "streamingLink" TEXT NOT NULL DEFAULT '',
    "releaseDate" TEXT NOT NULL DEFAULT '',
    "videoType" TEXT NOT NULL DEFAULT '',
    "keywords" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "completedPrompt" TEXT NOT NULL DEFAULT '',
    "aiResponse" TEXT NOT NULL DEFAULT '',
    "finalTitle" TEXT NOT NULL DEFAULT '',
    "finalDescription" TEXT NOT NULL DEFAULT '',
    "finalTags" TEXT NOT NULL DEFAULT '',
    "finalHashtags" TEXT NOT NULL DEFAULT '',
    "finalPinnedComment" TEXT NOT NULL DEFAULT '',
    "finalThumbnailText" TEXT NOT NULL DEFAULT '',
    "finalShortsCaption" TEXT NOT NULL DEFAULT '',
    "finalCommunityPost" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "YouTubePackage_trackTitle_idx" ON "YouTubePackage"("trackTitle");

-- CreateIndex
CREATE INDEX "YouTubePackage_artistName_idx" ON "YouTubePackage"("artistName");

-- CreateIndex
CREATE INDEX "YouTubePackage_updatedAt_idx" ON "YouTubePackage"("updatedAt");
