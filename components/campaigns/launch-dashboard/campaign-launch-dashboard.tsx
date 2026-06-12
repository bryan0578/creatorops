"use client"

import Link from "next/link"
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  ExternalLink,
  ShieldCheck,
} from "lucide-react"

import {
  buildLaunchDashboardData,
  type LaunchAssetItem,
  type LaunchDashboardData,
  type LaunchReadiness,
} from "@/lib/campaign-launch-dashboard"
import type { CampaignLinkableStoreSlice } from "@/lib/campaigns"
import type { CampaignRecord, PromptRun, PublishingChecklist } from "@/lib/types"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RECENT_RECORDS_CARD_CLASS } from "@/components/module/form-layout"
import { cn } from "@/lib/utils"
import { CampaignExperimentsSection } from "@/components/campaigns/launch-dashboard/campaign-experiments-section"
import { CampaignBundleSection } from "@/components/campaigns/launch-dashboard/campaign-bundle-section"
import { CampaignExportPackSection } from "@/components/campaigns/launch-dashboard/campaign-export-pack-section"
import { CampaignPublishingChecklistCard } from "@/components/campaigns/launch-dashboard/campaign-publishing-checklist-card"
import { CampaignPromptHistoryCard } from "@/components/campaigns/launch-dashboard/campaign-prompt-history-card"
import { CampaignCopilotCard } from "@/components/campaigns/launch-dashboard/campaign-copilot-card"
import { CampaignAgentsCard } from "@/components/campaigns/launch-dashboard/campaign-agents-card"
import { CampaignCommerceCard } from "@/components/campaigns/launch-dashboard/campaign-commerce-card"
import { CampaignPatternInsightsCard } from "@/components/campaigns/launch-dashboard/campaign-pattern-insights-card"
import { CampaignQualityPerformanceCard } from "@/components/campaigns/launch-dashboard/campaign-quality-performance-card"
import { CampaignFeedbackLoopCard } from "@/components/campaigns/launch-dashboard/campaign-feedback-loop-card"
import { CampaignExternalLinksCard } from "@/components/integrations/campaign-external-links-card"
import { CampaignAssetLibraryCard } from "@/components/assets/asset-widgets"
import { CampaignPlaybookCard } from "@/components/playbooks/playbook-widgets"
import { CampaignLearningLibraryCard } from "@/components/learnings/learning-widgets"
import { CampaignQualityReviewCard } from "@/components/quality/quality-widgets"
import { CampaignAutomationSuggestionsCard } from "@/components/automation/automation-suggestions-card"
import { CampaignCalendarTimelineCard } from "@/components/calendar/calendar-widgets"

function formatLaunchDate(value: string) {
  if (!value.trim()) return "—"
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleDateString(undefined, { dateStyle: "medium" })
}

