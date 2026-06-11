import {
  buildPatternId,
  confidenceFromEvidence,
  isEarlySignal,
  normalizePatternText,
  scoreFromEvidence,
} from "@/lib/patterns/scoring"
import { evidenceItem, relatedRecord } from "@/lib/patterns/evidence"
import type {
  DetectedPattern,
  PatternAction,
  PatternDetectInput,
  PatternDetectSummary,
  PatternType,
} from "@/lib/patterns/types"
import type {
  AnalyticsRecord,
  AssetRecord,
  CampaignRecord,
  DriveFileRecord,
  ExperimentRecord,
  LearningRecord,
  MerchIdea,
  MockupPromptRecord,
  ProductListing,
  QualityReviewRecord,
  ReleasePlan,
  YouTubePackage,
  YouTubeThumbnailRecord,
  YouTubeVideoRecord,
} from "@/lib/types"

export interface PatternDetectionDataset {
  campaigns: CampaignRecord[]
  analyticsRecords: AnalyticsRecord[]
  youtubeVideos: YouTubeVideoRecord[]
  youtubePackages: YouTubePackage[]
  youtubeThumbnails: YouTubeThumbnailRecord[]
  qualityReviews: QualityReviewRecord[]
  learnings: LearningRecord[]
  experiments: ExperimentRecord[]
  assets: AssetRecord[]
  productListings: ProductListing[]
  merchIdeas: MerchIdea[]
  mockupPrompts: MockupPromptRecord[]
  releasePlans: ReleasePlan[]
  driveFiles: DriveFileRecord[]
}

const TITLE_MARKERS = [
  "official",
  "lyric video",
  "ai music",
  "music video",
  "visualizer",
  "official audio",
]

const EMOTIONAL_WORDS = [
  "dark",
  "horror",
  "creepy",
  "sweet",
  "mystery",
  "villain",
  "dream",
  "night",
  "love",
  "pain",
]

const THUMBNAIL_STYLE_TERMS = [
  "cyberpunk",
  "anime",
  "k-pop",
  "kpop",
  "horror",
  "creepy",
  "cute",
  "contrast",
  "red",
  "black",
  "pink",
  "glitch",
  "cinematic",
  "typography",
  "overlay",
]

function defaultActions(pattern: Pick<DetectedPattern, "patternType" | "id">): PatternAction[] {
  return [
    {
      id: `${pattern.id}:learning`,
      label: "Create Learning",
      actionType: "create-learning",
    },
    {
      id: `${pattern.id}:experiment`,
      label: "Create Experiment",
      actionType: "create-experiment",
    },
    {
      id: `${pattern.id}:playbook`,
      label: "Suggest Playbook Update",
      actionType: "playbook",
      href: "/playbooks",
    },
  ]
}

function pushPattern(bucket: DetectedPattern[], seen: Set<string>, pattern: DetectedPattern) {
  if (seen.has(pattern.id)) return
  seen.add(pattern.id)
  bucket.push(pattern)
}

function scopedCampaigns(dataset: PatternDetectionDataset, input: PatternDetectInput) {
  if (!input.campaignId) return dataset.campaigns
  return dataset.campaigns.filter((c) => c.id === input.campaignId)
}

