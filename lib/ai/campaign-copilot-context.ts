import { buildLaunchDashboardData, type LaunchDashboardData } from "@/lib/campaign-launch-dashboard"
import type { CampaignLinkableStoreSlice } from "@/lib/campaigns"
import { filterAssetsForCampaign } from "@/lib/assets"
import { buildCampaignContext, type CampaignContextBundle } from "@/lib/data/campaign-context"
import {
  filterSuggestionsForCampaign,
  type AutomationReport,
} from "@/lib/data/automation-rules"
import type { DataHealthIssue, DataHealthReport } from "@/lib/data/data-health"
import { filterQualityReviewsForCampaign } from "@/lib/quality-reviews"
import {
  filterExternalLinksForCampaign,
  groupExternalLinksByPlatform,
} from "@/lib/data/external-links"
import {
  filterDriveFilesForCampaign,
  filterDriveFoldersForCampaign,
} from "@/lib/drive/mappers"
import { buildAssetLinkSuggestions } from "@/lib/asset-linking/matchers"
import { extractPlaybookIdFromNotes } from "@/lib/playbooks"
import { isAIGenerationTemplate } from "@/lib/ai-templates/utils"
import { getCampaignPromptRuns } from "@/lib/prompt-run-linking"
import type {
  CampaignRecord,
  CampaignTask,
  ExperimentRecord,
  LearningRecord,
  PlaybookRecord,
  Prompt,
  PromptRun,
  QualityReviewRecord,
  ExternalLinkRecord,
  WorkspaceSettingsRecord,
} from "@/lib/types"

export interface CampaignCopilotTaskSummary {
  total: number
  completed: number
  open: number
  overdue: number
  openTasks: CampaignTask[]
  overdueTasks: CampaignTask[]
}

export interface CampaignCopilotChecklistSummary {
  total: number
  completed: number
  incompletePhases: string[]
}

export interface CampaignCopilotQualitySummary {
  count: number
  lowest: Array<{
    reviewName: string
    reviewType: string
    overallScore: number
    weaknesses: string
  }>
}

export interface CampaignCopilotPromptHistoryItem {
  id: string
  promptName: string
  moduleType: string
  runType: string
  updatedAt: number
  tags: string[]
}

export interface CampaignCopilotStructuredContext {
  campaignId: string
  campaignName: string
  campaignType: string
  status: string
  priority: string
  launchDate: string
  primaryGoal: string
  targetAudience: string
  description: string
  readinessScore: number
  readinessLabel: string
  readinessCompleted: number
  readinessTotal: number
  tasks: CampaignCopilotTaskSummary
  checklist: CampaignCopilotChecklistSummary
  linkedRecordCount: number
  linkedRecordTypes: string[]
  missingAssets: Array<{ key: string; label: string }>
  presentAssets: Array<{ key: string; label: string; title?: string }>
  hasYouTubePackage: boolean
  hasYouTubeThumbnail: boolean
  hasReleasePlan: boolean
  hasSocialContent: boolean
  hasEmailCampaign: boolean
  hasMerchIdea: boolean
  hasProductListing: boolean
  hasMockupPrompt: boolean
  hasAnalytics: boolean
  quality: CampaignCopilotQualitySummary
  learnings: Array<{
    title: string
    insight: string
    recommendation: string
    confidence: string
    impact: string
  }>
  experiments: Array<{
    name: string
    status: string
    metricFocus: string
    hypothesis: string
  }>
  analyticsSummary: string
  dataHealthWarnings: Array<{ severity: string; title: string; description: string }>
  automationSuggestions: Array<{ title: string; description: string; priority: string }>
  promptHistory: CampaignCopilotPromptHistoryItem[]
  copilotRunCount: number
  playbookName: string | null
  aiTemplateCount: number
  launchData: LaunchDashboardData
  externalLinksByPlatform: Record<string, Array<{ name: string; linkType: string; url: string }>>
  missingExternalLinks: string[]
  importedYouTubeAnalyticsSummary: string
  youtubeVideos: Array<{
    id: string
    title: string
    viewCount: number
    likeCount: number
    commentCount: number
    lastSyncedAt: number | null
    videoUrl: string
    campaignLinked: boolean
    hasAnalytics: boolean
    issues: string[]
  }>
  youtubeVideoIssues: string[]
  driveFolders: Array<{
    id: string
    name: string
    url: string
    fileCount: number
    lastSyncedAt: number | null
  }>
  driveFiles: Array<{
    id: string
    name: string
    detectedAssetType: string
    linkedAssetId: string
    modifiedTime: number | null
    unlinked: boolean
  }>
  driveSummary: string
  driveIssues: string[]
  assetLinkSuggestions: Array<{
    sourceName: string
    targetName: string
    suggestedAction: string
    confidence: string
    score: number
    reason: string
  }>
  patternInsights: Array<{
    title: string
    patternType: string
    confidence: string
    summary: string
    recommendation: string
    earlySignal: boolean
    score: number
  }>
  globalPatternInsights: Array<{
    title: string
    patternType: string
    confidence: string
    summary: string
    recommendation: string
    earlySignal: boolean
    score: number
  }>
  qualityPerformanceInsights: Array<{
    title: string
    insightType: string
    confidence: string
    sampleSize: number
    qualityScore?: number
    performanceMetric?: string
    performanceValue?: number
    summary: string
    recommendation: string
    earlySignal: boolean
  }>
  feedbackLoopSuggestions: Array<{
    title: string
    suggestionType: string
    confidence: string
    summary: string
    recommendation: string
    sourceType: string
    sourceName: string
  }>
}

