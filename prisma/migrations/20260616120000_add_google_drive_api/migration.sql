-- CreateTable
CREATE TABLE "DriveConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountEmail" TEXT NOT NULL DEFAULT '',
    "displayName" TEXT NOT NULL DEFAULT '',
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
CREATE TABLE "DriveFolder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driveFolderId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL DEFAULT '',
    "campaignId" TEXT NOT NULL DEFAULT '',
    "campaignName" TEXT NOT NULL DEFAULT '',
    "artistName" TEXT NOT NULL DEFAULT '',
    "songTitle" TEXT NOT NULL DEFAULT '',
    "productName" TEXT NOT NULL DEFAULT '',
    "sourceRecordType" TEXT NOT NULL DEFAULT '',
    "sourceRecordId" TEXT NOT NULL DEFAULT '',
    "externalLinkId" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "lastSyncedAt" DATETIME,
    "notes" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "rawJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DriveFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driveFileId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "mimeType" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL DEFAULT '',
    "webViewLink" TEXT NOT NULL DEFAULT '',
    "thumbnailLink" TEXT NOT NULL DEFAULT '',
    "iconLink" TEXT NOT NULL DEFAULT '',
    "sizeBytes" INTEGER,
    "modifiedTime" DATETIME,
    "folderId" TEXT NOT NULL DEFAULT '',
    "driveFolderId" TEXT NOT NULL DEFAULT '',
    "campaignId" TEXT NOT NULL DEFAULT '',
    "campaignName" TEXT NOT NULL DEFAULT '',
    "artistName" TEXT NOT NULL DEFAULT '',
    "songTitle" TEXT NOT NULL DEFAULT '',
    "productName" TEXT NOT NULL DEFAULT '',
    "assetId" TEXT NOT NULL DEFAULT '',
    "sourceRecordType" TEXT NOT NULL DEFAULT '',
    "sourceRecordId" TEXT NOT NULL DEFAULT '',
    "detectedAssetType" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "lastSyncedAt" DATETIME,
    "notes" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "rawJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DriveFolder_driveFolderId_key" ON "DriveFolder"("driveFolderId");
CREATE INDEX "DriveFolder_driveFolderId_idx" ON "DriveFolder"("driveFolderId");
CREATE INDEX "DriveFolder_campaignId_idx" ON "DriveFolder"("campaignId");
CREATE INDEX "DriveFolder_campaignName_idx" ON "DriveFolder"("campaignName");
CREATE INDEX "DriveFolder_sourceRecordType_idx" ON "DriveFolder"("sourceRecordType");
CREATE INDEX "DriveFolder_sourceRecordId_idx" ON "DriveFolder"("sourceRecordId");
CREATE INDEX "DriveFolder_updatedAt_idx" ON "DriveFolder"("updatedAt");

CREATE UNIQUE INDEX "DriveFile_driveFileId_key" ON "DriveFile"("driveFileId");
CREATE INDEX "DriveFile_driveFileId_idx" ON "DriveFile"("driveFileId");
CREATE INDEX "DriveFile_folderId_idx" ON "DriveFile"("folderId");
CREATE INDEX "DriveFile_driveFolderId_idx" ON "DriveFile"("driveFolderId");
CREATE INDEX "DriveFile_campaignId_idx" ON "DriveFile"("campaignId");
CREATE INDEX "DriveFile_campaignName_idx" ON "DriveFile"("campaignName");
CREATE INDEX "DriveFile_assetId_idx" ON "DriveFile"("assetId");
CREATE INDEX "DriveFile_detectedAssetType_idx" ON "DriveFile"("detectedAssetType");
CREATE INDEX "DriveFile_modifiedTime_idx" ON "DriveFile"("modifiedTime");
CREATE INDEX "DriveFile_updatedAt_idx" ON "DriveFile"("updatedAt");

CREATE INDEX "DriveConnection_status_idx" ON "DriveConnection"("status");
CREATE INDEX "DriveConnection_updatedAt_idx" ON "DriveConnection"("updatedAt");
