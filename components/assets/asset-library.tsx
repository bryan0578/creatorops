"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Copy,
  Download,
  ExternalLink,
  FolderOpen,
  Link2,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"
import { formatFieldLabel } from "@/lib/ui/labels"
import { formLabelClassName } from "@/components/ui/form-field"

import {
  createAsset,
  deleteAsset,
  duplicateAsset,
  getAssets,
  importAssets,
  updateAsset,
} from "@/lib/actions/assets"
import { getDriveFilesForAsset, createFileAssetsFromSyncedDriveFiles } from "@/lib/actions/drive-integration"
import {
  ASSET_SOURCE_TOOLS,
  ASSET_STATUSES,
  ASSET_TYPES,
  assetFormFromRecord,
  emptyAssetForm,
  formatAssetTags,
  normalizeAssetRecord,
  recordFromAssetForm,
} from "@/lib/assets"
import {
  campaignPrefillToastMessage,
  parseCampaignPrefillContext,
  shouldSkipCampaignUrlPrefill,
} from "@/lib/campaign-prefill"
import {
  buildRecordHref,
  RELATED_TYPE_LABELS,
  type RelatedRecordType,
} from "@/lib/data/related-records"
import { parseImportJsonText } from "@/lib/safe-json"
import { downloadJson } from "@/lib/storage"
import { createId, useStore } from "@/lib/store"
import type { AssetFormValues, AssetRecord, DriveFileRecord } from "@/lib/types"

import { ModulePageHeader } from "@/components/app-shell"
import { CampaignPrefillBanner } from "@/components/campaigns/campaign-prefill-banner"
import { EmptyState } from "@/components/empty-state"
import { AssetRelatedLinksPanel } from "@/components/assets/asset-related-links-panel"
import {
  FormGrid,
  FormSection,
  ModuleTabPanel,
  ModuleWorkflowTabs,
  RECENT_RECORDS_CARD_CLASS,
} from "@/components/module/form-layout"
import { IntegrationLinkButton } from "@/components/integrations/integration-link-button"
import { AssetLinkSuggestionsPanel } from "@/components/asset-linking/asset-link-suggestions-panel"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useSmartDefaultTab } from "@/hooks/use-smart-default-tab"

const ASSET_WORKFLOW_TABS = [
  { value: "details", label: "Asset Details" },
  { value: "source", label: "Source & Links" },
  { value: "usage", label: "Usage Notes" },
  { value: "related", label: "Related" },
  { value: "saved", label: "Saved Assets" },
] as const

const DETAIL_FIELDS: (keyof AssetFormValues)[] = [
  "assetName",
  "assetType",
  "status",
  "campaignName",
  "artistName",
  "songTitle",
  "productName",
  "platform",
  "versionLabel",
  "tags",
  "description",
]

const SOURCE_FIELDS: (keyof AssetFormValues)[] = [
  "filePath",
  "fileUrl",
  "externalUrl",
  "sourceTool",
  "sourcePromptRunId",
  "sourcePromptName",
  "sourceRecordType",
  "sourceRecordId",
  "experimentId",
  "analyticsRecordId",
]

const USAGE_FIELDS: (keyof AssetFormValues)[] = [
  "usageNotes",
  "rightsNotes",
  "notes",
]

const FIELD_LABELS: Record<keyof AssetFormValues, string> = {
  assetName: "Asset name",
  assetType: "Asset type",
  status: "Status",
  campaignId: "Campaign ID",
  campaignName: "Campaign",
  artistName: "Artist",
  songTitle: "Song / track",
  productName: "Product",
  platform: "Platform",
  filePath: "File path",
  fileUrl: "File URL",
  externalUrl: "External URL",
  sourceTool: "Source tool",
  sourcePromptRunId: "Prompt run ID",
  sourcePromptName: "Prompt name",
  sourceRecordType: "Source record type",
  sourceRecordId: "Source record ID",
  experimentId: "Experiment ID",
  analyticsRecordId: "Analytics record ID",
  versionLabel: "Version label",
  tags: "Tags",
  description: "Description",
  usageNotes: "Usage notes",
  rightsNotes: "Rights notes",
  notes: "Notes",
}

const TEXTAREA_FIELDS = new Set<keyof AssetFormValues>([
  "description",
  "usageNotes",
  "rightsNotes",
  "notes",
  "tags",
])

