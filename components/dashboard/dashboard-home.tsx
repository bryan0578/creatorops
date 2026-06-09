"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ImagePlus,
  Library,
  Megaphone,
  Mail,
  Play,
  Plus,
  Search,
  Sparkles,
  Share2,
  ShoppingBag,
  Users,
  Video,
  Workflow as WorkflowIcon,
} from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import type { CampaignRecord, Prompt, Workflow } from "@/lib/types"
import {
  campaignStatusBadgeClass,
  formatDashboardDate,
  formatLaunchLabel,
  getCampaignSubject,
  getCampaignTaskProgress,
  getUpcomingLaunches,
  priorityBadgeClass,
  sortActiveCampaigns,
} from "@/lib/dashboard"

import { PageHeader } from "@/components/app-shell"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { RatingStars } from "@/components/rating-stars"
import { StatusBadge } from "@/components/workflows/status-badge"
import { PromptFormDialog } from "@/components/prompts/prompt-form-dialog"
import { RecentActivityTimeline } from "@/components/activity/recent-activity-timeline"

function CompactStatCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string
  value: React.ReactNode
  icon: React.ElementType
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-border/80 bg-card px-3 py-2.5 shadow-sm transition-colors hover:bg-muted/30"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/50">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums leading-tight">{value}</p>
      </div>
    </Link>
  )
}

function ActiveCampaignCard({ campaign }: { campaign: CampaignRecord }) {
  const progress = getCampaignTaskProgress(campaign.tasks)
  const launchLabel = formatLaunchLabel(campaign.launchDate)

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 transition-colors hover:border-primary/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold sm:text-base">
              {campaign.campaignName || "Untitled campaign"}
            </h3>
            <Badge
              variant="outline"
              className={cn("text-[10px]", campaignStatusBadgeClass(campaign.status))}
            >
              {campaign.status}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {campaign.campaignType}
            </Badge>
            <Badge
              variant="outline"
              className={cn("text-[10px]", priorityBadgeClass(campaign.priority))}
            >
              {campaign.priority}
            </Badge>
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {getCampaignSubject(campaign)}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="text-foreground/90">{launchLabel}</span>
            <span>
              {campaign.linkedRecords.length} linked
            </span>
            {progress ? (
              <span>{progress.label}</span>
            ) : (
              <span>No tasks yet</span>
            )}
          </div>
          {progress ? (
            <div className="h-1 max-w-sm overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          ) : null}
        </div>
        <Link
          href={`/campaigns?campaignId=${encodeURIComponent(campaign.id)}`}
          className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
        >
          Open
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  )
}

function QuickCreateButton({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ElementType
  label: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "h-8 justify-start gap-2 px-2.5",
      )}
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate text-xs">{label}</span>
    </Link>
  )
}

