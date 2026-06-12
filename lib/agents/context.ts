import type {
  AgentContextBundle,
  AgentContextInclude,
  AgentRelatedRecord,
  AgentRunInput,
} from "@/lib/agents/types"
import { getAgentById } from "@/lib/agents/registry"
import { getAutomationReport } from "@/lib/actions/automation-rules"
import { getDataHealthReport } from "@/lib/actions/data-health"
import { loadFeedbackLoopDataset } from "@/lib/actions/feedback-loop"
import { loadPatternDetectionDataset } from "@/lib/actions/patterns"
import { loadQualityPerformanceDataset } from "@/lib/actions/quality-performance"
import { loadCommerceDataset } from "@/lib/actions/commerce"
import { getPlaybooks } from "@/lib/actions/playbooks"
import { getPromptRuns } from "@/lib/actions/prompt-runs"
import { getPrompts } from "@/lib/actions/prompts"
import { buildArtistUniverseContext } from "@/lib/artist-universe/context"
import { buildFeedbackSuggestions } from "@/lib/feedback-loop/suggestions"
import { buildQualityPerformanceInsights } from "@/lib/quality-performance/detectors"
import type {
  AnalyticsRecord,
  AssetRecord,
  CampaignRecord,
  DriveFileRecord,
  ExperimentRecord,
  LearningRecord,
  PlaybookRecord,
  ProductListingRecord,
  PromptRun,
  QualityReviewRecord,
  YouTubeVideoRecord,
} from "@/lib/types"

const LIMITS = {
  campaigns: 5,
  analytics: 8,
  videos: 8,
  assets: 8,
  driveFiles: 8,
  learnings: 8,
  qualityReviews: 8,
  patterns: 8,
  experiments: 8,
  playbooks: 5,
  prompts: 8,
  promptRuns: 8,
} as const

function matchesArtist(record: { artistName?: string; campaignName?: string }, artist?: string): boolean {
  if (!artist?.trim()) return true
  const needle = artist.trim().toLowerCase()
  return (
    record.artistName?.toLowerCase().includes(needle) ||
    record.campaignName?.toLowerCase().includes(needle) ||
    false
  )
}

function matchesPlatform(record: { platform?: string }, platform?: string): boolean {
  if (!platform?.trim()) return true
  return record.platform?.toLowerCase() === platform.trim().toLowerCase()
}

function matchesCampaign(record: { campaignId?: string }, campaignId?: string): boolean {
  if (!campaignId?.trim()) return true
  return record.campaignId === campaignId.trim()
}

function sortByRecent<T extends { updatedAt?: number; createdAt?: number }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0),
  )
}

function compactCampaign(c: CampaignRecord): string {
  return `- ${c.campaignName} (${c.status ?? "Unknown"}) · artist: ${c.artistName || "—"} · launch: ${c.launchDate || "—"}`
}

function compactAnalytics(a: AnalyticsRecord): string {
  return `- ${a.itemName || "Analytics"} · ${a.platform || "—"} · views: ${a.views ?? "—"} · CTR: ${a.clickThroughRate ?? "—"} · campaign: ${a.relatedCampaign || "—"}`
}

function compactVideo(v: YouTubeVideoRecord): string {
  return `- ${v.title || "Untitled"} · views: ${v.viewCount ?? "—"} · linked campaign: ${v.campaignName || "none"} · stats synced: ${v.lastSyncedAt ? "yes" : "stale/missing"}`
}

function compactAsset(a: AssetRecord): string {
  return `- ${a.assetName || "Asset"} · type: ${a.assetType || "—"} · campaign: ${a.campaignName || "—"}`
}

function compactDrive(f: DriveFileRecord): string {
  return `- ${f.name || "File"} · linked: ${f.campaignName || f.campaignId || "none"} · type: ${f.mimeType || "—"}`
}

function compactQuality(q: QualityReviewRecord): string {
  return `- ${q.reviewName || q.reviewType || "Review"} · score: ${q.overallScore ?? "—"} · campaign: ${q.campaignName || "—"}`
}