const SOURCE_RECORD_TYPES: RelatedRecordType[] = [
  "release-plan",
  "youtube-package",
  "youtube-thumbnail",
  "social-repurposing",
  "merch-idea",
  "product-listing",
  "mockup-prompt",
  "email-campaign",
  "analytics",
  "experiment",
  "campaign",
  "artist",
]

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function getPromptRunHref(id: string): string {
  return `/prompt-runner?recordId=${encodeURIComponent(id)}`
}

function getSourceRecordHref(type: string, id: string): string | null {
  if (!type.trim() || !id.trim()) return null
  if (type === "prompt-run") return getPromptRunHref(id)
  if (SOURCE_RECORD_TYPES.includes(type as RelatedRecordType)) {
    return buildRecordHref(type as RelatedRecordType, id)
  }
  return null
}

type RelatedLinkItem = {
  key: string
  label: string
  title: string
  subtitle: string
  href: string
}

function buildRelatedLinks(form: AssetFormValues): RelatedLinkItem[] {
  const links: RelatedLinkItem[] = []

  if (form.campaignId.trim()) {
    links.push({
      key: "campaign",
      label: "Campaign",
      title: form.campaignName || "Linked campaign",
      subtitle: form.campaignId,
      href: buildRecordHref("campaign", form.campaignId),
    })
  }

  if (form.sourcePromptRunId.trim()) {
    links.push({
      key: "prompt-run",
      label: "Prompt run",
      title: form.sourcePromptName || "Linked prompt run",
      subtitle: form.sourcePromptRunId,
      href: getPromptRunHref(form.sourcePromptRunId),
    })
  }

  if (form.experimentId.trim()) {
    links.push({
      key: "experiment",
      label: "Experiment",
      title: "Linked experiment",
      subtitle: form.experimentId,
      href: buildRecordHref("experiment", form.experimentId),
    })
  }

  if (form.analyticsRecordId.trim()) {
    links.push({
      key: "analytics",
      label: "Analytics",
      title: "Linked analytics record",
      subtitle: form.analyticsRecordId,
      href: buildRecordHref("analytics", form.analyticsRecordId),
    })
  }

  const sourceHref = getSourceRecordHref(form.sourceRecordType, form.sourceRecordId)
  if (sourceHref) {
    links.push({
      key: "source-record",
      label:
        RELATED_TYPE_LABELS[form.sourceRecordType as RelatedRecordType] ??
        "Source record",
      title: form.sourceRecordType || "Source record",
      subtitle: form.sourceRecordId,
      href: sourceHref,
    })
  }

  return links
}

