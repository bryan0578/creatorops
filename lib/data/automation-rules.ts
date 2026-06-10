/**
 * Automation Rules Engine — read-only suggestions with explicit apply actions.
 */

import type { CampaignLinkableStoreSlice } from "@/lib/campaigns"
import {
  buildLaunchDashboardData,
  isCommerceLaunchCampaign,
  isMusicLaunchCampaign,
} from "@/lib/campaign-launch-dashboard"
import { buildMissingAssetRepair } from "@/lib/data/data-health-repairs"
import type { DataHealthReport } from "@/lib/data/data-health"
import { normalizeStatusToStage } from "@/lib/data/campaign-board"
import {
  generateDefaultPublishingChecklist,
  hasIncompletePhaseItems,
  isChecklistItemDone,
  isPublishedCampaignStatus,
  isReadyToPublishCampaignStatus,
} from "@/lib/data/publishing-checklist"
import type { CampaignLinkedRecordType, CampaignRecord, ExperimentRecord, PromptRun } from "@/lib/types"

export type AutomationPriority = "high" | "medium" | "low" | "info"

export type AutomationCategory =
  | "Missing Asset"
  | "Task Automation"
  | "Publishing Checklist"
  | "Campaign Stage"
  | "Data Health"
  | "Experiment"
  | "Analytics"
  | "Prompt History"
  | "Export"
  | "Cleanup"

export type AutomationActionType =
  | "navigate"
  | "generatePublishingChecklist"
  | "addCampaignTasks"
  | "updateCampaignStatus"
  | "addReviewTasks"
  | "openDataHealth"
  | "createMissingAsset"

export interface AutomationActionPayload {
  campaignId?: string
  status?: string
  assetType?: CampaignLinkedRecordType
  href?: string
  tasks?: { title: string; description?: string }[]
  replaceChecklist?: boolean
}

export interface AutomationSuggestion {
  id: string
  ruleId: string
  priority: AutomationPriority
  category: AutomationCategory
  title: string
  description: string
  campaignId?: string
  campaignName?: string
  sourceType?: string
  sourceId?: string
  suggestedActionLabel: string
  actionType: AutomationActionType
  actionPayload: AutomationActionPayload
  href?: string
  canApply: boolean
  reason: string
}

export interface AutomationReportSummary {
  totalSuggestions: number
  highPriority: number
  mediumPriority: number
  lowPriority: number
  campaignsScanned: number
  readyToApply: number
  informational: number
}

export interface AutomationReport {
  scannedAt: number
  summary: AutomationReportSummary
  suggestions: AutomationSuggestion[]
  dataHealthOk: boolean
}

export interface BuiltinAutomationRule {
  id: string
  name: string
  description: string
  category: AutomationCategory
  priority: AutomationPriority
  enabled: boolean
}

export interface AutomationEvaluationContext {
  campaigns: CampaignRecord[]
  store: CampaignLinkableStoreSlice & {
    experiments: ExperimentRecord[]
    runs: PromptRun[]
  }
  dataHealth: DataHealthReport | null
  dataHealthFailed: boolean
}

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase()
}

function hasText(value: string | undefined | null): boolean {
  return norm(value).length > 0
}

function suggestionId(parts: string[]): string {
  return parts.filter(Boolean).join(":")
}

function parseDate(value: string | undefined | null): number | null {
  if (!value?.trim()) return null
  const ts = Date.parse(value.trim())
  return Number.isNaN(ts) ? null : ts
}

function daysSince(ts: number): number {
  return (Date.now() - ts) / (1000 * 60 * 60 * 24)
}

function campaignHasTaskTitle(campaign: CampaignRecord, title: string): boolean {
  const needle = norm(title)
  return campaign.tasks.some((task) => norm(task.title) === needle)
}

function campaignHasTaskMatching(campaign: CampaignRecord, pattern: RegExp): boolean {
  return campaign.tasks.some((task) => pattern.test(task.title))
}

