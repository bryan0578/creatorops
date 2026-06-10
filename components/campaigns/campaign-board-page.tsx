"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  ExternalLink,
  LayoutGrid,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

import { updateCampaignStatus } from "@/lib/actions/campaigns"
import {
  CAMPAIGN_BOARD_STAGES,
  filterCampaignsForBoard,
  getStageConfig,
  groupCampaignsByStage,
  normalizeStatusToStage,
  stageToStatus,
  type CampaignBoardFilters,
  type CampaignBoardStage,
} from "@/lib/data/campaign-board"
import { getCampaignReadiness, type CampaignHealthLabel } from "@/lib/data/campaign-readiness"
import type { CampaignLinkableStoreSlice } from "@/lib/campaigns"
import { useStore } from "@/lib/store"
import type { CampaignRecord } from "@/lib/types"
import {
  campaignStatusBadgeClass,
  formatLaunchLabel,
  priorityBadgeClass,
} from "@/lib/dashboard"

import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { ModuleShell, RECENT_RECORDS_CARD_CLASS } from "@/components/module/form-layout"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

function healthBadgeClass(label: CampaignHealthLabel): string {
  switch (label) {
    case "Healthy":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
    case "Needs assets":
      return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "Broken links":
      return "border-destructive/50 bg-destructive/10 text-destructive"
    case "Incomplete":
      return "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-300"
    default:
      return ""
  }
}

function formatStageLabel(status: string): string {
  return getStageConfig(normalizeStatusToStage(status)).title
}