function compactLearning(l: LearningRecord): string {
  return `- ${l.title} · ${l.learningType} · confidence: ${l.confidence} · ${l.insight?.slice(0, 120) || ""}`
}

function compactExperiment(e: ExperimentRecord): string {
  return `- ${e.experimentName} · ${e.status} · campaign: ${e.campaignName || "—"}`
}

function compactPlaybook(p: PlaybookRecord): string {
  return `- ${p.name} · ${p.category || "General"} · tasks: ${p.taskTemplate?.length ?? 0}`
}

function compactPromptRun(r: PromptRun): string {
  return `- ${r.promptName} · ${r.runType || r.moduleType || "run"} · campaign: ${r.campaignName || "—"}`
}

function resolveInclude(input: AgentRunInput): AgentContextInclude {
  const agent = getAgentById(input.agentId)
  return { ...(agent?.defaultInclude ?? {}), ...(input.includeData ?? {}) }
}

function filterRecords<T extends { campaignId?: string; artistName?: string; platform?: string }>(
  items: T[],
  input: AgentRunInput,
): T[] {
  let filtered = items
  if (input.campaignId) {
    filtered = filtered.filter((item) => matchesCampaign(item, input.campaignId))
  }
  if (input.artistName) {
    filtered = filtered.filter((item) => matchesArtist(item, input.artistName))
  }
  if (input.platform) {
    filtered = filtered.filter((item) => matchesPlatform(item, input.platform))
  }
  return sortByRecent(filtered)
}

function findSourceRecord(
  dataset: Awaited<ReturnType<typeof loadFeedbackLoopDataset>>,
  sourceRecordType?: string,
  sourceRecordId?: string,
  promptRuns: PromptRun[] = [],
): { title: string; summary: string; href: string } | null {
  if (!sourceRecordType?.trim() || !sourceRecordId?.trim()) return null
  const type = sourceRecordType.trim()
  const id = sourceRecordId.trim()

  const video = dataset.youtubeVideos.find((v) => v.id === id)
  if (type.toLowerCase().includes("youtube") && video) {
    return {
      title: video.title || "YouTube Video",
      summary: compactVideo(video),
      href: `/videos?recordId=${encodeURIComponent(id)}`,
    }
  }

  const listing = dataset.productListings.find((p) => p.id === id)
  if (type.toLowerCase().includes("product") && listing) {
    return {
      title: listing.finalTitle || "Product Listing",
      summary: `- ${listing.finalTitle || listing.designConcept || "Product"} · store: ${listing.storeName || "—"}`,
      href: `/product-listings?recordId=${encodeURIComponent(id)}`,
    }
  }

  const campaign = dataset.campaigns.find((c) => c.id === id)
  if (type.toLowerCase().includes("campaign") && campaign) {
    return {
      title: campaign.campaignName,
      summary: compactCampaign(campaign),
      href: `/campaigns?campaignId=${encodeURIComponent(id)}`,
    }
  }

  const promptRun = promptRuns.find((r) => r.id === id)
  if (type.toLowerCase().includes("prompt") && promptRun) {
    return {
      title: promptRun.promptName || "Prompt Run",
      summary: compactPromptRun(promptRun),
      href: `/runner?recordId=${encodeURIComponent(id)}`,
    }
  }

  return {
    title: `${type} record`,
    summary: `- Selected source record ${type} (${id})`,
    href: `/agents?sourceRecordType=${encodeURIComponent(type)}&sourceRecordId=${encodeURIComponent(id)}`,
  }
}