export const BUILTIN_AUTOMATION_RULES: BuiltinAutomationRule[] = [
  {
    id: "missing-music-assets",
    name: "Missing Music Release Assets",
    description: "Flags required music launch assets that are not linked or matched.",
    category: "Missing Asset",
    priority: "medium",
    enabled: true,
  },
  {
    id: "missing-commerce-assets",
    name: "Missing Commerce/Product Assets",
    description: "Flags required commerce launch assets that are missing.",
    category: "Missing Asset",
    priority: "medium",
    enabled: true,
  },
  {
    id: "missing-publishing-checklist",
    name: "Missing Publishing Checklist",
    description: "Suggests generating a default publishing checklist.",
    category: "Publishing Checklist",
    priority: "medium",
    enabled: true,
  },
  {
    id: "published-review-tasks",
    name: "Published Campaign Review Tasks",
    description: "Adds 24-hour, 7-day, and 30-day review tasks for published campaigns.",
    category: "Task Automation",
    priority: "medium",
    enabled: true,
  },
  {
    id: "ready-to-publish-status",
    name: "Ready to Publish Status",
    description: "Suggests moving fully ready campaigns out of planning/generating.",
    category: "Campaign Stage",
    priority: "low",
    enabled: true,
  },
  {
    id: "published-missing-analytics",
    name: "Published Missing Analytics",
    description: "Published campaigns without an analytics record.",
    category: "Analytics",
    priority: "medium",
    enabled: true,
  },
  {
    id: "data-health-warnings",
    name: "Data Health Warnings",
    description: "Surfaces broken links and data health issues.",
    category: "Data Health",
    priority: "high",
    enabled: true,
  },
  {
    id: "experiment-missing-analytics",
    name: "Experiment Missing Analytics Link",
    description: "Running experiments without a linked analytics record.",
    category: "Experiment",
    priority: "medium",
    enabled: true,
  },
  {
    id: "experiment-winner-learnings",
    name: "Experiment Winner Missing Learnings",
    description: "Winner chosen experiments without a learning summary.",
    category: "Experiment",
    priority: "medium",
    enabled: true,
  },
  {
    id: "prompt-history-missing",
    name: "Prompt History Missing",
    description: "Campaigns with no linked prompt runs.",
    category: "Prompt History",
    priority: "info",
    enabled: true,
  },
  {
    id: "export-campaign-bundle",
    name: "Export Campaign Bundle",
    description: "Reminds you to export a portable campaign bundle.",
    category: "Export",
    priority: "info",
    enabled: true,
  },
  {
    id: "incomplete-campaign-fields",
    name: "Incomplete Campaign Overview",
    description: "Campaigns missing key overview fields.",
    category: "Cleanup",
    priority: "low",
    enabled: true,
  },
  {
    id: "prepublish-checklist-incomplete",
    name: "Pre-Publish Checklist Incomplete",
    description: "Ready-to-publish campaigns with open Pre-Publish checklist items.",
    category: "Publishing Checklist",
    priority: "medium",
    enabled: true,
  },
  {
    id: "review-due",
    name: "Review Due Suggestions",
    description: "Suggests performance reviews based on launch date.",
    category: "Task Automation",
    priority: "low",
    enabled: true,
  },
]