function CampaignBoardCard({
  campaign,
  store,
  onMove,
  moving,
}: {
  campaign: CampaignRecord
  store: CampaignLinkableStoreSlice
  onMove: (campaignId: string, stage: CampaignBoardStage) => Promise<void>
  moving: boolean
}) {
  const readiness = React.useMemo(
    () => getCampaignReadiness(campaign, store),
    [campaign, store],
  )

  const subject =
    campaign.songTitle || campaign.productName || campaign.niche || null
  const currentStage = normalizeStatusToStage(campaign.status)
  const dashboardHref = `/campaigns?campaignId=${encodeURIComponent(campaign.id)}`
  const primaryQuickAction = readiness.quickCreateActions[0]

  return (
    <Card className="border-border/80 bg-card shadow-sm transition-colors hover:border-primary/30">
      <CardHeader className="gap-2 space-y-0 p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <CardTitle className="line-clamp-2 text-sm leading-snug">
              {campaign.campaignName || "Untitled campaign"}
            </CardTitle>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-[10px]">
                {campaign.campaignType || "Campaign"}
              </Badge>
              <Badge
                variant="outline"
                className={cn("text-[10px]", campaignStatusBadgeClass(campaign.status))}
              >
                {formatStageLabel(campaign.status)}
              </Badge>
              {campaign.priority ? (
                <Badge
                  variant="outline"
                  className={cn("text-[10px]", priorityBadgeClass(campaign.priority))}
                >
                  {campaign.priority}
                </Badge>
              ) : null}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={moving}
                  aria-label="Campaign actions"
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Move to</DropdownMenuLabel>
              {CAMPAIGN_BOARD_STAGES.filter((stage) => stage.id !== currentStage).map(
                (stage) => (
                  <DropdownMenuItem
                    key={stage.id}
                    onClick={() => onMove(campaign.id, stage.id)}
                  >
                    {stage.title}
                  </DropdownMenuItem>
                ),
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  window.location.href = dashboardHref
                }}
              >
                Open Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  window.location.href = dashboardHref
                }}
              >
                Edit Campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3 pt-0">
        {campaign.artistName ? (
          <p className="truncate text-xs text-muted-foreground">{campaign.artistName}</p>
        ) : null}
        {subject ? (
          <p className="line-clamp-2 text-xs text-foreground/90">{subject}</p>
        ) : null}
        {campaign.launchDate.trim() ? (
          <p className="text-xs text-muted-foreground">{formatLaunchLabel(campaign.launchDate)}</p>
        ) : null}

        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <div>
            <span className="block text-foreground/80">{readiness.assetReadinessPercent}%</span>
            Asset readiness
          </div>
          <div>
            <span className="block text-foreground/80">{readiness.taskProgressPercent}%</span>
            Task progress
          </div>
          <div>
            <span className="block text-foreground/80">{readiness.linkedRecordCount}</span>
            Linked records
          </div>
          <div>
            <span className="block text-foreground/80">{readiness.missingAssets}</span>
            Missing assets
          </div>
        </div>

        <Badge variant="outline" className={cn("text-[10px]", healthBadgeClass(readiness.healthLabel))}>
          {readiness.healthLabel}
        </Badge>

        <div className="flex flex-wrap gap-1.5 pt-1">
          <Link href={dashboardHref} className={buttonVariants({ size: "sm", variant: "default" })}>
            Open Dashboard
          </Link>
          <Link
            href={dashboardHref}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            <Pencil className="size-3.5" />
            Edit
          </Link>
          {primaryQuickAction ? (
            <Link
              href={primaryQuickAction.href}
              className={buttonVariants({ size: "sm", variant: "secondary" })}
            >
              <ExternalLink className="size-3.5" />
              {primaryQuickAction.label}
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function BoardColumn({
  stage,
  campaigns,
  store,
  onMove,
  movingId,
}: {
  stage: (typeof CAMPAIGN_BOARD_STAGES)[number]
  campaigns: CampaignRecord[]
  store: CampaignLinkableStoreSlice
  onMove: (campaignId: string, stage: CampaignBoardStage) => Promise<void>
  movingId: string | null
}) {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-3">
      <div className={cn("rounded-xl border border-border/80 bg-muted/20 p-3", RECENT_RECORDS_CARD_CLASS)}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{stage.title}</h2>
          <Badge variant="secondary" className="tabular-nums">
            {campaigns.length}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground text-pretty">{stage.description}</p>
      </div>

      <div className="flex min-h-24 flex-col gap-2">
        {campaigns.length ? (
          campaigns.map((campaign) => (
            <CampaignBoardCard
              key={campaign.id}
              campaign={campaign}
              store={store}
              onMove={onMove}
              moving={movingId === campaign.id}
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
            No campaigns in this stage.
          </div>
        )}
      </div>
    </div>
  )
}

export function CampaignBoardPage() {
  const store = useStore()
  const [filters, setFilters] = React.useState<CampaignBoardFilters>({
    search: "",
    campaignType: "all",
    priority: "all",
    artist: "all",
    stage: "all",
    showArchived: false,
  })
  const [refreshing, setRefreshing] = React.useState(false)
  const [movingId, setMovingId] = React.useState<string | null>(null)

  const linkableStore = React.useMemo<CampaignLinkableStoreSlice>(
    () => ({
      releasePlans: store.releasePlans,
      youtubePackages: store.youtubePackages,
      youtubeThumbnailRecords: store.youtubeThumbnailRecords,
      socialRepurposingRecords: store.socialRepurposingRecords,
      merchIdeas: store.merchIdeas,
      productListings: store.productListings,
      mockupPromptRecords: store.mockupPromptRecords,
      emailCampaignRecords: store.emailCampaignRecords,
      analyticsRecords: store.analyticsRecords,
      artistRecords: store.artistRecords,
      workflows: store.workflows,
      workflowRuns: store.workflowRuns,
      runs: store.runs,
    }),
    [store],
  )

  const filterOptions = React.useMemo(() => {
    const values = new Set<string>()
    const priorities = new Set<string>()
    const artists = new Set<string>()
    for (const campaign of store.campaigns) {
      if (campaign.campaignType.trim()) values.add(campaign.campaignType)
      if (campaign.priority.trim()) priorities.add(campaign.priority)
      if (campaign.artistName.trim()) artists.add(campaign.artistName)
    }
    return {
      types: Array.from(values).sort(),
      priorities: Array.from(priorities).sort(),
      artists: Array.from(artists).sort(),
    }
  }, [store.campaigns])

  const filteredCampaigns = React.useMemo(
    () => filterCampaignsForBoard(store.campaigns, filters),
    [store.campaigns, filters],
  )

  const grouped = React.useMemo(
    () => groupCampaignsByStage(filteredCampaigns),
    [filteredCampaigns],
  )

  const visibleStages = React.useMemo(
    () =>
      filters.showArchived
        ? CAMPAIGN_BOARD_STAGES
        : CAMPAIGN_BOARD_STAGES.filter((stage) => stage.id !== "archived"),
    [filters.showArchived],
  )

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await store.reloadCampaigns()
      toast.success("Campaign board refreshed")
    } catch {
      toast.error("Could not refresh campaigns")
    } finally {
      setRefreshing(false)
    }
  }

  async function handleMove(campaignId: string, stage: CampaignBoardStage) {
    setMovingId(campaignId)
    try {
      const status = stageToStatus(stage)
      await updateCampaignStatus(campaignId, status)
      await store.reloadCampaigns()
      toast.success(`Campaign moved to ${getStageConfig(stage).title}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not move campaign")
    } finally {
      setMovingId(null)
    }
  }

  if (!store.hydrated) {
    return (
      <ModuleShell>
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading campaign board…
        </div>
      </ModuleShell>
    )
  }

  return (
    <ModuleShell>
      <ModulePageHeader
        title="Campaign Board"
        description="Visual pipeline for music releases, merch drops, product launches, and content campaigns."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/campaigns" className={buttonVariants({ size: "sm" })}>
              <Plus className="size-4" />
              New Campaign
            </Link>
            <Link href="/campaigns" className={buttonVariants({ size: "sm", variant: "outline" })}>
              Open Campaign Builder
            </Link>
            <Button type="button" size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Refresh
            </Button>
          </div>
        }
      />

      {store.campaigns.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No campaigns yet"
          description="Create your first campaign or seed PrettyWise demo data to test the pipeline."
          primaryActionLabel="Create Campaign"
          primaryActionHref="/campaigns"
          secondaryActionLabel="Open Backup Center"
          secondaryActionHref="/backups"
        />
      ) : (
        <>
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filters</CardTitle>
              <CardDescription>Search and narrow the pipeline view.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="space-y-1.5 xl:col-span-2">
                <Label htmlFor="board-search">Search campaigns</Label>
                <Input
                  id="board-search"
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  placeholder="Name, artist, song, product…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Campaign type</Label>
                <Select
                  value={filters.campaignType}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, campaignType: value ?? "all" }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <span className="truncate">{filters.campaignType === "all" ? "All types" : filters.campaignType}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {filterOptions.types.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={filters.priority}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, priority: value ?? "all" }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <span className="truncate">{filters.priority === "all" ? "All priorities" : filters.priority}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    {filterOptions.priorities.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Artist</Label>
                <Select
                  value={filters.artist}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, artist: value ?? "all" }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <span className="truncate">{filters.artist === "all" ? "All artists" : filters.artist}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All artists</SelectItem>
                    {filterOptions.artists.map((artist) => (
                      <SelectItem key={artist} value={artist}>
                        {artist}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select
                  value={filters.stage}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, stage: value ?? "all" }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <span className="truncate">
                      {filters.stage === "all"
                        ? "All stages"
                        : getStageConfig(filters.stage as CampaignBoardStage).title}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stages</SelectItem>
                    {CAMPAIGN_BOARD_STAGES.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  size="sm"
                  variant={filters.showArchived ? "secondary" : "outline"}
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, showArchived: !prev.showArchived }))
                  }
                >
                  {filters.showArchived ? "Hide archived" : "Show archived"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              {filteredCampaigns.length} campaign{filteredCampaigns.length === 1 ? "" : "s"} visible
            </span>
            <Link href="/campaigns" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Open Campaign Builder
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-4">
              {visibleStages.map((stage) => (
                <BoardColumn
                  key={stage.id}
                  stage={stage}
                  campaigns={grouped[stage.id]}
                  store={linkableStore}
                  onMove={handleMove}
                  movingId={movingId}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </ModuleShell>
  )
}
