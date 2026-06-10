"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { parseImportJsonText } from "@/lib/safe-json"
import {
  Copy,
  Download,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { useStore, createId } from "@/lib/store"
import type {
  CampaignFormValues,
  CampaignLinkedRecord,
  CampaignLinkedRecordType,
  CampaignRecord,
  CampaignTask,
  PublishingChecklist,
} from "@/lib/types"
import {
  CAMPAIGN_BUILDER_STATUSES,
  CAMPAIGN_BUILDER_TYPES,
  CAMPAIGN_PRIORITIES,
  CAMPAIGN_TASK_STATUSES,
} from "@/lib/types"
import { buildCampaignQuickActionHref } from "@/lib/campaign-prefill"
import type { PresetPrefillContext } from "@/lib/preset-prefill"
import {
  presetPrefillToastMessage,
  tryConsumePresetPrefill,
} from "@/lib/preset-prefill"
import { ModulePageHeader } from "@/components/app-shell"
import { PresetPrefillBanner } from "@/components/presets/preset-prefill-banner"
import { ApplyWorkspaceDefaultsButton } from "@/components/settings/apply-workspace-defaults-button"
import {
  buildCampaignRecordFromForm,
  buildCampaignTimeline,
  buildLinkedRecordFromOption,
  CAMPAIGN_LINK_TYPE_LABELS,
  CAMPAIGN_LINKABLE_TYPES,
  campaignFormFromRecord,
  duplicateCampaignRecord,
  emptyCampaignForm,
  emptyCampaignTask,
  emptyPublishingChecklist,
  getLinkableRecordOptions,
} from "@/lib/campaigns"
import { downloadJson, loadCampaigns } from "@/lib/storage"
import { migrateLocalCampaignsToDatabase } from "@/lib/actions/campaigns"
import { CampaignLinkedRecordsGroups } from "@/components/relationships/campaign-linked-records-groups"
import {
  CampaignLaunchDashboard,
  CampaignLaunchDashboardEmpty,
} from "@/components/campaigns/launch-dashboard/campaign-launch-dashboard"
import { PublishingChecklistTab } from "@/components/campaigns/publishing-checklist-tab"
import { EmptyState } from "@/components/empty-state"
import {
  CAMPAIGN_BUILDER_TABS,
  FormGrid,
  FormSection,
  ModuleTabPanel,
  RECENT_RECORDS_CARD_CLASS,
} from "@/components/module/form-layout"
import { TabRow } from "@/components/ui/tab-row"
import { Tabs, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

const OVERVIEW_TEXTAREAS = new Set(["description", "primaryGoal", "targetAudience"])

const QUICK_ACTIONS = [
  { label: "Create release plan", module: "release-planner" as const },
  { label: "Create YouTube package", module: "youtube-packaging" as const },
  { label: "Create YouTube thumbnail", module: "youtube-thumbnails" as const },
  { label: "Create social content", module: "social-repurposing" as const },
  { label: "Create merch idea", module: "merch-ideas" as const },
  { label: "Create product listing", module: "product-listings" as const },
  { label: "Create mockup prompt", module: "mockup-prompts" as const },
  { label: "Create email campaign", module: "email-campaigns" as const },
  { label: "Create analytics record", module: "analytics" as const },
]

export function CampaignBuilder() {
  const store = useStore()
  const searchParams = useSearchParams()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [recordId, setRecordId] = React.useState(() => createId("campaign"))
  const [createdAt, setCreatedAt] = React.useState(() => Date.now())
  const [form, setForm] = React.useState<CampaignFormValues>(emptyCampaignForm)
  const [linkedRecords, setLinkedRecords] = React.useState<CampaignLinkedRecord[]>(
    [],
  )
  const [tasks, setTasks] = React.useState<CampaignTask[]>([])
  const [publishingChecklist, setPublishingChecklist] =
    React.useState<PublishingChecklist>(emptyPublishingChecklist)
  const [saving, setSaving] = React.useState(false)
  const [savedFilter, setSavedFilter] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("overview")

  const [linkType, setLinkType] =
    React.useState<CampaignLinkedRecordType>("release-plan")
  const [linkRecordId, setLinkRecordId] = React.useState("")
  const [linkNotes, setLinkNotes] = React.useState("")
  const [linkSearch, setLinkSearch] = React.useState("")

  const recordOpened = React.useRef(false)
  const presetPrefillApplied = React.useRef(false)
  const [presetPrefill, setPresetPrefill] = React.useState<PresetPrefillContext | null>(
    null,
  )

  const linkableOptions = React.useMemo(() => {
    const options = getLinkableRecordOptions(linkType, store)
    const query = linkSearch.trim().toLowerCase()
    if (!query) return options
    return options.filter(
      (option) =>
        option.title.toLowerCase().includes(query) ||
        option.subtitle.toLowerCase().includes(query),
    )
  }, [linkType, linkSearch, store])

  const filteredCampaigns = React.useMemo(() => {
    const query = savedFilter.trim().toLowerCase()
    if (!query) return store.campaigns
    return store.campaigns.filter((campaign) => {
      const haystack = [
        campaign.campaignName,
        campaign.campaignType,
        campaign.status,
        campaign.artistName,
        campaign.songTitle,
        campaign.productName,
        campaign.niche,
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [savedFilter, store.campaigns])

  const timeline = React.useMemo(
    () =>
      buildCampaignTimeline(
        buildCampaignRecordFromForm(
          recordId,
          form,
          linkedRecords,
          tasks,
          { createdAt, updatedAt: Date.now() },
          publishingChecklist,
        ),
      ),
    [recordId, form, linkedRecords, tasks, createdAt, publishingChecklist],
  )

  const buildCurrentRecord = React.useCallback(
    (updatedAt = Date.now()) =>
      buildCampaignRecordFromForm(
        recordId,
        form,
        linkedRecords,
        tasks.map((task, index) => ({ ...task, order: index })),
        { createdAt, updatedAt },
        publishingChecklist,
      ),
    [recordId, form, linkedRecords, tasks, createdAt, publishingChecklist],
  )

  function loadRecord(record: CampaignRecord) {
    setRecordId(record.id)
    setCreatedAt(record.createdAt)
    setForm(campaignFormFromRecord(record))
    setLinkedRecords(record.linkedRecords)
    setTasks(record.tasks)
    setPublishingChecklist(record.publishingChecklist)
    setActiveTab("launch")
    toast.message(`Opened ${record.campaignName || "campaign"}`)
  }

  function resetDraft() {
    const id = createId("campaign")
    const now = Date.now()
    setRecordId(id)
    setCreatedAt(now)
    setForm(emptyCampaignForm())
    setLinkedRecords([])
    setTasks([])
    setPublishingChecklist(emptyPublishingChecklist())
    setActiveTab("overview")
  }

  function updateForm<K extends keyof CampaignFormValues>(
    key: K,
    value: CampaignFormValues[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.campaignName.trim()) {
      toast.error("Campaign name is required")
      return
    }

    setSaving(true)
    try {
      const record = buildCurrentRecord()

      const exists = store.campaigns.some((c) => c.id === recordId)
      if (exists) {
        await store.updateCampaign(record)
      } else {
        await store.addCampaign(record)
      }
      toast.success("Campaign saved")
    } catch {
      toast.error("Could not save campaign")
    } finally {
      setSaving(false)
    }
  }

  function handleAddLinkedRecord() {
    if (!linkRecordId) {
      toast.error("Select a record to link")
      return
    }

    if (linkedRecords.some((r) => r.type === linkType && r.id === linkRecordId)) {
      toast.error("This record is already linked")
      return
    }

    const option = getLinkableRecordOptions(linkType, store).find(
      (item) => item.id === linkRecordId,
    )
    if (!option) {
      toast.error("Selected record not found")
      return
    }

    setLinkedRecords((prev) => [
      ...prev,
      buildLinkedRecordFromOption(linkType, option, linkNotes),
    ])
    setLinkRecordId("")
    setLinkNotes("")
    setLinkSearch("")
    toast.success("Linked record added")
  }

  function handleRemoveLinkedRecord(id: string, type: CampaignLinkedRecordType) {
    setLinkedRecords((prev) =>
      prev.filter((record) => !(record.id === id && record.type === type)),
    )
  }

  function handleAddTask() {
    setTasks((prev) => [
      ...prev,
      emptyCampaignTask(createId("task"), prev.length),
    ])
  }

  function updateTask(id: string, patch: Partial<CampaignTask>) {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    )
  }

  function removeTask(id: string) {
    setTasks((prev) => prev.filter((task) => task.id !== id))
  }

  async function handleDeleteCampaign(id: string) {
    try {
      await store.deleteCampaign(id)
      if (id === recordId) resetDraft()
      toast.success("Campaign deleted")
    } catch {
      toast.error("Could not delete campaign")
    }
  }

  async function handleDuplicate(record: CampaignRecord) {
    const copy = duplicateCampaignRecord(record, createId("campaign"))
    try {
      await store.addCampaign(copy)
      loadRecord(copy)
      toast.success("Campaign duplicated")
    } catch {
      toast.error("Could not duplicate campaign")
    }
  }

  function handleExport() {
    downloadJson("creatorops-campaigns.json", store.campaigns)
    toast.success("Exported campaigns")
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
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
        if (!Array.isArray(parsed)) throw new Error("Invalid format")
        await store.importCampaigns(parsed)
        toast.success(`Imported ${parsed.length} campaign(s)`)
      } catch {
        toast.error("Invalid campaigns JSON")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  async function handleMigrateLocal() {
    const local = loadCampaigns()
    if (local.length === 0) {
      toast.message("No local campaigns to migrate")
      return
    }
    try {
      const result = await migrateLocalCampaignsToDatabase(local)
      await store.reloadCampaigns()
      toast.success(`Migrated ${result.migrated} campaign(s) to SQLite`)
    } catch {
      toast.error("Migration failed")
    }
  }

  React.useEffect(() => {
    if (!store.hydrated) return
    const tab = searchParams.get("tab")
    if (
      tab &&
      CAMPAIGN_BUILDER_TABS.some((item) => item.value === tab)
    ) {
      setActiveTab(tab)
    }
  }, [searchParams, store.hydrated])

  React.useEffect(() => {
    if (!store.hydrated) return
    const paramId =
      searchParams.get("campaignId") ?? searchParams.get("recordId")
    if (!paramId) return
    const record = store.campaigns.find((c) => c.id === paramId)
    if (!record) return

    if (!recordOpened.current || paramId !== recordId) {
      loadRecord(record)
      recordOpened.current = true
    }
  }, [searchParams, store.campaigns, store.hydrated, recordId])

  React.useEffect(() => {
    if (!store.hydrated || presetPrefillApplied.current) return

    const openId = searchParams.get("campaignId") ?? searchParams.get("recordId")
    if (openId && store.campaigns.some((c) => c.id === openId)) return

    const isEditingSaved =
      store.campaigns.some((c) => c.id === recordId) && form.campaignName.trim()

    const presetContext = tryConsumePresetPrefill({
      searchParams,
      editingId: isEditingSaved ? recordId : null,
      prefillApplied: presetPrefillApplied,
      setForm,
    })
    if (presetContext) {
      setPresetPrefill(presetContext)
      setActiveTab("overview")
      toast.success(presetPrefillToastMessage(presetContext.presetName))
    }
  }, [store.hydrated, searchParams, store.campaigns, recordId, form.campaignName])

  React.useEffect(() => {
    const campaign = store.campaigns.find((c) => c.id === recordId)
    if (!campaign) return

    const localKeys = new Set(
      linkedRecords.map((r) => `${r.type}:${r.id}`),
    )
    const missingFromStore = campaign.linkedRecords.filter(
      (r) => !localKeys.has(`${r.type}:${r.id}`),
    )
    if (missingFromStore.length === 0) return

    setLinkedRecords((prev) => [...prev, ...missingFromStore])
  }, [store.campaigns, recordId, linkedRecords])

  const isEditingSaved =
    store.campaigns.some((c) => c.id === recordId) && form.campaignName.trim()

  const launchCampaign = React.useMemo(
    () => buildCurrentRecord(),
    [buildCurrentRecord],
  )

  async function handleSavePublishingChecklist(next: PublishingChecklist) {
    setPublishingChecklist(next)
  }

  async function saveCurrentCampaign(checklistOverride?: PublishingChecklist) {
    if (!form.campaignName.trim()) {
      toast.error("Campaign name is required")
      return
    }
    setSaving(true)
    try {
      const record = buildCampaignRecordFromForm(
        recordId,
        form,
        linkedRecords,
        tasks.map((task, index) => ({ ...task, order: index })),
        { createdAt, updatedAt: Date.now() },
        checklistOverride ?? publishingChecklist,
      )
      const exists = store.campaigns.some((c) => c.id === recordId)
      if (exists) {
        await store.updateCampaign(record)
      } else {
        await store.addCampaign(record)
      }
    } catch {
      toast.error("Could not save campaign")
      throw new Error("save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleGeneratePublishingChecklist(next: PublishingChecklist) {
    setPublishingChecklist(next)
    setSaving(true)
    try {
      const record = buildCampaignRecordFromForm(
        recordId,
        form,
        linkedRecords,
        tasks.map((task, index) => ({ ...task, order: index })),
        { createdAt, updatedAt: Date.now() },
        next,
      )
      const exists = store.campaigns.some((c) => c.id === recordId)
      if (exists) {
        await store.updateCampaign(record)
      } else {
        await store.addCampaign(record)
      }
      toast.success("Publishing checklist generated")
    } catch {
      toast.error("Could not save checklist")
    } finally {
      setSaving(false)
    }
  }

  const linkableStore = React.useMemo(
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

  return (
    <div className="flex flex-col gap-8">
      <ModulePageHeader
        title="Campaign Builder"
        description="Plan a launch from one place — link release plans, YouTube assets, merch, email, social, analytics, and more."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ApplyWorkspaceDefaultsButton
              module="campaign"
              form={form}
              setForm={setForm}
            />
            <Button type="button" variant="outline" onClick={resetDraft}>
              <Plus className="size-4" />
              New campaign
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save campaign
            </Button>
          </div>
        }
      />

      <PresetPrefillBanner presetPrefill={presetPrefill} />

      {isEditingSaved ? (
        <p className="-mt-4 text-sm text-muted-foreground">
          Editing: <span className="font-medium text-foreground">{form.campaignName}</span>
        </p>
      ) : null}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full gap-6"
      >
        <TabRow>
          {CAMPAIGN_BUILDER_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabRow>
        <ModuleTabPanel value="launch">
          {isEditingSaved ? (
            <CampaignLaunchDashboard
              campaign={launchCampaign}
              store={linkableStore}
              promptRuns={store.runs}
              onGoToTasks={() => setActiveTab("tasks")}
              onGoToPublishingChecklist={() => setActiveTab("publishing-checklist")}
              onGeneratePublishingChecklist={handleGeneratePublishingChecklist}
              onGoToOverview={() => setActiveTab("overview")}
              onGoToSaved={() => setActiveTab("saved")}
              onGoToLinked={() => setActiveTab("linked")}
            />
          ) : (
            <CampaignLaunchDashboardEmpty
              onCreateCampaign={() => setActiveTab("overview")}
              onGoToSaved={() => setActiveTab("saved")}
            />
          )}
        </ModuleTabPanel>
        <ModuleTabPanel value="overview">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Campaign overview</CardTitle>
              <CardDescription>
                Core details for this launch — artist, song, product, dates, and goals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormGrid>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="campaignName">Campaign name</Label>
                  <Input
                    id="campaignName"
                    value={form.campaignName}
                    onChange={(e) => updateForm("campaignName", e.target.value)}
                    placeholder="No Exit Release Promo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Campaign type</Label>
                  <Select
                    value={form.campaignType}
                    onValueChange={(v) => updateForm("campaignType", v)}
                  >
                    <SelectTrigger className="w-full">
                      <span>{form.campaignType || "Select type"}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_BUILDER_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => updateForm("status", v)}
                  >
                    <SelectTrigger className="w-full">
                      <span>{form.status}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_BUILDER_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => updateForm("priority", v)}
                  >
                    <SelectTrigger className="w-full">
                      <span>{form.priority}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="artistName">Artist name</Label>
                  <Input
                    id="artistName"
                    value={form.artistName}
                    onChange={(e) => updateForm("artistName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="songTitle">Song title</Label>
                  <Input
                    id="songTitle"
                    value={form.songTitle}
                    onChange={(e) => updateForm("songTitle", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productName">Product name</Label>
                  <Input
                    id="productName"
                    value={form.productName}
                    onChange={(e) => updateForm("productName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="niche">Niche</Label>
                  <Input
                    id="niche"
                    value={form.niche}
                    onChange={(e) => updateForm("niche", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => updateForm("startDate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="launchDate">Launch date</Label>
                  <Input
                    id="launchDate"
                    type="date"
                    value={form.launchDate}
                    onChange={(e) => updateForm("launchDate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => updateForm("endDate", e.target.value)}
                  />
                </div>
              </FormGrid>

              {(["primaryGoal", "targetAudience", "description"] as const).map(
                (key) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key}>
                      {key === "primaryGoal"
                        ? "Primary goal"
                        : key === "targetAudience"
                          ? "Target audience"
                          : "Description"}
                    </Label>
                    <Textarea
                      id={key}
                      rows={OVERVIEW_TEXTAREAS.has(key) ? 3 : 2}
                      value={form[key]}
                      onChange={(e) => updateForm(key, e.target.value)}
                    />
                  </div>
                ),
              )}

              <FormSection title="Quick actions" description="Jump to a module to create linked assets. Supported fields are passed as query params where available.">
                <div className="flex flex-wrap gap-2">
                  {QUICK_ACTIONS.map((action) => (
                    <Link
                      key={action.module}
                      href={buildCampaignQuickActionHref(
                        action.module,
                        form,
                        recordId,
                      )}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <Plus className="size-4" />
                      {action.label}
                    </Link>
                  ))}
                </div>
              </FormSection>
            </CardContent>
          </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="linked">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Link existing records</CardTitle>
              <CardDescription>
                Attach release plans, YouTube assets, merch, email, analytics, and more.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormGrid columns={3}>
                <div className="space-y-2">
                  <Label>Record type</Label>
                  <Select
                    value={linkType}
                    onValueChange={(v) => {
                      setLinkType(v as CampaignLinkedRecordType)
                      setLinkRecordId("")
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <span>{CAMPAIGN_LINK_TYPE_LABELS[linkType]}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_LINKABLE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {CAMPAIGN_LINK_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Search records</Label>
                  <div className="relative">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      value={linkSearch}
                      onChange={(e) => setLinkSearch(e.target.value)}
                      placeholder="Filter by title or subtitle…"
                    />
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Record</Label>
                  <Select value={linkRecordId} onValueChange={setLinkRecordId}>
                    <SelectTrigger className="w-full">
                      <span>
                        {linkRecordId
                          ? linkableOptions.find((o) => o.id === linkRecordId)?.title
                          : "Select a record"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {linkableOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.title}
                          {option.subtitle ? ` — ${option.subtitle}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-3">
                  <Label htmlFor="linkNotes">Notes for this link</Label>
                  <Input
                    id="linkNotes"
                    value={linkNotes}
                    onChange={(e) => setLinkNotes(e.target.value)}
                    placeholder="Optional context for this linked record"
                  />
                </div>
              </FormGrid>
              <Button type="button" onClick={handleAddLinkedRecord}>
                <Plus className="size-4" />
                Add linked record
              </Button>

              <div className="space-y-3">
                <CampaignLinkedRecordsGroups
                  linkedRecords={linkedRecords}
                  campaignId={recordId}
                  form={form}
                  onRemove={handleRemoveLinkedRecord}
                />
              </div>
            </CardContent>
          </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="tasks">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">Campaign tasks</CardTitle>
                <CardDescription>
                  Track launch to-dos with due dates and optional related records.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddTask}>
                <Plus className="size-4" />
                Add task
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {tasks.length === 0 ? (
                <EmptyState
                  title="No tasks yet"
                  description="Add launch to-dos with due dates and optional links to related records."
                  primaryActionLabel="Add first task"
                  primaryActionOnClick={handleAddTask}
                />
              ) : (
                tasks.map((task, index) => (
                  <div
                    key={task.id}
                    className="space-y-3 rounded-xl border border-border/80 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Task {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTask(task.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <FormGrid>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Title</Label>
                        <Input
                          value={task.title}
                          onChange={(e) =>
                            updateTask(task.id, { title: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={task.status}
                          onValueChange={(v) =>
                            updateTask(task.id, {
                              status: v as CampaignTask["status"],
                            })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <span>{task.status}</span>
                          </SelectTrigger>
                          <SelectContent>
                            {CAMPAIGN_TASK_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Due date</Label>
                        <Input
                          type="date"
                          value={task.dueDate}
                          onChange={(e) =>
                            updateTask(task.id, { dueDate: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Description</Label>
                        <Textarea
                          rows={2}
                          value={task.description}
                          onChange={(e) =>
                            updateTask(task.id, { description: e.target.value })
                          }
                        />
                      </div>
                    </FormGrid>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="publishing-checklist">
          <PublishingChecklistTab
            campaignId={recordId}
            campaignName={form.campaignName}
            form={form}
            checklist={publishingChecklist}
            onChecklistChange={handleSavePublishingChecklist}
            onSave={saveCurrentCampaign}
            saving={saving}
          />
        </ModuleTabPanel>

        <ModuleTabPanel value="timeline">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Campaign timeline</CardTitle>
              <CardDescription>
                Milestones and task due dates in chronological order.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {timeline.length === 0 ? (
                <EmptyState
                  title="No timeline events yet"
                  description="Add start, launch, or end dates — or task due dates — to build a chronological timeline."
                />
              ) : (
                timeline.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 rounded-lg border border-border/60 px-4 py-3"
                  >
                    <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{event.label}</span>
                        <Badge variant="outline">
                          {event.kind === "milestone" ? "Milestone" : "Task"}
                        </Badge>
                        {event.status ? (
                          <Badge variant="secondary">{event.status}</Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{event.date}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="notes">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Notes & review</CardTitle>
              <CardDescription>
                Capture lessons learned and what to improve next time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                [
                  ["notes", "Campaign notes"],
                  ["lessonsLearned", "Lessons learned"],
                  ["whatWorked", "What worked"],
                  ["whatToImprove", "What to improve next time"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <Textarea
                    id={key}
                    rows={4}
                    value={form[key]}
                    onChange={(e) => updateForm(key, e.target.value)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="saved">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">Saved campaigns</CardTitle>
                <CardDescription>
                  Open, duplicate, export, or import campaigns.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleExport}>
                  <Download className="size-4" />
                  Export JSON
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-4" />
                  Import JSON
                </Button>
                {!store.campaignsUseDatabase ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleMigrateLocal}
                  >
                    Migrate local
                  </Button>
                ) : null}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImportFile}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative max-w-md">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={savedFilter}
                  onChange={(e) => setSavedFilter(e.target.value)}
                  placeholder="Search by name, type, status, artist, song…"
                />
              </div>

              {filteredCampaigns.length === 0 ? (
                <EmptyState
                  title="No saved campaigns yet"
                  description="Save a campaign draft or seed the PrettyWise demo launch to explore linked records and tasks."
                  primaryActionLabel="Seed PrettyWise demo"
                  primaryActionHref="/backups"
                  secondaryActionLabel="New campaign"
                  secondaryActionHref="/campaigns"
                />
              ) : (
                <div className="space-y-3">
                  {filteredCampaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="flex flex-col gap-3 rounded-xl border border-border/80 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">
                            {campaign.campaignName || "Untitled campaign"}
                          </span>
                          <Badge variant="outline">{campaign.status}</Badge>
                          <Badge variant="secondary">{campaign.campaignType}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {[campaign.artistName, campaign.songTitle, campaign.productName]
                            .filter(Boolean)
                            .join(" · ") || "No artist / song / product"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {campaign.linkedRecords.length} linked · {campaign.tasks.length}{" "}
                          tasks · Updated {formatDate(campaign.updatedAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={campaign.id === recordId ? "default" : "outline"}
                          onClick={() => loadRecord(campaign)}
                        >
                          Open
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleDuplicate(campaign)}
                        >
                          <Copy className="size-4" />
                          Duplicate
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteCampaign(campaign.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </ModuleTabPanel>
      </Tabs>
    </div>
  )
}