export async function buildAgentContext(input: AgentRunInput): Promise<AgentContextBundle> {
  const include = resolveInclude(input)
  const warnings: string[] = []
  const missingData: string[] = []
  const relatedRecords: AgentRelatedRecord[] = []

  const dataset = await loadFeedbackLoopDataset()
  const promptRuns = include.prompts ? await getPromptRuns().catch(() => [] as PromptRun[]) : []
  const prompts = include.prompts ? await getPrompts().catch(() => []) : []
  const playbooks = include.playbooks ? await getPlaybooks().catch(() => [] as PlaybookRecord[]) : []

  const sections: string[] = ["# CreatorOps Agent Context"]
  sections.push(`Agent: ${getAgentById(input.agentId)?.name ?? input.agentId}`)
  if (input.userGoal?.trim()) sections.push(`User goal: ${input.userGoal.trim()}`)
  if (input.extraInstructions?.trim()) sections.push(`Extra instructions: ${input.extraInstructions.trim()}`)

  const source = findSourceRecord(
    dataset,
    input.sourceRecordType,
    input.sourceRecordId,
    promptRuns,
  )
  if (source) {
    sections.push("\n## Selected source record")
    sections.push(source.summary)
    relatedRecords.push({
      sourceType: input.sourceRecordType ?? "record",
      sourceId: input.sourceRecordId ?? "",
      title: source.title,
      href: source.href,
    })
  } else if (input.sourceRecordType && input.sourceRecordId) {
    warnings.push("Selected source record was not found. Analysis uses broader context.")
    missingData.push(`Source record ${input.sourceRecordType} (${input.sourceRecordId})`)
  }

  let campaigns = filterRecords(dataset.campaigns, input)
  if (input.campaignId) {
    const selected = dataset.campaigns.find((c) => c.id === input.campaignId)
    if (selected) {
      campaigns = [selected, ...campaigns.filter((c) => c.id !== selected.id)]
      relatedRecords.push({
        sourceType: "campaign",
        sourceId: selected.id,
        title: selected.campaignName,
        href: `/campaigns?campaignId=${encodeURIComponent(selected.id)}`,
      })
    } else {
      warnings.push("Selected campaign was not found.")
      missingData.push("Selected campaign")
    }
  }
  campaigns = campaigns.slice(0, LIMITS.campaigns)

  if (include.campaigns !== false) {
    sections.push("\n## Campaign summary")
    if (campaigns.length === 0) {
      sections.push("- No matching campaigns found.")
      missingData.push("Campaigns")
    } else {
      sections.push(campaigns.map(compactCampaign).join("\n"))
    }
  }

  if (include.videos) {
    const videos = filterRecords(dataset.youtubeVideos, input).slice(0, LIMITS.videos)
    sections.push("\n## YouTube / video summary")
    if (videos.length === 0) {
      sections.push("- No matching videos found.")
      missingData.push("YouTube videos")
    } else {
      sections.push(videos.map(compactVideo).join("\n"))
    }
  }

  if (include.analytics) {
    const analytics = filterRecords(dataset.analyticsRecords, input).slice(0, LIMITS.analytics)
    sections.push("\n## Analytics summary")
    if (analytics.length === 0) {
      sections.push("- No matching analytics records found.")
      missingData.push("Analytics")
    } else {
      sections.push(analytics.map(compactAnalytics).join("\n"))
    }
  }

  if (include.assets) {
    const assets = filterRecords(dataset.assets, input).slice(0, LIMITS.assets)
    sections.push("\n## Asset summary")
    if (assets.length === 0) {
      sections.push("- No matching assets found.")
      missingData.push("Assets")
    } else {
      sections.push(assets.map(compactAsset).join("\n"))
    }
  }

  if (include.driveFiles) {
    const driveFiles = filterRecords(dataset.driveFiles, input).slice(0, LIMITS.driveFiles)
    sections.push("\n## Drive file summary")
    if (driveFiles.length === 0) {
      sections.push("- No matching Drive files found.")
      missingData.push("Drive files")
    } else {
      sections.push(driveFiles.map(compactDrive).join("\n"))
    }
  }

  if (include.qualityReviews) {
    const reviews = filterRecords(dataset.qualityReviews, input).slice(0, LIMITS.qualityReviews)
    sections.push("\n## Quality review summary")
    if (reviews.length === 0) {
      sections.push("- No matching quality reviews found.")
      missingData.push("Quality reviews")
    } else {
      sections.push(reviews.map(compactQuality).join("\n"))
    }
  }

  if (include.learnings) {
    const learnings = filterRecords(dataset.learnings, input).slice(0, LIMITS.learnings)
    sections.push("\n## Learning summary")
    if (learnings.length === 0) {
      sections.push("- No matching learnings found.")
      missingData.push("Learnings")
    } else {
      sections.push(learnings.map(compactLearning).join("\n"))
    }
  }

  if (include.experiments) {
    const experiments = filterRecords(dataset.experiments, input).slice(0, LIMITS.experiments)
    sections.push("\n## Experiment summary")
    if (experiments.length === 0) {
      sections.push("- No matching experiments found.")
      missingData.push("Experiments")
    } else {
      sections.push(experiments.map(compactExperiment).join("\n"))
    }
  }

  if (include.patterns) {
    try {
      const patterns = buildDetectedPatterns(dataset, {
        campaignId: input.campaignId,
        artistName: input.artistName,
        platform: input.platform,
        limit: LIMITS.patterns,
      })
      sections.push("\n## Pattern summary")
      if (patterns.length === 0) {
        sections.push("- No notable patterns detected.")
      } else {
        sections.push(
          patterns
            .slice(0, LIMITS.patterns)
            .map((p) => `- ${p.title} · ${p.patternType} · confidence: ${p.confidence}`)
            .join("\n"),
        )
      }
    } catch {
      sections.push("\n## Pattern summary\n- Pattern detection unavailable.")
    }
  }

  if (include.qualityPerformance) {
    try {
      const qpDataset = await loadQualityPerformanceDataset()
      const insights = buildQualityPerformanceInsights(qpDataset, {
        campaignId: input.campaignId,
        limit: LIMITS.patterns,
      })
      sections.push("\n## Quality vs performance summary")
      if (insights.length === 0) {
        sections.push("- No quality/performance correlations found.")
      } else {
        sections.push(
          insights
            .slice(0, LIMITS.patterns)
            .map((i) => `- ${i.title} · ${i.insightType} · ${i.summary}`)
            .join("\n"),
        )
      }
    } catch {
      sections.push("\n## Quality vs performance summary\n- Analysis unavailable.")
    }
  }

  if (include.feedbackLoop) {
    try {
      const suggestions = buildFeedbackSuggestions(dataset, {
        campaignId: input.campaignId,
        artistName: input.artistName,
        platform: input.platform,
        limit: LIMITS.learnings,
      })
      sections.push("\n## Feedback loop summary")
      if (suggestions.length === 0) {
        sections.push("- No feedback-loop suggestions available.")
      } else {
        sections.push(
          suggestions
            .slice(0, LIMITS.learnings)
            .map((s) => `- ${s.title} · ${s.suggestionType} · ${s.summary}`)
            .join("\n"),
        )
      }
    } catch {
      sections.push("\n## Feedback loop summary\n- Suggestions unavailable.")
    }
  }

  if (include.playbooks) {
    const filtered = playbooks.slice(0, LIMITS.playbooks)
    sections.push("\n## Playbook summary")
    if (filtered.length === 0) {
      sections.push("- No playbooks found.")
      missingData.push("Playbooks")
    } else {
      sections.push(filtered.map(compactPlaybook).join("\n"))
    }
  }

  if (include.prompts) {
    sections.push("\n## Prompt summary")
    const runs = filterRecords(promptRuns, input).slice(0, LIMITS.promptRuns)
    if (runs.length === 0 && prompts.length === 0) {
      sections.push("- No prompt templates or runs found.")
      missingData.push("Prompts")
    } else {
      if (prompts.length > 0) {
        sections.push(
          prompts
            .slice(0, LIMITS.prompts)
            .map((p) => `- Template: ${p.name} · ${p.category}`)
            .join("\n"),
        )
      }
      if (runs.length > 0) {
        sections.push(runs.map(compactPromptRun).join("\n"))
      }
    }
  }

  if (include.dataHealth) {
    try {
      const report = await getDataHealthReport()
      const top = report.issues.slice(0, 6)
      sections.push("\n## Data health risks")
      if (top.length === 0) {
        sections.push("- No notable data health issues.")
      } else {
        sections.push(top.map((i) => `- [${i.severity}] ${i.title}: ${i.description}`).join("\n"))
      }
    } catch {
      sections.push("\n## Data health risks\n- Data health scan unavailable.")
    }
  }

  if (input.agentId === "product-strategist") {
    try {
      const commerce = await loadCommerceDataset()
      const research = filterRecords(commerce.research, input).slice(0, 6)
      const collections = filterRecords(
        commerce.collections.map((c) => ({
          ...c,
          campaignId: c.campaignId,
          artistName: c.artistName,
        })),
        input,
      ).slice(0, 6)
      const revenue = filterRecords(
        commerce.revenue.map((r) => ({
          ...r,
          campaignId: r.campaignId,
          artistName: r.artistName,
          platform: r.platform,
        })),
        input,
      ).slice(0, 8)
      const listings = filterRecords(
        commerce.listings.map((l) => ({
          ...l,
          campaignId: (l as ProductListingRecord & { campaignId?: string }).campaignId,
          artistName: "",
        })),
        input,
      ).slice(0, 6)

      sections.push("\n## Product research summary")
      sections.push(
        research.length === 0
          ? "- No product research items."
          : research.map((r) => `- ${r.title} · ${r.status} · score: ${r.opportunityScore ?? "—"}`).join("\n"),
      )
      sections.push("\n## Collections summary")
      sections.push(
        collections.length === 0
          ? "- No collections."
          : collections.map((c) => `- ${c.name} · ${c.status} · products: ${c.productIds.length}`).join("\n"),
      )
      sections.push("\n## Revenue summary")
      sections.push(
        revenue.length === 0
          ? "- No revenue records."
          : revenue
              .map((r) => `- ${r.productName} · $${r.grossRevenue.toFixed(2)} · ${r.platform || r.source}`)
              .join("\n"),
      )
      sections.push("\n## Product listing summary")
      sections.push(
        listings.length === 0
          ? "- No product listings."
          : listings.map((l) => `- ${l.finalTitle || l.designConcept || "Listing"} · ${l.storeName || "—"}`).join("\n"),
      )
    } catch {
      sections.push("\n## Commerce summary\n- Commerce dataset unavailable.")
    }
  }

  if (include.automation) {
    try {
      const automation = await getAutomationReport()
      const suggestions = automation.suggestions.slice(0, 6)
      sections.push("\n## Automation suggestions")
      if (suggestions.length === 0) {
        sections.push("- No automation suggestions.")
      } else {
        sections.push(suggestions.map((s) => `- ${s.title}: ${s.description}`).join("\n"))
      }
    } catch {
      sections.push("\n## Automation suggestions\n- Automation report unavailable.")
    }
  }

  const artistUniverseAgents = new Set([
    "release-strategist",
    "youtube-growth",
    "product-strategist",
    "prompt-optimizer",
    "campaign-qa",
    "learning-synthesizer",
  ])
  if (
    artistUniverseAgents.has(input.agentId) &&
    (input.artistName?.trim() || input.campaignId?.trim())
  ) {
    try {
      const universe = await buildArtistUniverseContext({
        artistName: input.artistName,
        campaignId: input.campaignId,
        includeLore: true,
        includeVisualIdentity: true,
        includeLearnings: input.agentId === "learning-synthesizer",
        includeProducts: input.agentId === "product-strategist",
        includeAssets: input.agentId === "youtube-growth",
      })
      if (universe.compactText.trim()) {
        sections.push("\n## Artist Universe context")
        sections.push(universe.compactText.slice(0, 3500))
      }
    } catch {
      sections.push("\n## Artist Universe context\n- Artist universe context unavailable.")
    }
  }

  if (missingData.length > 0) {
    sections.push("\n## Missing or limited data")
    sections.push(missingData.map((item) => `- ${item}`).join("\n"))
  }

  return {
    markdown: sections.join("\n"),
    relatedRecords,
    warnings,
    missingData,
  }
}

export async function previewAgentContext(input: AgentRunInput): Promise<string> {
  const bundle = await buildAgentContext(input)
  return bundle.markdown
}
