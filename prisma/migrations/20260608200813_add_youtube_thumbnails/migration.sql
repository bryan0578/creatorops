-- CreateTable
CREATE TABLE "YouTubeThumbnail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackTitle" TEXT NOT NULL DEFAULT '',
    "artistName" TEXT NOT NULL DEFAULT '',
    "videoTitle" TEXT NOT NULL DEFAULT '',
    "contentFormat" TEXT NOT NULL DEFAULT '',
    "videoType" TEXT NOT NULL DEFAULT '',
    "genre" TEXT NOT NULL DEFAULT '',
    "mood" TEXT NOT NULL DEFAULT '',
    "targetAudience" TEXT NOT NULL DEFAULT '',
    "visualTheme" TEXT NOT NULL DEFAULT '',
    "hookAngle" TEXT NOT NULL DEFAULT '',
    "mainSubject" TEXT NOT NULL DEFAULT '',
    "textOverlay" TEXT NOT NULL DEFAULT '',
    "colorDirection" TEXT NOT NULL DEFAULT '',
    "brandingNotes" TEXT NOT NULL DEFAULT '',
    "referenceStyle" TEXT NOT NULL DEFAULT '',
    "ctaGoal" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "completedPrompt" TEXT NOT NULL DEFAULT '',
    "aiResponse" TEXT NOT NULL DEFAULT '',
    "finalConcept" TEXT NOT NULL DEFAULT '',
    "finalTextOverlay" TEXT NOT NULL DEFAULT '',
    "finalComposition" TEXT NOT NULL DEFAULT '',
    "finalColorDirection" TEXT NOT NULL DEFAULT '',
    "finalImagePrompt" TEXT NOT NULL DEFAULT '',
    "finalAltVariation" TEXT NOT NULL DEFAULT '',
    "finalShortsVersion" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "YouTubeThumbnail_trackTitle_idx" ON "YouTubeThumbnail"("trackTitle");

-- CreateIndex
CREATE INDEX "YouTubeThumbnail_artistName_idx" ON "YouTubeThumbnail"("artistName");

-- CreateIndex
CREATE INDEX "YouTubeThumbnail_videoTitle_idx" ON "YouTubeThumbnail"("videoTitle");

-- CreateIndex
CREATE INDEX "YouTubeThumbnail_updatedAt_idx" ON "YouTubeThumbnail"("updatedAt");
