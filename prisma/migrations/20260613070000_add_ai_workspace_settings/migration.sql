-- AI provider preferences (non-secret) on workspace settings singleton
ALTER TABLE "WorkspaceSettings" ADD COLUMN "aiGenerationEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkspaceSettings" ADD COLUMN "aiDefaultProvider" TEXT NOT NULL DEFAULT 'openai';
ALTER TABLE "WorkspaceSettings" ADD COLUMN "aiDefaultModel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WorkspaceSettings" ADD COLUMN "aiTemperature" REAL NOT NULL DEFAULT 0.7;
ALTER TABLE "WorkspaceSettings" ADD COLUMN "aiMaxOutputTokens" INTEGER NOT NULL DEFAULT 2048;
ALTER TABLE "WorkspaceSettings" ADD COLUMN "aiSystemStylePreference" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WorkspaceSettings" ADD COLUMN "aiSaveGenerationsAsPromptRuns" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "WorkspaceSettings" ADD COLUMN "aiIncludeCampaignContextByDefault" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "WorkspaceSettings" ADD COLUMN "aiIncludeLearningsByDefault" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "WorkspaceSettings" ADD COLUMN "aiIncludeQualityNotesByDefault" BOOLEAN NOT NULL DEFAULT true;