function isOverdueTask(task: CampaignTask): boolean {
  if (task.status === "Done" || task.status === "Skipped") return false
  const due = task.dueDate?.trim()
  if (!due) return false
  const parsed = Date.parse(due)
  if (Number.isNaN(parsed)) return false
  return parsed < Date.now()
}

function summarizeTasks(campaign: CampaignRecord): CampaignCopilotTaskSummary {
  const tasks = [...campaign.tasks].sort((a, b) => a.order - b.order)
  const openTasks = tasks.filter((task) => task.status !== "Done")
  const overdueTasks = openTasks.filter(isOverdueTask)
  const completed = tasks.length - openTasks.length
  return {
    total: tasks.length,
    completed,
    open: openTasks.length,
    overdue: overdueTasks.length,
    openTasks: openTasks.slice(0, 8),
    overdueTasks: overdueTasks.slice(0, 5),
  }
}

function summarizeChecklist(campaign: CampaignRecord): CampaignCopilotChecklistSummary {
  const items = campaign.publishingChecklist?.items ?? []
  const completed = items.filter(
    (item) => item.status === "done" || item.status === "complete",
  ).length
  const phases = new Set<string>()
  for (const item of items) {
    if (item.status !== "done" && item.status !== "complete" && item.phase?.trim()) {
      phases.add(item.phase.trim())
    }
  }
  return {
    total: items.length,
    completed,
    incompletePhases: [...phases],
  }
}

function summarizeQuality(reviews: QualityReviewRecord[]): CampaignCopilotQualitySummary {
  const sorted = [...reviews].sort((a, b) => a.overallScore - b.overallScore)
  return {
    count: reviews.length,
    lowest: sorted.slice(0, 5).map((review) => ({
      reviewName: review.reviewName,
      reviewType: review.reviewType,
      overallScore: review.overallScore,
      weaknesses: review.weaknesses,
    })),
  }
}

function filterDataHealthForCampaign(
  report: DataHealthReport | null,
  campaignId: string,
  campaignName: string,
): DataHealthIssue[] {
  if (!report) return []
  return report.issues.filter((issue) => {
    if (issue.sourceId === campaignId) return true
    if (issue.description.includes(campaignName) && campaignName.trim()) return true
    return false
  })
}

function summarizePromptHistory(runs: PromptRun[]): CampaignCopilotPromptHistoryItem[] {
  return runs.slice(0, 10).map((run) => ({
    id: run.id,
    promptName: run.promptName,
    moduleType: run.moduleType,
    runType: run.runType,
    updatedAt: run.updatedAt,
    tags: run.tags,
  }))
}

export interface BuildCampaignCopilotContextInput {
  bundle: CampaignContextBundle
  store: CampaignLinkableStoreSlice
  launchData: LaunchDashboardData
  qualityReviews: QualityReviewRecord[]
  experiments: ExperimentRecord[]
  promptRuns: PromptRun[]
  learnings: LearningRecord[]
  dataHealth: DataHealthReport | null
  automationReport: AutomationReport | null
  prompts: Prompt[]
  playbooks: PlaybookRecord[]
  externalLinks: ExternalLinkRecord[]
  youtubeVideos: import("@/lib/types").YouTubeVideoRecord[]
  driveFolders: import("@/lib/types").DriveFolderRecord[]
  driveFiles: import("@/lib/types").DriveFileRecord[]
  assets: import("@/lib/types").AssetRecord[]
  patternInsights?: import("@/lib/patterns/types").DetectedPattern[]
  globalPatternInsights?: import("@/lib/patterns/types").DetectedPattern[]
  qualityPerformanceInsights?: import("@/lib/quality-performance/types").QualityPerformanceInsight[]
  feedbackLoopSuggestions?: import("@/lib/feedback-loop/types").FeedbackSuggestion[]
}

