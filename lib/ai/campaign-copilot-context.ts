import { buildLaunchDashboardData, type LaunchDashboardData } from "@/lib/campaign-launch-dashboard"
import type { CampaignLinkableStoreSlice } from "@/lib/campaigns"
import { buildCampaignContext, type CampaignContextBundle } from "@/lib/data/campaign-context"
import {
  filterSuggestionsForCampaign,
  type AutomationReport,
} from "@/lib/data/automation-rules"
import type { DataHealthIssue, DataHealthReport } from "@/lib/data/data-health"
import { filterQualityReviewsForCampaign } from "@/lib/quality-reviews"
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
