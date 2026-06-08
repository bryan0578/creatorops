-- CreateTable
CREATE TABLE "PromptRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promptId" TEXT NOT NULL,
    "promptName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "inputValues" TEXT NOT NULL DEFAULT '{}',
    "completedPrompt" TEXT NOT NULL DEFAULT '',
    "aiResponse" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "PromptRun_promptId_idx" ON "PromptRun"("promptId");

-- CreateIndex
CREATE INDEX "PromptRun_updatedAt_idx" ON "PromptRun"("updatedAt");