export function buildCampaignCopilotStructuredContext(
  input: BuildCampaignCopilotContextInput,
): CampaignCopilotStructuredContext {
  const { campaign } = input.bundle
  const { launchData } = input
  const campaignReviews = filterQualityReviewsForCampaign(
    input.qualityReviews,
    campaign.id,
    campaign.campaignName,
  )
  const campaignRuns = getCampaignPromptRuns(input.promptRuns, campaign.id)
  const copilotRunCount = campaignRuns.filter(
    (run) =>
      run.moduleType === "Campaign Copilot" ||
      run.tags.includes("campaign-copilot") ||
      run.runType === "Copilot",
  ).length

  const campaignExperiments = input.experiments.filter(
    (exp) =>
      exp.campaignId === campaign.id ||
      exp.campaignName.trim().toLowerCase() === campaign.campaignName.trim().toLowerCase(),
  )

  const automationSuggestions = input.automationReport
    ? filterSuggestionsForCampaign(input.automationReport, campaign.id).slice(0, 8)
    : []

  const dataHealthWarnings = filterDataHealthForCampaign(
    input.dataHealth,
    campaign.id,
    campaign.campaignName,
  )
    .slice(0, 8)
    .map((issue) => ({
      severity: issue.severity,
      title: issue.title,
      description: issue.description,
    }))

  const playbookId = extractPlaybookIdFromNotes(campaign.notes)
  const playbook = playbookId
    ? input.playbooks.find((item) => item.id === playbookId) ?? null
    : null

  const missingAssets = launchData.readiness.assets
    .filter((asset) => !asset.completed)
    .map((asset) => ({ key: asset.key, label: asset.label }))

  const presentAssets = launchData.readiness.assets
    .filter((asset) => asset.completed)
    .map((asset) => ({ key: asset.key, label: asset.label, title: asset.title }))

  const linkedTypes = [...new Set(campaign.linkedRecords.map((record) => record.type))]

  const campaignExternalLinks = filterExternalLinksForCampaign(
    input.externalLinks,
    campaign.id,
    campaign.campaignName,
  )
  const groupedExternalLinks = groupExternalLinksByPlatform(campaignExternalLinks)
  const externalLinksByPlatform: CampaignCopilotStructuredContext["externalLinksByPlatform"] = {}
  for (const [platform, links] of groupedExternalLinks.entries()) {
    externalLinksByPlatform[platform] = links.map((link) => ({
      name: link.name,
      linkType: link.linkType,
      url: link.url,
    }))
  }
  const missingExternalLinks: string[] = []
  if (
    !campaignExternalLinks.some(
      (link) => link.platform === "YouTube" && link.linkType === "Published Video",
    )
  ) {
    missingExternalLinks.push("Published YouTube video link")
  }
  if (
    !campaignExternalLinks.some(
      (link) =>
        link.platform === "Google Drive" && link.linkType === "Google Drive Folder",
    )
  ) {
    missingExternalLinks.push("Google Drive folder link")
  }
  if (
    Boolean(input.bundle.productListing) &&
    !campaignExternalLinks.some((link) => link.platform === "Fourthwall")
  ) {
    missingExternalLinks.push("Fourthwall product link")
  }
  if (
    Boolean(input.bundle.releasePlan) &&
    !campaignExternalLinks.some((link) => link.platform === "Suno")
  ) {
    missingExternalLinks.push("Suno project/song link")
  }
  const youtubeAnalytics = campaignExternalLinks
    .filter((link) => link.linkType === "YouTube Analytics CSV")
    .map((link) => link.name)
  const importedYouTubeAnalyticsSummary =
    input.bundle.analyticsRecord &&
    input.bundle.analyticsRecord.platform === "YouTube"
      ? [
          input.bundle.analyticsRecord.itemName,
          input.bundle.analyticsRecord.views
            ? `${input.bundle.analyticsRecord.views} views`
            : "",
          input.bundle.analyticsRecord.notes?.includes("YouTube CSV")
            ? "Imported from YouTube CSV"
            : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : youtubeAnalytics.length > 0
        ? `CSV links: ${youtubeAnalytics.join(", ")}`
        : ""

  return {
    campaignId: campaign.id,
    campaignName: campaign.campaignName,
    campaignType: campaign.campaignType,
    status: campaign.status,
    priority: campaign.priority,
    launchDate: campaign.launchDate,
    primaryGoal: campaign.primaryGoal,
    targetAudience: campaign.targetAudience,
    description: campaign.description,
    readinessScore: launchData.readiness.score,
    readinessLabel: launchData.readiness.label,
    readinessCompleted: launchData.readiness.completed,
    readinessTotal: launchData.readiness.total,
    tasks: summarizeTasks(campaign),
    checklist: summarizeChecklist(campaign),
    linkedRecordCount: campaign.linkedRecords.length,
    linkedRecordTypes: linkedTypes,
    missingAssets,
    presentAssets,
    hasYouTubePackage: Boolean(input.bundle.youtubePackage),
    hasYouTubeThumbnail: Boolean(input.bundle.youtubeThumbnail),
    hasReleasePlan: Boolean(input.bundle.releasePlan),
    hasSocialContent: Boolean(input.bundle.socialRepurposing),
    hasEmailCampaign: Boolean(input.bundle.emailCampaign),
    hasMerchIdea: Boolean(input.bundle.merchIdea),
    hasProductListing: Boolean(input.bundle.productListing),
    hasMockupPrompt: Boolean(input.bundle.mockupPrompt),
    hasAnalytics: Boolean(input.bundle.analyticsRecord),
    quality: summarizeQuality(campaignReviews),
    learnings: input.bundle.reusableLearnings.map((learning) => ({
      title: learning.title,
      insight: learning.insight,
      recommendation: learning.recommendation,
      confidence: learning.confidence,
      impact: learning.impact,
    })),
    experiments: campaignExperiments.slice(0, 6).map((exp) => ({
      name: exp.experimentName,
      status: exp.status,
      metricFocus: exp.metricFocus,
      hypothesis: exp.hypothesis,
    })),
    analyticsSummary: input.bundle.analyticsRecord
      ? [
          input.bundle.analyticsRecord.recordName,
          input.bundle.analyticsRecord.primaryMetric,
          input.bundle.analyticsRecord.notes,
        ]
          .filter(Boolean)
          .join(" · ")
      : "",
    dataHealthWarnings,
    automationSuggestions: automationSuggestions.map((item) => ({
      title: item.title,
      description: item.description,
      priority: item.priority,
    })),
    promptHistory: summarizePromptHistory(campaignRuns),
    copilotRunCount,
    playbookName: playbook?.name ?? null,
    aiTemplateCount: input.prompts.filter(isAIGenerationTemplate).length,
    launchData,
    externalLinksByPlatform,
    missingExternalLinks,
    importedYouTubeAnalyticsSummary,
    youtubeVideos: input.youtubeVideos.map((video) => {
      const issues: string[] = []
      if (!video.campaignId?.trim()) issues.push("unlinked to campaign")
      if (!video.analyticsRecordId?.trim()) issues.push("missing analytics record")
      if (!video.externalLinkId?.trim()) issues.push("missing external link")
      if (!video.lastSyncedAt) issues.push("never synced stats")
      else if (Date.now() - video.lastSyncedAt > 7 * 24 * 60 * 60 * 1000) {
        issues.push("stale stats")
      }
      return {
        id: video.id,
        title: video.title,
        viewCount: video.viewCount ?? 0,
        likeCount: video.likeCount ?? 0,
        commentCount: video.commentCount ?? 0,
        lastSyncedAt: video.lastSyncedAt,
        videoUrl: video.videoUrl,
        campaignLinked: Boolean(video.campaignId?.trim()),
        hasAnalytics: Boolean(video.analyticsRecordId?.trim()),
        issues,
      }
    }),
    youtubeVideoIssues: input.youtubeVideos.flatMap((video) => {
      const issues: string[] = []
      if (!video.campaignId?.trim()) issues.push(`${video.title}: unlinked`)
      if (!video.analyticsRecordId?.trim()) issues.push(`${video.title}: missing analytics`)
      if (!video.lastSyncedAt) issues.push(`${video.title}: not synced`)
      return issues
    }),
    driveFolders: (() => {
      const folders = filterDriveFoldersForCampaign(
        input.driveFolders ?? [],
        campaign.id,
        campaign.campaignName,
      )
      const files = filterDriveFilesForCampaign(
        input.driveFiles ?? [],
        campaign.id,
        campaign.campaignName,
      )
      return folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        url: folder.url,
        fileCount: files.filter(
          (file) => file.folderId === folder.id || file.driveFolderId === folder.driveFolderId,
        ).length,
        lastSyncedAt: folder.lastSyncedAt,
      }))
    })(),
    driveFiles: filterDriveFilesForCampaign(
      input.driveFiles ?? [],
      campaign.id,
      campaign.campaignName,
    )
      .slice(0, 12)
      .map((file) => ({
        id: file.id,
        name: file.name,
        detectedAssetType: file.detectedAssetType,
        linkedAssetId: file.assetId,
        modifiedTime: file.modifiedTime,
        unlinked: !file.assetId?.trim(),
      })),
    driveSummary: (() => {
      const folders = filterDriveFoldersForCampaign(
        input.driveFolders ?? [],
        campaign.id,
        campaign.campaignName,
      )
      const files = filterDriveFilesForCampaign(
        input.driveFiles ?? [],
        campaign.id,
        campaign.campaignName,
      )
      const linked = files.filter((file) => file.assetId?.trim()).length
      const unlinked = files.filter((file) => !file.assetId?.trim() && file.status !== "Ignored").length
      if (folders.length === 0 && files.length === 0) return "No synced Google Drive folders or files."
      return `${folders.length} folder(s), ${files.length} file(s), ${linked} linked asset(s), ${unlinked} unlinked file(s).`
    })(),
    driveIssues: (() => {
      const files = filterDriveFilesForCampaign(
        input.driveFiles ?? [],
        campaign.id,
        campaign.campaignName,
      )
      const issues: string[] = []
      if (files.some((file) => !file.assetId?.trim() && file.status !== "Ignored")) {
        issues.push("Unlinked Drive files exist")
      }
      for (const file of files) {
        if (!file.detectedAssetType?.trim()) {
          issues.push(`${file.name}: unknown asset type`)
        }
      }
      const folders = filterDriveFoldersForCampaign(
        input.driveFolders ?? [],
        campaign.id,
        campaign.campaignName,
      )
      if (folders.length === 0 && files.length > 0) {
        issues.push("Files synced but no campaign Drive folder record")
      }
      return issues
    })(),
    assetLinkSuggestions: buildAssetLinkSuggestions(
      {
        campaigns: [campaign],
        assets: filterAssetsForCampaign(
          input.assets ?? [],
          campaign.id,
          campaign.campaignName,
        ),
        driveFiles: input.driveFiles ?? [],
        driveFolders: input.driveFolders ?? [],
        youtubeVideos: input.youtubeVideos ?? [],
        productListings: input.store.productListings ?? [],
        merchIdeas: input.store.merchIdeas ?? [],
        mockupPrompts: input.store.mockupPromptRecords ?? [],
        releasePlans: input.store.releasePlans ?? [],
      },
      { campaignId: campaign.id, limit: 10 },
    )
      .filter((item) => item.confidence !== "low" || item.score >= 40)
      .map((item) => ({
        sourceName: item.sourceName,
        targetName: item.targetName,
        suggestedAction: item.suggestedAction,
        confidence: item.confidence,
        score: item.score,
        reason: item.reason,
      })),
    patternInsights: (input.patternInsights ?? []).slice(0, 8).map((pattern) => ({
      title: pattern.title,
      patternType: pattern.patternType,
      confidence: pattern.confidence,
      summary: pattern.summary,
      recommendation: pattern.recommendation,
      earlySignal: Boolean(pattern.earlySignal),
      score: pattern.score,
    })),
    globalPatternInsights: (input.globalPatternInsights ?? []).slice(0, 5).map((pattern) => ({
      title: pattern.title,
      patternType: pattern.patternType,
      confidence: pattern.confidence,
      summary: pattern.summary,
      recommendation: pattern.recommendation,
      earlySignal: Boolean(pattern.earlySignal),
      score: pattern.score,
    })),
    qualityPerformanceInsights: (input.qualityPerformanceInsights ?? []).slice(0, 8).map((insight) => ({
      title: insight.title,
      insightType: insight.insightType,
      confidence: insight.confidence,
      sampleSize: insight.sampleSize,
      qualityScore: insight.qualityScore,
      performanceMetric: insight.performanceMetric,
      performanceValue: insight.performanceValue,
      summary: insight.summary,
      recommendation: insight.recommendation,
      earlySignal: Boolean(insight.earlySignal),
    })),
    feedbackLoopSuggestions: (input.feedbackLoopSuggestions ?? []).slice(0, 6).map((item) => ({
      title: item.title,
      suggestionType: item.suggestionType,
      confidence: item.confidence,
      summary: item.summary,
      recommendation: item.recommendedLearning.recommendation,
      sourceType: item.sourceType,
      sourceName: item.sourceName,
    })),
  }
}

