"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Lightbulb, Loader2, RefreshCw, Search, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { getLearnings } from "@/lib/actions/learnings"
import {
  convertResearchToMerchIdea,
  convertResearchToProductListing,
  createExperimentFromResearch,
  createLearningFromResearch,
  createProductResearchItem,
  deleteProductResearchItem,
  getProductResearchItems,
  getProductResearchItemById,
} from "@/lib/actions/product-research"
import { agentHref } from "@/lib/agents/routes"
import type { ProductResearchItemRecord } from "@/lib/commerce/types"
import { scoreResearchOpportunity } from "@/lib/commerce/scoring"
import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { RecordNotFound } from "@/components/record-not-found"
import { ModuleShell, ModuleTabPanel, ModuleWorkflowTabs } from "@/components/module/form-layout"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { LearningRecord } from "@/lib/types"

const TABS = [
  { value: "board", label: "Research Board" },
  { value: "opportunities", label: "Opportunities" },
  { value: "competitors", label: "Competitors / Inspiration" },
  { value: "audience", label: "Audience Fit" },
  { value: "convert", label: "Convert to Product" },
  { value: "learnings", label: "Learnings" },
] as const

type TabValue = (typeof TABS)[number]["value"]

const TAB_ALIASES: Record<string, TabValue> = {
  board: "board",
  opportunities: "opportunities",
  competitors: "competitors",
  inspiration: "competitors",
  audience: "audience",
  convert: "convert",
  learnings: "learnings",
}

const EMPTY_FORM = {
  title: "",
  productType: "",
  category: "",
  niche: "",
  audience: "",
  platform: "",
  inspirationUrl: "",
  competitorName: "",
  priceRange: "",
  demandSignal: "",
  difficulty: "",
  opportunityScore: "",
  campaignName: "",
  artistName: "",
  notes: "",
  tags: "",
}

function orNotSet(value: string | null | undefined): string {
  const text = value?.trim()
  return text ? text : "Not set"
}

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