function evaluateMissingAssets(
  ctx: AutomationEvaluationContext,
  suggestions: AutomationSuggestion[],
) {
  for (const campaign of ctx.campaigns) {
    const dashboard = buildLaunchDashboardData(campaign, ctx.store)
    for (const asset of dashboard.readiness.assets) {
      if (asset.completed || !asset.type) continue

      const repair = buildMissingAssetRepair(campaign, asset.type)
      if (!repair || repair.kind !== "create-asset") continue

      const isMusic = isMusicLaunchCampaign(campaign.campaignType)
      const isCommerce = isCommerceLaunchCampaign(campaign.campaignType)
      if (!isMusic && !isCommerce) continue
      const ruleId = isMusic ? "missing-music-assets" : "missing-commerce-assets"

      suggestions.push({
        id: suggestionId([ruleId, campaign.id, asset.type]),
        ruleId,
        priority: "medium",
        category: "Missing Asset",
        title: `Missing ${asset.label}`,
        description: `${campaign.campaignName || "Campaign"} is missing ${asset.label.toLowerCase()}.`,
        campaignId: campaign.id,
        campaignName: campaign.campaignName,
        sourceType: "campaign",
        sourceId: campaign.id,
        suggestedActionLabel: repair.label,
        actionType: "createMissingAsset",
        actionPayload: {
          campaignId: campaign.id,
          assetType: asset.type,
          href: repair.href,
        },
        href: repair.href,
        canApply: true,
        reason: "Required launch asset is not linked or matched.",
      })
    }
  }
}

function evaluateMissingPublishingChecklist(
  ctx: AutomationEvaluationContext,
  suggestions: AutomationSuggestion[],
) {
  for (const campaign of ctx.campaigns) {
    if (campaign.publishingChecklist.items.length > 0) continue
    suggestions.push({
      id: suggestionId(["missing-publishing-checklist", campaign.id]),
      ruleId: "missing-publishing-checklist",
      priority: "medium",
      category: "Publishing Checklist",
      title: "Generate publishing checklist",
      description: `${campaign.campaignName || "Campaign"} has no publishing checklist yet.`,
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      suggestedActionLabel: "Generate Publishing Checklist",
      actionType: "generatePublishingChecklist",
      actionPayload: { campaignId: campaign.id },
      href: `/campaigns?campaignId=${encodeURIComponent(campaign.id)}&tab=publishing-checklist`,
      canApply: true,
      reason: "Publishing checklist is empty.",
    })
  }
}

const REVIEW_TASK_DEFS = [
  { key: "24h", title: "24-hour review", pattern: /24[- ]?hour/i },
  { key: "7d", title: "7-day review", pattern: /7[- ]?day/i },
  { key: "30d", title: "30-day review", pattern: /30[- ]?day/i },
] as const

function evaluatePublishedReviewTasks(
  ctx: AutomationEvaluationContext,
  suggestions: AutomationSuggestion[],
) {
  for (const campaign of ctx.campaigns) {
    if (!isPublishedCampaignStatus(campaign.status)) continue

    const missing = REVIEW_TASK_DEFS.filter(
      (def) => !campaignHasTaskMatching(campaign, def.pattern),
    )
    if (missing.length === 0) continue

    suggestions.push({
      id: suggestionId(["published-review-tasks", campaign.id]),
      ruleId: "published-review-tasks",
      priority: "medium",
      category: "Task Automation",
      title: "Add published campaign review tasks",
      description: `Add ${missing.map((m) => m.title).join(", ")} for ${campaign.campaignName || "campaign"}.`,
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      suggestedActionLabel: "Add Review Tasks",
      actionType: "addReviewTasks",
      actionPayload: {
        campaignId: campaign.id,
        tasks: missing.map((m) => ({
          title: m.title,
          description: `Performance review for ${campaign.campaignName || "campaign"}.`,
        })),
      },
      canApply: true,
      reason: "Published campaigns benefit from timed review tasks.",
    })
  }
}

