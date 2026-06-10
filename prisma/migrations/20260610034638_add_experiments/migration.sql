-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL DEFAULT '',
    "campaignName" TEXT NOT NULL DEFAULT '',
    "experimentName" TEXT NOT NULL DEFAULT '',
    "experimentType" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Idea',
    "platform" TEXT NOT NULL DEFAULT '',
    "hypothesis" TEXT NOT NULL DEFAULT '',
    "variantA" TEXT NOT NULL DEFAULT '',
    "variantB" TEXT NOT NULL DEFAULT '',
    "variantC" TEXT NOT NULL DEFAULT '',
    "winner" TEXT NOT NULL DEFAULT '',
    "resultSummary" TEXT NOT NULL DEFAULT '',
    "metricFocus" TEXT NOT NULL DEFAULT '',
    "startDate" TEXT NOT NULL DEFAULT '',
    "endDate" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "whatWorked" TEXT NOT NULL DEFAULT '',
    "whatDidNotWork" TEXT NOT NULL DEFAULT '',
    "nextTestIdea" TEXT NOT NULL DEFAULT '',
    "relatedAnalyticsNotes" TEXT NOT NULL DEFAULT '',
    "variantAMetric" TEXT NOT NULL DEFAULT '',
    "variantBMetric" TEXT NOT NULL DEFAULT '',
    "variantCMetric" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Experiment_experimentName_idx" ON "Experiment"("experimentName");

-- CreateIndex
CREATE INDEX "Experiment_experimentType_idx" ON "Experiment"("experimentType");

-- CreateIndex
CREATE INDEX "Experiment_status_idx" ON "Experiment"("status");

-- CreateIndex
CREATE INDEX "Experiment_campaignId_idx" ON "Experiment"("campaignId");

-- CreateIndex
CREATE INDEX "Experiment_campaignName_idx" ON "Experiment"("campaignName");

-- CreateIndex
CREATE INDEX "Experiment_platform_idx" ON "Experiment"("platform");

-- CreateIndex
CREATE INDEX "Experiment_metricFocus_idx" ON "Experiment"("metricFocus");

-- CreateIndex
CREATE INDEX "Experiment_winner_idx" ON "Experiment"("winner");

-- CreateIndex
CREATE INDEX "Experiment_updatedAt_idx" ON "Experiment"("updatedAt");