function titleFeatures(title: string) {
  const normalized = title.trim()
  const lower = normalized.toLowerCase()
  return {
    length: normalized.length,
    hasArtistDash: normalized.includes(" - ") || normalized.includes(" | "),
    hasParens: /[([{]/.test(normalized),
    markers: TITLE_MARKERS.filter((marker) => lower.includes(marker)),
    emotional: EMOTIONAL_WORDS.filter((word) => lower.includes(word)),
    wordCount: normalizePatternText(normalized).split(" ").filter(Boolean).length,
  }
}

function detectYouTubeTitlePatterns(
  dataset: PatternDetectionDataset,
  bucket: DetectedPattern[],
  seen: Set<string>,
  input: PatternDetectInput,
) {
  type TitleRow = { title: string; views: number; id: string; type: string; campaignName?: string }
  const rows: TitleRow[] = []

  for (const video of dataset.youtubeVideos) {
    rows.push({
      title: video.title,
      views: video.viewCount ?? 0,
      id: video.id,
      type: "youtube-video",
      campaignName: video.campaignName,
    })
  }
  for (const record of dataset.analyticsRecords) {
    if (record.titleUsed?.trim()) {
      rows.push({
        title: record.titleUsed,
        views: record.views ?? 0,
        id: record.id,
        type: "analytics",
        campaignName: record.relatedCampaign,
      })
    }
  }

  if (rows.length === 0) return

  const short = rows.filter((row) => titleFeatures(row.title).wordCount <= 6)
  const long = rows.filter((row) => titleFeatures(row.title).wordCount >= 10)
  const withEmotion = rows.filter((row) => titleFeatures(row.title).emotional.length > 0)
  const withMarkers = rows.filter((row) => titleFeatures(row.title).markers.length > 0)

  const compareGroups = (
    label: string,
    groupA: TitleRow[],
    groupB: TitleRow[],
    featureLabel: string,
  ) => {
    if (groupA.length === 0 || groupB.length === 0) return
    const avgA = groupA.reduce((s, r) => s + r.views, 0) / groupA.length
    const avgB = groupB.reduce((s, r) => s + r.views, 0) / groupB.length
    const hasMetrics = groupA.some((r) => r.views > 0) || groupB.some((r) => r.views > 0)
    const gap = hasMetrics && avgB > 0 ? ((avgA - avgB) / avgB) * 100 : 0
    const winner = avgA >= avgB ? groupA : groupB
    const winnerLabel = avgA >= avgB ? featureLabel : `non-${featureLabel}`
    const count = winner.length
    const confidence = confidenceFromEvidence({
      recordCount: count,
      metricGap: Math.abs(gap),
      strongSignal: count >= 2 && hasMetrics,
    })
    const early = isEarlySignal(count, confidence)

    pushPattern(bucket, seen, {
      id: buildPatternId(["youtube-title", label]),
      title: `${featureLabel} titles appear in stronger records`,
      patternType: "youtube-title",
      category: "YouTube",
      confidence,
      score: scoreFromEvidence({ recordCount: count, metricGap: Math.abs(gap), base: 35 }),
      summary: early
        ? `Early signal: ${count} record(s) use ${winnerLabel}. ${hasMetrics ? `Average views difference ~${Math.round(Math.abs(gap))}%.` : "Add analytics to validate performance."}`
        : `${winnerLabel} titles show up in ${count} record(s)${hasMetrics ? ` with ~${Math.round(Math.abs(gap))}% average view difference` : ""}.`,
      evidence: winner.slice(0, 4).map((row) =>
        evidenceItem("Title", row.title, row.type, row.id),
      ),
      recommendation: hasMetrics
        ? `Test more ${winnerLabel} title formats on upcoming releases.`
        : `Track views for ${winnerLabel} titles after publishing.`,
      actions: defaultActions({ patternType: "youtube-title", id: label }),
      relatedRecords: winner.slice(0, 3).map((row) =>
        relatedRecord(row.type, row.id, row.title),
      ),
      platform: "YouTube",
      metricName: hasMetrics ? "avgViews" : undefined,
      metricValue: hasMetrics ? Math.max(avgA, avgB) : undefined,
      earlySignal: early,
    })
  }

  if (withEmotion.length >= 1) {
    compareGroups("emotional", withEmotion, rows.filter((r) => titleFeatures(r.title).emotional.length === 0), "emotional-word")
  }
  if (short.length >= 1 && long.length >= 1) {
    compareGroups("short-vs-long", short, long, "short")
  }
  if (withMarkers.length >= 1) {
    compareGroups("format-marker", withMarkers, rows.filter((r) => titleFeatures(r.title).markers.length === 0), "format-marker")
  }
}

function detectThumbnailPatterns(
  dataset: PatternDetectionDataset,
  bucket: DetectedPattern[],
  seen: Set<string>,
) {
  const styleHits = new Map<string, { count: number; scores: number[]; records: string[] }>()

  for (const thumb of dataset.youtubeThumbnails) {
    const text = [
      thumb.visualTheme,
      thumb.colorDirection,
      thumb.referenceStyle,
      thumb.finalConcept,
      thumb.genre,
      thumb.mood,
    ].join(" ")
    for (const term of THUMBNAIL_STYLE_TERMS) {
      if (!normalizePatternText(text).includes(term)) continue
      const entry = styleHits.get(term) ?? { count: 0, scores: [], records: [] }
      entry.count += 1
      entry.records.push(thumb.id)
      styleHits.set(term, entry)
    }
  }

  for (const review of dataset.qualityReviews) {
    if (review.reviewType !== "Thumbnail" && !review.reviewName.toLowerCase().includes("thumbnail")) {
      continue
    }
    const text = [review.strengths, review.improvementIdeas, review.weaknesses].join(" ")
    for (const term of THUMBNAIL_STYLE_TERMS) {
      if (!normalizePatternText(text).includes(term)) continue
      const entry = styleHits.get(term) ?? { count: 0, scores: [], records: [] }
      entry.count += 1
      entry.scores.push(review.overallScore)
      entry.records.push(review.id)
      styleHits.set(term, entry)
    }
  }

  for (const file of dataset.driveFiles) {
    if (!(file.detectedAssetType ?? "").toLowerCase().includes("thumbnail")) continue
    const text = file.name
    for (const term of THUMBNAIL_STYLE_TERMS) {
      if (!normalizePatternText(text).includes(term)) continue
      const entry = styleHits.get(term) ?? { count: 0, scores: [], records: [] }
      entry.count += 1
      entry.records.push(file.id)
      styleHits.set(term, entry)
    }
  }

  for (const [term, data] of styleHits.entries()) {
    if (data.count < 1) continue
    const avgScore =
      data.scores.length > 0
        ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
        : 0
    const confidence = confidenceFromEvidence({
      recordCount: data.count,
      strongSignal: avgScore >= 80,
    })
    pushPattern(bucket, seen, {
      id: buildPatternId(["thumbnail-style", term]),
      title: `"${term}" appears in thumbnail/visual records`,
      patternType: "thumbnail",
      category: "Thumbnail",
      confidence,
      score: scoreFromEvidence({ recordCount: data.count, base: 40 }),
      summary: isEarlySignal(data.count, confidence)
        ? `Early signal: "${term}" shows up in ${data.count} thumbnail-related record(s).`
        : `"${term}" is repeated across ${data.count} thumbnail, review, or Drive file record(s)${avgScore ? ` with avg quality score ${Math.round(avgScore)}` : ""}.`,
      evidence: [
        evidenceItem("Style term", term),
        evidenceItem("Occurrences", String(data.count)),
        ...(avgScore ? [evidenceItem("Avg quality score", String(Math.round(avgScore)))] : []),
      ],
      recommendation: `Reuse "${term}" visual language when packaging similar releases.`,
      actions: defaultActions({ patternType: "thumbnail", id: term }),
      relatedRecords: data.records.slice(0, 3).map((id, index) =>
        relatedRecord("youtube-thumbnail", id, `Thumbnail record ${index + 1}`),
      ),
      platform: "YouTube",
      earlySignal: isEarlySignal(data.count, confidence),
    })
  }

  const highThumbReviews = dataset.qualityReviews.filter(
    (review) =>
      (review.reviewType === "Thumbnail" || review.reviewName.toLowerCase().includes("thumbnail")) &&
      review.overallScore >= 80,
  )
  if (highThumbReviews.length >= 1) {
    const confidence = confidenceFromEvidence({ recordCount: highThumbReviews.length, strongSignal: true })
    pushPattern(bucket, seen, {
      id: buildPatternId(["thumbnail-high-quality"]),
      title: "High-scoring thumbnail reviews cluster",
      patternType: "thumbnail",
      category: "Thumbnail",
      confidence,
      score: scoreFromEvidence({ recordCount: highThumbReviews.length, base: 45 }),
      summary: `${highThumbReviews.length} thumbnail review(s) scored 80+ — strong visual packaging patterns may be repeatable.`,
      evidence: highThumbReviews.slice(0, 4).map((review) =>
        evidenceItem(review.reviewName, `Score ${review.overallScore}`, "quality-review", review.id),
      ),
      recommendation: "Capture the shared visual choices from these reviews as a Pattern learning.",
      actions: defaultActions({ patternType: "thumbnail", id: "high-quality" }),
      relatedRecords: highThumbReviews.slice(0, 3).map((review) =>
        relatedRecord("quality-review", review.id, review.reviewName),
      ),
      earlySignal: isEarlySignal(highThumbReviews.length, confidence),
    })
  }
}

function detectCampaignReadinessPatterns(
  dataset: PatternDetectionDataset,
  bucket: DetectedPattern[],
  seen: Set<string>,
  input: PatternDetectInput,
) {
  for (const campaign of scopedCampaigns(dataset, input)) {
    const reviews = dataset.qualityReviews.filter(
      (review) =>
        review.campaignId === campaign.id ||
        review.campaignName.trim().toLowerCase() === campaign.campaignName.trim().toLowerCase(),
    )
    const linkedCount = campaign.linkedRecords.length
    const taskDone = campaign.tasks.filter((task) => task.status === "Done").length
    const checklistDone =
      campaign.publishingChecklist?.items?.filter(
        (item) => item.status === "done" || item.status === "complete",
      ).length ?? 0

    if (reviews.length >= 1 && linkedCount >= 3) {
      const avgScore = reviews.reduce((s, r) => s + r.overallScore, 0) / reviews.length
      const confidence = confidenceFromEvidence({
        recordCount: reviews.length,
        strongSignal: avgScore >= 75 && linkedCount >= 5,
      })
      pushPattern(bucket, seen, {
        id: buildPatternId(["campaign-readiness", campaign.id]),
        title: `"${campaign.campaignName}" has strong readiness signals`,
        patternType: "campaign-readiness",
        category: "Campaign",
        confidence,
        score: scoreFromEvidence({ recordCount: linkedCount, base: 35 }),
        summary: `${linkedCount} linked records, ${reviews.length} quality review(s), avg score ${Math.round(avgScore)}, ${taskDone} completed tasks, ${checklistDone} checklist items done.`,
        evidence: [
          evidenceItem("Linked records", String(linkedCount)),
          evidenceItem("Quality reviews", String(reviews.length)),
          evidenceItem("Avg quality score", String(Math.round(avgScore))),
        ],
        recommendation: "Use this campaign as a launch template for similar releases.",
        actions: defaultActions({ patternType: "campaign-readiness", id: campaign.id }),
        relatedRecords: [relatedRecord("campaign", campaign.id, campaign.campaignName)],
        campaignId: campaign.id,
        campaignName: campaign.campaignName,
        earlySignal: isEarlySignal(reviews.length, confidence),
      })
    }

    if (linkedCount >= 2 && reviews.length === 0) {
      pushPattern(bucket, seen, {
        id: buildPatternId(["campaign-missing-quality", campaign.id]),
        title: `"${campaign.campaignName}" has assets but no quality review`,
        patternType: "repeated-issue",
        category: "Quality",
        confidence: "medium",
        score: 48,
        summary: "Campaign readiness is harder to compare without a quality review score.",
        evidence: [evidenceItem("Linked records", String(linkedCount))],
        recommendation: "Run a quality review before publishing.",
        actions: defaultActions({ patternType: "repeated-issue", id: campaign.id }),
        relatedRecords: [relatedRecord("campaign", campaign.id, campaign.campaignName)],
        campaignId: campaign.id,
        campaignName: campaign.campaignName,
      })
    }
  }
}

function detectArtistProjectPatterns(
  dataset: PatternDetectionDataset,
  bucket: DetectedPattern[],
  seen: Set<string>,
  input: PatternDetectInput,
) {
  const byArtist = new Map<string, { campaigns: number; learnings: number; videos: number; analytics: number }>()

  for (const campaign of dataset.campaigns) {
    const artist = campaign.artistName?.trim()
    if (!artist) continue
    const entry = byArtist.get(artist) ?? { campaigns: 0, learnings: 0, videos: 0, analytics: 0 }
    entry.campaigns += 1
    byArtist.set(artist, entry)
  }
  for (const learning of dataset.learnings) {
    const artist = learning.artistName?.trim()
    if (!artist) continue
    const entry = byArtist.get(artist) ?? { campaigns: 0, learnings: 0, videos: 0, analytics: 0 }
    entry.learnings += 1
    byArtist.set(artist, entry)
  }
  for (const video of dataset.youtubeVideos) {
    const artist = video.artistName?.trim()
    if (!artist) continue
    const entry = byArtist.get(artist) ?? { campaigns: 0, learnings: 0, videos: 0, analytics: 0 }
    entry.videos += 1
    byArtist.set(artist, entry)
  }

  for (const [artist, stats] of byArtist.entries()) {
    if (input.artistName && artist.toLowerCase() !== input.artistName.toLowerCase()) continue
    if (stats.campaigns < 1) continue
    const confidence = confidenceFromEvidence({
      recordCount: stats.campaigns + stats.learnings + stats.videos,
    })
    pushPattern(bucket, seen, {
      id: buildPatternId(["artist-project", normalizePatternText(artist)]),
      title: `${artist} project footprint`,
      patternType: "artist-project",
      category: "Artist",
      confidence,
      score: scoreFromEvidence({
        recordCount: stats.campaigns + stats.learnings,
        base: 30,
      }),
      summary: `${artist}: ${stats.campaigns} campaign(s), ${stats.videos} video(s), ${stats.learnings} learning(s).`,
      evidence: [
        evidenceItem("Campaigns", String(stats.campaigns)),
        evidenceItem("Videos", String(stats.videos)),
        evidenceItem("Learnings", String(stats.learnings)),
      ],
      recommendation: "Compare genre/mood tags and packaging choices across this artist's campaigns.",
      actions: defaultActions({ patternType: "artist-project", id: artist }),
      relatedRecords: [],
      artistName: artist,
      earlySignal: isEarlySignal(stats.campaigns, confidence),
    })
  }
}

function detectProductMerchPatterns(
  dataset: PatternDetectionDataset,
  bucket: DetectedPattern[],
  seen: Set<string>,
) {
  const listings = dataset.productListings
  if (listings.length >= 1) {
    const withTitle = listings.filter((item) => item.finalTitle?.trim())
    if (withTitle.length >= 1) {
      pushPattern(bucket, seen, {
        id: buildPatternId(["product-listing-style"]),
        title: "Product listing title patterns",
        patternType: "product-merch",
        category: "Product",
        confidence: confidenceFromEvidence({ recordCount: withTitle.length }),
        score: scoreFromEvidence({ recordCount: withTitle.length, base: 32 }),
        summary: `${withTitle.length} product listing(s) include finalized titles to compare.`,
        evidence: withTitle.slice(0, 4).map((item) =>
          evidenceItem(item.finalTitle, item.designConcept || item.niche, "product-listing", item.id),
        ),
        recommendation: "Compare high-performing listing titles and reuse structure for similar products.",
        actions: defaultActions({ patternType: "product-merch", id: "listing" }),
        relatedRecords: withTitle.slice(0, 3).map((item) =>
          relatedRecord("product-listing", item.id, item.finalTitle),
        ),
        earlySignal: withTitle.length < 2,
      })
    }
  }

  const mockups = dataset.merchIdeas.filter(
    (idea) => idea.selectedProductTitle?.trim() || idea.selectedConceptName?.trim(),
  )
  if (mockups.length >= 1) {
    pushPattern(bucket, seen, {
      id: buildPatternId(["merch-mockup-ideas"]),
      title: "Merch concept patterns",
      patternType: "product-merch",
      category: "Product",
      confidence: confidenceFromEvidence({ recordCount: mockups.length }),
      score: scoreFromEvidence({ recordCount: mockups.length, base: 30 }),
      summary: `${mockups.length} merch idea(s) with named concepts — compare mockup coverage and campaign links.`,
      evidence: mockups.slice(0, 3).map((idea) =>
        evidenceItem(
          idea.selectedProductTitle || idea.selectedConceptName,
          idea.styleDirection || idea.audience,
          "merch-idea",
          idea.id,
        ),
      ),
      recommendation: "Link mockup assets and Drive files to merch ideas for stronger launch readiness.",
      actions: defaultActions({ patternType: "product-merch", id: "merch" }),
      relatedRecords: mockups.slice(0, 3).map((idea) =>
        relatedRecord("merch-idea", idea.id, idea.selectedProductTitle || idea.selectedConceptName),
      ),
      earlySignal: mockups.length < 2,
    })
  }
}

function detectExperimentPatterns(
  dataset: PatternDetectionDataset,
  bucket: DetectedPattern[],
  seen: Set<string>,
) {
  const completed = dataset.experiments.filter(
    (exp) => exp.status === "Winner Chosen" || exp.status === "Reviewing" || exp.winner?.trim(),
  )
  for (const exp of completed) {
    const confidence = confidenceFromEvidence({
      recordCount: 1,
      strongSignal: Boolean(exp.winner && exp.learningSummary?.trim()),
    })
    pushPattern(bucket, seen, {
      id: buildPatternId(["experiment-result", exp.id]),
      title: `Experiment outcome: ${exp.experimentName}`,
      patternType: "experiment",
      category: "Experiment",
      confidence,
      score: scoreFromEvidence({ recordCount: 1, base: 42, metricGap: exp.winner ? 15 : 0 }),
      summary: `${exp.experimentType || "Test"} — winner: ${exp.winner || "pending"}. ${exp.resultSummary || exp.learningSummary || ""}`.trim(),
      evidence: [
        evidenceItem("Hypothesis", exp.hypothesis || "—"),
        evidenceItem("Winner", exp.winner || "—"),
        evidenceItem("Metric focus", exp.metricFocus || "—"),
      ],
      recommendation: exp.nextTestIdea?.trim()
        ? exp.nextTestIdea
        : "Capture this experiment result as a reusable learning.",
      actions: defaultActions({ patternType: "experiment", id: exp.id }),
      relatedRecords: [relatedRecord("experiment", exp.id, exp.experimentName)],
      campaignId: exp.campaignId,
      campaignName: exp.campaignName,
      platform: exp.platform,
      earlySignal: !exp.learningSummary?.trim(),
    })
  }

  const withoutLearning = completed.filter(
    (exp) =>
      !dataset.learnings.some(
        (learning) =>
          learning.experimentId === exp.id ||
          (learning.sourceType === "experiment" && learning.sourceId === exp.id),
      ),
  )
  if (withoutLearning.length >= 1) {
    pushPattern(bucket, seen, {
      id: buildPatternId(["experiment-no-learning"]),
      title: "Completed experiments without learnings",
      patternType: "learning-gap",
      category: "Learning",
      confidence: confidenceFromEvidence({ recordCount: withoutLearning.length }),
      score: scoreFromEvidence({ recordCount: withoutLearning.length, base: 38 }),
      summary: `${withoutLearning.length} experiment(s) finished without a captured learning.`,
      evidence: withoutLearning.slice(0, 4).map((exp) =>
        evidenceItem(exp.experimentName, exp.winner || exp.status, "experiment", exp.id),
      ),
      recommendation: "Create learnings from winning experiments while evidence is fresh.",
      actions: defaultActions({ patternType: "learning-gap", id: "experiment" }),
      relatedRecords: withoutLearning.slice(0, 3).map((exp) =>
        relatedRecord("experiment", exp.id, exp.experimentName),
      ),
    })
  }
}

function detectLearningGaps(
  dataset: PatternDetectionDataset,
  bucket: DetectedPattern[],
  seen: Set<string>,
) {
  const analyticsWithoutLearning = dataset.analyticsRecords.filter(
    (record) =>
      !dataset.learnings.some(
        (learning) =>
          learning.analyticsRecordId === record.id ||
          (learning.sourceType === "analytics" && learning.sourceId === record.id),
      ),
  )
  if (analyticsWithoutLearning.length >= 1) {
    pushPattern(bucket, seen, {
      id: buildPatternId(["learning-gap-analytics"]),
      title: "Analytics records without learnings",
      patternType: "learning-gap",
      category: "Learning",
      confidence: confidenceFromEvidence({ recordCount: analyticsWithoutLearning.length }),
      score: scoreFromEvidence({ recordCount: analyticsWithoutLearning.length, base: 36 }),
      summary: `${analyticsWithoutLearning.length} analytics record(s) have no linked learning yet.`,
      evidence: analyticsWithoutLearning.slice(0, 4).map((record) =>
        evidenceItem(record.itemName, record.platform, "analytics", record.id),
      ),
      recommendation: "Convert performance notes into reusable Pattern or Win learnings.",
      actions: defaultActions({ patternType: "learning-gap", id: "analytics" }),
      relatedRecords: analyticsWithoutLearning.slice(0, 3).map((record) =>
        relatedRecord("analytics", record.id, record.itemName),
      ),
    })
  }

  const highPerformers = dataset.youtubeVideos.filter((video) => (video.viewCount ?? 0) >= 100)
  const highWithoutLearning = highPerformers.filter(
    (video) =>
      !dataset.learnings.some(
        (learning) =>
          learning.sourceId === video.id ||
          learning.campaignId === video.campaignId,
      ),
  )
  if (highWithoutLearning.length >= 1) {
    pushPattern(bucket, seen, {
      id: buildPatternId(["learning-gap-youtube-high"]),
      title: "High-performing videos without learnings",
      patternType: "learning-gap",
      category: "Learning",
      confidence: confidenceFromEvidence({ recordCount: highWithoutLearning.length, strongSignal: true }),
      score: scoreFromEvidence({ recordCount: highWithoutLearning.length, base: 44 }),
      summary: `${highWithoutLearning.length} imported video(s) have meaningful stats but no learning captured.`,
      evidence: highWithoutLearning.slice(0, 3).map((video) =>
        evidenceItem(video.title, `${(video.viewCount ?? 0).toLocaleString()} views`, "youtube-video", video.id),
      ),
      recommendation: "Document what worked in title, thumbnail, and packaging for these videos.",
      actions: defaultActions({ patternType: "learning-gap", id: "youtube-high" }),
      relatedRecords: highWithoutLearning.slice(0, 3).map((video) =>
        relatedRecord("youtube-video", video.id, video.title),
      ),
      platform: "YouTube",
    })
  }

  const qualityWithoutLearning = dataset.qualityReviews.filter(
    (review) =>
      !dataset.learnings.some(
        (learning) =>
          learning.qualityReviewId === review.id ||
          (learning.sourceType === "quality-review" && learning.sourceId === review.id),
      ),
  )
  if (qualityWithoutLearning.length >= 1) {
    pushPattern(bucket, seen, {
      id: buildPatternId(["learning-gap-quality"]),
      title: "Quality reviews without learnings",
      patternType: "learning-gap",
      category: "Learning",
      confidence: confidenceFromEvidence({ recordCount: qualityWithoutLearning.length }),
      score: scoreFromEvidence({ recordCount: qualityWithoutLearning.length, base: 34 }),
      summary: `${qualityWithoutLearning.length} quality review(s) have not been converted to learnings.`,
      evidence: qualityWithoutLearning.slice(0, 4).map((review) =>
        evidenceItem(review.reviewName, `Score ${review.overallScore}`, "quality-review", review.id),
      ),
      recommendation: "Turn repeated strengths and weaknesses into Pattern learnings.",
      actions: defaultActions({ patternType: "learning-gap", id: "quality" }),
      relatedRecords: qualityWithoutLearning.slice(0, 3).map((review) =>
        relatedRecord("quality-review", review.id, review.reviewName),
      ),
    })
  }
}

function detectRepeatedIssues(
  dataset: PatternDetectionDataset,
  bucket: DetectedPattern[],
  seen: Set<string>,
) {
  const weaknessTerms = new Map<string, number>()
  for (const review of dataset.qualityReviews) {
    if (review.overallScore > 65) continue
    const text = normalizePatternText(review.weaknesses)
    for (const term of ["description", "thumbnail", "title", "cta", "tags", "story", "contrast"]) {
      if (text.includes(term)) {
        weaknessTerms.set(term, (weaknessTerms.get(term) ?? 0) + 1)
      }
    }
  }
  for (const [term, count] of weaknessTerms.entries()) {
    if (count < 2) continue
    pushPattern(bucket, seen, {
      id: buildPatternId(["repeated-weakness", term]),
      title: `Repeated low-score issue: ${term}`,
      patternType: "repeated-issue",
      category: "Quality",
      confidence: confidenceFromEvidence({ recordCount: count }),
      score: scoreFromEvidence({ recordCount: count, base: 40 }),
      summary: `"${term}" appears in weaknesses across ${count} low-scoring quality review(s).`,
      evidence: [evidenceItem("Issue term", term), evidenceItem("Occurrences", String(count))],
      recommendation: `Add a checklist item or playbook note to improve ${term} before publishing.`,
      actions: defaultActions({ patternType: "repeated-issue", id: term }),
      relatedRecords: [],
    })
  }

  const unlinkedVideos = dataset.youtubeVideos.filter((video) => !video.campaignId?.trim())
  if (unlinkedVideos.length >= 2) {
    pushPattern(bucket, seen, {
      id: buildPatternId(["repeated-unlinked-videos"]),
      title: "Repeated unlinked YouTube videos",
      patternType: "repeated-issue",
      category: "Operations",
      confidence: confidenceFromEvidence({ recordCount: unlinkedVideos.length }),
      score: scoreFromEvidence({ recordCount: unlinkedVideos.length, base: 35 }),
      summary: `${unlinkedVideos.length} imported video(s) are not linked to campaigns.`,
      evidence: unlinkedVideos.slice(0, 4).map((video) =>
        evidenceItem(video.title, video.channelTitle || "YouTube", "youtube-video", video.id),
      ),
      recommendation: "Link videos to campaigns to improve pattern detection and readiness tracking.",
      actions: [
        {
          id: "navigate-videos",
          label: "Open Unlinked Videos",
          actionType: "navigate",
          href: "/videos?filter=unlinked",
        },
      ],
      relatedRecords: unlinkedVideos.slice(0, 3).map((video) =>
        relatedRecord("youtube-video", video.id, video.title),
      ),
      platform: "YouTube",
    })
  }

  const unlinkedDrive = dataset.driveFiles.filter(
    (file) => !file.assetId?.trim() && file.status !== "Ignored",
  )
  if (unlinkedDrive.length >= 3) {
    pushPattern(bucket, seen, {
      id: buildPatternId(["repeated-unlinked-drive"]),
      title: "Repeated unlinked Drive files",
      patternType: "repeated-issue",
      category: "Operations",
      confidence: confidenceFromEvidence({ recordCount: unlinkedDrive.length }),
      score: scoreFromEvidence({ recordCount: unlinkedDrive.length, base: 33 }),
      summary: `${unlinkedDrive.length} synced Drive file(s) are not linked to assets.`,
      evidence: unlinkedDrive.slice(0, 4).map((file) =>
        evidenceItem(file.name, file.detectedAssetType || file.mimeType || "Drive file", "drive-file", file.id),
      ),
      recommendation: "Review Drive sync and convert important files into assets.",
      actions: [
        {
          id: "navigate-drive",
          label: "Open Google Drive Integration",
          actionType: "navigate",
          href: "/integrations?tab=google-drive",
        },
      ],
      relatedRecords: unlinkedDrive.slice(0, 3).map((file) =>
        relatedRecord("drive-file", file.id, file.name),
      ),
    })
  }
}

export function buildDetectedPatterns(
  dataset: PatternDetectionDataset,
  input: PatternDetectInput = {},
): DetectedPattern[] {
  const bucket: DetectedPattern[] = []
  const seen = new Set<string>()

  detectYouTubeTitlePatterns(dataset, bucket, seen, input)
  detectThumbnailPatterns(dataset, bucket, seen)
  detectCampaignReadinessPatterns(dataset, bucket, seen, input)
  detectArtistProjectPatterns(dataset, bucket, seen, input)
  detectProductMerchPatterns(dataset, bucket, seen)
  detectExperimentPatterns(dataset, bucket, seen)
  detectLearningGaps(dataset, bucket, seen)
  detectRepeatedIssues(dataset, bucket, seen)

  let filtered = bucket
  if (input.patternType) {
    filtered = filtered.filter((pattern) => pattern.patternType === input.patternType)
  }
  if (input.platform) {
    const platform = input.platform.toLowerCase()
    filtered = filtered.filter(
      (pattern) => (pattern.platform ?? "").toLowerCase() === platform,
    )
  }
  if (input.campaignId) {
    filtered = filtered.filter(
      (pattern) =>
        pattern.campaignId === input.campaignId ||
        pattern.relatedRecords.some((record) => record.sourceType === "campaign" && record.sourceId === input.campaignId) ||
        pattern.patternType === "youtube-title" ||
        pattern.patternType === "thumbnail" ||
        pattern.patternType === "learning-gap" ||
        pattern.patternType === "repeated-issue",
    )
  }
  if (input.analyticsRecordId) {
    filtered = filtered.filter((pattern) =>
      pattern.relatedRecords.some((record) => record.sourceId === input.analyticsRecordId) ||
      pattern.evidence.some((item) => item.sourceId === input.analyticsRecordId),
    )
  }
  if (input.youtubeVideoId) {
    filtered = filtered.filter((pattern) =>
      pattern.relatedRecords.some((record) => record.sourceId === input.youtubeVideoId) ||
      pattern.evidence.some((item) => item.sourceId === input.youtubeVideoId),
    )
  }
  if (input.minConfidence) {
    const order = { low: 0, medium: 1, high: 2 }
    filtered = filtered.filter(
      (pattern) => order[pattern.confidence] >= order[input.minConfidence!],
    )
  }

  return filtered
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit ?? 60)
}

export function summarizePatterns(patterns: DetectedPattern[]): PatternDetectSummary {
  const learningOpportunities = patterns.filter((p) => p.patternType === "learning-gap").length
  const repeatedIssues = patterns.filter((p) => p.patternType === "repeated-issue").length
  const sorted = [...patterns].sort((a, b) => b.score - a.score)
  return {
    total: patterns.length,
    highConfidence: patterns.filter((p) => p.confidence === "high").length,
    mediumConfidence: patterns.filter((p) => p.confidence === "medium").length,
    lowConfidence: patterns.filter((p) => p.confidence === "low").length,
    earlySignals: patterns.filter((p) => p.earlySignal).length,
    learningOpportunities,
    repeatedIssues,
    bestPattern: sorted.find((p) => !p.earlySignal && p.patternType !== "learning-gap"),
    biggestGap: sorted.find((p) => p.patternType === "learning-gap" || p.patternType === "repeated-issue"),
  }
}

export function patternsForTab(
  patterns: DetectedPattern[],
  tab: string,
): DetectedPattern[] {
  switch (tab) {
    case "youtube":
      return patterns.filter((p) => p.patternType === "youtube-title")
    case "thumbnail":
      return patterns.filter((p) => p.patternType === "thumbnail")
    case "campaign":
      return patterns.filter((p) =>
        ["campaign-readiness", "artist-project"].includes(p.patternType),
      )
    case "product":
      return patterns.filter((p) => p.patternType === "product-merch")
    case "experiment":
      return patterns.filter((p) => p.patternType === "experiment")
    case "gaps":
      return patterns.filter((p) =>
        ["learning-gap", "repeated-issue"].includes(p.patternType),
      )
    default:
      return patterns
  }
}