export function DashboardHome() {
  const {
    prompts,
    workflows,
    runs,
    workflowRuns,
    youtubePackages,
    productListings,
    releasePlans,
    analyticsRecords,
    campaigns,
    artistRecords,
    youtubeThumbnailRecords,
    merchIdeas,
    socialRepurposingRecords,
    mockupPromptRecords,
    emailCampaignRecords,
    campaignsUseDatabase,
    addPrompt,
  } = useStore()

  const [promptFormOpen, setPromptFormOpen] = React.useState(false)

  const todayLabel = React.useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [],
  )

  const activeCampaignList = React.useMemo(
    () => sortActiveCampaigns(campaigns),
    [campaigns],
  )

  const upcomingLaunches = React.useMemo(
    () => getUpcomingLaunches(campaigns, releasePlans, 6),
    [campaigns, releasePlans],
  )

  const activeWorkflows = workflows.filter((w) => w.status === "Active").length

  const topCategories = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of prompts) {
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  }, [prompts])

  const topRated = React.useMemo(
    () => [...prompts].sort((a, b) => b.rating - a.rating).slice(0, 4),
    [prompts],
  )

  const recentPrompts = React.useMemo(
    () => [...prompts].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4),
    [prompts],
  )

  const recentWorkflows = React.useMemo(
    () => [...workflows].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4),
    [workflows],
  )

  const moreModuleStats = [
    { label: "Artists", value: artistRecords.length, href: "/artist-crm" },
    {
      label: "Product listings",
      value: productListings.length,
      href: "/product-listings",
    },
    { label: "Prompt runs", value: runs.length, href: "/runner" },
    { label: "Workflow runs", value: workflowRuns.length, href: "/workflow-runner" },
    { label: "Release plans", value: releasePlans.length, href: "/release-planner" },
    { label: "Merch ideas", value: merchIdeas.length, href: "/merch-ideas" },
    {
      label: "Social campaigns",
      value: socialRepurposingRecords.length,
      href: "/social-repurposing",
    },
    { label: "Mockup prompts", value: mockupPromptRecords.length, href: "/mockup-prompts" },
    { label: "Email campaigns", value: emailCampaignRecords.length, href: "/email-campaigns" },
  ]

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="CreatorOps Dashboard"
        description="Command center for active campaigns, upcoming launches, and recent work across your creator workspace."
        action={
          <div className="flex flex-col items-end gap-2">
            <p className="text-xs text-muted-foreground">{todayLabel}</p>
            <p className="text-xs text-muted-foreground">
              {campaignsUseDatabase ? "SQLite workspace" : "Local storage"} ·{" "}
              {activeCampaignList.length} active campaign
              {activeCampaignList.length === 1 ? "" : "s"}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link href="/campaigns" className={buttonVariants()}>
                <Megaphone className="size-4" />
                New Campaign
              </Link>
              <Link href="/runner" className={buttonVariants({ variant: "secondary" })}>
                <Play className="size-4" />
                Run Prompt
              </Link>
              <Link
                href="/youtube-packaging"
                className={buttonVariants({ variant: "outline" })}
              >
                <Video className="size-4" />
                Create YouTube Package
              </Link>
              <Link href="/search" className={buttonVariants({ variant: "outline" })}>
                <Search className="size-4" />
                Open Global Search
              </Link>
              <Link href="/presets" className={buttonVariants({ variant: "outline" })}>
                <Sparkles className="size-4" />
                Presets
              </Link>
            </div>
          </div>
        }
      />

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <CompactStatCard
          label="Active campaigns"
          value={activeCampaignList.length}
          icon={Megaphone}
          href="/campaigns"
        />
        <CompactStatCard
          label="Total prompts"
          value={prompts.length}
          icon={Library}
          href="/prompts"
        />
        <CompactStatCard
          label="Saved workflows"
          value={workflows.length}
          icon={WorkflowIcon}
          href="/workflows"
        />
        <CompactStatCard
          label="YouTube packages"
          value={youtubePackages.length}
          icon={Video}
          href="/youtube-packaging"
        />
        <CompactStatCard
          label="Thumbnails"
          value={youtubeThumbnailRecords.length}
          icon={ImagePlus}
          href="/youtube-thumbnails"
        />
        <CompactStatCard
          label="Analytics records"
          value={analyticsRecords.length}
          icon={BarChart3}
          href="/analytics"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/80 xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Campaigns</CardTitle>
            <CardDescription>
              Planning and active launch campaigns across your workspace
            </CardDescription>
            <CardAction>
              <Link
                href="/campaigns"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                View all
                <ArrowRight className="size-4" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {activeCampaignList.length ? (
              activeCampaignList.map((campaign) => (
                <ActiveCampaignCard key={campaign.id} campaign={campaign} />
              ))
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/80 py-6 text-center">
                <p className="max-w-sm text-sm text-muted-foreground text-pretty">
                  No active or planning campaigns yet.
                </p>
                <Link href="/campaigns" className={buttonVariants({ size: "sm" })}>
                  <Plus className="size-4" />
                  Create Campaign
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upcoming Launches</CardTitle>
            <CardDescription>Campaign and release dates, soonest first</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            {upcomingLaunches.length ? (
              upcomingLaunches.map((item) => (
                <div
                  key={`${item.source}-${item.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/80 px-2.5 py-2"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{formatDashboardDate(item.date)}</span>
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                        {item.type}
                      </Badge>
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                  <Link
                    href={item.href}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "h-7 shrink-0 px-2 text-xs",
                    )}
                  >
                    Open
                  </Link>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-border/60 px-3 py-4 text-center">
                <p className="text-xs text-muted-foreground text-pretty">
                  No upcoming launch dates.
                </p>
                <Link
                  href="/campaigns"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "mt-2 h-7 text-xs",
                  )}
                >
                  Open Campaigns
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <RecentActivityTimeline limit={6} compact />

      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Create</CardTitle>
          <CardDescription>Jump straight into common creation flows</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 pt-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <QuickCreateButton
            href="/release-planner"
            icon={CalendarDays}
            label="Create Release Plan"
          />
          <QuickCreateButton
            href="/youtube-thumbnails"
            icon={ImagePlus}
            label="Create YouTube Thumbnail"
          />
          <QuickCreateButton
            href="/social-repurposing"
            icon={Share2}
            label="Create Social Content"
          />
          <QuickCreateButton
            href="/email-campaigns"
            icon={Mail}
            label="Create Email Campaign"
          />
          <QuickCreateButton
            href="/analytics"
            icon={BarChart3}
            label="Add Analytics Record"
          />
          <QuickCreateButton
            href="/product-listings"
            icon={ShoppingBag}
            label="Create Product Listing"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex h-full flex-col border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent prompts</CardTitle>
            <CardDescription>Recently created or updated</CardDescription>
            <CardAction>
              <Link
                href="/prompts"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                View all
                <ArrowRight className="size-4" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-1.5 pt-0">
            {recentPrompts.length ? (
              recentPrompts.map((p: Prompt) => (
                <Link
                  key={p.id}
                  href="/prompts"
                  className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.description}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {p.category}
                  </Badge>
                </Link>
              ))
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
                <p className="text-sm text-muted-foreground">No prompts yet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPromptFormOpen(true)}
                >
                  <Plus className="size-4" />
                  Create your first prompt
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent workflows</CardTitle>
            <CardDescription>Recently created or updated</CardDescription>
            <CardAction>
              <Link
                href="/workflows"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                View all
                <ArrowRight className="size-4" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-1.5 pt-0">
            {recentWorkflows.length ? (
              recentWorkflows.map((w: Workflow) => (
                <Link
                  key={w.id}
                  href="/workflows"
                  className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{w.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {w.steps.length} step{w.steps.length === 1 ? "" : "s"}
                      {w.estimatedTimeSaved ? ` · ${w.estimatedTimeSaved}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={w.status} />
                </Link>
              ))
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
                <p className="text-sm text-muted-foreground">No workflows yet.</p>
                <Link
                  href="/workflows"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Plus className="size-4" />
                  Create your first workflow
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Highest rated prompts</CardTitle>
            <CardDescription>Top performers in your library</CardDescription>
            <CardAction>
              <Link
                href="/prompts"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                View all
                <ArrowRight className="size-4" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-1.5 pt-0">
            {topRated.length ? (
              topRated.map((p: Prompt) => (
                <Link
                  key={p.id}
                  href="/prompts"
                  className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.category}</p>
                  </div>
                  <RatingStars rating={p.rating} size={12} />
                </Link>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No prompts yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-2">
        <div>
          <h2 className="text-sm font-semibold">More Modules</h2>
          <p className="text-xs text-muted-foreground">
            Additional workspace records and categories
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {moreModuleStats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="flex items-center justify-between rounded-md border border-border/80 px-2.5 py-2 text-sm transition-colors hover:bg-muted/40"
            >
              <span className="truncate text-xs text-muted-foreground">{stat.label}</span>
              <span className="ml-2 font-semibold tabular-nums">{stat.value}</span>
            </Link>
          ))}
          {topCategories.length > 0 ? (
            <Card className="border-border/80 sm:col-span-2 lg:col-span-2">
              <CardHeader className="py-2">
                <CardDescription className="text-xs">
                  Top prompt categories
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 pt-0 pb-3">
                {topCategories.map(([cat, count]) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate text-xs">{cat}</span>
                    <Badge variant="secondary" className="h-5 text-[10px]">
                      {count}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
        {activeWorkflows > 0 ? (
          <p className="text-xs text-muted-foreground">
            {activeWorkflows} active workflow{activeWorkflows === 1 ? "" : "s"} of{" "}
            {workflows.length} saved
          </p>
        ) : null}
      </section>

      <PromptFormDialog
        open={promptFormOpen}
        onOpenChange={setPromptFormOpen}
        initial={null}
        onSave={async (p) => {
          try {
            await addPrompt(p)
            toast.success("Prompt created")
          } catch {
            toast.error("Could not save prompt to database")
          }
        }}
      />
    </div>
  )
}
