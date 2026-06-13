-- Generic cross-module record links
CREATE TABLE "CreatorOpsLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceType" TEXT NOT NULL DEFAULT '',
    "sourceId" TEXT NOT NULL DEFAULT '',
    "targetType" TEXT NOT NULL DEFAULT '',
    "targetId" TEXT NOT NULL DEFAULT '',
    "relationshipType" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "CreatorOpsLink_sourceType_sourceId_targetType_targetId_relationshipType_key" ON "CreatorOpsLink"("sourceType", "sourceId", "targetType", "targetId", "relationshipType");
CREATE INDEX "CreatorOpsLink_sourceType_sourceId_idx" ON "CreatorOpsLink"("sourceType", "sourceId");
CREATE INDEX "CreatorOpsLink_targetType_targetId_idx" ON "CreatorOpsLink"("targetType", "targetId");
CREATE INDEX "CreatorOpsLink_updatedAt_idx" ON "CreatorOpsLink"("updatedAt");