function evaluateReadyToPublishStatus(
  ctx: AutomationEvaluationContext,
  suggestions: AutomationSuggestion[],
) {
  for (const campaign of ctx.campaigns) {
    const dashboard = buildLaunchDashboardData(campaign, ctx.store)
    if (dashboard.readiness.total === 0) continue
    if (dashboard.readiness.score < 100) continue

    const stage = normalizeStatusToStage(campaign.status)
    if (stage !== "planning" && stage !== "generating-assets") continue

    suggestions.push({
      id: suggestionId(["ready-to-publish-status", campaign.id]),
      ruleId: "ready-to-publish-status",
      priority: "low",
      category: "Campaign Stage",
      title: "Move to Ready to Publish",
      description: `${campaign.campaignName || "Campaign"} has all required assets ready but status is still ${campaign.status}.`,
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      suggestedActionLabel: "Move to Ready to Publish",
      actionType: "updateCampaignStatus",
      actionPayload: { campaignId: campaign.id, status: "Ready to Publish" },
      href: `/campaigns?campaignId=${encodeURIComponent(campaign.id)}`,
      canApply: true,
      reason: "Asset readiness is 100%.",
    })
  }
}

function evaluatePublishedMissingAnalytics(
  ctx: AutomationEvaluationContext,
  suggestions: AutomationSuggestion[],
) {
  for (const campaign of ctx.campaigns) {
    if (!isPublishedCampaignStatus(campaign.status)) continue
    const dashboard = buildLaunchDashboardData(campaign, ctx.store)
    const analyticsAsset = dashboard.readiness.assets.find((a) => a.type === "analytics")
    if (analyticsAsset?.completed) continue

    const repair = buildMissingAssetRepair(campaign, "analytics")
    suggestions.push({
      id: suggestionId(["published-missing-analytics", campaign.id]),
      ruleId: "published-missing-analytics",
      priority: "medium",
      category: "Analytics",
      title: "Add analytics record",
      description: `${campaign.campaignName || "Campaign"} is published but has no analytics record.`,
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      suggestedActionLabel: repair?.label ?? "Add Analytics Record",
      actionType: "createMissingAsset",
      actionPayload: {
        campaignId: campaign.id,
        assetType: "analytics",
        href: repair?.href ?? `/analytics?campaignId=${encodeURIComponent(campaign.id)}`,
      },
      href: repair?.href,
      canApply: true,
      reason: "Published campaigns should track performance.",
    })
  }
}

function evaluateDataHealth(ctx: AutomationEvaluationContext, suggestions: AutomationSuggestion[]) {
  if (ctx.dataHealthFailed) {
    suggestions.push({
      id: "data-health-scan-failed",
      ruleId: "data-health-warnings",
      priority: "medium",
      category: "Data Health",
      title: "Data Health scan could not complete",
      description: "Automation could not load the full Data Health report.",
      suggestedActionLabel: "Open Data Health",
      actionType: "openDataHealth",
      actionPayload: { href: "/data-health" },
      href: "/data-health",
      canApply: true,
      reason: "Data Health scan failed safely.",
    })
    return
  }

  if (!ctx.dataHealth) return

  const broken = ctx.dataHealth.summary.brokenLinks
  const missing = ctx.dataHealth.summary.missingAssets

  if (broken === 0 && missing === 0 && ctx.dataHealth.issues.length === 0) return

  suggestions.push({
    id: suggestionId(["data-health-warnings", String(broken), String(missing)]),
    ruleId: "data-health-warnings",
    priority: broken > 0 ? "high" : "medium",
    category: "Data Health",
    title: broken > 0 ? "Fix broken links in Data Health" : "Review Data Health warnings",
    description: `${ctx.dataHealth.summary.totalIssues} issue(s): ${broken} broken link(s), ${missing} missing asset warning(s).`,
    suggestedActionLabel: "Open Data Health",
    actionType: "openDataHealth",
    actionPayload: { href: "/data-health" },
    href: "/data-health",
    canApply: true,
    reason: "Data Health found workspace issues.",
  })
}