export function buildCampaignCopilotContextFromRecords(
  campaign: CampaignRecord,
  store: CampaignLinkableStoreSlice,
  workspaceSettings: WorkspaceSettingsRecord | null,
  learnings: LearningRecord[],
  extras: Omit<
    BuildCampaignCopilotContextInput,
    "bundle" | "store" | "launchData"
  >,
): { structured: CampaignCopilotStructuredContext; markdown: string } {
  const bundle = buildCampaignContext(campaign, store, workspaceSettings, learnings)
  const launchData = buildLaunchDashboardData(campaign, store)
  const structured = buildCampaignCopilotStructuredContext({
    bundle,
    store,
    launchData,
    ...extras,
  })
  return {
    structured,
    markdown: formatCampaignCopilotMarkdown(structured, bundle),
  }
}

function formatCampaignCopilotMarkdown(
  ctx: CampaignCopilotStructuredContext,
  bundle: CampaignContextBundle,
): string {
  const lines: string[] = [
    `# Campaign: ${ctx.campaignName || "Untitled"}`,
    "",
    "## Summary",
    `- Type: ${ctx.campaignType || "—"}`,
    `- Status: ${ctx.status || "—"}`,
    `- Priority: ${ctx.priority || "—"}`,
    `- Launch date: ${ctx.launchDate || "—"}`,
    `- Goal: ${ctx.primaryGoal || "—"}`,
    `- Audience: ${ctx.targetAudience || "—"}`,
    `- Readiness: ${ctx.readinessScore}% (${ctx.readinessLabel}) — ${ctx.readinessCompleted}/${ctx.readinessTotal} assets`,
    "",
    "## Tasks",
    `- Total: ${ctx.tasks.total}`,
    `- Completed: ${ctx.tasks.completed}`,
    `- Open: ${ctx.tasks.open}`,
    `- Overdue: ${ctx.tasks.overdue}`,
  ]

  if (ctx.tasks.overdueTasks.length > 0) {
    lines.push("", "### Overdue tasks")
    for (const task of ctx.tasks.overdueTasks) {
      lines.push(`- ${task.title} (due ${task.dueDate || "—"})`)
    }
  }
  if (ctx.tasks.openTasks.length > 0) {
    lines.push("", "### Open tasks")
    for (const task of ctx.tasks.openTasks) {
      lines.push(`- [${task.status}] ${task.title}`)
    }
  }

  lines.push(
    "",
    "## Publishing checklist",
    `- Items: ${ctx.checklist.completed}/${ctx.checklist.total} complete`,
  )
  if (ctx.checklist.incompletePhases.length > 0) {
    lines.push(`- Incomplete phases: ${ctx.checklist.incompletePhases.join(", ")}`)
  }

  lines.push(
    "",
    "## Linked records",
    `- Count: ${ctx.linkedRecordCount}`,
    `- Types: ${ctx.linkedRecordTypes.join(", ") || "none"}`,
    "",
    "## Asset presence",
    `- YouTube package: ${ctx.hasYouTubePackage ? "yes" : "missing"}`,
    `- YouTube thumbnail: ${ctx.hasYouTubeThumbnail ? "yes" : "missing"}`,
    `- Release plan: ${ctx.hasReleasePlan ? "yes" : "missing"}`,
    `- Social repurposing: ${ctx.hasSocialContent ? "yes" : "missing"}`,
    `- Email campaign: ${ctx.hasEmailCampaign ? "yes" : "missing"}`,
    `- Merch idea: ${ctx.hasMerchIdea ? "yes" : "missing"}`,
    `- Product listing: ${ctx.hasProductListing ? "yes" : "missing"}`,
    `- Mockup prompt: ${ctx.hasMockupPrompt ? "yes" : "missing"}`,
    `- Analytics: ${ctx.hasAnalytics ? "yes" : "missing"}`,
  )

  if (ctx.missingAssets.length > 0) {
    lines.push("", "## Missing assets")
    for (const asset of ctx.missingAssets) {
      lines.push(`- ${asset.label}`)
    }
  }

  if (bundle.artistProfile) {
    lines.push(
      "",
      "## Artist profile",
      `- Name: ${bundle.artistProfile.artistName}`,
      `- Genre: ${bundle.artistProfile.genre}`,
      `- Mood: ${bundle.artistProfile.mood}`,
      `- Brand tone: ${bundle.artistProfile.brandTone}`,
    )
  }

  if (ctx.quality.count > 0) {
    lines.push("", "## Quality reviews", `- Count: ${ctx.quality.count}`)
    for (const review of ctx.quality.lowest) {
      lines.push(
        `- ${review.reviewName || review.reviewType}: ${review.overallScore}/100`,
      )
      if (review.weaknesses.trim()) {
        lines.push(`  Weaknesses: ${review.weaknesses.trim()}`)
      }
    }
  } else {
    lines.push("", "## Quality reviews", "- None linked to this campaign")
  }

  if (ctx.learnings.length > 0) {
    lines.push("", "## Reusable learnings")
    for (const learning of ctx.learnings) {
      lines.push(
        `- ${learning.title} (${learning.confidence} confidence, ${learning.impact} impact)`,
        `  Insight: ${learning.insight}`,
      )
      if (learning.recommendation.trim()) {
        lines.push(`  Recommendation: ${learning.recommendation}`)
      }
    }
  }

  if (ctx.experiments.length > 0) {
    lines.push("", "## Experiments")
    for (const exp of ctx.experiments) {
      lines.push(`- ${exp.name} (${exp.status}) — metric: ${exp.metricFocus || "—"}`)
    }
  }

  if (ctx.analyticsSummary) {
    lines.push("", "## Analytics", ctx.analyticsSummary)
  }

  if (Object.keys(ctx.externalLinksByPlatform).length > 0) {
    lines.push("", "## External links")
    for (const [platform, links] of Object.entries(ctx.externalLinksByPlatform)) {
      lines.push(`- ${platform}: ${links.length} link(s)`)
      for (const link of links.slice(0, 4)) {
        lines.push(`  - ${link.name || link.linkType} (${link.linkType})`)
      }
    }
  } else {
    lines.push("", "## External links", "- None linked to this campaign")
  }

  if (ctx.missingExternalLinks.length > 0) {
    lines.push("", "## Missing external links")
    for (const item of ctx.missingExternalLinks) {
      lines.push(`- ${item}`)
    }
    lines.push(
      "",
      "Suggested actions:",
      "- Add Published YouTube Link",
      "- Import YouTube CSV",
      "- Add Google Drive folder",
      "- Add Fourthwall product link",
      "- Add Suno project link",
    )
  }

  if (ctx.importedYouTubeAnalyticsSummary) {
    lines.push("", "## Imported YouTube analytics", ctx.importedYouTubeAnalyticsSummary)
  }

  if (ctx.youtubeVideos.length > 0) {
    lines.push("", "## YouTube API videos")
    for (const video of ctx.youtubeVideos) {
      lines.push(
        `- ${video.title}: ${video.viewCount.toLocaleString()} views, ${video.likeCount.toLocaleString()} likes, ${video.commentCount.toLocaleString()} comments (last synced ${video.lastSyncedAt ? new Date(video.lastSyncedAt).toLocaleDateString() : "never"})${video.issues.length ? ` — issues: ${video.issues.join(", ")}` : ""}`,
      )
    }
    lines.push(
      "",
      "Suggested actions:",
      "- Open Video Intelligence (/videos)",
      "- Sync stats",
      "- Link video to campaign if unlinked",
      "- Create learning from YouTube analytics",
      "- Run quality review or experiment on title/thumbnail",
      "- Import recent videos from YouTube Integration",
    )
  }

  if (ctx.youtubeVideoIssues.length > 0) {
    lines.push("", "## Video Intelligence attention", ...ctx.youtubeVideoIssues.map((item) => `- ${item}`))
  }

  if (ctx.driveFolders.length > 0 || ctx.driveFiles.length > 0) {
    lines.push("", "## Google Drive sync", ctx.driveSummary)
    if (ctx.driveFolders.length > 0) {
      lines.push("", "### Linked Drive folders")
      for (const folder of ctx.driveFolders) {
        lines.push(
          `- ${folder.name}: ${folder.fileCount} file(s), last synced ${folder.lastSyncedAt ? new Date(folder.lastSyncedAt).toLocaleDateString() : "never"}`,
        )
      }
    }
    if (ctx.driveFiles.length > 0) {
      lines.push("", "### Recent Drive files")
      for (const file of ctx.driveFiles) {
        lines.push(
          `- ${file.name} (${file.detectedAssetType || "Unknown"})${file.unlinked ? " — not linked to asset" : ""}`,
        )
      }
    }
    lines.push(
      "",
      "Suggested actions:",
      "- Sync Drive folder from Integrations",
      "- Create asset from important Drive file",
      "- Link thumbnail or cover art file to campaign assets",
      "- Add missing cover art/mockup/video file from Drive",
    )
  }

  if (ctx.driveIssues.length > 0) {
    lines.push("", "## Drive attention", ...ctx.driveIssues.map((item) => `- ${item}`))
  }

  if (ctx.assetLinkSuggestions.length > 0) {
    lines.push("", "## Asset link suggestions")
    for (const item of ctx.assetLinkSuggestions) {
      lines.push(
        `- [${item.confidence}/${item.score}] ${item.sourceName} → ${item.targetName}: ${item.reason} (${item.suggestedAction})`,
      )
    }
    lines.push(
      "",
      "Suggested actions:",
      "- Link thumbnail file to YouTube video",
      "- Create an Asset from a Drive mockup file",
      "- Attach a Drive folder to the campaign",
      "- Link unlinked Drive files after reviewing confidence",
    )
  }

  if (ctx.patternInsights.length > 0) {
    lines.push("", "## Campaign pattern insights")
    for (const pattern of ctx.patternInsights) {
      const signal = pattern.earlySignal ? " (early signal — limited sample)" : ""
      lines.push(
        `- [${pattern.confidence}/${pattern.score}] ${pattern.title}${signal}: ${pattern.summary} Recommendation: ${pattern.recommendation}`,
      )
    }
    lines.push(
      "",
      "Use cautious language when sample size is small. Do not claim a pattern is proven unless confidence is high with multiple supporting records.",
    )
  }

  if (ctx.globalPatternInsights.length > 0) {
    lines.push("", "## Global pattern insights")
    for (const pattern of ctx.globalPatternInsights) {
      const signal = pattern.earlySignal ? " (early signal)" : ""
      lines.push(
        `- [${pattern.confidence}] ${pattern.title}${signal}: ${pattern.summary}`,
      )
    }
  }

  if (ctx.qualityPerformanceInsights.length > 0) {
    lines.push("", "## Quality vs performance insights")
    for (const insight of ctx.qualityPerformanceInsights) {
      const signal =
        insight.earlySignal || insight.sampleSize < 3
          ? " (early signal — small sample)"
          : ""
      const perf =
        insight.performanceMetric && insight.performanceValue !== undefined
          ? ` ${insight.performanceMetric}=${insight.performanceValue}`
          : ""
      lines.push(
        `- [${insight.confidence}/n=${insight.sampleSize}] ${insight.title}${signal}: ${insight.summary}${perf}. Recommendation: ${insight.recommendation}`,
      )
    }
    lines.push(
      "",
      "Use 'associated with' language unless sample size is 5+ with a clear metric gap. High quality + low performance may indicate distribution/timing issues.",
    )
  }

  if (ctx.feedbackLoopSuggestions.length > 0) {
    lines.push("", "## Learning feedback loop")
    for (const item of ctx.feedbackLoopSuggestions) {
      lines.push(
        `- [${item.confidence}] ${item.title}: ${item.summary} Recommendation: ${item.recommendation}`,
      )
    }
    lines.push(
      "",
      "Suggested actions:",
      "- Create a campaign retrospective learning",
      "- Turn experiment results into reusable learnings",
      "- Convert high-confidence patterns into learnings",
      "- Add winning quality patterns to your playbook",
    )
  }

  if (ctx.dataHealthWarnings.length > 0) {
    lines.push("", "## Data health warnings")
    for (const warning of ctx.dataHealthWarnings) {
      lines.push(`- [${warning.severity}] ${warning.title}: ${warning.description}`)
    }
  }

  if (ctx.automationSuggestions.length > 0) {
    lines.push("", "## Automation suggestions")
    for (const suggestion of ctx.automationSuggestions) {
      lines.push(`- [${suggestion.priority}] ${suggestion.title}: ${suggestion.description}`)
    }
  }

  if (ctx.promptHistory.length > 0) {
    lines.push("", "## Prompt history (recent)")
    for (const run of ctx.promptHistory) {
      lines.push(
        `- ${run.promptName} (${run.moduleType || run.runType}) — ${new Date(run.updatedAt).toLocaleDateString()}`,
      )
    }
  }

  if (ctx.playbookName) {
    lines.push("", "## Playbook", `- ${ctx.playbookName}`)
  }

  if (ctx.launchData.nextActions.length > 0) {
    lines.push("", "## Deterministic next actions (dashboard)")
    for (const action of ctx.launchData.nextActions.slice(0, 6)) {
      lines.push(`- ${action.label}`)
    }
  }

  if (ctx.launchData.healthWarnings.length > 0) {
    lines.push("", "## Launch dashboard health warnings")
    for (const warning of ctx.launchData.healthWarnings) {
      lines.push(`- [${warning.severity}] ${warning.title}: ${warning.description}`)
    }
  }

  lines.push("", `## Copilot runs on this campaign: ${ctx.copilotRunCount}`)

  return lines.join("\n").trim()
}
