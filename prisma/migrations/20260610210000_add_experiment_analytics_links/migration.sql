-- AlterTable
ALTER TABLE "Experiment" ADD COLUMN "analyticsRecordId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Experiment" ADD COLUMN "analyticsRecordName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Experiment" ADD COLUMN "confidenceNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Experiment" ADD COLUMN "learningSummary" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "AnalyticsRecord" ADD COLUMN "experimentId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AnalyticsRecord" ADD COLUMN "experimentName" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "Experiment_analyticsRecordId_idx" ON "Experiment"("analyticsRecordId");

-- CreateIndex
CREATE INDEX "AnalyticsRecord_experimentId_idx" ON "AnalyticsRecord"("experimentId");
