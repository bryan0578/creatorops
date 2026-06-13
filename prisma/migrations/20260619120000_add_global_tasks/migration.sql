-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'To Do',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "dueDate" TEXT NOT NULL DEFAULT '',
    "module" TEXT NOT NULL DEFAULT '',
    "taskType" TEXT NOT NULL DEFAULT 'Global',
    "artistName" TEXT NOT NULL DEFAULT '',
    "campaignId" TEXT NOT NULL DEFAULT '',
    "campaignName" TEXT NOT NULL DEFAULT '',
    "songConceptId" TEXT NOT NULL DEFAULT '',
    "songTitle" TEXT NOT NULL DEFAULT '',
    "productId" TEXT NOT NULL DEFAULT '',
    "assetId" TEXT NOT NULL DEFAULT '',
    "integrationType" TEXT NOT NULL DEFAULT '',
    "sourceRecordType" TEXT NOT NULL DEFAULT '',
    "sourceRecordId" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");
CREATE INDEX "Task_priority_idx" ON "Task"("priority");
CREATE INDEX "Task_taskType_idx" ON "Task"("taskType");
CREATE INDEX "Task_module_idx" ON "Task"("module");
CREATE INDEX "Task_artistName_idx" ON "Task"("artistName");
CREATE INDEX "Task_campaignId_idx" ON "Task"("campaignId");
CREATE INDEX "Task_songConceptId_idx" ON "Task"("songConceptId");
CREATE INDEX "Task_assetId_idx" ON "Task"("assetId");
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");
CREATE INDEX "Task_updatedAt_idx" ON "Task"("updatedAt");