function evaluateExperiments(ctx: AutomationEvaluationContext, suggestions: AutomationSuggestion[]) {
  for (const experiment of ctx.store.experiments) {
    if (
      (experiment.status === "Running" || experiment.status === "Reviewing") &&
      !hasText(experiment.analyticsRecordId)
    ) {
      const href = experiment.campaignId
        ? `/analytics?campaignId=${encodeURIComponent(experiment.campaignId)}&experimentId=${encodeURIComponent(experiment.id)}`
        : `/analytics?experimentId=${encodeURIComponent(experiment.id)}`
      suggestions.push({
        id: suggestionId(["experiment-missing-analytics", experiment.id]),
        ruleId: "experiment-missing-analytics",
        priority: "medium",
        category: "Experiment",
        title: "Link analytics to experiment",
        description: `${experiment.experimentName || "Experiment"} is ${experiment.status.toLowerCase()} without an analytics record.`,
        campaignId: experiment.campaignId || undefined,
        campaignName: experiment.campaignName || undefined,
        sourceType: "experiment",
        sourceId: experiment.id,
        suggestedActionLabel: "Create Analytics Record",
        actionType: "navigate",
        actionPayload: { href },
        href,
        canApply: true,
        reason: "Running experiments should link to analytics.",
      })
    }

    if (experiment.status === "Winner Chosen" && !hasText(experiment.learningSummary)) {
      suggestions.push({
        id: suggestionId(["experiment-winner-learnings", experiment.id]),
        ruleId: "experiment-winner-learnings",
        priority: "medium",
        category: "Experiment",
        title: "Add experiment learning summary",
        description: `${experiment.experimentName || "Experiment"} has a winner but no learning summary.`,
        campaignId: experiment.campaignId || undefined,
        campaignName: experiment.campaignName || undefined,
        sourceType: "experiment",
        sourceId: experiment.id,
        suggestedActionLabel: "Open Experiment",
        actionType: "navigate",
        actionPayload: {
          href: `/experiments?recordId=${encodeURIComponent(experiment.id)}`,
        },
        href: `/experiments?recordId=${encodeURIComponent(experiment.id)}`,
        canApply: true,
        reason: "Winner chosen experiments should capture learnings.",
      })
    }
  }
}

function evaluatePromptHistory(ctx: AutomationEvaluationContext, suggestions: AutomationSuggestion[]) {
  for (const campaign of ctx.campaigns) {
    const linkedRuns = ctx.store.runs.filter(
      (run) =>
        (campaign.id && run.campaignId === campaign.id) ||
        norm(run.campaignName) === norm(campaign.campaignName),
    )
    if (linkedRuns.length > 0) continue

    suggestions.push({
      id: suggestionId(["prompt-history-missing", campaign.id]),
      ruleId: "prompt-history-missing",
      priority: "info",
      category: "Prompt History",
      title: "Save prompt run history",
      description: `${campaign.campaignName || "Campaign"} has no linked prompt runs yet.`,
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      suggestedActionLabel: "Open Prompt Runner",
      actionType: "navigate",
      actionPayload: {
        href: `/runner?campaignId=${encodeURIComponent(campaign.id)}`,
      },
      href: `/runner?campaignId=${encodeURIComponent(campaign.id)}`,
      canApply: true,
      reason: "Prompt runs help track generated outputs.",
    })
  }
}

function evaluateExportBundle(ctx: AutomationEvaluationContext, suggestions: AutomationSuggestion[]) {
  for (const campaign of ctx.campaigns) {
    if (!isPublishedCampaignStatus(campaign.status)) continue
    if (campaign.linkedRecords.length < 3) continue
    suggestions.push({
      id: suggestionId(["export-campaign-bundle", campaign.id]),
      ruleId: "export-campaign-bundle",
      priority: "info",
      category: "Export",
      title: "Export campaign bundle",
      description: `Create a portable JSON bundle for ${campaign.campaignName || "campaign"}.`,
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      suggestedActionLabel: "Open Campaign",
      actionType: "navigate",
      actionPayload: {
        href: `/campaigns?campaignId=${encodeURIComponent(campaign.id)}`,
      },
      href: `/campaigns?campaignId=${encodeURIComponent(campaign.id)}`,
      canApply: true,
      reason: "Informational — export from Launch Dashboard when ready.",
    })
  }
}

