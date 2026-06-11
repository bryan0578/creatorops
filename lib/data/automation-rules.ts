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
import { filterAssetsForCampaign } from "@/lib/assets"
import { filterLearningsForCampaign } from "@/lib/learnings"
import { filterQualityReviewsForCampaign } from "@/lib/quality-reviews"
import { normalizeStatusToStage } from "@/lib/data/campaign-board"
import {
  generateDefaultPublishingChecklist,
  hasIncompletePhaseItems,
  isChecklistItemDone,
  isPublishedCampaignStatus,
  isReadyToPublishCampaignStatus,
} from "@/lib/data/publishing-checklist"
import { extractPlaybookIdFromNotes } from "@/lib/playbooks"
import type { CampaignLinkedRecordType, CampaignRecord, ExperimentRecord, AssetRecord, LearningRecord, PromptRun, QualityReviewRecord, WorkspaceSettingsRecord } from "@/lib/types"

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
    assets: AssetRecord[]
    qualityReviews: QualityReviewRecord[]
    learnings: LearningRecord[]
  }
  dataHealth: DataHealthReport | null
  dataHealthFailed: boolean
  workspaceSettings: WorkspaceSettingsRecord | null
  aiProviderConfigured: boolean
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
    id: "suggest-playbook",
    name: "Suggest Playbook for Empty Campaign",
    description: "Suggests creating from a playbook when a campaign has no tasks or checklist.",
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
    id: "ai-provider-not-configured",
    name: "AI Provider Not Configured",
    description: "AI generation is enabled in settings but no provider API key was detected.",
    category: "Data Health",
    priority: "info",
    enabled: true,
  },
  {
    id: "ai-missing-youtube-package",
    name: "Missing YouTube Package (AI)",
    description: "Suggests opening YouTube Packaging to generate metadata with AI.",
    category: "Missing Asset",
    priority: "info",
    enabled: true,
  },
  {
    id: "ai-missing-youtube-thumbnail",
    name: "Missing YouTube Thumbnail (AI)",
    description: "Suggests opening YouTube Thumbnails to generate concepts with AI.",
    category: "Missing Asset",
    priority: "info",
    enabled: true,
  },
  {
    id: "ai-missing-social-content",
    name: "Missing Social Content (AI)",
    description: "Suggests opening Social Repurposing to generate captions with AI.",
    category: "Missing Asset",
    priority: "info",
    enabled: true,
  },
  {
    id: "ai-missing-email-campaign",
    name: "Missing Email Campaign (AI)",
    description: "Suggests opening Email Campaigns to generate copy with AI.",
    category: "Missing Asset",
    priority: "info",
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
    id: "asset-library-missing-thumbnail",
    name: "Thumbnail Record Without Asset",
    description: "Campaigns with YouTube Thumbnail records but no matching Asset Library entry.",
    category: "Missing Asset",
    priority: "medium",
    enabled: true,
  },
  {
    id: "asset-library-missing-mockup",
    name: "Mockup Prompt Without Asset",
    description: "Campaigns with Mockup Prompt records but no matching Asset Library entry.",
    category: "Missing Asset",
    priority: "medium",
    enabled: true,
  },
  {
    id: "asset-library-ready-no-thumbnail",
    name: "Ready to Publish Without Ready Asset",
    description: "Ready-to-publish campaigns missing a ready thumbnail or product image asset.",
    category: "Missing Asset",
    priority: "medium",
    enabled: true,
  },
  {
    id: "asset-library-prompt-run-unlinked",
    name: "Image Prompt Run Without Asset",
    description: "Prompt runs for thumbnails or mockups without a linked asset record.",
    category: "Missing Asset",
    priority: "info",
    enabled: true,
  },
  {
    id: "quality-review-missing-readiness",
    name: "Missing Campaign Readiness Review",
    description: "Ready-to-publish campaigns without a Campaign Readiness quality review.",
    category: "Publishing Checklist",
    priority: "medium",
    enabled: true,
  },
  {
    id: "quality-review-missing-youtube-package",
    name: "YouTube Package Without Quality Review",
    description: "Campaigns with a YouTube package but no quality review for it.",
    category: "Missing Asset",
    priority: "info",
    enabled: true,
  },
  {
    id: "quality-review-missing-youtube-thumbnail",
    name: "YouTube Thumbnail Without Quality Review",
    description: "Campaigns with a YouTube thumbnail but no quality review for it.",
    category: "Missing Asset",
    priority: "info",
    enabled: true,
  },
  {
    id: "quality-review-missing-product-listing",
    name: "Product Listing Without Quality Review",
    description: "Campaigns with a product listing but no quality review for it.",
    category: "Missing Asset",
    priority: "info",
    enabled: true,
  },
  {
    id: "quality-review-low-score",
    name: "Low Quality Score",
    description: "Quality reviews below 60 suggest revision before publishing.",
    category: "Campaign Stage",
    priority: "medium",
    enabled: true,
  },
  {
    id: "quality-review-readiness-below-70",
    name: "Campaign Readiness Below 70",
    description: "Campaign readiness reviews below 70 suggest fixes before publish.",
    category: "Publishing Checklist",
    priority: "high",
    enabled: true,
  },
  {
    id: "learning-missing-from-analytics",
    name: "Analytics Without Learning",
    description: "Analytics records with what worked / did not work but no linked learning.",
    category: "Task Automation",
    priority: "info",
    enabled: true,
  },
  {
    id: "learning-missing-from-experiment",
    name: "Experiment Winner Without Learning",
    description: "Experiments with winners or learning summaries but no linked learning.",
    category: "Task Automation",
    priority: "info",
    enabled: true,
  },
  {
    id: "learning-missing-from-low-quality",
    name: "Low Quality Score Without Learning",
    description: "Quality reviews below 60 without a captured learning.",
    category: "Campaign Stage",
    priority: "medium",
    enabled: true,
  },
  {
    id: "learning-missing-campaign-final",
    name: "Completed Campaign Without Final Learning",
    description: "Archived or completed campaigns without a campaign strategy learning.",
    category: "Task Automation",
    priority: "info",
    enabled: true,
  },
  {
    id: "learning-apply-high-impact",
    name: "Apply High-Impact Learning",
    description: "High-impact learnings exist that may apply to similar campaigns.",
    category: "Task Automation",
    priority: "info",
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

function campaignHasAssetForSourceRecord(
  assets: AssetRecord[],
  sourceRecordType: string,
  sourceRecordId: string,
): boolean {
  return assets.some(
    (asset) =>
      asset.sourceRecordType === sourceRecordType &&
      asset.sourceRecordId === sourceRecordId,
  )
}

function campaignHasAssetType(
  assets: AssetRecord[],
  assetTypes: string[],
  readyOnly = false,
): boolean {
  const typeSet = new Set(assetTypes.map((t) => t.toLowerCase()))
  return assets.some((asset) => {
    if (!typeSet.has(asset.assetType.trim().toLowerCase())) return false
    if (!readyOnly) return true
    return ["Ready", "Used", "Published"].includes(asset.status)
  })
}

function evaluateMissingAssetLibrary(
  ctx: AutomationEvaluationContext,
  suggestions: AutomationSuggestion[],
) {
  const assets = ctx.store.assets ?? []

  for (const campaign of ctx.campaigns) {
    const campaignAssets = filterAssetsForCampaign(
      assets,
      campaign.id,
      campaign.campaignName,
    )

    for (const link of campaign.linkedRecords) {
      if (link.type === "youtube-thumbnail" && link.id) {
        if (!campaignHasAssetForSourceRecord(campaignAssets, "youtube-thumbnail", link.id)) {
          const href = `/assets?campaignId=${encodeURIComponent(campaign.id)}&sourceRecordType=youtube-thumbnail&sourceRecordId=${encodeURIComponent(link.id)}`
          suggestions.push({
            id: suggestionId(["asset-library-missing-thumbnail", campaign.id, link.id]),
            ruleId: "asset-library-missing-thumbnail",
            priority: "medium",
            category: "Missing Asset",
            title: "Save thumbnail as asset",
            description: `${campaign.campaignName || "Campaign"} has a YouTube Thumbnail record without a matching Asset Library entry.`,
            campaignId: campaign.id,
            campaignName: campaign.campaignName,
            sourceType: "youtube-thumbnail",
            sourceId: link.id,
            suggestedActionLabel: "Open Asset Library",
            actionType: "navigate",
            actionPayload: { href, campaignId: campaign.id },
            href,
            canApply: false,
            reason: "Thumbnail concepts should be tracked in Asset Library.",
          })
        }
      }

      if (link.type === "mockup-prompt" && link.id) {
        if (!campaignHasAssetForSourceRecord(campaignAssets, "mockup-prompt", link.id)) {
          const href = `/assets?campaignId=${encodeURIComponent(campaign.id)}&sourceRecordType=mockup-prompt&sourceRecordId=${encodeURIComponent(link.id)}`
          suggestions.push({
            id: suggestionId(["asset-library-missing-mockup", campaign.id, link.id]),
            ruleId: "asset-library-missing-mockup",
            priority: "medium",
            category: "Missing Asset",
            title: "Save mockup as asset",
            description: `${campaign.campaignName || "Campaign"} has a Mockup Prompt without a matching Asset Library entry.`,
            campaignId: campaign.id,
            campaignName: campaign.campaignName,
            sourceType: "mockup-prompt",
            sourceId: link.id,
            suggestedActionLabel: "Open Asset Library",
            actionType: "navigate",
            actionPayload: { href, campaignId: campaign.id },
            href,
            canApply: false,
            reason: "Mockup prompts should be tracked as production assets.",
          })
        }
      }
    }

    if (isReadyToPublishCampaignStatus(campaign.status)) {
      const isMusic = isMusicLaunchCampaign(campaign.campaignType)
      const isCommerce = isCommerceLaunchCampaign(campaign.campaignType)
      const requiredTypes = isMusic
        ? ["YouTube Thumbnail", "Video File", "Shorts Cover"]
        : isCommerce
          ? ["Product Image", "Product Mockup", "Merch Mockup"]
          : []

      if (
        requiredTypes.length > 0 &&
        !campaignHasAssetType(campaignAssets, requiredTypes, true)
      ) {
        const href = `/assets?campaignId=${encodeURIComponent(campaign.id)}`
        suggestions.push({
          id: suggestionId(["asset-library-ready-no-thumbnail", campaign.id]),
          ruleId: "asset-library-ready-no-thumbnail",
          priority: "medium",
          category: "Missing Asset",
          title: "Add ready production asset",
          description: `${campaign.campaignName || "Campaign"} is ready to publish but has no ready ${isMusic ? "thumbnail or video" : "product image or mockup"} asset.`,
          campaignId: campaign.id,
          campaignName: campaign.campaignName,
          suggestedActionLabel: "Open Asset Library",
          actionType: "navigate",
          actionPayload: { href, campaignId: campaign.id },
          href,
          canApply: false,
          reason: "Ready-to-publish campaigns should have at least one ready visual asset.",
        })
      }
    }
  }

  for (const run of ctx.store.runs) {
    if (run.moduleType !== "YouTube Thumbnail" && run.moduleType !== "Mockup Prompt") {
      continue
    }
    const hasLinkedAsset = assets.some((asset) => asset.sourcePromptRunId === run.id)
    if (hasLinkedAsset) continue

    const href = run.campaignId
      ? `/assets?campaignId=${encodeURIComponent(run.campaignId)}`
      : "/assets"
    suggestions.push({
      id: suggestionId(["asset-library-prompt-run-unlinked", run.id]),
      ruleId: "asset-library-prompt-run-unlinked",
      priority: "info",
      category: "Missing Asset",
      title: "Save prompt run output as asset",
      description: `${run.promptName || run.moduleType || "Prompt run"} has no linked Asset Library record.`,
      campaignId: run.campaignId || undefined,
      campaignName: run.campaignName || undefined,
      sourceType: "prompt-run",
      sourceId: run.id,
      suggestedActionLabel: "Open Asset Library",
      actionType: "navigate",
      actionPayload: { href, campaignId: run.campaignId },
      href,
      canApply: false,
      reason: "Image-generation prompt runs can be saved as assets.",
    })
  }
}

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

function evaluateSuggestPlaybook(
  ctx: AutomationEvaluationContext,
  suggestions: AutomationSuggestion[],
) {
  for (const campaign of ctx.campaigns) {
    if (extractPlaybookIdFromNotes(campaign.notes)) continue
    if (campaign.tasks.length > 0 || campaign.publishingChecklist.items.length > 0) continue

    suggestions.push({
      id: suggestionId(["suggest-playbook", campaign.id]),
      ruleId: "suggest-playbook",
      priority: "medium",
      category: "Publishing Checklist",
      title: "Create campaign from playbook",
      description: `${campaign.campaignName || "Campaign"} has no tasks or publishing checklist yet. Launch faster with a saved playbook.`,
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      suggestedActionLabel: "Open Playbooks",
      actionType: "navigate",
      actionPayload: { href: "/playbooks" },
      href: "/playbooks",
      canApply: false,
      reason: "Campaign has no tasks or publishing checklist and no playbook reference.",
    })
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

function evaluateCampaignCopilot(
  ctx: AutomationEvaluationContext,
  suggestions: AutomationSuggestion[],
) {
  if (!ctx.aiProviderConfigured) return

  for (const campaign of ctx.campaigns) {
    if (campaign.status !== "Ready to Publish") continue

    const hasCopilot = ctx.store.runs.some(
      (run) =>
        run.campaignId === campaign.id &&
        (run.moduleType === "Campaign Copilot" ||
          run.tags.includes("campaign-copilot") ||
          run.runType === "Copilot"),
    )
    if (hasCopilot) continue

    suggestions.push({
      id: suggestionId(["campaign-copilot-suggested", campaign.id]),
      ruleId: "campaign-copilot-suggested",
      priority: "info",
      category: "Campaign Copilot",
      title: "Run Campaign Copilot before publish",
      description: `${campaign.campaignName || "Campaign"} is Ready to Publish but has no Copilot analysis yet.`,
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      suggestedActionLabel: "Open Campaign Copilot",
      actionType: "navigate",
      actionPayload: {
        href: `/copilot?campaignId=${encodeURIComponent(campaign.id)}`,
      },
      href: `/copilot?campaignId=${encodeURIComponent(campaign.id)}`,
      canApply: false,
      reason: "Copilot can surface blockers, missing assets, and next actions before launch.",
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

function campaignHasReview(
  reviews: QualityReviewRecord[],
  campaign: CampaignRecord,
  reviewType?: string,
  sourceRecordType?: string,
  sourceRecordId?: string,
): boolean {
  const scoped = filterQualityReviewsForCampaign(reviews, campaign.id, campaign.campaignName)
  return scoped.some((review) => {
    if (reviewType && review.reviewType !== reviewType) return false
    if (sourceRecordType && review.sourceRecordType !== sourceRecordType) return false
    if (sourceRecordId && review.sourceRecordId !== sourceRecordId) return false
    return true
  })
}

function hasLearningForSource(
  learnings: LearningRecord[],
  sourceType: string,
  sourceId: string,
): boolean {
  return learnings.some(
    (learning) => learning.sourceType === sourceType && learning.sourceId === sourceId,
  )
}

function evaluateLearnings(ctx: AutomationEvaluationContext, suggestions: AutomationSuggestion[]) {
  const learnings = ctx.store.learnings ?? []
  const analytics = ctx.store.analyticsRecords ?? []

  for (const record of analytics) {
    const hasNotes = Boolean(record.whatWorked?.trim() || record.whatDidNotWork?.trim())
    if (hasNotes && !hasLearningForSource(learnings, "analytics", record.id)) {
      suggestions.push({
        id: suggestionId(["learning-missing-from-analytics", record.id]),
        ruleId: "learning-missing-from-analytics",
        priority: "info",
        category: "Task Automation",
        title: "Capture analytics learning",
        description: `"${record.itemName || "Analytics"}" has performance notes but no learning entry.`,
        suggestedActionLabel: "Create Learning",
        actionType: "navigate",
        actionPayload: {
          href: `/learnings?analyticsRecordId=${encodeURIComponent(record.id)}&learningType=${encodeURIComponent("Analytics Review")}`,
        },
        href: `/learnings?analyticsRecordId=${encodeURIComponent(record.id)}&learningType=${encodeURIComponent("Analytics Review")}`,
        canApply: false,
        reason: "Capture what worked for future campaigns.",
      })
    }
  }

  for (const experiment of ctx.store.experiments ?? []) {
    const hasSummary = Boolean(experiment.learningSummary?.trim() || experiment.winner)
    if (
      hasSummary &&
      !hasLearningForSource(learnings, "experiment", experiment.id) &&
      !learnings.some((l) => l.experimentId === experiment.id)
    ) {
      suggestions.push({
        id: suggestionId(["learning-missing-from-experiment", experiment.id]),
        ruleId: "learning-missing-from-experiment",
        priority: "info",
        category: "Task Automation",
        title: "Capture experiment learning",
        description: `"${experiment.experimentName || "Experiment"}" has results but no learning entry.`,
        campaignId: experiment.campaignId,
        campaignName: experiment.campaignName,
        suggestedActionLabel: "Create Learning",
        actionType: "navigate",
        actionPayload: {
          href: `/learnings?experimentId=${encodeURIComponent(experiment.id)}&learningType=${encodeURIComponent("Experiment Result")}`,
        },
        href: `/learnings?experimentId=${encodeURIComponent(experiment.id)}&learningType=${encodeURIComponent("Experiment Result")}`,
        canApply: false,
        reason: "Document experiment winners for reuse.",
      })
    }
  }

  const reviews = ctx.store.qualityReviews ?? []
  for (const review of reviews) {
    if (
      review.overallScore > 0 &&
      review.overallScore < 60 &&
      !learnings.some((l) => l.qualityReviewId === review.id)
    ) {
      suggestions.push({
        id: suggestionId(["learning-missing-from-low-quality", review.id]),
        ruleId: "learning-missing-from-low-quality",
        priority: "medium",
        category: "Campaign Stage",
        title: "Capture low-score learning",
        description: `"${review.reviewName || review.reviewType}" scored ${review.overallScore}/100 — document what to fix.`,
        campaignId: review.campaignId,
        campaignName: review.campaignName,
        suggestedActionLabel: "Create Learning",
        actionType: "navigate",
        actionPayload: { href: `/learnings?qualityReviewId=${encodeURIComponent(review.id)}` },
        href: `/learnings?qualityReviewId=${encodeURIComponent(review.id)}`,
        canApply: false,
        reason: "Low scores should inform future creative decisions.",
      })
    }
  }

  for (const campaign of ctx.campaigns) {
    const scoped = filterLearningsForCampaign(learnings, campaign.id, campaign.campaignName)
    if (
      (campaign.status === "Archived" || campaign.status === "Completed") &&
      !scoped.some((l) => l.learningType === "Campaign Strategy")
    ) {
      suggestions.push({
        id: suggestionId(["learning-missing-campaign-final", campaign.id]),
        ruleId: "learning-missing-campaign-final",
        priority: "info",
        category: "Task Automation",
        title: "Add final campaign learning",
        description: `${campaign.campaignName || "Campaign"} is complete but has no campaign strategy learning.`,
        campaignId: campaign.id,
        campaignName: campaign.campaignName,
        suggestedActionLabel: "Create Learning",
        actionType: "navigate",
        actionPayload: {
          href: `/learnings?campaignId=${encodeURIComponent(campaign.id)}&learningType=${encodeURIComponent("Campaign Strategy")}`,
        },
        href: `/learnings?campaignId=${encodeURIComponent(campaign.id)}&learningType=${encodeURIComponent("Campaign Strategy")}`,
        canApply: false,
        reason: "Archive campaigns with a final learning summary.",
      })
    }

    const highImpact = scoped.filter(
      (l) => l.impact === "High" && l.confidence !== "Low" && l.status === "Active",
    )
    if (highImpact.length > 0) {
      const top = highImpact[0]
      suggestions.push({
        id: suggestionId(["learning-apply-high-impact", campaign.id, top.id]),
        ruleId: "learning-apply-high-impact",
        priority: "info",
        category: "Task Automation",
        title: "Apply high-impact learning",
        description: `"${top.title}" may apply to ${campaign.campaignName || "this campaign"}.`,
        campaignId: campaign.id,
        campaignName: campaign.campaignName,
        suggestedActionLabel: "View Learning",
        actionType: "navigate",
        actionPayload: { href: `/learnings?recordId=${encodeURIComponent(top.id)}` },
        href: `/learnings?recordId=${encodeURIComponent(top.id)}`,
        canApply: false,
        reason: "Reuse proven tactics in campaign context prompts.",
      })
    }
  }
}

function evaluateQualityReviews(
  ctx: AutomationEvaluationContext,
  suggestions: AutomationSuggestion[],
) {
  const reviews = ctx.store.qualityReviews ?? []

  for (const campaign of ctx.campaigns) {
    const campaignReviews = filterQualityReviewsForCampaign(
      reviews,
      campaign.id,
      campaign.campaignName,
    )

    if (
      campaign.status === "Ready to Publish" &&
      !campaignHasReview(reviews, campaign, "Campaign Readiness")
    ) {
      suggestions.push({
        id: suggestionId(["quality-review-missing-readiness", campaign.id]),
        ruleId: "quality-review-missing-readiness",
        priority: "medium",
        category: "Publishing Checklist",
        title: "Add campaign readiness review",
        description: `${campaign.campaignName || "Campaign"} is Ready to Publish but has no Campaign Readiness quality review.`,
        campaignId: campaign.id,
        campaignName: campaign.campaignName,
        suggestedActionLabel: "New Quality Review",
        actionType: "navigate",
        actionPayload: {
          href: `/quality?campaignId=${encodeURIComponent(campaign.id)}&reviewType=${encodeURIComponent("Campaign Readiness")}`,
        },
        href: `/quality?campaignId=${encodeURIComponent(campaign.id)}&reviewType=${encodeURIComponent("Campaign Readiness")}`,
        canApply: false,
        reason: "Quality review helps validate launch readiness before publish.",
      })
    }

    const youtubeLink = campaign.linkedRecords.find((link) => link.type === "youtube-package")
    if (
      youtubeLink &&
      !campaignHasReview(reviews, campaign, "YouTube Package", "youtube-package", youtubeLink.id)
    ) {
      suggestions.push({
        id: suggestionId(["quality-review-missing-youtube-package", campaign.id, youtubeLink.id]),
        ruleId: "quality-review-missing-youtube-package",
        priority: "info",
        category: "Missing Asset",
        title: "Review YouTube package",
        description: `${campaign.campaignName || "Campaign"} has a YouTube package without a quality review.`,
        campaignId: campaign.id,
        campaignName: campaign.campaignName,
        suggestedActionLabel: "Review YouTube Package",
        actionType: "navigate",
        actionPayload: {
          href: `/quality?campaignId=${encodeURIComponent(campaign.id)}&sourceRecordType=youtube-package&sourceRecordId=${encodeURIComponent(youtubeLink.id)}&reviewType=${encodeURIComponent("YouTube Package")}`,
        },
        href: `/quality?campaignId=${encodeURIComponent(campaign.id)}&sourceRecordType=youtube-package&sourceRecordId=${encodeURIComponent(youtubeLink.id)}&reviewType=${encodeURIComponent("YouTube Package")}`,
        canApply: false,
        reason: "Score metadata before publishing.",
      })
    }

    const thumbnailLink = campaign.linkedRecords.find(
      (link) => link.type === "youtube-thumbnail",
    )
    if (
      thumbnailLink &&
      !campaignHasReview(
        reviews,
        campaign,
        "Thumbnail",
        "youtube-thumbnail",
        thumbnailLink.id,
      )
    ) {
      suggestions.push({
        id: suggestionId([
          "quality-review-missing-youtube-thumbnail",
          campaign.id,
          thumbnailLink.id,
        ]),
        ruleId: "quality-review-missing-youtube-thumbnail",
        priority: "info",
        category: "Missing Asset",
        title: "Review YouTube thumbnail",
        description: `${campaign.campaignName || "Campaign"} has a YouTube thumbnail without a quality review.`,
        campaignId: campaign.id,
        campaignName: campaign.campaignName,
        suggestedActionLabel: "Review Thumbnail",
        actionType: "navigate",
        actionPayload: {
          href: `/quality?campaignId=${encodeURIComponent(campaign.id)}&sourceRecordType=youtube-thumbnail&sourceRecordId=${encodeURIComponent(thumbnailLink.id)}&reviewType=${encodeURIComponent("Thumbnail")}`,
        },
        href: `/quality?campaignId=${encodeURIComponent(campaign.id)}&sourceRecordType=youtube-thumbnail&sourceRecordId=${encodeURIComponent(thumbnailLink.id)}&reviewType=${encodeURIComponent("Thumbnail")}`,
        canApply: false,
        reason: "Score thumbnail creative before publishing.",
      })
    }

    const productListingLink = campaign.linkedRecords.find(
      (link) => link.type === "product-listing",
    )
    if (
      productListingLink &&
      !campaignHasReview(
        reviews,
        campaign,
        "Product Listing",
        "product-listing",
        productListingLink.id,
      )
    ) {
      suggestions.push({
        id: suggestionId([
          "quality-review-missing-product-listing",
          campaign.id,
          productListingLink.id,
        ]),
        ruleId: "quality-review-missing-product-listing",
        priority: "info",
        category: "Missing Asset",
        title: "Review product listing",
        description: `${campaign.campaignName || "Campaign"} has a product listing without a quality review.`,
        campaignId: campaign.id,
        campaignName: campaign.campaignName,
        suggestedActionLabel: "Create Quality Review",
        actionType: "navigate",
        actionPayload: {
          href: `/quality?campaignId=${encodeURIComponent(campaign.id)}&sourceRecordType=product-listing&sourceRecordId=${encodeURIComponent(productListingLink.id)}&reviewType=${encodeURIComponent("Product Listing")}`,
        },
        href: `/quality?campaignId=${encodeURIComponent(campaign.id)}&sourceRecordType=product-listing&sourceRecordId=${encodeURIComponent(productListingLink.id)}&reviewType=${encodeURIComponent("Product Listing")}`,
        canApply: false,
        reason: "Score product copy before publishing.",
      })
    }

    for (const review of campaignReviews) {
      if (review.overallScore > 0 && review.overallScore < 60) {
        suggestions.push({
          id: suggestionId(["quality-review-low-score", review.id]),
          ruleId: "quality-review-low-score",
          priority: "medium",
          category: "Campaign Stage",
          title: "Quality score suggests revision",
          description: `"${review.reviewName || review.reviewType}" scored ${review.overallScore}/100.`,
          campaignId: campaign.id,
          campaignName: campaign.campaignName,
          suggestedActionLabel: "Open Review",
          actionType: "navigate",
          actionPayload: { href: `/quality?recordId=${encodeURIComponent(review.id)}` },
          href: `/quality?recordId=${encodeURIComponent(review.id)}`,
          canApply: false,
          reason: "Scores below 60 usually need revision before publishing.",
        })
      }

      if (
        review.reviewType === "Campaign Readiness" &&
        review.overallScore > 0 &&
        review.overallScore < 70 &&
        campaign.status === "Ready to Publish"
      ) {
        suggestions.push({
          id: suggestionId(["quality-review-readiness-below-70", review.id]),
          ruleId: "quality-review-readiness-below-70",
          priority: "high",
          category: "Publishing Checklist",
          title: "Campaign readiness below 70",
          description: `Readiness review scored ${review.overallScore}/100 — address gaps before publishing.`,
          campaignId: campaign.id,
          campaignName: campaign.campaignName,
          suggestedActionLabel: "Fix Before Publish",
          actionType: "navigate",
          actionPayload: { href: `/quality?recordId=${encodeURIComponent(review.id)}` },
          href: `/quality?recordId=${encodeURIComponent(review.id)}`,
          canApply: false,
          reason: "Publishing checklist recommends readiness score ≥ 70.",
        })
      }
    }
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

const AI_MISSING_ASSET_RULES: {
  type: CampaignLinkedRecordType
  ruleId: string
  title: string
}[] = [
  {
    type: "youtube-package",
    ruleId: "ai-missing-youtube-package",
    title: "Generate YouTube metadata with AI",
  },
  {
    type: "youtube-thumbnail",
    ruleId: "ai-missing-youtube-thumbnail",
    title: "Generate thumbnail concepts with AI",
  },
  {
    type: "social-repurposing",
    ruleId: "ai-missing-social-content",
    title: "Generate social captions with AI",
  },
  {
    type: "email-campaign",
    ruleId: "ai-missing-email-campaign",
    title: "Generate email campaign with AI",
  },
]

function evaluateAIGeneration(
  ctx: AutomationEvaluationContext,
  suggestions: AutomationSuggestion[],
) {
  if (ctx.workspaceSettings?.aiGenerationEnabled && !ctx.aiProviderConfigured) {
    suggestions.push({
      id: suggestionId(["ai-provider-not-configured"]),
      ruleId: "ai-provider-not-configured",
      priority: "info",
      category: "Data Health",
      title: "AI provider not configured",
      description:
        "AI generation is enabled in Workspace Settings, but no provider API key was found. Add OPENAI_API_KEY to .env.local.",
      suggestedActionLabel: "Open AI Settings",
      actionType: "navigate",
      actionPayload: { href: "/settings" },
      href: "/settings",
      canApply: false,
      reason: "Environment is missing a configured AI provider.",
    })
  }

  for (const campaign of ctx.campaigns) {
    const dashboard = buildLaunchDashboardData(campaign, ctx.store)
    for (const rule of AI_MISSING_ASSET_RULES) {
      const asset = dashboard.readiness.assets.find((entry) => entry.type === rule.type)
      if (!asset || asset.completed) continue

      const repair = buildMissingAssetRepair(campaign, rule.type)
      if (!repair || repair.kind !== "create-asset") continue

      suggestions.push({
        id: suggestionId([rule.ruleId, campaign.id, rule.type]),
        ruleId: rule.ruleId,
        priority: "info",
        category: "Missing Asset",
        title: rule.title,
        description: `${campaign.campaignName || "Campaign"} is missing ${asset.label.toLowerCase()}. Open the module to generate with AI (optional).`,
        campaignId: campaign.id,
        campaignName: campaign.campaignName,
        sourceType: "campaign",
        sourceId: campaign.id,
        suggestedActionLabel: repair.label,
        actionType: "navigate",
        actionPayload: { campaignId: campaign.id, href: repair.href },
        href: repair.href,
        canApply: false,
        reason: "Navigate to module — AI generation is optional and not auto-triggered.",
      })
    }
  }
}

const RULE_EVALUATORS: Array<(ctx: AutomationEvaluationContext, out: AutomationSuggestion[]) => void> = [
  evaluateMissingAssets,
  evaluateMissingAssetLibrary,
  evaluateSuggestPlaybook,
  evaluateMissingPublishingChecklist,
  evaluatePublishedReviewTasks,
  evaluateReadyToPublishStatus,
  evaluatePublishedMissingAnalytics,
  evaluateDataHealth,
  evaluateAIGeneration,
  evaluateExperiments,
  evaluatePromptHistory,
  evaluateCampaignCopilot,
  evaluateExportBundle,
  evaluateQualityReviews,
  evaluateLearnings,
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