export function AssetLibrary() {
  const { campaigns } = useStore()
  const searchParams = useSearchParams()

  const [assets, setAssets] = React.useState<AssetRecord[]>([])
  const [loading, setLoading] = React.useState(true)

  const { activeTab, setActiveTab } = useSmartDefaultTab({
    validTabs: ASSET_WORKFLOW_TABS.map((tab) => tab.value),
    detailsTab: "details",
    savedTab: "saved",
    recordsLoaded: !loading,
    hasRecords: assets.length > 0,
  })
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState<AssetFormValues>(emptyAssetForm())
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [driveLinkedFiles, setDriveLinkedFiles] = React.useState<DriveFileRecord[]>([])
  const [driveFilesLoading, setDriveFilesLoading] = React.useState(false)
  const [recordSearch, setRecordSearch] = React.useState("")
  const [filterType, setFilterType] = React.useState("all")
  const [filterStatus, setFilterStatus] = React.useState("all")
  const [filterCampaign, setFilterCampaign] = React.useState("all")
  const [filterArtist, setFilterArtist] = React.useState("all")
  const [filterPlatform, setFilterPlatform] = React.useState("all")
  const [filterTags, setFilterTags] = React.useState("")
  const [pendingDelete, setPendingDelete] = React.useState<AssetRecord | null>(null)
  const [creatingDriveAssets, setCreatingDriveAssets] = React.useState(false)
  const [relatedLinksVersion, setRelatedLinksVersion] = React.useState(0)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const prefillApplied = React.useRef(false)
  const [campaignPrefill, setCampaignPrefill] = React.useState(
    parseCampaignPrefillContext(searchParams),
  )

  const loadAssets = React.useCallback(async () => {
    setLoading(true)
    try {
      const rows = await getAssets()
      setAssets(rows)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load assets.",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadAssets()
  }, [loadAssets])

  React.useEffect(() => {
    const recordId = searchParams.get("recordId")?.trim()
    if (!recordId || loading) return
    const record = assets.find((item) => item.id === recordId)
    if (record) {
      setEditingId(record.id)
      setForm(assetFormFromRecord(record))
    }
  }, [searchParams, assets, loading])

  React.useEffect(() => {
    if (prefillApplied.current || shouldSkipCampaignUrlPrefill(editingId)) return

    const context = parseCampaignPrefillContext(searchParams)
    if (context.campaignId) setCampaignPrefill(context)

    const { campaignId, campaignName } = context
    if (!campaignId && !campaignName) return

    const campaign = campaignId
      ? campaigns.find((item) => item.id === campaignId)
      : campaigns.find(
          (item) =>
            item.campaignName.trim().toLowerCase() ===
            (campaignName ?? "").trim().toLowerCase(),
        )

    setForm((prev) => ({
      ...prev,
      campaignId: campaign?.id ?? campaignId ?? prev.campaignId,
      campaignName: campaign?.campaignName ?? campaignName ?? prev.campaignName,
      artistName: prev.artistName || campaign?.artistName || "",
      songTitle: prev.songTitle || campaign?.songTitle || "",
      productName: prev.productName || campaign?.productName || "",
    }))
    prefillApplied.current = true
    toast.success(campaignPrefillToastMessage(context.campaignName))
  }, [searchParams, campaigns, editingId])

  React.useEffect(() => {
    const assetId = editingId ?? form.id
    if (!assetId) {
      setDriveLinkedFiles([])
      return
    }
    let cancelled = false
    setDriveFilesLoading(true)
    void getDriveFilesForAsset(assetId)
      .then((files) => {
        if (!cancelled) setDriveLinkedFiles(files)
      })
      .finally(() => {
        if (!cancelled) setDriveFilesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [editingId, form.id])

  const filterOptions = React.useMemo(() => {
    const campaignNames = new Set<string>()
    const artists = new Set<string>()
    const platforms = new Set<string>()

    for (const asset of assets) {
      if (asset.campaignName.trim()) campaignNames.add(asset.campaignName.trim())
      if (asset.artistName.trim()) artists.add(asset.artistName.trim())
      if (asset.platform.trim()) platforms.add(asset.platform.trim())
    }

    return {
      campaigns: Array.from(campaignNames).sort(),
      artists: Array.from(artists).sort(),
      platforms: Array.from(platforms).sort(),
    }
  }, [assets])

  const filteredRecords = React.useMemo(() => {
    const q = recordSearch.trim().toLowerCase()
    const tagNeedle = filterTags.trim().toLowerCase()
    const sorted = [...assets].sort((a, b) => b.updatedAt - a.updatedAt)

    return sorted.filter((record) => {
      if (filterType !== "all" && record.assetType !== filterType) return false
      if (filterStatus !== "all" && record.status !== filterStatus) return false
      if (filterCampaign !== "all" && record.campaignName !== filterCampaign) {
        return false
      }
      if (filterArtist !== "all" && record.artistName !== filterArtist) return false
      if (filterPlatform !== "all" && record.platform !== filterPlatform) return false
      if (tagNeedle) {
        const tagHaystack = formatAssetTags(record.tags).toLowerCase()
        if (!tagHaystack.includes(tagNeedle)) return false
      }
      if (!q) return true

      const haystack = [
        record.assetName,
        record.assetType,
        record.status,
        record.campaignName,
        record.artistName,
        record.songTitle,
        record.productName,
        record.platform,
        record.description,
        record.usageNotes,
        formatAssetTags(record.tags),
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [
    assets,
    recordSearch,
    filterType,
    filterStatus,
    filterCampaign,
    filterArtist,
    filterPlatform,
    filterTags,
  ])

  const relatedLinks = React.useMemo(() => buildRelatedLinks(form), [form])

  const summary = React.useMemo(
    () => ({
      total: assets.length,
      ready: assets.filter(
        (asset) =>
          asset.status === "Ready" ||
          asset.status === "Used" ||
          asset.status === "Published",
      ).length,
      withLinks: assets.filter(
        (asset) =>
          asset.filePath.trim() ||
          asset.fileUrl.trim() ||
          asset.externalUrl.trim(),
      ).length,
    }),
    [assets],
  )

  function setField<K extends keyof AssetFormValues>(
    key: K,
    value: AssetFormValues[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setForm(emptyAssetForm())
    setEditingId(null)
    prefillApplied.current = false
  }

  function openRecord(record: AssetRecord) {
    const normalized = normalizeAssetRecord(record)
    setForm(assetFormFromRecord(normalized))
    setEditingId(normalized.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
    toast.success("Asset loaded")
  }

  async function handleSave() {
    if (!form.assetName.trim()) {
      toast.error("Asset name is required.")
      return
    }

    setSaving(true)
    const now = Date.now()
    const existing = editingId
      ? assets.find((item) => item.id === editingId)
      : undefined

    const record = recordFromAssetForm(editingId ?? createId("asset"), form, {
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }, existing?.notes)

    try {
      if (editingId) {
        await updateAsset(record)
        toast.success("Asset updated")
      } else {
        await createAsset(record)
        setEditingId(record.id)
        toast.success("Asset saved")
      }
      await loadAssets()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save asset.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDuplicate(record: AssetRecord) {
    try {
      const copy = await duplicateAsset(record.id)
      if (!copy) {
        toast.error("Asset not found.")
        return
      }
      await loadAssets()
      openRecord(copy)
      toast.success("Asset duplicated")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not duplicate asset.",
      )
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    try {
      const result = await deleteAsset(pendingDelete.id)
      if (!result.ok) {
        toast.error(result.message ?? "Could not delete asset.")
        return
      }
      if (editingId === pendingDelete.id) resetForm()
      setPendingDelete(null)
      await loadAssets()
      toast.success("Asset deleted")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete asset.")
    }
  }

  function handleExport() {
    downloadJson("creatorops-assets.json", assets)
    toast.success("Exported assets")
  }

  function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
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
          normalizeAssetRecord(item as AssetRecord),
        )
        const count = await importAssets(items)
        await loadAssets()
        toast.success(`Imported ${count} asset(s)`)
      } catch {
        toast.error("Invalid JSON file or import failed")
      }
    }
    reader.readAsText(file)
  }

  function renderField(key: keyof AssetFormValues) {
    const label = formatFieldLabel(key)
    const value = form[key]
    const id = `asset-${key}`

    if (key === "assetType") {
      return (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={id}>{label}</Label>
          <Select
            value={value || "Other"}
            onValueChange={(next) => setField(key, next ?? "Other")}
          >
            <SelectTrigger id={id} className="w-full">
              <span className="truncate">{value || "Other"}</span>
            </SelectTrigger>
            <SelectContent className="min-w-[280px]">
              {ASSET_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    if (key === "status") {
      return (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={id}>{label}</Label>
          <Select
            value={value || "Draft"}
            onValueChange={(next) => setField(key, next ?? "Draft")}
          >
            <SelectTrigger id={id} className="w-full">
              <span className="truncate">{value || "Draft"}</span>
            </SelectTrigger>
            <SelectContent>
              {ASSET_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    if (key === "sourceTool") {
      return (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={id}>{label}</Label>
          <Select
            value={value || "none"}
            onValueChange={(next) => setField(key, next === "none" || !next ? "" : next)}
          >
            <SelectTrigger id={id} className="w-full">
              <span className="truncate">{value || "Select tool"}</span>
            </SelectTrigger>
            <SelectContent className="min-w-[240px]">
              <SelectItem value="none">None</SelectItem>
              {ASSET_SOURCE_TOOLS.map((tool) => (
                <SelectItem key={tool} value={tool}>
                  {tool}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    if (key === "campaignName") {
      return (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={id}>{label}</Label>
          <Select
            value={form.campaignId || "none"}
            onValueChange={(next) => {
              if (!next || next === "none") {
                setField("campaignId", "")
                setField("campaignName", "")
                return
              }
              const campaign = campaigns.find((item) => item.id === next)
              setField("campaignId", next)
              setField("campaignName", campaign?.campaignName ?? "")
            }}
          >
            <SelectTrigger id={id} className="w-full">
              <span className="truncate">{form.campaignName || "Select campaign"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No campaign</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.campaignName || "Untitled campaign"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    if (TEXTAREA_FIELDS.has(key)) {
      return (
        <div key={key} className="space-y-1.5 md:col-span-2">
          <Label htmlFor={id}>{label}</Label>
          <Textarea
            id={id}
            value={value}
            onChange={(event) => setField(key, event.target.value)}
            rows={key === "tags" ? 2 : 4}
            placeholder={
              key === "tags" ? "Comma-separated tags or JSON array" : undefined
            }
          />
        </div>
      )
    }

    return (
      <div key={key} className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          value={value}
          onChange={(event) => setField(key, event.target.value)}
          placeholder={`Enter ${label.toLowerCase()}…`}
        />
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ModulePageHeader
        title="Asset Library"
        description="Track creative files, URLs, references, prompts, and production assets across campaigns."
        action={
          <>
            <Button type="button" size="sm" onClick={resetForm}>
              <Plus className="size-4" />
              New Asset
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={creatingDriveAssets}
              onClick={() => {
                setCreatingDriveAssets(true)
                void createFileAssetsFromSyncedDriveFiles()
                  .then((result) => {
                    toast[result.success ? "success" : "error"](result.message)
                    if (result.success) void loadAssets()
                  })
                  .finally(() => setCreatingDriveAssets(false))
              }}
            >
              {creatingDriveAssets ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FolderOpen className="size-4" />
              )}
              Create File Assets from Drive
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleExport}>
              <Download className="size-4" />
              Export JSON
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              Import JSON
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImport}
            />
          </>
        }
      />

      <CampaignPrefillBanner
        campaignId={campaignPrefill.campaignId}
        campaignName={campaignPrefill.campaignName}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className={RECENT_RECORDS_CARD_CLASS}>
          <CardHeader className="pb-2">
            <CardDescription>Total assets</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={RECENT_RECORDS_CARD_CLASS}>
          <CardHeader className="pb-2">
            <CardDescription>Ready / used</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{summary.ready}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={RECENT_RECORDS_CARD_CLASS}>
          <CardHeader className="pb-2">
            <CardDescription>With file or URL</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{summary.withLinks}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <ModuleWorkflowTabs
        tabs={ASSET_WORKFLOW_TABS}
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <ModuleTabPanel value="details">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Asset details</CardTitle>
              <CardDescription>
                Name, type, campaign context, and descriptive metadata.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.campaignName ? (
                <Badge variant="secondary">Campaign: {form.campaignName}</Badge>
              ) : null}
              <FormSection>
                <FormGrid>{DETAIL_FIELDS.map((field) => renderField(field))}</FormGrid>
              </FormSection>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving…
                    </>
                  ) : editingId ? (
                    "Update Asset"
                  ) : (
                    "Save Asset"
                  )}
                </Button>
                {editingId ? (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    New Asset
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="source">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Source &amp; links</CardTitle>
              <CardDescription>
                File locations, external URLs, and links back to CreatorOps records.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormSection>
                <FormGrid>{SOURCE_FIELDS.map((field) => renderField(field))}</FormGrid>
              </FormSection>
              {!form.filePath.trim() &&
              !form.fileUrl.trim() &&
              !form.externalUrl.trim() ? (
                <EmptyState
                  icon={Link2}
                  title="No file or URL yet"
                  description="Add a local path, hosted file URL, or external reference link for this asset."
                />
              ) : null}
              <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                Save Source &amp; Links
              </Button>
              {form.sourceTool === "Google Drive" ? (
                <p className="text-sm text-muted-foreground rounded-md border border-border/60 p-3">
                  This asset was created from Google Drive
                  {form.sourceRecordType === "DriveFile" && form.sourceRecordId
                    ? ` (file id ${form.sourceRecordId})`
                    : ""}
                  .
                </p>
              ) : null}
            </CardContent>
          </Card>

          {form.id ? (
            <AssetLinkSuggestionsPanel
              assetId={form.id}
              campaignId={form.campaignId || undefined}
              limit={6}
              compact
              onApplied={() => {
                void getDriveFilesForAsset(form.id).then(setDriveLinkedFiles)
              }}
            />
          ) : null}

          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Google Drive files</CardTitle>
              <CardDescription>
                Drive files synced and linked to this asset via the Google Drive integration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.id ? (
                <>
                  {driveFilesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Loading Drive files…
                    </div>
                  ) : driveLinkedFiles.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {driveLinkedFiles.map((file) => (
                        <li
                          key={file.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 p-3"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {[file.detectedAssetType, file.mimeType].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {file.webViewLink || file.url ? (
                              <Link
                                href={file.webViewLink || file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={buttonVariants({ variant: "outline", size: "sm" })}
                              >
                                Open Drive
                              </Link>
                            ) : null}
                            <Link
                              href={`/integrations?tab=google-drive&fileId=${encodeURIComponent(file.id)}`}
                              className={buttonVariants({ variant: "outline", size: "sm" })}
                            >
                              View in Integrations
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState
                      icon={FolderOpen}
                      title="No linked Drive files"
                      description="Sync a Drive folder in Integrations, then link or create assets from synced files."
                    />
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/integrations?tab=google-drive&assetId=${encodeURIComponent(form.id)}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Link Drive File
                    </Link>
                    {(form.externalUrl || form.fileUrl || driveLinkedFiles[0]?.webViewLink) ? (
                      <Link
                        href={
                          form.externalUrl ||
                          form.fileUrl ||
                          driveLinkedFiles[0]?.webViewLink ||
                          "#"
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Open Drive Source
                      </Link>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Save this asset first to link Google Drive files.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">External links</CardTitle>
              <CardDescription>
                Track Google Drive, Canva, Midjourney, Suno, and other source URLs for this
                asset.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {form.id ? (
                <>
                  <IntegrationLinkButton
                    label="Google Drive File"
                    assetId={form.id}
                    campaignId={form.campaignId}
                    sourceRecordType="Asset"
                    sourceRecordId={form.id}
                    platform="Google Drive"
                    linkType="Google Drive File"
                  />
                  <IntegrationLinkButton
                    label="Google Drive Folder"
                    assetId={form.id}
                    campaignId={form.campaignId}
                    sourceRecordType="Asset"
                    sourceRecordId={form.id}
                    platform="Google Drive"
                    linkType="Google Drive Folder"
                  />
                  <IntegrationLinkButton
                    label="Canva Link"
                    assetId={form.id}
                    campaignId={form.campaignId}
                    sourceRecordType="Asset"
                    sourceRecordId={form.id}
                    platform="Canva"
                    linkType="Reference"
                  />
                  <IntegrationLinkButton
                    label="Midjourney Link"
                    assetId={form.id}
                    campaignId={form.campaignId}
                    sourceRecordType="Asset"
                    sourceRecordId={form.id}
                    platform="Midjourney"
                    linkType="Reference"
                  />
                  <IntegrationLinkButton
                    label="Suno Link"
                    assetId={form.id}
                    campaignId={form.campaignId}
                    sourceRecordType="Asset"
                    sourceRecordId={form.id}
                    platform="Suno"
                    linkType="Suno Song"
                  />
                  <IntegrationLinkButton
                    label="Other Source Link"
                    assetId={form.id}
                    campaignId={form.campaignId}
                    sourceRecordType="Asset"
                    sourceRecordId={form.id}
                    linkType="Asset Source"
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Save this asset first to add external links.
                </p>
              )}
            </CardContent>
          </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="usage">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Usage notes</CardTitle>
              <CardDescription>
                How to use this asset, rights considerations, and internal notes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormSection>
                <FormGrid columns={1}>
                  {USAGE_FIELDS.map((field) => renderField(field))}
                </FormGrid>
              </FormSection>
              {!form.usageNotes.trim() &&
              !form.rightsNotes.trim() &&
              !form.notes.trim() ? (
                <EmptyState
                  title="No usage notes yet"
                  description="Document where this asset should be used, licensing notes, and production context."
                />
              ) : null}
              <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                Save Usage Notes
              </Button>
            </CardContent>
          </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="related">
          <div className="space-y-4">
            {relatedLinks.length ? (
              <Card className={RECENT_RECORDS_CARD_CLASS}>
                <CardHeader>
                  <CardTitle className="text-base">Related records</CardTitle>
                  <CardDescription>
                    Campaign, prompt run, experiment, analytics, and Drive source links.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    {relatedLinks.map((link) => (
                      <Link
                        key={link.key}
                        href={link.href}
                        className="flex flex-col gap-1 rounded-xl border border-border/80 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{link.label}</Badge>
                            <p className="font-medium text-pretty">{link.title}</p>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {link.subtitle}
                          </p>
                        </div>
                        <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <AssetRelatedLinksPanel
              key={`${editingId ?? "new"}-${relatedLinksVersion}`}
              assetId={editingId}
              showBulkActions={Boolean(editingId)}
              onLinksChanged={() => {
                setRelatedLinksVersion((v) => v + 1)
                void loadAssets()
              }}
            />
          </div>
        </ModuleTabPanel>

        <ModuleTabPanel value="saved">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader className="flex flex-col gap-4">
              <div>
                <CardTitle className="text-base">Saved assets</CardTitle>
                <CardDescription>
                  {assets.length} saved asset{assets.length === 1 ? "" : "s"} · search and
                  filter by type, status, campaign, artist, platform, or tags
                </CardDescription>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="relative lg:col-span-3">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={recordSearch}
                    onChange={(event) => setRecordSearch(event.target.value)}
                    placeholder="Search assets…"
                    className="pl-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={filterType}
                    onValueChange={(value) => setFilterType(value ?? "all")}
                  >
                    <SelectTrigger className="w-full">
                      <span className="truncate">
                        {filterType === "all" ? "All types" : filterType}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {ASSET_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={filterStatus}
                    onValueChange={(value) => setFilterStatus(value ?? "all")}
                  >
                    <SelectTrigger className="w-full">
                      <span className="truncate">
                        {filterStatus === "all" ? "All statuses" : filterStatus}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {ASSET_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Campaign</Label>
                  <Select
                    value={filterCampaign}
                    onValueChange={(value) => setFilterCampaign(value ?? "all")}
                  >
                    <SelectTrigger className="w-full">
                      <span className="truncate">
                        {filterCampaign === "all" ? "All campaigns" : filterCampaign}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All campaigns</SelectItem>
                      {filterOptions.campaigns.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Artist</Label>
                  <Select
                    value={filterArtist}
                    onValueChange={(value) => setFilterArtist(value ?? "all")}
                  >
                    <SelectTrigger className="w-full">
                      <span className="truncate">
                        {filterArtist === "all" ? "All artists" : filterArtist}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All artists</SelectItem>
                      {filterOptions.artists.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Platform</Label>
                  <Select
                    value={filterPlatform}
                    onValueChange={(value) => setFilterPlatform(value ?? "all")}
                  >
                    <SelectTrigger className="w-full">
                      <span className="truncate">
                        {filterPlatform === "all" ? "All platforms" : filterPlatform}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All platforms</SelectItem>
                      {filterOptions.platforms.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 lg:col-span-3">
                  <Label htmlFor="asset-tag-filter">Tags</Label>
                  <Input
                    id="asset-tag-filter"
                    value={filterTags}
                    onChange={(event) => setFilterTags(event.target.value)}
                    placeholder="Filter by tag…"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading assets…
                </div>
              ) : filteredRecords.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  title={
                    assets.length === 0
                      ? "No assets saved yet"
                      : "No assets match your filters"
                  }
                  description={
                    assets.length === 0
                      ? "Create your first asset to track creative files, URLs, references, and production outputs."
                      : "Try adjusting search or filter criteria."
                  }
                  primaryActionLabel={assets.length === 0 ? "New Asset" : undefined}
                  primaryActionOnClick={assets.length === 0 ? resetForm : undefined}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex flex-col gap-3 rounded-xl border border-border/80 p-4 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <button
                        type="button"
                        onClick={() => openRecord(record)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-pretty">
                            {record.assetName || "Untitled asset"}
                          </p>
                          {record.assetType ? (
                            <Badge variant="secondary">{record.assetType}</Badge>
                          ) : null}
                          {record.status ? (
                            <Badge variant="outline">{record.status}</Badge>
                          ) : null}
                          {editingId === record.id ? (
                            <Badge variant="outline" className="text-xs">
                              Editing
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {[record.campaignName, record.artistName, record.platform]
                            .filter(Boolean)
                            .join(" · ") || "No campaign context"}
                        </p>
                        {record.tags.length ? (
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            Tags: {formatAssetTags(record.tags)}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-muted-foreground">
                          Updated {formatDate(record.updatedAt)}
                        </p>
                      </button>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button type="button" size="sm" onClick={() => openRecord(record)}>
                          Open
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleDuplicate(record)}
                        >
                          <Copy className="size-4" />
                          Duplicate
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setPendingDelete(record)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </ModuleTabPanel>
      </ModuleWorkflowTabs>

      <Dialog open={Boolean(pendingDelete)} onOpenChange={() => setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete asset?</DialogTitle>
            <DialogDescription>
              This removes{" "}
              <span className="font-medium">
                {pendingDelete?.assetName || "this asset"}
              </span>{" "}
              from the library. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