export function CampaignSummaryCard({ campaign }: { campaign: CampaignRecord }) {
  const fields = [
    { label: "Type", value: campaign.campaignType },
    { label: "Status", value: campaign.status },
    { label: "Priority", value: campaign.priority },
    { label: "Artist", value: campaign.artistName },
    { label: "Song", value: campaign.songTitle },
    { label: "Product", value: campaign.productName },
    { label: "Niche", value: campaign.niche },
    { label: "Launch date", value: formatLaunchDate(campaign.launchDate) },
    { label: "Primary goal", value: campaign.primaryGoal },
    { label: "Target audience", value: campaign.targetAudience },
  ]

  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader>
        <CardTitle className="text-base">{campaign.campaignName || "Untitled campaign"}</CardTitle>
        <CardDescription>Launch summary and campaign context</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((field) => (
            <div key={field.label} className="space-y-0.5">
              <dt className="text-xs text-muted-foreground">{field.label}</dt>
              <dd className="text-sm font-medium text-pretty">{field.value || "—"}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

export function CampaignReadinessScore({ readiness }: { readiness: LaunchReadiness }) {
  if (readiness.total === 0) {
    return (
      <Card className={RECENT_RECORDS_CARD_CLASS}>
        <CardHeader>
          <CardTitle className="text-base">Asset readiness</CardTitle>
          <CardDescription>
            Set a Music Release or Commerce campaign type to track launch assets.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Asset readiness</CardTitle>
        <CardDescription>
          {readiness.completed} of {readiness.total} required assets ready
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <span className="text-3xl font-semibold tabular-nums">{readiness.score}%</span>
          <Badge variant="secondary">{readiness.label}</Badge>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${readiness.score}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-pretty">
          Asset readiness tracks required records. Task progress tracks execution.
        </p>
      </CardContent>
    </Card>
  )
}

function AssetStatusIcon({ completed }: { completed: boolean }) {
  return completed ? (
    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
  ) : (
    <Circle className="size-4 shrink-0 text-muted-foreground" />
  )
}

export function CampaignAssetChecklist({ assets }: { assets: LaunchAssetItem[] }) {
  if (!assets.length) {
    return (
      <Card className={RECENT_RECORDS_CARD_CLASS}>
        <CardHeader>
          <CardTitle className="text-base">Asset checklist</CardTitle>
          <CardDescription>
            Choose Music Release or a Commerce campaign type to see required launch assets.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader>
        <CardTitle className="text-base">Asset checklist</CardTitle>
        <CardDescription>
          Linked records count first; related matches fill gaps without duplicating links.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {assets.map((asset) => (
          <div
            key={asset.key}
            className="flex flex-col gap-2 rounded-lg border border-border/80 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-2">
              <AssetStatusIcon completed={asset.completed} />
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">{asset.label}</p>
                {asset.completed ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {asset.title}
                    {asset.inferredMatch ? " · matched" : asset.formallyLinked ? " · linked" : ""}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Missing</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5 sm:justify-end">
              {asset.completed && asset.href ? (
                <Link
                  href={asset.href}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Open
                  <ExternalLink className="size-3.5" />
                </Link>
              ) : null}
              {!asset.completed && asset.createHref && asset.createLabel ? (
                <Link href={asset.createHref} className={buttonVariants({ size: "sm" })}>
                  {asset.createLabel}
                </Link>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function CampaignTaskProgress({
  taskProgress,
  onGoToTasks,
}: {
  taskProgress: LaunchDashboardData["taskProgress"]
  onGoToTasks: () => void
}) {
  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Task progress</CardTitle>
        <CardDescription>
          {taskProgress.completed} of {taskProgress.total} tasks complete
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium tabular-nums">{taskProgress.percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand-secondary transition-all"
              style={{ width: `${taskProgress.percent}%` }}
            />
          </div>
        </div>
        {taskProgress.nextTasks.length ? (
          <ul className="space-y-2 text-sm">
            {taskProgress.nextTasks.map((task) => (
              <li
                key={task.id}
                className="rounded-md border border-border/70 px-2.5 py-2 text-pretty"
              >
                <span className="font-medium">{task.title || "Untitled task"}</span>
                {task.dueDate ? (
                  <span className="ml-2 text-xs text-muted-foreground">Due {task.dueDate}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No open tasks — add tasks in the Tasks tab.</p>
        )}
        <Button type="button" variant="outline" size="sm" onClick={onGoToTasks}>
          Go to Tasks
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  )
}

export function CampaignLinkedRecordsSummary({
  counts,
}: {
  counts: LaunchDashboardData["linkedGroupCounts"]
}) {
  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader>
        <CardTitle className="text-base">Linked records</CardTitle>
        <CardDescription>Grouped counts across this campaign</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {counts.map((group) => (
            <div
              key={group.id}
              className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2"
            >
              <p className="text-xs text-muted-foreground">{group.label}</p>
              <p className="text-lg font-semibold tabular-nums">{group.count}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function CampaignHealthSummary({
  warnings,
}: {
  warnings: LaunchDashboardData["healthWarnings"]
}) {
  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">Data health</CardTitle>
          <CardDescription>Campaign-specific warnings from local data checks</CardDescription>
        </div>
        <Link href="/data-health" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Open Data Health
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {warnings.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            No broken links or major issues for this campaign.
          </p>
        ) : (
          warnings.map((warning) => (
            <div
              key={warning.id}
              className={cn(
                "flex gap-2 rounded-lg border px-3 py-2 text-sm",
                warning.severity === "critical"
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-amber-500/30 bg-amber-500/5",
              )}
            >
              {warning.severity === "critical" ? (
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300" />
              )}
              <div>
                <p className="font-medium">{warning.title}</p>
                <p className="text-muted-foreground text-pretty">{warning.description}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export function CampaignNextActions({
  actions,
  onGoToTasks,
}: {
  actions: LaunchDashboardData["nextActions"]
  onGoToTasks: () => void
}) {
  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader>
        <CardTitle className="text-base">Next best actions</CardTitle>
        <CardDescription>Suggested steps based on missing assets and open tasks</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {actions.map((action) =>
          action.kind === "task" ? (
            <Button key={action.id} type="button" variant="outline" size="sm" onClick={onGoToTasks}>
              {action.label}
            </Button>
          ) : (
            <Link
              key={action.id}
              href={action.href}
              className={buttonVariants({
                variant: action.kind === "create" ? "default" : "outline",
                size: "sm",
              })}
            >
              {action.label}
            </Link>
          ),
        )}
      </CardContent>
    </Card>
  )
}

export function CampaignLaunchDashboard({
  campaign,
  store,
  promptRuns,
  onGoToTasks,
  onGoToPublishingChecklist,
  onGeneratePublishingChecklist,
  onGoToOverview,
  onGoToSaved,
  onGoToLinked,
}: {
  campaign: CampaignRecord
  store: CampaignLinkableStoreSlice
  promptRuns: PromptRun[]
  onGoToTasks: () => void
  onGoToPublishingChecklist: () => void
  onGeneratePublishingChecklist: (checklist: PublishingChecklist) => void
  onGoToOverview: () => void
  onGoToSaved: () => void
  onGoToLinked: () => void
}) {
  const data = buildLaunchDashboardData(campaign, store)
  const hasRequiredAssets = data.readiness.total > 0
  const hasLinkedRecords = campaign.linkedRecords.length > 0

  return (
    <div className="space-y-6">
      <CampaignSummaryCard campaign={campaign} />

      <CampaignCopilotCard campaign={campaign} launchData={data} />

      <CampaignAgentsCard campaign={campaign} />

      <CampaignCommerceCard campaign={campaign} />

      <CampaignPatternInsightsCard
        campaignId={campaign.id}
        campaignName={campaign.campaignName}
      />

      <CampaignQualityPerformanceCard
        campaignId={campaign.id}
        campaignName={campaign.campaignName}
      />

      <CampaignFeedbackLoopCard
        campaignId={campaign.id}
        campaignName={campaign.campaignName}
      />

      <CampaignExternalLinksCard campaignId={campaign.id} />

      <CampaignPlaybookCard campaign={campaign} />

      <div className="grid gap-4 xl:grid-cols-2">
        <CampaignReadinessScore readiness={data.readiness} />
        <CampaignTaskProgress taskProgress={data.taskProgress} onGoToTasks={onGoToTasks} />
      </div>

      {!hasRequiredAssets ? (
        <EmptyState
          icon={ShieldCheck}
          title="Set a launch campaign type"
          description="Choose Music Release or a Commerce campaign type on Overview to unlock readiness tracking and asset checklists."
          primaryActionLabel="Edit Overview"
          primaryActionOnClick={onGoToOverview}
        />
      ) : (
        <CampaignAssetChecklist assets={data.readiness.assets} />
      )}

      {!hasLinkedRecords && hasRequiredAssets ? (
        <EmptyState
          title="No linked records yet"
          description="Use the checklist above to create assets with campaign prefill, or link existing records from the Linked Records tab."
          primaryActionLabel={
            data.readiness.assets.find((a) => a.createHref)?.createLabel ??
            "Create asset"
          }
          primaryActionHref={
            data.readiness.assets.find((a) => a.createHref)?.createHref
          }
          secondaryActionLabel="View Linked Records"
          secondaryActionOnClick={onGoToLinked}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <CampaignLinkedRecordsSummary counts={data.linkedGroupCounts} />
        <CampaignHealthSummary warnings={data.healthWarnings} />
      </div>

      <CampaignNextActions actions={data.nextActions} onGoToTasks={onGoToTasks} />

      <div className="grid gap-4 xl:grid-cols-2">
        <CampaignAutomationSuggestionsCard campaignId={campaign.id} />
        <CampaignCalendarTimelineCard campaignId={campaign.id} />
        <CampaignAssetLibraryCard campaignId={campaign.id} />
        <CampaignQualityReviewCard
          campaignId={campaign.id}
          campaignName={campaign.campaignName}
          linkedRecords={campaign.linkedRecords}
        />
        <CampaignLearningLibraryCard
          campaignId={campaign.id}
          campaignName={campaign.campaignName}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <CampaignExportPackSection
          campaignId={campaign.id}
          campaignName={campaign.campaignName}
        />
        <CampaignBundleSection
          campaignId={campaign.id}
          campaignName={campaign.campaignName}
        />
        <CampaignExperimentsSection
          campaignId={campaign.id}
          campaignName={campaign.campaignName}
        />
      </div>

      <CampaignPublishingChecklistCard
        campaign={campaign}
        onOpenChecklist={onGoToPublishingChecklist}
        onGenerateChecklist={onGeneratePublishingChecklist}
      />

      <CampaignPromptHistoryCard campaign={campaign} runs={promptRuns} />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onGoToSaved}>
          Open Saved Campaigns
        </Button>
      </div>
    </div>
  )
}

export function CampaignLaunchDashboardEmpty({
  onCreateCampaign,
  onGoToSaved,
}: {
  onCreateCampaign: () => void
  onGoToSaved: () => void
}) {
  return (
    <EmptyState
      icon={ShieldCheck}
      title="No campaign selected"
      description="Open or create a campaign to view its launch dashboard."
      primaryActionLabel="Create Campaign"
      primaryActionOnClick={onCreateCampaign}
      secondaryActionLabel="Open Saved Campaigns"
      secondaryActionOnClick={onGoToSaved}
    />
  )
}
