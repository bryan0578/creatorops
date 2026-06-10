-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetName" TEXT NOT NULL DEFAULT '',
    "assetType" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "campaignId" TEXT NOT NULL DEFAULT '',
    "campaignName" TEXT NOT NULL DEFAULT '',
    "artistName" TEXT NOT NULL DEFAULT '',
    "songTitle" TEXT NOT NULL DEFAULT '',
    "productName" TEXT NOT NULL DEFAULT '',
    "platform" TEXT NOT NULL DEFAULT '',
    "filePath" TEXT NOT NULL DEFAULT '',
    "fileUrl" TEXT NOT NULL DEFAULT '',
    "externalUrl" TEXT NOT NULL DEFAULT '',
    "sourceTool" TEXT NOT NULL DEFAULT '',
    "sourcePromptRunId" TEXT NOT NULL DEFAULT '',
    "sourcePromptName" TEXT NOT NULL DEFAULT '',
    "sourceRecordType" TEXT NOT NULL DEFAULT '',
    "sourceRecordId" TEXT NOT NULL DEFAULT '',
    "experimentId" TEXT NOT NULL DEFAULT '',
    "analyticsRecordId" TEXT NOT NULL DEFAULT '',
    "versionLabel" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "description" TEXT NOT NULL DEFAULT '',
    "usageNotes" TEXT NOT NULL DEFAULT '',
    "rightsNotes" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Asset_assetName_idx" ON "Asset"("assetName");
CREATE INDEX "Asset_assetType_idx" ON "Asset"("assetType");
CREATE INDEX "Asset_campaignId_idx" ON "Asset"("campaignId");
CREATE INDEX "Asset_campaignName_idx" ON "Asset"("campaignName");
CREATE INDEX "Asset_artistName_idx" ON "Asset"("artistName");
CREATE INDEX "Asset_songTitle_idx" ON "Asset"("songTitle");
CREATE INDEX "Asset_status_idx" ON "Asset"("status");
CREATE INDEX "Asset_updatedAt_idx" ON "Asset"("updatedAt");
