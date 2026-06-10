"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { parseImportJsonText } from "@/lib/safe-json"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Copy,
  Database,
  Download,
  Search,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { useStore, createId } from "@/lib/store"
import type { AnalyticsRecord } from "@/lib/types"
import { ANALYTICS_ITEM_TYPES, ANALYTICS_PLATFORMS } from "@/lib/types"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import { migrateLocalAnalyticsRecordsToDatabase } from "@/lib/actions/analytics-records"
import { downloadJson, loadAnalyticsRecords } from "@/lib/storage"
import {
  buildInsightsPrompt,
  computeAnalyticsSummary,
  emptyAnalyticsRecord,
  formatCurrency,
  formatNumber,
  normalizeAnalyticsRecord,
  sortAnalyticsRecords,
  type AnalyticsSortKey,
} from "@/lib/analytics-tracker"
import {
  analyticsLinkTitle,
  campaignPrefillToastMessage,
  linkRecordToCampaign,
  parseCampaignPrefillContext,
  shouldSkipCampaignUrlPrefill,
} from "@/lib/campaign-prefill"
import type { PresetPrefillContext } from "@/lib/preset-prefill"
import {
  presetPrefillToastMessage,
  tryConsumePresetPrefill,
} from "@/lib/preset-prefill"

import { ModulePageHeader } from "@/components/app-shell"
import { SaveLinkedPromptRunButton } from "@/components/module/save-linked-prompt-run-button"
import { CampaignPrefillBanner } from "@/components/campaigns/campaign-prefill-banner"
import { CampaignPromptOutputSection } from "@/components/campaigns/campaign-context-prompt-controls"
import { PresetPrefillBanner } from "@/components/presets/preset-prefill-banner"
import { RelatedExperimentsPanel } from "@/components/experiments/related-experiments-panel"
import { RelationshipPanel } from "@/components/relationships/relationship-panel"
import {
  ANALYTICS_WORKFLOW_TABS,
  ModuleTabPanel,
  ModuleWorkflowTabs,
  PromptPreviewBlock,
  RECENT_RECORDS_CARD_CLASS,
} from "@/components/module/form-layout"
import { RatingStars } from "@/components/rating-stars"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type AnalyticsFormState = Omit<
  AnalyticsRecord,
  "id" | "createdAt" | "updatedAt"
>

const TEXTAREA_ITEM_FIELDS = new Set([
  "descriptionNotes",
  "tagsUsed",
  "callToAction",
  "notes",
])

const METRIC_FIELDS: {
  key: keyof AnalyticsFormState
  label: string
  step?: string
}[] = [
  { key: "views", label: "Views" },
  { key: "impressions", label: "Impressions" },
  { key: "clicks", label: "Clicks" },
  { key: "clickThroughRate", label: "Click-through rate (%)", step: "0.01" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "shares", label: "Shares" },
  { key: "saves", label: "Saves" },
  { key: "subscribersGained", label: "Subscribers gained" },
  { key: "watchTimeHours", label: "Watch time (hours)", step: "0.1" },
  { key: "averageViewDuration", label: "Average view duration (sec)", step: "0.1" },
  { key: "revenue", label: "Revenue ($)", step: "0.01" },
  { key: "sales", label: "Sales" },
  { key: "conversionRate", label: "Conversion rate (%)", step: "0.01" },
]

const ITEM_FIELD_ORDER: (keyof AnalyticsFormState)[] = [
  "itemName",
  "itemType",
  "relatedArtist",
  "relatedSong",
  "relatedCampaign",
  "platform",
  "publishDate",
  "url",
  "niche",
  "genre",
  "mood",
  "titleUsed",
  "thumbnailText",
  "descriptionNotes",
  "tagsUsed",
  "callToAction",
  "notes",
]

