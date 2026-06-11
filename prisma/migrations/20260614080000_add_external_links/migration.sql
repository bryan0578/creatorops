-- CreateTable
CREATE TABLE "ExternalLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "linkType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "campaignId" TEXT NOT NULL DEFAULT '',
    "campaignName" TEXT NOT NULL DEFAULT '',
    "artistName" TEXT NOT NULL DEFAULT '',
    "songTitle" TEXT NOT NULL DEFAULT '',
    "productName" TEXT NOT NULL DEFAULT '',
    "sourceRecordType" TEXT NOT NULL DEFAULT '',
    "sourceRecordId" TEXT NOT NULL DEFAULT '',
    "assetId" TEXT NOT NULL DEFAULT '',
    "analyticsRecordId" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ExternalLink_name_idx" ON "ExternalLink"("name");
CREATE INDEX "ExternalLink_platform_idx" ON "ExternalLink"("platform");
CREATE INDEX "ExternalLink_linkType_idx" ON "ExternalLink"("linkType");
CREATE INDEX "ExternalLink_campaignId_idx" ON "ExternalLink"("campaignId");
CREATE INDEX "ExternalLink_campaignName_idx" ON "ExternalLink"("campaignName");
CREATE INDEX "ExternalLink_sourceRecordType_idx" ON "ExternalLink"("sourceRecordType");
CREATE INDEX "ExternalLink_sourceRecordId_idx" ON "ExternalLink"("sourceRecordId");
CREATE INDEX "ExternalLink_assetId_idx" ON "ExternalLink"("assetId");
CREATE INDEX "ExternalLink_analyticsRecordId_idx" ON "ExternalLink"("analyticsRecordId");
CREATE INDEX "ExternalLink_updatedAt_idx" ON "ExternalLink"("updatedAt");
