-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artistName" TEXT NOT NULL DEFAULT '',
    "artistType" TEXT NOT NULL DEFAULT '',
    "genre" TEXT NOT NULL DEFAULT '',
    "subGenres" TEXT NOT NULL DEFAULT '',
    "mood" TEXT NOT NULL DEFAULT '',
    "brandDescription" TEXT NOT NULL DEFAULT '',
    "visualIdentity" TEXT NOT NULL DEFAULT '',
    "targetAudience" TEXT NOT NULL DEFAULT '',
    "contentStyle" TEXT NOT NULL DEFAULT '',
    "youtubeChannel" TEXT NOT NULL DEFAULT '',
    "spotifyLink" TEXT NOT NULL DEFAULT '',
    "appleMusicLink" TEXT NOT NULL DEFAULT '',
    "amazonMusicLink" TEXT NOT NULL DEFAULT '',
    "websiteLink" TEXT NOT NULL DEFAULT '',
    "merchStoreLink" TEXT NOT NULL DEFAULT '',
    "socialLinks" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ArtistRelease" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artistId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "songTitle" TEXT NOT NULL DEFAULT '',
    "releaseDate" TEXT NOT NULL DEFAULT '',
    "genre" TEXT NOT NULL DEFAULT '',
    "mood" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT '',
    "youtubeUrl" TEXT NOT NULL DEFAULT '',
    "streamingLinks" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "thumbnailRecordId" TEXT NOT NULL DEFAULT '',
    "youtubePackagingRecordId" TEXT NOT NULL DEFAULT '',
    "releasePlanRecordId" TEXT NOT NULL DEFAULT '',
    "analyticsRecordId" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "ArtistRelease_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArtistProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artistId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "productName" TEXT NOT NULL DEFAULT '',
    "productType" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT '',
    "storeLink" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "ArtistProduct_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArtistCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artistId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "campaignName" TEXT NOT NULL DEFAULT '',
    "campaignType" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT '',
    "startDate" TEXT NOT NULL DEFAULT '',
    "endDate" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "ArtistCampaign_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Artist_artistName_idx" ON "Artist"("artistName");

-- CreateIndex
CREATE INDEX "Artist_artistType_idx" ON "Artist"("artistType");

-- CreateIndex
CREATE INDEX "Artist_genre_idx" ON "Artist"("genre");

-- CreateIndex
CREATE INDEX "Artist_updatedAt_idx" ON "Artist"("updatedAt");

-- CreateIndex
CREATE INDEX "ArtistRelease_artistId_idx" ON "ArtistRelease"("artistId");

-- CreateIndex
CREATE INDEX "ArtistRelease_songTitle_idx" ON "ArtistRelease"("songTitle");

-- CreateIndex
CREATE INDEX "ArtistRelease_thumbnailRecordId_idx" ON "ArtistRelease"("thumbnailRecordId");

-- CreateIndex
CREATE INDEX "ArtistRelease_youtubePackagingRecordId_idx" ON "ArtistRelease"("youtubePackagingRecordId");

-- CreateIndex
CREATE INDEX "ArtistRelease_releasePlanRecordId_idx" ON "ArtistRelease"("releasePlanRecordId");

-- CreateIndex
CREATE INDEX "ArtistRelease_analyticsRecordId_idx" ON "ArtistRelease"("analyticsRecordId");

-- CreateIndex
CREATE INDEX "ArtistProduct_artistId_idx" ON "ArtistProduct"("artistId");

-- CreateIndex
CREATE INDEX "ArtistCampaign_artistId_idx" ON "ArtistCampaign"("artistId");