const ITEM_LABELS: Record<string, string> = {
  itemName: "Item name",
  itemType: "Item type",
  relatedArtist: "Related artist",
  relatedSong: "Related song",
  relatedCampaign: "Related campaign",
  platform: "Platform",
  publishDate: "Publish date",
  url: "URL",
  niche: "Niche",
  genre: "Genre",
  mood: "Mood",
  titleUsed: "Title used",
  thumbnailText: "Thumbnail text",
  descriptionNotes: "Description notes",
  tagsUsed: "Tags used",
  callToAction: "Call to action",
  notes: "Notes",
}

function formFromRecord(record: AnalyticsRecord): AnalyticsFormState {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = record
  return rest
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string
  value: React.ReactNode
  hint?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
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

export function AnalyticsTracker() {
  const {
    analyticsRecords,
    analyticsRecordsUseDatabase,
    addAnalyticsRecord,
    updateAnalyticsRecord,
    deleteAnalyticsRecord,
    importAnalyticsRecords,
    reloadAnalyticsRecords,
    campaigns,
    updateCampaign,
  } = useStore()

  const [form, setForm] = React.useState<AnalyticsFormState>(
    formFromRecord(normalizeAnalyticsRecord({ ...emptyAnalyticsRecord(), id: "" })),
  )
  const [editingId, setEditingId] = React.useState<string | null>(null)

  const [recordSearch, setRecordSearch] = React.useState("")
  const [filterItemType, setFilterItemType] = React.useState<string>("all")
  const [filterPlatform, setFilterPlatform] = React.useState<string>("all")
  const [sortKey, setSortKey] = React.useState<AnalyticsSortKey>("updatedAt")
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc")
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [pendingDelete, setPendingDelete] = React.useState<AnalyticsRecord | null>(
    null,
  )
  const [migrating, setMigrating] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const prefillApplied = React.useRef(false)
  const searchParams = useSearchParams()
  const [campaignPrefill, setCampaignPrefill] = React.useState(
    parseCampaignPrefillContext(searchParams),
  )
  const [presetPrefill, setPresetPrefill] = React.useState<PresetPrefillContext | null>(
    null,
  )

  const summary = React.useMemo(
    () => computeAnalyticsSummary(analyticsRecords),
    [analyticsRecords],
  )

  const filteredRecords = React.useMemo(() => {
    const q = recordSearch.trim().toLowerCase()
    let results = analyticsRecords.filter((record) => {
      if (filterItemType !== "all" && record.itemType !== filterItemType) {
        return false
      }
      if (filterPlatform !== "all" && record.platform !== filterPlatform) {
        return false
      }
      if (!q) return true
      return (
        record.itemName.toLowerCase().includes(q) ||
        record.itemType.toLowerCase().includes(q) ||
        record.platform.toLowerCase().includes(q) ||
        record.relatedArtist.toLowerCase().includes(q) ||
        record.relatedSong.toLowerCase().includes(q) ||
        record.relatedCampaign.toLowerCase().includes(q) ||
        record.niche.toLowerCase().includes(q) ||
        record.genre.toLowerCase().includes(q)
      )
    })
    return sortAnalyticsRecords(results, sortKey, sortDir)
  }, [
    analyticsRecords,
    recordSearch,
    filterItemType,
    filterPlatform,
    sortKey,
    sortDir,
  ])

  const selectedRecords = React.useMemo(
    () => analyticsRecords.filter((r) => selectedIds.has(r.id)),
    [analyticsRecords, selectedIds],
  )

  const insightsPrompt = React.useMemo(
    () => buildInsightsPrompt(selectedRecords),
    [selectedRecords],
  )

  function setField<K extends keyof AnalyticsFormState>(
    key: K,
    value: AnalyticsFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setMetric(key: keyof AnalyticsFormState, raw: string) {
    const value = raw === "" ? 0 : Number(raw)
    setField(key, Number.isNaN(value) ? 0 : value)
  }

  function resetForm() {
    setForm(
      formFromRecord(
        normalizeAnalyticsRecord({ ...emptyAnalyticsRecord(), id: "" }),
      ),
    )
    setEditingId(null)
  }

  function openRecord(record: AnalyticsRecord) {
    const normalized = normalizeAnalyticsRecord(record)
    setForm(formFromRecord(normalized))
    setEditingId(normalized.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
    toast.success("Analytics record loaded")
  }

  React.useEffect(() => {
    if (prefillApplied.current || shouldSkipCampaignUrlPrefill(editingId)) return

    const presetContext = tryConsumePresetPrefill({
      searchParams,
      editingId,
      prefillApplied,
      setForm,
    })
    if (presetContext) {
      setPresetPrefill(presetContext)
      toast.success(presetPrefillToastMessage(presetContext.presetName))
      return
    }

    const context = parseCampaignPrefillContext(searchParams)
    if (context.campaignId) setCampaignPrefill(context)

    const relatedArtist = searchParams.get("relatedArtist")
    const relatedSong = searchParams.get("relatedSong")
    const relatedCampaign = searchParams.get("relatedCampaign")
    const itemName = searchParams.get("itemName")
    const genre = searchParams.get("genre")
    const mood = searchParams.get("mood")
    const url = searchParams.get("url")
    const niche = searchParams.get("niche")
    const publishDate = searchParams.get("publishDate")

    if (
      !context.campaignId &&
      !relatedArtist &&
      !relatedSong &&
      !relatedCampaign &&
      !itemName &&
      !genre &&
      !mood &&
      !url &&
      !niche &&
      !publishDate
    ) {
      return
    }

    prefillApplied.current = true
    setForm((prev) => ({
      ...prev,
      relatedArtist: relatedArtist ?? prev.relatedArtist,
      relatedSong: relatedSong ?? prev.relatedSong,
      relatedCampaign: relatedCampaign ?? prev.relatedCampaign,
      itemName: itemName ?? prev.itemName,
      genre: genre ?? prev.genre,
      mood: mood ?? prev.mood,
      url: url ?? prev.url,
      niche: niche ?? prev.niche,
      publishDate: publishDate ?? prev.publishDate,
    }))
    toast.success(
      context.campaignId
        ? campaignPrefillToastMessage(context.campaignName)
        : "Prefilled from artist CRM",
    )
  }, [searchParams, editingId])

  async function handleSave() {
    const now = Date.now()
    const record = normalizeAnalyticsRecord({
      id: editingId ?? createId("analytics"),
      ...form,
      createdAt: editingId
        ? (analyticsRecords.find((r) => r.id === editingId)?.createdAt ?? now)
        : now,
      updatedAt: now,
    })

    try {
      if (editingId) {
        await updateAnalyticsRecord(record)
        toast.success("Analytics record updated")
      } else {
        await addAnalyticsRecord(record)
        setEditingId(record.id)
        toast.success("Analytics record saved")
      }

      const linked = await linkRecordToCampaign(
        campaigns,
        updateCampaign,
        campaignPrefill.campaignId,
        "analytics",
        record.id,
        analyticsLinkTitle(record),
        "/analytics",
      )
      if (linked) toast.message("Linked to campaign")
    } catch {
      toast.error("Could not save analytics record to database")
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    try {
      await deleteAnalyticsRecord(pendingDelete.id)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(pendingDelete.id)
        return next
      })
      if (editingId === pendingDelete.id) resetForm()
      setPendingDelete(null)
      toast.success("Analytics record deleted")
    } catch {
      toast.error("Could not delete analytics record from database")
    }
  }

  function handleExport() {
    downloadJson("creatorops-analytics.json", analyticsRecords)
    toast.success("Exported analytics records")
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const importResult = parseImportJsonText(String(reader.result))
        if (!importResult.ok) {
          toast.error(importResult.message)
          return
        }
        const parsed = importResult.value
        const items = (Array.isArray(parsed) ? parsed : [parsed]).map((item) =>
          normalizeAnalyticsRecord(item as AnalyticsRecord),
        )
        await importAnalyticsRecords(items)
        toast.success(`Imported ${items.length} record(s) to database`)
      } catch {
        toast.error("Invalid JSON file or import failed")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  async function handleMigrateLocal() {
    const local = loadAnalyticsRecords()
    if (local.length === 0) {
      toast.error("No analytics records found in localStorage to migrate")
      return
    }
    setMigrating(true)
    try {
      const { migrated, total } =
        await migrateLocalAnalyticsRecordsToDatabase(local)
      await reloadAnalyticsRecords()
      toast.success(
        `Migrated ${migrated} local record(s). Database now has ${total} total.`,
      )
    } catch {
      toast.error("Migration to database failed")
    } finally {
      setMigrating(false)
    }
  }

  async function handleCopy(text: string, label: string) {
    try {
      await copyToClipboard(text)
      toast.success(`Copied ${label}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not copy")
    }
  }

  function toggleSort(key: AnalyticsSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  function SortIcon({ column }: { column: AnalyticsSortKey }) {
    if (sortKey !== column) return <ArrowUpDown className="size-3.5 opacity-40" />
    return sortDir === "asc" ? (
      <ArrowUp className="size-3.5" />
    ) : (
      <ArrowDown className="size-3.5" />
    )
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllFiltered() {
    const allSelected = filteredRecords.every((r) => selectedIds.has(r.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const record of filteredRecords) {
        if (allSelected) next.delete(record.id)
        else next.add(record.id)
      }
      return next
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <ModulePageHeader
        title="Analytics Tracker"
        description="Manually track performance for YouTube videos, music releases, merch, listings, social posts, and campaigns."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleSave}>
              {editingId ? "Update analytics record" : "Save analytics record"}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                New record
              </Button>
            ) : null}
          </div>
        }
      />

      <PresetPrefillBanner presetPrefill={presetPrefill} />
      <CampaignPrefillBanner
        campaignId={campaignPrefill.campaignId}
        campaignName={campaignPrefill.campaignName}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total tracked items" value={summary.totalItems} />
        <SummaryCard label="Total views" value={formatNumber(summary.totalViews)} />
        <SummaryCard label="Total clicks" value={formatNumber(summary.totalClicks)} />
        <SummaryCard label="Total sales" value={formatNumber(summary.totalSales)} />
        <SummaryCard
          label="Total revenue"
          value={formatCurrency(summary.totalRevenue)}
        />
        <SummaryCard
          label="Average rating"
          value={
            summary.averageRating > 0 ? (
              <div className="flex items-center gap-2">
                {summary.averageRating.toFixed(1)}
                <RatingStars rating={Math.round(summary.averageRating)} size={14} />
              </div>
            ) : (
              "—"
            )
          }
        />
        <SummaryCard
          label="Best performing platform"
          value={summary.bestPlatform}
          hint="By total views"
        />
        <SummaryCard
          label="Best performing item type"
          value={summary.bestItemType}
          hint="By total views"
        />
      </div>

      <ModuleWorkflowTabs defaultTab="details" tabs={ANALYTICS_WORKFLOW_TABS}>
        <ModuleTabPanel value="details">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tracked item</CardTitle>
              <CardDescription>
                Enter details about the content or campaign you are tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {ITEM_FIELD_ORDER.map((field) => {
                const id = `analytics-${field}`
                const label = ITEM_LABELS[field] ?? field

                if (field === "itemType") {
                  return (
                    <div key={field} className="space-y-2 sm:col-span-2">
                      <Label htmlFor={id}>{label}</Label>
                      <Select
                        value={form.itemType}
                        onValueChange={(v) => setField("itemType", v)}
                      >
                        <SelectTrigger id={id} className="w-full">
                          <span className="truncate">{form.itemType}</span>
                        </SelectTrigger>
                        <SelectContent className="min-w-[260px]">
                          {ANALYTICS_ITEM_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                }

                if (field === "platform") {
                  return (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={id}>{label}</Label>
                      <Select
                        value={form.platform}
                        onValueChange={(v) => setField("platform", v)}
                      >
                        <SelectTrigger id={id} className="w-full">
                          <span className="truncate">{form.platform}</span>
                        </SelectTrigger>
                        <SelectContent className="min-w-[260px]">
                          {ANALYTICS_PLATFORMS.map((platform) => (
                            <SelectItem key={platform} value={platform}>
                              {platform}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                }

                const isTextarea = TEXTAREA_ITEM_FIELDS.has(field)
                const commonProps = {
                  id,
                  value: String(form[field]),
                  onChange: (
                    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                  ) => setField(field, e.target.value),
                  placeholder: `Enter ${label.toLowerCase()}...`,
                  className: "w-full",
                }

                return (
                  <div
                    key={field}
                    className={`space-y-2 ${isTextarea ? "sm:col-span-2" : ""}`}
                  >
                    <Label htmlFor={id}>{label}</Label>
                    {isTextarea ? (
                      <Textarea {...commonProps} className="min-h-20 w-full" />
                    ) : (
                      <Input
                        {...commonProps}
                        type={field === "publishDate" ? "date" : "text"}
                      />
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="metrics">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metrics</CardTitle>
              <CardDescription>
                Enter performance numbers from your platform dashboards
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {METRIC_FIELDS.map(({ key, label, step }) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`metric-${key}`}>{label}</Label>
                  <Input
                    id={`metric-${key}`}
                    type="number"
                    min={0}
                    step={step ?? "1"}
                    value={form[key] === 0 ? "" : form[key]}
                    onChange={(e) => setMetric(key, e.target.value)}
                    placeholder="0"
                    className="w-full"
                  />
                </div>
              ))}
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <Label htmlFor="metric-retentionNotes">Retention notes</Label>
                <Textarea
                  id="metric-retentionNotes"
                  value={form.retentionNotes}
                  onChange={(e) => setField("retentionNotes", e.target.value)}
                  className="min-h-20 w-full"
                  placeholder="Notes on audience retention, drop-off points, etc."
                />
              </div>
            </CardContent>
          </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="review">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Performance review</CardTitle>
              <CardDescription>
                Capture what worked and what to improve
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                [
                  ["whatWorked", "What worked"],
                  ["whatDidNotWork", "What did not work"],
                  ["improvementIdeas", "Improvement ideas"],
                  ["nextActions", "Next actions"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`review-${key}`}>{label}</Label>
                  <Textarea
                    id={`review-${key}`}
                    value={form[key]}
                    onChange={(e) => setField(key, e.target.value)}
                    className="min-h-20 w-full"
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label>Rating</Label>
                <RatingStars
                  rating={form.rating}
                  onChange={(value) => setField("rating", value)}
                  size={20}
                />
              </div>
            </CardContent>
          </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="insights">
          <CampaignPromptOutputSection
            title="Generate Insights Prompt"
            description={
              selectedRecords.length
                ? `${selectedRecords.length} record(s) selected for analysis`
                : "Select records in the Saved Records tab to build an insights prompt"
            }
            basePrompt={insightsPrompt}
            onCopy={handleCopy}
            emptyMessage="Select one or more analytics records in Saved Records, then copy the generated insights prompt."
            contextInput={{
              moduleType: "analytics",
              campaigns,
              urlCampaignId: campaignPrefill.campaignId,
              urlCampaignName: campaignPrefill.campaignName,
              relatedCampaignName: form.relatedCampaign,
              artistName: form.relatedArtist,
              songTitle: form.relatedSong,
              niche: form.niche,
            }}
          />
          {insightsPrompt.trim() ? (
            <SaveLinkedPromptRunButton
              completedPrompt={insightsPrompt}
              moduleType="Analytics"
              campaignId={campaignPrefill.campaignId}
              campaignName={campaignPrefill.campaignName}
              outputRecordId={editingId ?? undefined}
              promptName="Analytics Insights Prompt"
            />
          ) : null}
        </ModuleTabPanel>

        <ModuleTabPanel value="related">
          <RelatedExperimentsPanel
            relatedCampaign={form.relatedCampaign}
            relatedSong={form.relatedSong}
            titleUsed={form.titleUsed}
            itemName={form.itemName}
          />
          <RelationshipPanel
            input={{
              currentType: "analytics",
              currentId: editingId,
              campaignId: campaignPrefill.campaignId,
              relatedCampaign: form.relatedCampaign,
              artistName: form.relatedArtist,
              songTitle: form.relatedSong,
              itemName: form.itemName,
              titleUsed: form.titleUsed,
            }}
          />
        </ModuleTabPanel>

        <ModuleTabPanel value="saved">
      <Card className={RECENT_RECORDS_CARD_CLASS}>
        <CardHeader className="flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-base">Recent analytics records</CardTitle>
            <CardDescription>
              {analyticsRecords.length} saved record
              {analyticsRecords.length === 1 ? "" : "s"}
              {analyticsRecordsUseDatabase
                ? " · stored in SQLite"
                : " · using localStorage fallback"}
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:flex-wrap lg:items-center">
            <div className="relative w-full lg:w-48">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={recordSearch}
                onChange={(e) => setRecordSearch(e.target.value)}
                placeholder="Search records..."
                className="pl-8"
              />
            </div>
            <Select value={filterItemType} onValueChange={setFilterItemType}>
              <SelectTrigger className="w-full lg:w-44">
                <span className="truncate">
                  {filterItemType === "all" ? "All item types" : filterItemType}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All item types</SelectItem>
                {ANALYTICS_ITEM_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="w-full lg:w-40">
                <span className="truncate">
                  {filterPlatform === "all" ? "All platforms" : filterPlatform}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                {ANALYTICS_PLATFORMS.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {platform}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMigrateLocal}
              disabled={migrating}
            >
              <Database className="size-4" />
              {migrating ? "Migrating…" : "Migrate local"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleExport}>
              <Download className="size-4" />
              Export
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {analyticsRecords.length === 0
                ? "No analytics records yet. Fill in the form and save your first tracked item."
                : "No records match your search or filters."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredRecords.length > 0 &&
                        filteredRecords.every((r) => selectedIds.has(r.id))
                      }
                      onChange={toggleSelectAllFiltered}
                      aria-label="Select all filtered records"
                      className="size-4 rounded border"
                    />
                  </TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => toggleSort("views")}
                    >
                      Views
                      <SortIcon column="views" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => toggleSort("clicks")}
                    >
                      Clicks
                      <SortIcon column="clicks" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => toggleSort("sales")}
                    >
                      Sales
                      <SortIcon column="sales" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => toggleSort("revenue")}
                    >
                      Revenue
                      <SortIcon column="revenue" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => toggleSort("rating")}
                    >
                      Rating
                      <SortIcon column="rating" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(record.id)}
                        onChange={() => toggleSelect(record.id)}
                        aria-label={`Select ${record.itemName}`}
                        className="size-4 rounded border"
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => openRecord(record)}
                        className="max-w-[180px] truncate text-left font-medium hover:underline"
                      >
                        {record.itemName || "Untitled"}
                      </button>
                      {record.relatedArtist ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {record.relatedArtist}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {record.itemType}
                      </Badge>
                    </TableCell>
                    <TableCell>{record.platform}</TableCell>
                    <TableCell>{formatNumber(record.views)}</TableCell>
                    <TableCell>{formatNumber(record.clicks)}</TableCell>
                    <TableCell>{formatNumber(record.sales)}</TableCell>
                    <TableCell>{formatCurrency(record.revenue)}</TableCell>
                    <TableCell>
                      {record.rating > 0 ? (
                        <RatingStars rating={record.rating} size={12} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openRecord(record)}
                        >
                          Open
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => setPendingDelete(record)}
                          aria-label="Delete record"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </ModuleTabPanel>
      </ModuleWorkflowTabs>

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete analytics record?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `"${pendingDelete.itemName || "Untitled"}" will be permanently removed.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
