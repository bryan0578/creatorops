"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2, RefreshCw, ShoppingBag, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { getProductFactoryPageData } from "@/lib/actions/commerce"
import { agentHref } from "@/lib/agents/routes"
import type { ProductPipelineItem } from "@/lib/commerce/types"
import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { ModuleShell, ModuleTabPanel, ModuleWorkflowTabs } from "@/components/module/form-layout"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "pipeline", label: "Pipeline" },
  { value: "ideas", label: "Ideas" },
  { value: "listings", label: "Listings" },
  { value: "mockups", label: "Mockups" },
  { value: "assets", label: "Assets" },
  { value: "readiness", label: "Launch Readiness" },
  { value: "recommendations", label: "Recommendations" },
] as const

const PIPELINE_STAGES = [
  "Idea",
  "Researching",
  "Designing",
  "Listing Draft",
  "Mockup Ready",
  "Ready to Launch",
  "Published",
  "Learning Review",
] as const

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function PipelineCard({ item }: { item: ProductPipelineItem }) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm">{item.title}</CardTitle>
          <Badge variant="outline">{item.stage}</Badge>
        </div>
        <CardDescription>
          {[item.productType, item.campaignName, item.artistName].filter(Boolean).join(" · ")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {item.readiness ? (
          <Badge variant={item.readiness.label === "Ready" ? "default" : "secondary"}>
            {item.readiness.label} ({item.readiness.score})
          </Badge>
        ) : null}
        {item.qualityScore ? <Badge variant="outline">Quality {item.qualityScore}</Badge> : null}
        {item.revenue ? <Badge variant="outline">${item.revenue.toFixed(2)}</Badge> : null}
        <Link href={item.href} className={buttonVariants({ size: "sm", variant: "outline" })}>
          Open
        </Link>
        <Link
          href={agentHref("product-strategist", {
            sourceRecordType: item.kind === "listing" ? "ProductListing" : item.kind,
            sourceRecordId: item.id,
          })}
          className={buttonVariants({ size: "sm", variant: "ghost" })}
        >
          Run Strategist
        </Link>
      </CardContent>
    </Card>
  )
}