function evaluateIncompleteCampaignFields(
  ctx: AutomationEvaluationContext,
  suggestions: AutomationSuggestion[],
) {
  for (const campaign of ctx.campaigns) {
    const missing: string[] = []
    if (!hasText(campaign.primaryGoal)) missing.push("primary goal")
    if (!hasText(campaign.targetAudience)) missing.push("target audience")
    if (!hasText(campaign.launchDate)) missing.push("launch date")
    if (isMusicLaunchCampaign(campaign.campaignType) && !hasText(campaign.artistName)) {
      missing.push("artist name")
    }
    if (isCommerceLaunchCampaign(campaign.campaignType) && !hasText(campaign.productName)) {
      missing.push("product name")
    }
    if (missing.length === 0) continue

    suggestions.push({
      id: suggestionId(["incomplete-campaign-fields", campaign.id]),
      ruleId: "incomplete-campaign-fields",
      priority: "low",
      category: "Cleanup",
      title: "Complete campaign overview",
      description: `Missing: ${missing.join(", ")}.`,
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      suggestedActionLabel: "Open Campaign",
      actionType: "navigate",
      actionPayload: {
        href: `/campaigns?campaignId=${encodeURIComponent(campaign.id)}`,
      },
      href: `/campaigns?campaignId=${encodeURIComponent(campaign.id)}`,
      canApply: true,
      reason: "Campaign overview fields improve automation accuracy.",
    })
  }
}

function evaluatePrePublishChecklist(
  ctx: AutomationEvaluationContext,
  suggestions: AutomationSuggestion[],
) {
  for (const campaign of ctx.campaigns) {
    if (!isReadyToPublishCampaignStatus(campaign.status)) continue
    if (campaign.publishingChecklist.items.length === 0) continue
    if (!hasIncompletePhaseItems(campaign.publishingChecklist, "Pre-Publish")) continue

    suggestions.push({
      id: suggestionId(["prepublish-checklist-incomplete", campaign.id]),
      ruleId: "prepublish-checklist-incomplete",
      priority: "medium",
      category: "Publishing Checklist",
      title: "Complete Pre-Publish checklist",
      description: `${campaign.campaignName || "Campaign"} is ready to publish but Pre-Publish items remain open.`,
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      suggestedActionLabel: "Open Checklist",
      actionType: "navigate",
      actionPayload: {
        href: `/campaigns?campaignId=${encodeURIComponent(campaign.id)}&tab=publishing-checklist`,
      },
      href: `/campaigns?campaignId=${encodeURIComponent(campaign.id)}&tab=publishing-checklist`,
      canApply: true,
      reason: "Pre-Publish checklist should be complete before launch.",
    })
  }
}

function evaluateReviewDue(ctx: AutomationEvaluationContext, suggestions: AutomationSuggestion[]) {
  for (const campaign of ctx.campaigns) {
    if (!isPublishedCampaignStatus(campaign.status)) continue
    const launchTs = parseDate(campaign.launchDate)
    if (launchTs === null) continue

    const elapsed = daysSince(launchTs)
    const checks: { minDays: number; label: string; phase: "24-Hour Review" | "7-Day Review" | "30-Day Review"; taskPattern: RegExp }[] = [
      { minDays: 1, label: "24-hour", phase: "24-Hour Review", taskPattern: /24[- ]?hour/i },
      { minDays: 7, label: "7-day", phase: "7-Day Review", taskPattern: /7[- ]?day/i },
      { minDays: 30, label: "30-day", phase: "30-Day Review", taskPattern: /30[- ]?day/i },
    ]

    for (const check of checks) {
      if (elapsed < check.minDays) continue
      if (campaignHasTaskMatching(campaign, check.taskPattern)) continue

      const phaseItems = campaign.publishingChecklist.items.filter(
        (item) => item.phase === check.phase,
      )
      const phaseComplete =
        phaseItems.length > 0 &&
        phaseItems.every((item) => isChecklistItemDone(item.status))
      if (phaseComplete) continue

      suggestions.push({
        id: suggestionId(["review-due", campaign.id, check.label]),
        ruleId: "review-due",
        priority: "low",
        category: "Task Automation",
        title: `${check.label} review due`,
        description: `Launch date was ${Math.floor(elapsed)} day(s) ago — schedule ${check.label} performance review.`,
        campaignId: campaign.id,
        campaignName: campaign.campaignName,
        suggestedActionLabel: "Add Review Task",
        actionType: "addCampaignTasks",
        actionPayload: {
          campaignId: campaign.id,
          tasks: [
            {
              title: `${check.label} review`,
              description: `Review performance for ${campaign.campaignName || "campaign"}.`,
            },
          ],
        },
        canApply: true,
        reason: "Conservative review timing based on launch date.",
      })
    }
  }
}

