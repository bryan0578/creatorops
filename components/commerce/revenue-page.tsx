"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { DollarSign, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { getCollections } from "@/lib/actions/collections"
import { getCampaigns } from "@/lib/actions/campaigns"
import { getProductListings } from "@/lib/actions/product-listings"
import {
  createRevenueRecord,
  deleteRevenueRecord,
  getRevenueRecords,
  importRevenueCsv,
  previewRevenueCsv,
} from "@/lib/actions/revenue"
import { getCommerceDashboardSummary } from "@/lib/actions/commerce"
import type { CommerceDashboardSummary, RevenueRecordItem } from "@/lib/commerce/types"
import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { ModuleShell, ModuleTabPanel, ModuleWorkflowTabs } from "@/components/module/form-layout"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormTextarea } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "records", label: "Revenue Records" },
  { value: "products", label: "Products" },
  { value: "collections", label: "Collections" },
  { value: "campaigns", label: "Campaigns" },
  { value: "import", label: "Import CSV" },
  { value: "learnings", label: "Learnings" },
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

export function RevenuePage() {
  const searchParams = useSearchParams()
  const recordId = searchParams.get("recordId") ?? ""

  const [activeTab, setActiveTab] = React.useState("overview")
  const [loading, setLoading] = React.useState(true)
  const [records, setRecords] = React.useState<RevenueRecordItem[]>([])
  const [summary, setSummary] = React.useState<CommerceDashboardSummary | null>(null)
  const [listings, setListings] = React.useState<Awaited<ReturnType<typeof getProductListings>>>([])
  const [collections, setCollections] = React.useState<Awaited<ReturnType<typeof getCollections>>>([])
  const [campaigns, setCampaigns] = React.useState<Awaited<ReturnType<typeof getCampaigns>>>([])
  const [csvText, setCsvText] = React.useState("")
  const [csvPreview, setCsvPreview] = React.useState<Awaited<ReturnType<typeof previewRevenueCsv>> | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState({
    source: "Manual",
    platform: "",
    productName: "",
    productListingId: "",
    collectionId: "",
    campaignId: "",
    saleDate: "",
    quantity: "1",
    grossRevenue: "",
    netRevenue: "",
    fees: "",
    notes: "",
  })

  const refresh = React.useCallback(async () => {
    setLoading(true)
    try {
      const [r, s, l, c, camp] = await Promise.all([
        getRevenueRecords(),
        getCommerceDashboardSummary(),
        getProductListings(),
        getCollections(),
        getCampaigns(),
      ])
      setRecords(r)
      setSummary(s)
      setListings(l)
      setCollections(c)
      setCampaigns(camp)
    } catch {
      toast.error("Could not load revenue data")
      setRecords([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.productName.trim()) {
      toast.error("Product name is required")
      return
    }
    setSaving(true)
    try {
      const campaign = campaigns.find((c) => c.id === form.campaignId)
      const collection = collections.find((c) => c.id === form.collectionId)
      await createRevenueRecord({
        source: form.source,
        platform: form.platform,
        orderId: "",
        productName: form.productName.trim(),
        productType: "",
        quantity: Number(form.quantity) || 1,
        grossRevenue: Number(form.grossRevenue) || 0,
        netRevenue: form.netRevenue ? Number(form.netRevenue) : null,
        fees: form.fees ? Number(form.fees) : null,
        currency: "USD",
        saleDate: form.saleDate ? Date.parse(form.saleDate) || Date.now() : Date.now(),
        campaignId: form.campaignId,
        campaignName: campaign?.campaignName ?? "",
        artistName: campaign?.artistName ?? "",
        productListingId: form.productListingId,
        collectionId: form.collectionId,
        externalLinkId: "",
        customerCountry: "",
        notes: form.notes,
        tags: ["manual", "commerce"],
        rawJson: "{}",
      })
      toast.success("Revenue record added")
      setForm({ ...form, productName: "", grossRevenue: "", netRevenue: "", fees: "", notes: "" })
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save record")
    } finally {
      setSaving(false)
    }
  }

  async function handlePreviewCsv() {
    try {
      const preview = await previewRevenueCsv(csvText)
      setCsvPreview(preview)
      if (!preview.success) toast.error(preview.errors[0] || "CSV parse failed")
    } catch {
      toast.error("Could not preview CSV")
    }
  }

  async function handleImportCsv() {
    setSaving(true)
    try {
      const result = await importRevenueCsv(csvText)
      setCsvPreview(result)
      toast.success(result.message)
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed")
    } finally {
      setSaving(false)
    }
  }

  const highlighted = recordId ? records.find((r) => r.id === recordId) : null

  return (
    <ModuleShell>
      <ModulePageHeader
        title="Revenue Dashboard"
        description="Track manual revenue and product performance before full store integrations."
        action={
          <Button type="button" size="sm" variant="ghost" disabled={loading} onClick={() => void refresh()}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          </Button>
        }
      />

      <ModuleWorkflowTabs tabs={TABS} value={activeTab} onValueChange={setActiveTab}>
        <ModuleTabPanel value="overview">
          {summary ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total gross revenue" value={`$${summary.totalGrossRevenue.toFixed(2)}`} />
              <StatCard label="Total net revenue" value={`$${summary.totalNetRevenue.toFixed(2)}`} />
              <StatCard label="Orders" value={summary.orderCount} />
              <StatCard label="Quantity sold" value={summary.quantitySold} />
              <StatCard label="Top product" value={summary.topProductName || "—"} />
              <StatCard label="Top collection" value={summary.topCollectionName || "—"} />
              <StatCard label="Top campaign" value={summary.topCampaignName || "—"} />
              <StatCard label="Revenue this month" value={`$${summary.revenueThisMonth.toFixed(2)}`} />
            </div>
          ) : (
            <EmptyState icon={DollarSign} title="No revenue yet" description="Add a manual record or import CSV." />
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="records">
          {highlighted ? (
            <Card className="mb-4 border-primary">
              <CardContent className="py-3 text-sm">Selected: {highlighted.productName}</CardContent>
            </Card>
          ) : null}
          {records.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No revenue records"
              description="Add a manual record below or import CSV on the Import tab."
              primaryActionLabel="Go to Import CSV"
              primaryActionOnClick={() => setActiveTab("import")}
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-2">Date</th>
                    <th className="p-2">Platform</th>
                    <th className="p-2">Product</th>
                    <th className="p-2">Qty</th>
                    <th className="p-2">Gross</th>
                    <th className="p-2">Net</th>
                    <th className="p-2">Campaign</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {records.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="p-2">
                        {row.saleDate ? new Date(row.saleDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-2">{row.platform || row.source}</td>
                      <td className="p-2">{row.productName}</td>
                      <td className="p-2">{row.quantity}</td>
                      <td className="p-2">${row.grossRevenue.toFixed(2)}</td>
                      <td className="p-2">{row.netRevenue != null ? `$${row.netRevenue.toFixed(2)}` : "—"}</td>
                      <td className="p-2">{row.campaignName || "—"}</td>
                      <td className="p-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void deleteRevenueRecord(row.id).then(() => refresh())}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="products">
          {listings.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No product listings"
              description="Link revenue to product listings to see performance here."
              primaryActionLabel="Open Product Listings"
              primaryActionHref="/product-listings"
            />
          ) : (
            <div className="grid gap-2">
              {listings.map((l) => {
                const total = records
                  .filter((r) => r.productListingId === l.id)
                  .reduce((s, r) => s + r.grossRevenue, 0)
                return (
                  <Card key={l.id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <span>{l.finalTitle || l.designConcept}</span>
                      <Badge variant="outline">${total.toFixed(2)}</Badge>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="collections">
          {collections.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No collections"
              description="Create collections and link revenue records to track collection performance."
              primaryActionLabel="Open Collections"
              primaryActionHref="/collections"
            />
          ) : (
            <div className="grid gap-2">
              {collections.map((c) => {
                const total = records
                  .filter((r) => r.collectionId === c.id)
                  .reduce((s, r) => s + r.grossRevenue, 0)
                return (
                  <Card key={c.id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <span>{c.name}</span>
                      <Badge variant="outline">${total.toFixed(2)}</Badge>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="campaigns">
          {campaigns.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No campaigns"
              description="Link revenue to campaigns to compare performance."
              primaryActionLabel="Open Campaigns"
              primaryActionHref="/campaigns"
            />
          ) : (
            <div className="grid gap-2">
              {campaigns.map((c) => {
                const total = records
                  .filter((r) => r.campaignId === c.id)
                  .reduce((s, r) => s + r.grossRevenue, 0)
                return (
                  <Card key={c.id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <span>{c.campaignName}</span>
                      <Badge variant="outline">${total.toFixed(2)}</Badge>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="import">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <Label htmlFor="csv">Paste CSV</Label>
              <Textarea
                id="csv"
                rows={10}
                placeholder="saleDate,platform,productName,quantity,grossRevenue,netRevenue,fees,orderId,campaignName,artistName"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
              />
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => void handlePreviewCsv()}>
                  Preview
                </Button>
                <Button type="button" size="sm" disabled={saving} onClick={() => void handleImportCsv()}>
                  Import
                </Button>
              </div>
            </div>
            {csvPreview ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preview</CardTitle>
                  <CardDescription>{csvPreview.message || `${csvPreview.preview.length} rows`}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {csvPreview.errors.map((e) => (
                    <p key={e} className="text-destructive">
                      {e}
                    </p>
                  ))}
                  {csvPreview.preview.slice(0, 5).map((row) => (
                    <p key={row.rowIndex}>
                      {row.productName} · ${row.grossRevenue} · {row.platform}
                    </p>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </ModuleTabPanel>

        <ModuleTabPanel value="learnings">
          <EmptyState
            icon={DollarSign}
            title="Product revenue learnings"
            description="Capture learnings from revenue performance in the Feedback Loop or Learnings library."
            primaryActionLabel="Open Feedback Loop"
            primaryActionHref="/feedback-loop"
            secondaryActionLabel="Open Learnings"
            secondaryActionHref="/learnings"
          />
        </ModuleTabPanel>
      </ModuleWorkflowTabs>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Add revenue record</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleCreate(e)} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField fieldKey="productName" required>
              <Input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
            </FormField>
            <FormField fieldKey="platform">
              <Input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} />
            </FormField>
            <FormField fieldKey="grossRevenue">
              <Input value={form.grossRevenue} onChange={(e) => setForm({ ...form, grossRevenue: e.target.value })} />
            </FormField>
            <FormField fieldKey="netRevenue">
              <Input value={form.netRevenue} onChange={(e) => setForm({ ...form, netRevenue: e.target.value })} />
            </FormField>
            <FormField fieldKey="saleDate">
              <Input type="date" value={form.saleDate} onChange={(e) => setForm({ ...form, saleDate: e.target.value })} />
            </FormField>
            <FormField fieldKey="productListingId" label="Product Listing">
              <select
                className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={form.productListingId}
                onChange={(e) => setForm({ ...form, productListingId: e.target.value })}
              >
                <option value="">—</option>
                {listings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.finalTitle || l.id}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField fieldKey="collectionId" label="Collection">
              <select
                className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={form.collectionId}
                onChange={(e) => setForm({ ...form, collectionId: e.target.value })}
              >
                <option value="">—</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField fieldKey="campaignId" label="Campaign">
              <select
                className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={form.campaignId}
                onChange={(e) => setForm({ ...form, campaignId: e.target.value })}
              >
                <option value="">—</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.campaignName}
                  </option>
                ))}
              </select>
            </FormField>
            <div className="flex items-end">
              <Button type="submit" size="sm" disabled={saving}>
                Add Record
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </ModuleShell>
  )
}
