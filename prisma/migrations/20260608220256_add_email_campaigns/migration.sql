-- CreateTable
CREATE TABLE "EmailCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignName" TEXT NOT NULL DEFAULT '',
    "campaignType" TEXT NOT NULL DEFAULT '',
    "businessArea" TEXT NOT NULL DEFAULT '',
    "audience" TEXT NOT NULL DEFAULT '',
    "offerOrAnnouncement" TEXT NOT NULL DEFAULT '',
    "productOrReleaseName" TEXT NOT NULL DEFAULT '',
    "keyBenefits" TEXT NOT NULL DEFAULT '',
    "tone" TEXT NOT NULL DEFAULT '',
    "callToAction" TEXT NOT NULL DEFAULT '',
    "link" TEXT NOT NULL DEFAULT '',
    "urgency" TEXT NOT NULL DEFAULT '',
    "senderName" TEXT NOT NULL DEFAULT '',
    "completedPrompt" TEXT NOT NULL DEFAULT '',
    "aiResponse" TEXT NOT NULL DEFAULT '',
    "finalSubjectLine" TEXT NOT NULL DEFAULT '',
    "finalPreviewText" TEXT NOT NULL DEFAULT '',
    "finalEmailBody" TEXT NOT NULL DEFAULT '',
    "finalCTA" TEXT NOT NULL DEFAULT '',
    "finalFollowUpEmail" TEXT NOT NULL DEFAULT '',
    "finalResendSubject" TEXT NOT NULL DEFAULT '',
    "finalResendBody" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "EmailCampaign_campaignName_idx" ON "EmailCampaign"("campaignName");

-- CreateIndex
CREATE INDEX "EmailCampaign_campaignType_idx" ON "EmailCampaign"("campaignType");

-- CreateIndex
CREATE INDEX "EmailCampaign_businessArea_idx" ON "EmailCampaign"("businessArea");

-- CreateIndex
CREATE INDEX "EmailCampaign_productOrReleaseName_idx" ON "EmailCampaign"("productOrReleaseName");

-- CreateIndex
CREATE INDEX "EmailCampaign_finalSubjectLine_idx" ON "EmailCampaign"("finalSubjectLine");

-- CreateIndex
CREATE INDEX "EmailCampaign_senderName_idx" ON "EmailCampaign"("senderName");

-- CreateIndex
CREATE INDEX "EmailCampaign_updatedAt_idx" ON "EmailCampaign"("updatedAt");
