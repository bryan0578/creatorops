-- CreateTable
CREATE TABLE "Playbook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "playbookType" TEXT NOT NULL DEFAULT 'Other',
    "category" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "targetCampaignType" TEXT NOT NULL DEFAULT '',
    "recommendedPresetId" TEXT NOT NULL DEFAULT '',
    "recommendedPresetName" TEXT NOT NULL DEFAULT '',
    "recommendedWorkflowId" TEXT NOT NULL DEFAULT '',
    "recommendedWorkflowName" TEXT NOT NULL DEFAULT '',
    "defaultCampaignFields" TEXT NOT NULL DEFAULT '{}',
    "taskTemplate" TEXT NOT NULL DEFAULT '[]',
    "publishingChecklistTemplate" TEXT NOT NULL DEFAULT '{}',
    "assetChecklist" TEXT NOT NULL DEFAULT '[]',
    "promptChecklist" TEXT NOT NULL DEFAULT '[]',
    "experimentTemplate" TEXT NOT NULL DEFAULT '[]',
    "automationNotes" TEXT NOT NULL DEFAULT '',
    "exportPackTemplate" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "Playbook_name_idx" ON "Playbook"("name");
CREATE INDEX "Playbook_playbookType_idx" ON "Playbook"("playbookType");
CREATE INDEX "Playbook_category_idx" ON "Playbook"("category");
CREATE INDEX "Playbook_status_idx" ON "Playbook"("status");
CREATE INDEX "Playbook_updatedAt_idx" ON "Playbook"("updatedAt");
