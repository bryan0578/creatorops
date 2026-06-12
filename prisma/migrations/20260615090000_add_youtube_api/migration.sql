-- CreateTable
CREATE TABLE "YouTubeConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountEmail" TEXT NOT NULL DEFAULT '',
    "channelId" TEXT NOT NULL DEFAULT '',
    "channelTitle" TEXT NOT NULL DEFAULT '',
    "channelHandle" TEXT NOT NULL DEFAULT '',
    "channelUrl" TEXT NOT NULL DEFAULT '',
    "thumbnailUrl" TEXT NOT NULL DEFAULT '',
    "scopes" TEXT NOT NULL DEFAULT '[]',
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "tokenType" TEXT NOT NULL DEFAULT '',
    "expiryDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'Disconnected',
    "lastSyncedAt" DATETIME,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "YouTubeVideo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "youtubeVideoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "channelId" TEXT NOT NULL DEFAULT '',
    "channelTitle" TEXT NOT NULL DEFAULT '',
    "publishedAt" DATETIME,
    "thumbnailUrl" TEXT NOT NULL DEFAULT '',
    "videoUrl" TEXT NOT NULL DEFAULT '',
    "duration" TEXT NOT NULL DEFAULT '',
    "privacyStatus" TEXT NOT NULL DEFAULT '',
    "campaignId" TEXT NOT NULL DEFAULT '',
    "campaignName" TEXT NOT NULL DEFAULT '',
    "artistName" TEXT NOT NULL DEFAULT '',
    "songTitle" TEXT NOT NULL DEFAULT '',
    "externalLinkId" TEXT NOT NULL DEFAULT '',
    "analyticsRecordId" TEXT NOT NULL DEFAULT '',
    "rawJson" TEXT NOT NULL DEFAULT '{}',
    "lastSyncedAt" DATETIME,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "YouTubeConnection_channelId_idx" ON "YouTubeConnection"("channelId");
CREATE INDEX "YouTubeConnection_status_idx" ON "YouTubeConnection"("status");
CREATE INDEX "YouTubeConnection_updatedAt_idx" ON "YouTubeConnection"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "YouTubeVideo_youtubeVideoId_key" ON "YouTubeVideo"("youtubeVideoId");
CREATE INDEX "YouTubeVideo_youtubeVideoId_idx" ON "YouTubeVideo"("youtubeVideoId");
CREATE INDEX "YouTubeVideo_channelId_idx" ON "YouTubeVideo"("channelId");
CREATE INDEX "YouTubeVideo_campaignId_idx" ON "YouTubeVideo"("campaignId");
CREATE INDEX "YouTubeVideo_campaignName_idx" ON "YouTubeVideo"("campaignName");
CREATE INDEX "YouTubeVideo_publishedAt_idx" ON "YouTubeVideo"("publishedAt");
CREATE INDEX "YouTubeVideo_updatedAt_idx" ON "YouTubeVideo"("updatedAt");
