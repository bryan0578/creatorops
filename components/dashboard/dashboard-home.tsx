"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Download,
  ImageIcon,
  ImagePlus,
  Library,
  Mail,
  ListChecks,
  Play,
  Plus,
  Share2,
  Shirt,
  ShoppingBag,
  Star,
  Users,
  Workflow as WorkflowIcon,
  Video,
} from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import type { Prompt, Workflow } from "@/lib/types"
import { downloadJson } from "@/lib/storage"

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
import { WorkflowFormDialog } from "@/components/workflows/workflow-form-dialog"

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string
  value: React.ReactNode
  icon: React.ElementType
  hint?: string
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardDescription>{label}</CardDescription>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground text-pretty">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function DashboardHome() {
  const {
    prompts,
    workflows,
    runs,
    workflowRuns,
    youtubePackages,
    merchIdeas,
    productListings,
    socialRepurposingRecords,
    releasePlans,
    analyticsRecords,
    mockupPromptRecords,
    emailCampaignRecords,
    artistRecords,
    youtubeThumbnailRecords,
    addPrompt,
    addWorkflow,
  } = useStore()

  const [promptFormOpen, setPromptFormOpen] = React.useState(false)
  const [workflowFormOpen, setWorkflowFormOpen] = React.useState(false)

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

  function handleExport() {
    downloadJson("creatorops-library.json", {
      prompts,
      workflows,
      exportedAt: new Date().toISOString(),
    })
    toast.success("Exported full library")
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Your command center for prompts and workflows across channels, label, merch, and digital products."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setPromptFormOpen(true)}>
              <Plus className="size-4" />
              Create prompt
            </Button>
            <Button variant="outline" onClick={() => setWorkflowFormOpen(true)}>
              <Plus className="size-4" />
              Create workflow
            </Button>
            <Link href="/runner" className={buttonVariants({ variant: "outline" })}>
              <Play className="size-4" />
              Prompt Runner
            </Link>
            <Link
              href="/workflow-runner"
              className={buttonVariants({ variant: "outline" })}
            >
              <ListChecks className="size-4" />
              Workflow Runner
            </Link>
            <Link
              href="/youtube-packaging"
              className={buttonVariants({ variant: "outline" })}
            >
              <Video className="size-4" />
              YouTube Packaging
            </Link>
            <Link
              href="/youtube-thumbnails"
              className={buttonVariants({ variant: "outline" })}
            >
              <ImagePlus className="size-4" />
              YouTube Thumbnails
            </Link>
            <Link
              href="/merch-ideas"
              className={buttonVariants({ variant: "outline" })}
            >
              <Shirt className="size-4" />
              Merch Ideas
            </Link>
            <Link
              href="/product-listings"
              className={buttonVariants({ variant: "outline" })}
            >
              <ShoppingBag className="size-4" />
              Product Listings
            </Link>
            <Link
              href="/social-repurposing"
              className={buttonVariants({ variant: "outline" })}
            >
              <Share2 className="size-4" />
              Social Repurposing
            </Link>
            <Link
              href="/release-planner"
              className={buttonVariants({ variant: "outline" })}
            >
              <CalendarDays className="size-4" />
              Release Planner
            </Link>
            <Link
              href="/analytics"
              className={buttonVariants({ variant: "outline" })}
            >
              <BarChart3 className="size-4" />
              Analytics Tracker
            </Link>
            <Link
              href="/mockup-prompts"
              className={buttonVariants({ variant: "outline" })}
            >
              <ImageIcon className="size-4" />
              Mockup Prompts
            </Link>
            <Link
              href="/email-campaigns"
              className={buttonVariants({ variant: "outline" })}
            >
              <Mail className="size-4" />
              Email Campaigns
            </Link>
            <Link
              href="/artist-crm"
              className={buttonVariants({ variant: "outline" })}
            >
              <Users className="size-4" />
              Artist CRM
            </Link>
            <Button onClick={handleExport}>
              <Download className="size-4" />
              Export library
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total prompts"
          value={prompts.length}
          icon={Library}
          hint="Reusable prompts in your library"
        />
        <StatCard
          label="Active workflows"
          value={activeWorkflows}
          icon={WorkflowIcon}
          hint={`${workflows.length} total workflows`}
        />
        <Link href="/runner" className="block transition-opacity hover:opacity-90">
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <CardDescription>Prompt Runner</CardDescription>
              <Play className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">{runs.length}</div>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                Saved prompt runs
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link
          href="/workflow-runner"
          className="block transition-opacity hover:opacity-90"
        >
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <CardDescription>Workflow Runner</CardDescription>
              <ListChecks className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {workflowRuns.length}
              </div>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                Saved workflow runs
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link
          href="/youtube-packaging"
          className="block transition-opacity hover:opacity-90"
        >
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <CardDescription>YouTube Packaging</CardDescription>
              <Video className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {youtubePackages.length}
              </div>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                Saved upload metadata packages
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link
          href="/youtube-thumbnails"
          className="block transition-opacity hover:opacity-90"
        >
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <CardDescription>YouTube Thumbnails</CardDescription>
              <ImagePlus className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {youtubeThumbnailRecords.length}
              </div>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                Saved thumbnail and Shorts cover projects
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link
          href="/merch-ideas"
          className="block transition-opacity hover:opacity-90"
        >
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <CardDescription>Merch Ideas</CardDescription>
              <Shirt className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {merchIdeas.length}
              </div>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                Saved merch concepts and listings
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link
          href="/product-listings"
          className="block transition-opacity hover:opacity-90"
        >
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <CardDescription>Product Listings</CardDescription>
              <ShoppingBag className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {productListings.length}
              </div>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                Saved ecommerce product listings
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link
          href="/social-repurposing"
          className="block transition-opacity hover:opacity-90"
        >
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <CardDescription>Social Repurposing</CardDescription>
              <Share2 className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {socialRepurposingRecords.length}
              </div>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                Saved multi-platform content campaigns
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link
          href="/release-planner"
          className="block transition-opacity hover:opacity-90"
        >
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <CardDescription>Release Planner</CardDescription>
              <CalendarDays className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {releasePlans.length}
              </div>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                Saved AI music release plans
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link
          href="/analytics"
          className="block transition-opacity hover:opacity-90"
        >
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <CardDescription>Analytics Tracker</CardDescription>
              <BarChart3 className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {analyticsRecords.length}
              </div>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                Manually tracked performance records
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link
          href="/mockup-prompts"
          className="block transition-opacity hover:opacity-90"
        >
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <CardDescription>Mockup Prompts</CardDescription>
              <ImageIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {mockupPromptRecords.length}
              </div>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                Saved image and mockup prompt projects
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link
          href="/email-campaigns"
          className="block transition-opacity hover:opacity-90"
        >
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <CardDescription>Email Campaigns</CardDescription>
              <Mail className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {emailCampaignRecords.length}
              </div>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                Saved email campaign projects
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link
          href="/artist-crm"
          className="block transition-opacity hover:opacity-90"
        >
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <CardDescription>Artist CRM</CardDescription>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {artistRecords.length}
              </div>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                Saved artist and label profiles
              </p>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardDescription>Top categories</CardDescription>
            <Library className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {topCategories.length ? (
              <div className="flex flex-col gap-1.5">
                {topCategories.map(([cat, count]) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate">{cat}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No prompts yet</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardDescription>Highest rated</CardDescription>
            <Star className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {topRated.length ? (
              <div className="flex flex-col gap-1.5">
                {topRated.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate">{p.name}</span>
                    <RatingStars rating={p.rating} size={12} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No prompts yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex h-full flex-col">
          <CardHeader>
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
          <CardContent className="flex flex-1 flex-col gap-2">
            {recentPrompts.length ? (
              recentPrompts.map((p: Prompt) => (
                <Link
                  key={p.id}
                  href="/prompts"
                  className="flex items-center justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.description}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {p.category}
                  </Badge>
                </Link>
              ))
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
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

        <Card className="flex h-full flex-col">
          <CardHeader>
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
          <CardContent className="flex flex-1 flex-col gap-2">
            {recentWorkflows.length ? (
              recentWorkflows.map((w: Workflow) => (
                <Link
                  key={w.id}
                  href="/workflows"
                  className="flex items-center justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
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
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
                <p className="text-sm text-muted-foreground">No workflows yet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWorkflowFormOpen(true)}
                >
                  <Plus className="size-4" />
                  Create your first workflow
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PromptFormDialog
        open={promptFormOpen}
        onOpenChange={setPromptFormOpen}
        initial={null}
        onSave={(p) => {
          addPrompt(p)
          toast.success("Prompt created")
        }}
      />
      <WorkflowFormDialog
        open={workflowFormOpen}
        onOpenChange={setWorkflowFormOpen}
        initial={null}
        prompts={prompts}
        onSave={(w) => {
          addWorkflow(w)
          toast.success("Workflow created")
        }}
      />
    </div>
  )
}
