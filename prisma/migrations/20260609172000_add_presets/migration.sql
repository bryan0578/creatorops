-- CreateTable
CREATE TABLE "Preset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "presetType" TEXT NOT NULL DEFAULT 'Campaign',
    "category" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "values" TEXT NOT NULL DEFAULT '{}',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Preset_name_idx" ON "Preset"("name");

-- CreateIndex
CREATE INDEX "Preset_presetType_idx" ON "Preset"("presetType");

-- CreateIndex
CREATE INDEX "Preset_category_idx" ON "Preset"("category");

-- CreateIndex
CREATE INDEX "Preset_updatedAt_idx" ON "Preset"("updatedAt");