export function ProductFactoryPage() {
  const [activeTab, setActiveTab] = React.useState("overview")
  const [loading, setLoading] = React.useState(true)
  const [data, setData] = React.useState<Awaited<ReturnType<typeof getProductFactoryPageData>> | null>(null)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    try {
      setData(await getProductFactoryPageData())
    } catch {
      toast.error("Could not load Product Factory data")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const summary = data?.summary
  const pipeline = data?.pipeline ?? []

  return (
    <ModuleShell>
      <ModulePageHeader
        title="Product Factory"
        description="Plan, build, package, launch, and improve merch, digital products, prompt packs, wall art, and creator products."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/product-research" className={buttonVariants({ size: "sm" })}>
              New Product Idea
            </Link>
            <Link href="/product-listings" className={buttonVariants({ variant: "outline", size: "sm" })}>
              New Product Listing
            </Link>
            <Link href="/mockup-prompts" className={buttonVariants({ variant: "outline", size: "sm" })}>
              New Mockup Prompt
            </Link>
            <Link href="/collections" className={buttonVariants({ variant: "outline", size: "sm" })}>
              New Collection
            </Link>
            <Link href={agentHref("product-strategist")} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Sparkles className="size-4" />
              Run Product Strategist
            </Link>
            <Button type="button" size="sm" variant="ghost" disabled={loading} onClick={() => void refresh()}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            </Button>
          </div>
        }
      />

      {loading && !data ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading Product Factory…
        </div>
      ) : null}

      <ModuleWorkflowTabs tabs={TABS} value={activeTab} onValueChange={setActiveTab}>
        <ModuleTabPanel value="overview">
          {summary ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Product ideas" value={summary.productIdeas} />
              <StatCard label="Active listings" value={summary.activeListings} />
              <StatCard label="Mockups ready" value={summary.mockupsReady} />
              <StatCard label="Collections" value={summary.collections} />
              <StatCard label="Product campaigns" value={summary.productCampaigns} />
              <StatCard label="Revenue tracked" value={summary.revenueTracked} />
              <StatCard label="Gross revenue" value={`$${summary.totalGrossRevenue.toFixed(2)}`} />
              <StatCard label="Quality gaps" value={summary.qualityGaps} />
            </div>
          ) : (
            <EmptyState icon={ShoppingBag} title="No product data yet" description="Add merch ideas, listings, or research items to get started." primaryActionLabel="Open Product Research" primaryActionHref="/product-research" />
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="pipeline">
          <div className="grid gap-4 xl:grid-cols-4">
            {PIPELINE_STAGES.map((stage) => {
              const items = pipeline.filter((item) => item.stage === stage)
              return (
                <div key={stage} className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">{stage}</h3>
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No items</p>
                  ) : (
                    items.map((item) => <PipelineCard key={`${item.kind}-${item.id}`} item={item} />)
                  )}
                </div>
              )
            })}
          </div>
        </ModuleTabPanel>

        <ModuleTabPanel value="ideas">
          {pipeline.filter((i) => i.kind === "research" || i.kind === "merch").length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No product ideas yet"
              description="Merch ideas and research items will appear here once added."
              primaryActionLabel="Open Product Research"
              primaryActionHref="/product-research"
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {pipeline.filter((i) => i.kind === "research" || i.kind === "merch").map((item) => (
                <PipelineCard key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="listings">
          {pipeline.filter((i) => i.kind === "listing").length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No listings in pipeline"
              description="Product listings will appear here when created."
              primaryActionLabel="Open Product Listings"
              primaryActionHref="/product-listings"
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {pipeline.filter((i) => i.kind === "listing").map((item) => (
                <PipelineCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="mockups">
          {pipeline.filter((i) => i.kind === "mockup").length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No mockups in pipeline"
              description="Mockup prompts will appear here when created."
              primaryActionLabel="Open Mockup Prompts"
              primaryActionHref="/mockup-prompts"
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {pipeline.filter((i) => i.kind === "mockup").map((item) => (
                <PipelineCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="assets">
          <Link href="/assets" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Open Asset Library
          </Link>
        </ModuleTabPanel>

        <ModuleTabPanel value="readiness">
          {pipeline.filter((i) => i.readiness).length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No launch readiness scores yet"
              description="Add product listings and mockups to see launch readiness."
              primaryActionLabel="Open Product Listings"
              primaryActionHref="/product-listings"
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {pipeline
                .filter((i) => i.readiness)
                .map((item) => (
                  <Card key={item.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <CardDescription>{item.readiness?.label}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {item.readiness?.blockers.map((b) => (
                        <p key={b} className="text-destructive">
                          Blocker: {b}
                        </p>
                      ))}
                      {item.readiness?.warnings.map((w) => (
                        <p key={w} className="text-amber-700 dark:text-amber-300">
                          {w}
                        </p>
                      ))}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="recommendations">
          {(data?.opportunities ?? []).length === 0 && (data?.insights ?? []).length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No recommendations yet"
              description="Product opportunities and performance insights will appear as you add research, listings, and revenue."
              primaryActionLabel="Open Product Research"
              primaryActionHref="/product-research"
            />
          ) : (
            <div className="space-y-3">
              {(data?.opportunities ?? []).map((opp) => (
                <Card key={opp.id}>
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div>
                      <p className="font-medium">{opp.title}</p>
                      <p className="text-sm text-muted-foreground">{opp.summary}</p>
                    </div>
                    <Link href={opp.href} className={buttonVariants({ size: "sm" })}>
                      Open
                    </Link>
                  </CardContent>
                </Card>
              ))}
              {(data?.insights ?? []).map((insight) => (
                <Card key={insight.id}>
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div>
                      <p className="font-medium">{insight.title}</p>
                      <p className="text-sm text-muted-foreground">{insight.summary}</p>
                    </div>
                    <Link href={insight.href} className={buttonVariants({ size: "sm", variant: "outline" })}>
                      Review
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ModuleTabPanel>
      </ModuleWorkflowTabs>
    </ModuleShell>
  )
}