const RULE_EVALUATORS: Array<(ctx: AutomationEvaluationContext, out: AutomationSuggestion[]) => void> = [
  evaluateMissingAssets,
  evaluateMissingPublishingChecklist,
  evaluatePublishedReviewTasks,
  evaluateReadyToPublishStatus,
  evaluatePublishedMissingAnalytics,
  evaluateDataHealth,
  evaluateExperiments,
  evaluatePromptHistory,
  evaluateExportBundle,
  evaluateIncompleteCampaignFields,
  evaluatePrePublishChecklist,
  evaluateReviewDue,
]

function summarizeSuggestions(suggestions: AutomationSuggestion[]): AutomationReportSummary {
  return {
    totalSuggestions: suggestions.length,
    highPriority: suggestions.filter((s) => s.priority === "high").length,
    mediumPriority: suggestions.filter((s) => s.priority === "medium").length,
    lowPriority: suggestions.filter((s) => s.priority === "low").length,
    campaignsScanned: 0,
    readyToApply: suggestions.filter((s) => s.canApply && s.actionType !== "navigate").length,
    informational: suggestions.filter((s) => s.priority === "info").length,
  }
}

const PRIORITY_ORDER: Record<AutomationPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  info: 3,
}

export function sortAutomationSuggestions(
  suggestions: AutomationSuggestion[],
): AutomationSuggestion[] {
  return [...suggestions].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  )
}

/** Build automation report from workspace context. Each rule is isolated — failures become warnings. */
export function buildAutomationReport(
  ctx: AutomationEvaluationContext,
  options?: { campaignId?: string },
): AutomationReport {
  const suggestions: AutomationSuggestion[] = []

  for (const evaluate of RULE_EVALUATORS) {
    try {
      evaluate(ctx, suggestions)
    } catch (error) {
      suggestions.push({
        id: suggestionId(["rule-error", String(Date.now())]),
        ruleId: "rule-error",
        priority: "info",
        category: "Cleanup",
        title: "Automation rule warning",
        description:
          error instanceof Error
            ? error.message
            : "A rule could not be evaluated.",
        suggestedActionLabel: "Dismiss",
        actionType: "navigate",
        actionPayload: {},
        canApply: false,
        reason: "Rule evaluation failed safely.",
      })
    }
  }

  let filtered = sortAutomationSuggestions(suggestions)
  if (options?.campaignId) {
    filtered = filtered.filter(
      (s) => s.campaignId === options.campaignId || !s.campaignId,
    )
  }

  const summary = summarizeSuggestions(filtered)
  summary.campaignsScanned = ctx.campaigns.length

  return {
    scannedAt: Date.now(),
    summary,
    suggestions: filtered,
    dataHealthOk: !ctx.dataHealthFailed,
  }
}

export function filterSuggestionsForCampaign(
  report: AutomationReport,
  campaignId: string,
): AutomationSuggestion[] {
  return report.suggestions.filter(
    (s) => s.campaignId === campaignId || (!s.campaignId && s.ruleId === "data-health-warnings"),
  )
}
