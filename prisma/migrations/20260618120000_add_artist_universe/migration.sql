-- CreateTable
CREATE TABLE "ArtistBible" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artistName" TEXT NOT NULL,
    "projectName" TEXT NOT NULL DEFAULT '',
    "labelName" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "genre" TEXT NOT NULL DEFAULT '',
    "subgenre" TEXT NOT NULL DEFAULT '',
    "mood" TEXT NOT NULL DEFAULT '',
    "aesthetic" TEXT NOT NULL DEFAULT '',
    "targetAudience" TEXT NOT NULL DEFAULT '',
    "brandPromise" TEXT NOT NULL DEFAULT '',
    "shortBio" TEXT NOT NULL DEFAULT '',
    "longBio" TEXT NOT NULL DEFAULT '',
    "voiceRules" TEXT NOT NULL DEFAULT '',
    "lyricalThemes" TEXT NOT NULL DEFAULT '',
    "visualRules" TEXT NOT NULL DEFAULT '',
    "sonicRules" TEXT NOT NULL DEFAULT '',
    "doList" TEXT NOT NULL DEFAULT '[]',
    "dontList" TEXT NOT NULL DEFAULT '[]',
    "referenceArtists" TEXT NOT NULL DEFAULT '[]',
    "referenceMedia" TEXT NOT NULL DEFAULT '[]',
    "colorPalette" TEXT NOT NULL DEFAULT '[]',
    "keywords" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "sourceArtistId" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LoreEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "loreType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "canonStatus" TEXT NOT NULL DEFAULT 'Flexible',
    "summary" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "characters" TEXT NOT NULL DEFAULT '[]',
    "locations" TEXT NOT NULL DEFAULT '[]',
    "symbols" TEXT NOT NULL DEFAULT '[]',
    "themes" TEXT NOT NULL DEFAULT '[]',
    "relatedSongs" TEXT NOT NULL DEFAULT '[]',
    "relatedCampaignIds" TEXT NOT NULL DEFAULT '[]',
    "relatedAssetIds" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SongConcept" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Idea',
    "songTitle" TEXT NOT NULL DEFAULT '',
    "conceptSummary" TEXT NOT NULL,
    "genre" TEXT NOT NULL DEFAULT '',
    "mood" TEXT NOT NULL DEFAULT '',
    "lyricalTheme" TEXT NOT NULL DEFAULT '',
    "storyRole" TEXT NOT NULL DEFAULT '',
    "hookIdea" TEXT NOT NULL DEFAULT '',
    "chorusIdea" TEXT NOT NULL DEFAULT '',
    "sunoPrompt" TEXT NOT NULL DEFAULT '',
    "lyricDraft" TEXT NOT NULL DEFAULT '',
    "visualConcept" TEXT NOT NULL DEFAULT '',
    "youtubeAngle" TEXT NOT NULL DEFAULT '',
    "productTieIn" TEXT NOT NULL DEFAULT '',
    "campaignId" TEXT NOT NULL DEFAULT '',
    "campaignName" TEXT NOT NULL DEFAULT '',
    "releasePlanId" TEXT NOT NULL DEFAULT '',
    "relatedLoreIds" TEXT NOT NULL DEFAULT '[]',
    "relatedAssetIds" TEXT NOT NULL DEFAULT '[]',
    "relatedPromptRunIds" TEXT NOT NULL DEFAULT '[]',
    "qualityReviewId" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReleaseStoryArc" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "arcType" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Planning',
    "summary" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT '',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "campaignIds" TEXT NOT NULL DEFAULT '[]',
    "releasePlanIds" TEXT NOT NULL DEFAULT '[]',
    "songConceptIds" TEXT NOT NULL DEFAULT '[]',
    "loreEntryIds" TEXT NOT NULL DEFAULT '[]',
    "productCollectionIds" TEXT NOT NULL DEFAULT '[]',
    "visualDirection" TEXT NOT NULL DEFAULT '',
    "narrativeBeats" TEXT NOT NULL DEFAULT '[]',
    "launchNotes" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VisualIdentityProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artistName" TEXT NOT NULL,
    "profileName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "visualStyle" TEXT NOT NULL DEFAULT '',
    "colorPalette" TEXT NOT NULL DEFAULT '[]',
    "typographyRules" TEXT NOT NULL DEFAULT '',
    "characterRules" TEXT NOT NULL DEFAULT '',
    "environmentRules" TEXT NOT NULL DEFAULT '',
    "imagePromptRules" TEXT NOT NULL DEFAULT '',
    "thumbnailRules" TEXT NOT NULL DEFAULT '',
    "merchDesignRules" TEXT NOT NULL DEFAULT '',
    "forbiddenElements" TEXT NOT NULL DEFAULT '[]',
    "referenceAssetIds" TEXT NOT NULL DEFAULT '[]',
    "referenceDriveFileIds" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ArtistBible_artistName_idx" ON "ArtistBible"("artistName");
CREATE INDEX "ArtistBible_projectName_idx" ON "ArtistBible"("projectName");
CREATE INDEX "ArtistBible_status_idx" ON "ArtistBible"("status");
CREATE INDEX "ArtistBible_updatedAt_idx" ON "ArtistBible"("updatedAt");

CREATE INDEX "LoreEntry_artistName_idx" ON "LoreEntry"("artistName");
CREATE INDEX "LoreEntry_loreType_idx" ON "LoreEntry"("loreType");
CREATE INDEX "LoreEntry_status_idx" ON "LoreEntry"("status");
CREATE INDEX "LoreEntry_canonStatus_idx" ON "LoreEntry"("canonStatus");
CREATE INDEX "LoreEntry_updatedAt_idx" ON "LoreEntry"("updatedAt");

CREATE INDEX "SongConcept_artistName_idx" ON "SongConcept"("artistName");
CREATE INDEX "SongConcept_status_idx" ON "SongConcept"("status");
CREATE INDEX "SongConcept_songTitle_idx" ON "SongConcept"("songTitle");
CREATE INDEX "SongConcept_campaignId_idx" ON "SongConcept"("campaignId");
CREATE INDEX "SongConcept_updatedAt_idx" ON "SongConcept"("updatedAt");

CREATE INDEX "ReleaseStoryArc_artistName_idx" ON "ReleaseStoryArc"("artistName");
CREATE INDEX "ReleaseStoryArc_status_idx" ON "ReleaseStoryArc"("status");
CREATE INDEX "ReleaseStoryArc_arcType_idx" ON "ReleaseStoryArc"("arcType");
CREATE INDEX "ReleaseStoryArc_updatedAt_idx" ON "ReleaseStoryArc"("updatedAt");

CREATE INDEX "VisualIdentityProfile_artistName_idx" ON "VisualIdentityProfile"("artistName");
CREATE INDEX "VisualIdentityProfile_profileName_idx" ON "VisualIdentityProfile"("profileName");
CREATE INDEX "VisualIdentityProfile_status_idx" ON "VisualIdentityProfile"("status");
CREATE INDEX "VisualIdentityProfile_updatedAt_idx" ON "VisualIdentityProfile"("updatedAt");
