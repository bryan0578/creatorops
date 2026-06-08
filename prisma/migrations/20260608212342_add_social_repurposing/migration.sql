-- CreateTable
CREATE TABLE "SocialRepurposing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignName" TEXT NOT NULL DEFAULT '',
    "sourceContent" TEXT NOT NULL DEFAULT '',
    "businessArea" TEXT NOT NULL DEFAULT '',
    "goal" TEXT NOT NULL DEFAULT '',
    "audience" TEXT NOT NULL DEFAULT '',
    "tone" TEXT NOT NULL DEFAULT '',
    "platforms" TEXT NOT NULL DEFAULT '',
    "callToAction" TEXT NOT NULL DEFAULT '',
    "productOrReleaseLink" TEXT NOT NULL DEFAULT '',
    "contentType" TEXT NOT NULL DEFAULT '',
    "completedPrompt" TEXT NOT NULL DEFAULT '',
    "aiResponse" TEXT NOT NULL DEFAULT '',
    "finalCoreMessage" TEXT NOT NULL DEFAULT '',
    "finalTikTokCaption" TEXT NOT NULL DEFAULT '',
    "finalInstagramCaption" TEXT NOT NULL DEFAULT '',
    "finalXPost" TEXT NOT NULL DEFAULT '',
    "finalYouTubeShortsIdea" TEXT NOT NULL DEFAULT '',
    "finalYouTubeCommunityPost" TEXT NOT NULL DEFAULT '',
    "finalEmailSnippet" TEXT NOT NULL DEFAULT '',
    "finalHashtags" TEXT NOT NULL DEFAULT '',
    "finalCTA" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SocialRepurposing_campaignName_idx" ON "SocialRepurposing"("campaignName");

-- CreateIndex
CREATE INDEX "SocialRepurposing_contentType_idx" ON "SocialRepurposing"("contentType");

-- CreateIndex
CREATE INDEX "SocialRepurposing_businessArea_idx" ON "SocialRepurposing"("businessArea");

-- CreateIndex
CREATE INDEX "SocialRepurposing_goal_idx" ON "SocialRepurposing"("goal");

-- CreateIndex
CREATE INDEX "SocialRepurposing_platforms_idx" ON "SocialRepurposing"("platforms");

-- CreateIndex
CREATE INDEX "SocialRepurposing_finalCoreMessage_idx" ON "SocialRepurposing"("finalCoreMessage");

-- CreateIndex
CREATE INDEX "SocialRepurposing_updatedAt_idx" ON "SocialRepurposing"("updatedAt");