function ResearchCard({
  item,
  onSelect,
  selected,
}: {
  item: ProductResearchItemRecord
  onSelect: (id: string) => void
  selected: boolean
}) {
  const score = item.opportunityScore ?? scoreResearchOpportunity(item)
  return (
    <Card
      className={`cursor-pointer border-border/80 ${selected ? "ring-2 ring-primary" : ""}`}
      onClick={() => onSelect(item.id)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{item.title}</CardTitle>
          <Badge variant="outline">{item.status || "Idea"}</Badge>
        </div>
        <CardDescription>
          {[item.productType, item.category, item.artistName].filter(Boolean).join(" · ") || "Not set"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">Score {score.toFixed(0)}</Badge>
        {item.competitorName ? <span>vs {item.competitorName}</span> : null}
        {item.priceRange ? <span>{item.priceRange}</span> : null}
      </CardContent>
    </Card>
  )
}

function ResearchQuickCreateForm({
  form,
  setForm,
  saving,
  onSubmit,
}: {
  form: typeof EMPTY_FORM
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>
  saving: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-border/80 p-4">
      <h3 className="font-medium">New product research item</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        {(
          [
            ["productType", "Product type"],
            ["category", "Category"],
            ["niche", "Niche"],
            ["audience", "Audience"],
            ["platform", "Platform"],
            ["competitorName", "Competitor / source"],
            ["priceRange", "Price range"],
            ["demandSignal", "Demand signal"],
            ["difficulty", "Difficulty"],
            ["opportunityScore", "Opportunity score"],
            ["campaignName", "Campaign"],
            ["artistName", "Artist / project"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={key}>{label}</Label>
            <Input
              id={key}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </div>
        ))}
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="inspirationUrl">Inspiration URL</Label>
          <Input
            id="inspirationUrl"
            value={form.inspirationUrl}
            onChange={(e) => setForm({ ...form, inspirationUrl: e.target.value })}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input id="tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        Save research item
      </Button>
    </form>
  )
}

function isCommerceLearning(learning: LearningRecord): boolean {
  const haystack = [
    learning.learningType,
    learning.category,
    learning.title,
    learning.notes,
    ...(Array.isArray(learning.tags) ? learning.tags : []),
  ]
    .join(" ")
    .toLowerCase()
  return /product|commerce|merch|collection|revenue|listing|mockup|product-research|product performance|commerce insight/.test(
    haystack,
  )
}

export function ProductResearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const recordId = searchParams.get("recordId") ?? ""
  const tabParam = searchParams.get("tab") ?? "board"
  const resolvedTab = TAB_ALIASES[tabParam] ?? "board"

  const [activeTab, setActiveTab] = React.useState<TabValue>(resolvedTab)
  const [loading, setLoading] = React.useState(true)
  const [items, setItems] = React.useState<ProductResearchItemRecord[]>([])
  const [learnings, setLearnings] = React.useState<LearningRecord[]>([])
  const [selectedId, setSelectedId] = React.useState(recordId)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [missingRecordId, setMissingRecordId] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setMissingRecordId(null)
    try {
      const [research, learningRows] = await Promise.all([
        getProductResearchItems(),
        getLearnings().catch(() => [] as LearningRecord[]),
      ])
      setItems(research)
      setLearnings(learningRows.filter(isCommerceLearning))
      if (recordId) {
        if (research.some((i) => i.id === recordId)) {
          setSelectedId(recordId)
        } else {
          const row = await getProductResearchItemById(recordId).catch(() => null)
          if (row) {
            setItems((prev) => (prev.some((i) => i.id === row.id) ? prev : [row, ...prev]))
            setSelectedId(row.id)
          } else {
            setMissingRecordId(recordId)
          }
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load product research")
      setItems([])
      setLearnings([])
    } finally {
      setLoading(false)
    }
  }, [recordId])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    const next = TAB_ALIASES[searchParams.get("tab") ?? ""] ?? "board"
    setActiveTab(next)
  }, [searchParams])

  function handleTabChange(tab: string) {
    const value = (TAB_ALIASES[tab] ?? tab) as TabValue
    setActiveTab(value)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.replace(`/product-research?${params.toString()}`)
  }

  const selected = items.find((i) => i.id === selectedId) ?? null

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error("Title is required")
      return
    }
    setSaving(true)
    try {
      const score = form.opportunityScore.trim() ? Number(form.opportunityScore) : null
      const created = await createProductResearchItem({
        title: form.title.trim(),
        productType: form.productType,
        category: form.category,
        niche: form.niche,
        audience: form.audience,
        platform: form.platform,
        inspirationUrl: form.inspirationUrl,
        competitorName: form.competitorName,
        priceRange: form.priceRange,
        demandSignal: form.demandSignal,
        difficulty: form.difficulty,
        opportunityScore: Number.isFinite(score) ? score : null,
        status: "Idea",
        campaignId: "",
        campaignName: form.campaignName,
        artistName: form.artistName,
        productName: form.title.trim(),
        notes: form.notes,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        rawJson: "{}",
      })
      toast.success("Research item created")
      setForm(EMPTY_FORM)
      setSelectedId(created.id)
      await refresh()
      handleTabChange("board")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create item")
    } finally {
      setSaving(false)
    }
  }

  async function runAction(
    label: string,
    action: () => Promise<{ href?: string } | void>,
  ) {
    if (!selected) return
    setSaving(true)
    try {
      const result = await action()
      toast.success(label)
      await refresh()
      if (result && "href" in result && result.href) router.push(result.href)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed")
    } finally {
      setSaving(false)
    }
  }

  const opportunities = [...items]
    .map((item) => ({ item, score: item.opportunityScore ?? scoreResearchOpportunity(item) }))
    .sort((a, b) => b.score - a.score)

  const highOpportunity = items.filter(
    (item) => (item.opportunityScore ?? scoreResearchOpportunity(item)) >= 70,
  ).length
  const activeIdeas = items.filter((item) => item.status !== "Converted" && item.status !== "Archived").length
  const readyToConvert = items.filter(
    (item) => item.status !== "Converted" && item.status !== "Archived" && (item.opportunityScore ?? 0) >= 60,
  ).length

  const inspirationItems = items.filter((i) => i.competitorName?.trim() || i.inspirationUrl?.trim())
  const audienceItems = items.filter((i) => i.audience?.trim() || i.niche?.trim())
  const convertibleItems = items.filter((i) => i.status !== "Converted" && i.status !== "Archived")

  const audienceGroups = React.useMemo(() => {
    const map = new Map<string, ProductResearchItemRecord[]>()
    for (const item of audienceItems) {
      const key = [item.audience || "Unknown audience", item.niche || "Unknown niche"].join(" · ")
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [audienceItems])

  return (
    <ModuleShell>
      <ModulePageHeader
        title="Product Research"
        description="Track product opportunities, audience fit, pricing ideas, inspiration, competitors, and creator product concepts."
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => handleTabChange("board")}>
              New Product Research Item
            </Button>
            <Link href={agentHref("product-strategist")} className={buttonVariants({ size: "sm", variant: "outline" })}>
              <Sparkles className="size-4" />
              Run Product Strategist
            </Link>
            <Button type="button" size="sm" variant="ghost" disabled={loading} onClick={() => void refresh()}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading product research…
        </div>
      ) : missingRecordId ? (
        <RecordNotFound
          recordId={missingRecordId}
          recordLabel="Product research item"
          moduleHref="/product-research"
          moduleLabel="Product Research"
        />
      ) : null}

      <ModuleWorkflowTabs tabs={TABS} value={activeTab} onValueChange={handleTabChange}>
        <ModuleTabPanel value="board">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total research items" value={items.length} />
            <StatCard label="Active ideas" value={activeIdeas} />
            <StatCard label="High opportunity" value={highOpportunity} />
            <StatCard label="Ready to convert" value={readyToConvert} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ResearchQuickCreateForm
              form={form}
              setForm={setForm}
              saving={saving}
              onSubmit={(e) => void handleCreate(e)}
            />

            <div className="space-y-3">
              {items.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="No product research yet"
                  description="Track product opportunities, audience fit, pricing ideas, inspiration, competitors, and creator product concepts."
                  primaryActionLabel="New Product Research Item"
                  primaryActionOnClick={() => handleTabChange("board")}
                  secondaryActionLabel="Run Product Strategist Agent"
                  secondaryActionHref={agentHref("product-strategist")}
                />
              ) : (
                items.map((item) => (
                  <ResearchCard
                    key={item.id}
                    item={item}
                    selected={selectedId === item.id}
                    onSelect={setSelectedId}
                  />
                ))
              )}
            </div>
          </div>
        </ModuleTabPanel>

        <ModuleTabPanel value="opportunities">
          {opportunities.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No opportunities yet"
              description="Opportunities will appear here after you add product research."
              primaryActionLabel="Add research item"
              primaryActionOnClick={() => handleTabChange("board")}
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {opportunities.map(({ item, score }) => (
                <Card key={item.id} className="border-border/80">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <Badge>{score.toFixed(0)}</Badge>
                    </div>
                    <CardDescription>{orNotSet(item.productType)} · {orNotSet(item.audience)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    <p>Difficulty: {orNotSet(item.difficulty)}</p>
                    <p>Demand: {orNotSet(item.demandSignal)}</p>
                    <p>Price range: {orNotSet(item.priceRange)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="competitors">
          {inspirationItems.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No inspiration saved"
              description="Save inspiration links, competitor examples, and market notes here."
              primaryActionLabel="Add research item"
              primaryActionOnClick={() => handleTabChange("board")}
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {inspirationItems.map((item) => (
                <Card key={item.id} className="border-border/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription>
                      {orNotSet(item.competitorName)} · {orNotSet(item.platform)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {item.inspirationUrl?.trim() ? (
                      <a
                        href={item.inspirationUrl}
                        className="text-primary underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open inspiration
                      </a>
                    ) : (
                      <span className="text-muted-foreground">No inspiration URL</span>
                    )}
                    {item.notes?.trim() ? <p className="text-muted-foreground">{item.notes}</p> : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="audience">
          {audienceItems.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No audience fit notes"
              description="Audience fit notes will appear here after you add research items."
              primaryActionLabel="Add research item"
              primaryActionOnClick={() => handleTabChange("board")}
            />
          ) : (
            <div className="space-y-4">
              {audienceGroups.map(([group, groupItems]) => (
                <Card key={group} className="border-border/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{group}</CardTitle>
                    <CardDescription>
                      {groupItems.length} item{groupItems.length === 1 ? "" : "s"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {groupItems.map((item) => (
                      <div key={item.id} className="rounded-md border border-border/60 p-3 text-sm">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-muted-foreground">
                          {orNotSet(item.productType)} · {orNotSet(item.artistName)}
                        </p>
                        <p className="mt-1 text-muted-foreground">{orNotSet(item.audience)}</p>
                        {item.notes?.trim() ? (
                          <p className="mt-1 text-muted-foreground">{item.notes.slice(0, 160)}</p>
                        ) : null}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="convert">
          {convertibleItems.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Nothing to convert"
              description="Research items ready for conversion will appear here."
              primaryActionLabel="Add research item"
              primaryActionOnClick={() => handleTabChange("board")}
            />
          ) : (
            <div className="space-y-4">
              {convertibleItems.map((item) => (
                <Card key={item.id} className="border-border/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription>
                      {orNotSet(item.productType)} · {item.status}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={saving}
                      onClick={() => {
                        setSelectedId(item.id)
                        void runAction("Converted to merch idea", () => convertResearchToMerchIdea(item.id))
                      }}
                    >
                      Convert to Merch Idea
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() => {
                        setSelectedId(item.id)
                        void runAction("Converted to product listing", () =>
                          convertResearchToProductListing(item.id),
                        )
                      }}
                    >
                      Convert to Product Listing
                    </Button>
                    <Link
                      href={`/mockup-prompts?campaignName=${encodeURIComponent(item.campaignName)}`}
                      className={buttonVariants({ size: "sm", variant: "outline" })}
                    >
                      Create Mockup Prompt
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() => {
                        setSelectedId(item.id)
                        void runAction("Experiment created", () => createExperimentFromResearch(item.id))
                      }}
                    >
                      Create Experiment
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() => {
                        setSelectedId(item.id)
                        void runAction("Learning created", () => createLearningFromResearch(item.id))
                      }}
                    >
                      Create Learning
                    </Button>
                    <Link
                      href={agentHref("product-strategist", {
                        sourceRecordType: "ProductResearch",
                        sourceRecordId: item.id,
                      })}
                      className={buttonVariants({ size: "sm", variant: "ghost" })}
                    >
                      Run Product Strategist
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="learnings">
          {learnings.length === 0 ? (
            <EmptyState
              icon={Lightbulb}
              title="No product learnings yet"
              description="Product learnings will appear here after research, launches, revenue, or experiments generate insights."
              primaryActionLabel="Open Learnings Library"
              primaryActionHref="/learnings"
              secondaryActionLabel="Open Feedback Loop"
              secondaryActionHref="/feedback-loop"
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {learnings.map((learning) => (
                <Card key={learning.id} className="border-border/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{learning.title}</CardTitle>
                    <CardDescription>
                      {orNotSet(learning.learningType)} · {orNotSet(learning.category)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>{learning.insight || "Not set"}</p>
                    <Link
                      href={`/learnings?recordId=${encodeURIComponent(learning.id)}`}
                      className="text-primary underline"
                    >
                      Open learning
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
