"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { FolderOpen, Loader2, RefreshCw, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { getProductListings } from "@/lib/actions/product-listings"
import { getAssets } from "@/lib/actions/assets"
import { getCampaigns } from "@/lib/actions/campaigns"
import {
  addAssetToCollection,
  addProductToCollection,
  createCampaignFromCollection,
  createCollection,
  getCollections,
  linkCollectionToCampaign,
} from "@/lib/actions/collections"
import { getRevenueForCollection } from "@/lib/actions/revenue"
import { agentHref } from "@/lib/agents/routes"
import type { ProductCollectionRecord } from "@/lib/commerce/types"
import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { ModuleShell, ModuleTabPanel, ModuleWorkflowTabs } from "@/components/module/form-layout"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ProductListing } from "@/lib/types"

const TABS = [
  { value: "collections", label: "Collections" },
  { value: "builder", label: "Collection Builder" },
  { value: "products", label: "Products" },
  { value: "assets", label: "Assets" },
  { value: "campaigns", label: "Campaign Links" },
  { value: "launch", label: "Launch Plan" },
  { value: "performance", label: "Performance" },
] as const

export function CollectionsPage() {
  const searchParams = useSearchParams()
  const recordId = searchParams.get("recordId") ?? ""

  const [activeTab, setActiveTab] = React.useState("collections")
  const [loading, setLoading] = React.useState(true)
  const [collections, setCollections] = React.useState<ProductCollectionRecord[]>([])
  const [listings, setListings] = React.useState<ProductListing[]>([])
  const [assets, setAssets] = React.useState<Awaited<ReturnType<typeof getAssets>>>([])
  const [campaigns, setCampaigns] = React.useState<Awaited<ReturnType<typeof getCampaigns>>>([])
  const [selectedId, setSelectedId] = React.useState(recordId)
  const [revenueTotal, setRevenueTotal] = React.useState(0)
  const [form, setForm] = React.useState({
    name: "",
    description: "",
    collectionType: "",
    theme: "",
    artistName: "",
    campaignName: "",
  })
  const [saving, setSaving] = React.useState(false)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    try {
      const [c, l, a, camp] = await Promise.all([
        getCollections(),
        getProductListings(),
        getAssets(),
        getCampaigns(),
      ])
      setCollections(c)
      setListings(l)
      setAssets(a)
      setCampaigns(camp)
      if (recordId && c.some((col) => col.id === recordId)) setSelectedId(recordId)
    } catch {
      toast.error("Could not load collections")
      setCollections([])
    } finally {
      setLoading(false)
    }
  }, [recordId])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const selected = collections.find((c) => c.id === selectedId) ?? null

  React.useEffect(() => {
    if (!selected) {
      setRevenueTotal(0)
      return
    }
    void getRevenueForCollection(selected.id).then((rows) => {
      setRevenueTotal(rows.reduce((sum, r) => sum + (r.grossRevenue ?? 0), 0))
    })
  }, [selected])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("Collection name is required")
      return
    }
    setSaving(true)
    try {
      const created = await createCollection({
        name: form.name.trim(),
        description: form.description,
        collectionType: form.collectionType || "Drop",
        status: "Planning",
        campaignId: "",
        campaignName: form.campaignName,
        artistName: form.artistName,
        theme: form.theme,
        targetAudience: "",
        launchDate: null,
        productIds: [],
        merchIdeaIds: [],
        assetIds: [],
        externalLinkIds: [],
        notes: "",
        tags: [],
      })
      toast.success("Collection created")
      setSelectedId(created.id)
      setForm({ name: "", description: "", collectionType: "", theme: "", artistName: "", campaignName: "" })
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create collection")
    } finally {
      setSaving(false)
    }
  }

  const selectedListings = listings.filter((l) => selected?.productIds.includes(l.id))

  return (
    <ModuleShell>
      <ModulePageHeader
        title="Collections"
        description="Group products into drops, bundles, campaigns, and artist collections."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/product-factory" className={buttonVariants({ size: "sm", variant: "outline" })}>
              Product Factory
            </Link>
            <Link href={agentHref("product-strategist")} className={buttonVariants({ size: "sm" })}>
              <Sparkles className="size-4" />
              Run Product Strategist
            </Link>
            <Button type="button" size="sm" variant="ghost" disabled={loading} onClick={() => void refresh()}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            </Button>
          </div>
        }
      />

      <ModuleWorkflowTabs tabs={TABS} value={activeTab} onValueChange={setActiveTab}>
        <ModuleTabPanel value="collections">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {collections.map((col) => (
              <Card
                key={col.id}
                className={`cursor-pointer ${selectedId === col.id ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSelectedId(col.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{col.name}</CardTitle>
                  <CardDescription>{col.theme || col.collectionType}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Badge variant="outline">{col.status}</Badge>
                  <Badge variant="secondary">{col.productIds.length} products</Badge>
                </CardContent>
              </Card>
            ))}
            {!loading && collections.length === 0 ? (
              <EmptyState icon={FolderOpen} title="No collections" description="Create your first collection in the Builder tab." />
            ) : null}
          </div>
        </ModuleTabPanel>

        <ModuleTabPanel value="builder">
          <form onSubmit={(e) => void handleCreate(e)} className="max-w-xl space-y-3 rounded-lg border p-4">
            <h3 className="font-medium">New collection</h3>
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="theme">Theme</Label>
              <Input id="theme" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <Button type="submit" size="sm" disabled={saving}>
              Create collection
            </Button>
          </form>
        </ModuleTabPanel>

        <ModuleTabPanel value="products">
          {selected ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Collection: {selected.name}</p>
              <div className="flex flex-wrap gap-2">
                {listings.slice(0, 12).map((listing) => (
                  <Button
                    key={listing.id}
                    size="sm"
                    variant={selected.productIds.includes(listing.id) ? "default" : "outline"}
                    disabled={saving}
                    onClick={() =>
                      void addProductToCollection(selected.id, listing.id).then(() => refresh())
                    }
                  >
                    {listing.finalTitle || "Listing"}
                  </Button>
                ))}
              </div>
              <div className="grid gap-2">
                {selectedListings.map((l) => (
                  <Link
                    key={l.id}
                    href={`/product-listings?recordId=${encodeURIComponent(l.id)}`}
                    className="text-sm text-primary underline"
                  >
                    {l.finalTitle || l.designConcept || l.id}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState icon={FolderOpen} title="Select a collection" description="Pick a collection to manage products." />
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="assets">
          {selected ? (
            <div className="flex flex-wrap gap-2">
              {assets.slice(0, 20).map((asset) => (
                <Button
                  key={asset.id}
                  size="sm"
                  variant={selected.assetIds.includes(asset.id) ? "default" : "outline"}
                  disabled={saving}
                  onClick={() => void addAssetToCollection(selected.id, asset.id).then(() => refresh())}
                >
                  {asset.assetName || asset.id}
                </Button>
              ))}
            </div>
          ) : (
            <EmptyState icon={FolderOpen} title="Select a collection" description="Pick a collection to link assets." />
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="campaigns">
          {selected ? (
            <div className="space-y-3">
              <p className="text-sm">
                Linked campaign: <strong>{selected.campaignName || "None"}</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                {campaigns.slice(0, 10).map((c) => (
                  <Button
                    key={c.id}
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() =>
                      void linkCollectionToCampaign(selected.id, c.id).then(() => {
                        toast.success("Campaign linked")
                        void refresh()
                      })
                    }
                  >
                    Link {c.campaignName}
                  </Button>
                ))}
                <Button
                  size="sm"
                  disabled={saving}
                  onClick={() =>
                    void createCampaignFromCollection(selected.id).then(() => {
                      toast.success("Campaign created")
                      void refresh()
                    })
                  }
                >
                  Create Campaign
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState icon={FolderOpen} title="Select a collection" description="Pick a collection to link campaigns." />
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="launch">
          {selected ? (
            <Card>
              <CardHeader>
                <CardTitle>{selected.name}</CardTitle>
                <CardDescription>Status: {selected.status}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Theme: {selected.theme || "—"}</p>
                <p>Launch date: {selected.launchDate ? new Date(selected.launchDate).toLocaleDateString() : "—"}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Link href="/mockup-prompts" className={buttonVariants({ size: "sm", variant: "outline" })}>
                    Create Mockup Prompt
                  </Link>
                  <Link href="/product-listings" className={buttonVariants({ size: "sm", variant: "outline" })}>
                    Create Product Listing
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={FolderOpen}
              title="Select a collection"
              description="Pick a collection to plan its launch."
              primaryActionLabel="Open Collections"
              primaryActionOnClick={() => setActiveTab("collections")}
            />
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="performance">
          {selected ? (
            <Card>
              <CardContent className="py-6">
                <p className="text-2xl font-semibold tabular-nums">${revenueTotal.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Gross revenue tracked for this collection</p>
                <Link href="/revenue" className={buttonVariants({ size: "sm", className: "mt-3" })}>
                  Open Revenue Dashboard
                </Link>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={FolderOpen}
              title="Select a collection"
              description="Pick a collection to view revenue performance."
              primaryActionLabel="Open Collections"
              primaryActionOnClick={() => setActiveTab("collections")}
            />
          )}
        </ModuleTabPanel>
      </ModuleWorkflowTabs>
    </ModuleShell>
  )
}
