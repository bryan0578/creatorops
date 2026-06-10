-- AlterTable
ALTER TABLE "PromptRun" ADD COLUMN "campaignId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PromptRun" ADD COLUMN "campaignName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PromptRun" ADD COLUMN "moduleType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PromptRun" ADD COLUMN "outputRecordId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PromptRun" ADD COLUMN "outputRecordType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PromptRun" ADD COLUMN "experimentId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PromptRun" ADD COLUMN "sourcePromptId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PromptRun" ADD COLUMN "sourcePromptName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PromptRun" ADD COLUMN "runType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PromptRun" ADD COLUMN "tags" TEXT NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE INDEX "PromptRun_campaignId_idx" ON "PromptRun"("campaignId");
CREATE INDEX "PromptRun_moduleType_idx" ON "PromptRun"("moduleType");
CREATE INDEX "PromptRun_outputRecordId_idx" ON "PromptRun"("outputRecordId");
CREATE INDEX "PromptRun_experimentId_idx" ON "PromptRun"("experimentId");
