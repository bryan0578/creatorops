-- Published Song Archive fields on SongConcept
ALTER TABLE "SongConcept" ADD COLUMN "publishedUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SongConcept" ADD COLUMN "publishedPlatform" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SongConcept" ADD COLUMN "publishedDate" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SongConcept" ADD COLUMN "releaseStatus" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SongConcept" ADD COLUMN "performanceNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SongConcept" ADD COLUMN "futureMerchIdeas" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SongConcept" ADD COLUMN "futureCampaignIdeas" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SongConcept" ADD COLUMN "relatedYouTubeVideoId" TEXT NOT NULL DEFAULT '';
