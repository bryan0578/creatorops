"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  BookOpen,
  Copy,
  Download,
  Loader2,
  Megaphone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react"
import { toast } from "sonner"

import {
  createCampaignFromPlaybook,
  createPlaybook,
  deletePlaybook,
  duplicatePlaybook,
  getPlaybooks,
  getStarterPlaybooks,
  importPlaybooks,
  seedStarterPlaybooks,
  updatePlaybook,
} from "@/lib/actions/playbooks"
import { generateDefaultPublishingChecklist } from "@/lib/data/publishing-checklist"
import {
  emptyPlaybookForm,
  playbookFormFromRecord,
  playbookSummaryCounts,
  PLAYBOOK_STATUSES,
  PLAYBOOK_TYPES,
  recordFromPlaybookForm,
} from "@/lib/playbooks"
import { parseImportJsonText } from "@/lib/safe-json"
import { downloadJson } from "@/lib/storage"
import { createId } from "@/lib/store"
import {
  ASSET_TYPES,
  CAMPAIGN_BUILDER_STATUSES,
  CAMPAIGN_BUILDER_TYPES,
  CAMPAIGN_PRIORITIES,
  EXPERIMENT_TYPES,
  PROMPT_RUN_MODULE_TYPES,
  PUBLISHING_CHECKLIST_PHASES,
} from "@/lib/types"
import type {
  CreateCampaignFromPlaybookOptions,
  PlaybookAssetChecklistItem,
  PlaybookChecklistTemplateItem,
  PlaybookExperimentTemplateItem,
  PlaybookFormValues,
  PlaybookPromptChecklistItem,
  PlaybookRecord,
  PlaybookTaskTemplateItem,
} from "@/lib/types"
import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import {
  FormGrid,
  FormSection,
  ModuleTabPanel,
  ModuleWorkflowTabs,
  RECENT_RECORDS_CARD_CLASS,
} from "@/components/module/form-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

const PLAYBOOK_WORKFLOW_TABS = [
  { value: "details", label: "Playbook Details" },
  { value: "campaign-defaults", label: "Campaign Defaults" },
  { value: "tasks", label: "Tasks" },
  { value: "publishing-checklist", label: "Publishing Checklist" },
  { value: "assets-prompts", label: "Assets & Prompts" },
  { value: "experiments", label: "Experiments" },
  { value: "saved", label: "Saved Playbooks" },
  { value: "starters", label: "Starter Playbooks" },
] as const

const DEFAULT_CAMPAIGN_OPTIONS: CreateCampaignFromPlaybookOptions = {
  createTasks: true,
  createPublishingChecklist: true,
  createExperimentIdeas: true,
  createPlaceholderAssets: false,
  applyRecommendedPreset: true,
  linkRecommendedWorkflow: true,
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function emptyTask(): PlaybookTaskTemplateItem {
  return {
    title: "",
    description: "",
    phase: "",
    status: "To Do",
    priority: "",
    dueOffset: "",
  }
}

function emptyChecklistItem(): PlaybookChecklistTemplateItem {
  return {
    phase: "Pre-Publish",
    title: "",
    status: "todo",
    dueOffset: "",
    notes: "",
  }
}

function emptyAssetItem(): PlaybookAssetChecklistItem {
  return {
    assetType: "Other",
    title: "",
    required: false,
    notes: "",
    suggestedModule: "",
    dueOffset: "",
  }
}

function emptyPromptItem(): PlaybookPromptChecklistItem {
  return {
    promptName: "",
    promptType: "",
    moduleType: "Other",
    required: false,
    notes: "",
    suggestedPromptId: "",
  }
}

function emptyExperimentItem(): PlaybookExperimentTemplateItem {
  return {
    experimentName: "",
    experimentType: "Other",
    hypothesis: "",
    metricFocus: "",
    platform: "",
    variantA: "",
    variantB: "",
    variantC: "",
    notes: "",
  }
}

export function PlaybookBuilder() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab")
  const defaultTab = initialTab === "saved" ? "saved" : "details"

  const [playbooks, setPlaybooks] = React.useState<PlaybookRecord[]>([])
  const [starters, setStarters] = React.useState<PlaybookRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [recordId, setRecordId] = React.useState(() => createId("playbook"))
  const [createdAt, setCreatedAt] = React.useState(() => Date.now())
  const [form, setForm] = React.useState<PlaybookFormValues>(emptyPlaybookForm())
  const [recordSearch, setRecordSearch] = React.useState("")
  const [filterType, setFilterType] = React.useState("all")
  const [filterStatus, setFilterStatus] = React.useState("all")
  const [pendingDelete, setPendingDelete] = React.useState<PlaybookRecord | null>(null)
  const [createCampaignOpen, setCreateCampaignOpen] = React.useState(false)
  const [creatingCampaign, setCreatingCampaign] = React.useState(false)
  const [campaignForm, setCampaignForm] = React.useState({
    campaignName: "",
    artistName: "",
    songTitle: "",
    productName: "",
    launchDate: "",
    presetId: "",
  })
  const [campaignOptions, setCampaignOptions] =
    React.useState<CreateCampaignFromPlaybookOptions>(DEFAULT_CAMPAIGN_OPTIONS)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const recordPrefillApplied = React.useRef(false)

  const isEditingSaved = playbooks.some((item) => item.id === recordId)
  const counts = React.useMemo(() => {
    const draft = recordFromPlaybookForm(recordId, form, { createdAt })
    return playbookSummaryCounts(draft)
  }, [recordId, form, createdAt])

  const loadPlaybooks = React.useCallback(async () => {
    setLoading(true)
    try {
      const [rows, starterRows] = await Promise.all([
        getPlaybooks(),
        getStarterPlaybooks(),
      ])
      setPlaybooks(rows)
      setStarters(starterRows)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load playbooks.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadPlaybooks()
  }, [loadPlaybooks])

  React.useEffect(() => {
    if (searchParams.get("createCampaign") === "1") {
      setCreateCampaignOpen(true)
    }
  }, [searchParams])

  React.useEffect(() => {
    const paramRecordId = searchParams.get("recordId")?.trim()
    if (!paramRecordId || loading || recordPrefillApplied.current) return
    const record = playbooks.find((item) => item.id === paramRecordId)
    if (record) {
      openPlaybook(record)
      recordPrefillApplied.current = true
    }
  }, [searchParams, playbooks, loading])

  const filteredRecords = React.useMemo(() => {
    const q = recordSearch.trim().toLowerCase()
    return [...playbooks]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .filter((record) => {
        if (filterType !== "all" && record.playbookType !== filterType) return false
        if (filterStatus !== "all" && record.status !== filterStatus) return false
        if (!q) return true
        const haystack = [
          record.name,
          record.description,
          record.playbookType,
          record.category,
          record.status,
          record.tags.join(" "),
        ]
          .join(" ")
          .toLowerCase()
        return haystack.includes(q)
      })
  }, [playbooks, recordSearch, filterType, filterStatus])

  function openPlaybook(record: PlaybookRecord) {
    setRecordId(record.id)
    setCreatedAt(record.createdAt)
    setForm(playbookFormFromRecord(record))
    setCampaignForm((prev) => ({
      ...prev,
      campaignName: prev.campaignName || `${record.name} Campaign`,
    }))
  }

  function resetDraft() {
    const id = createId("playbook")
    setRecordId(id)
    setCreatedAt(Date.now())
    setForm(emptyPlaybookForm())
    recordPrefillApplied.current = false
    router.replace("/playbooks")
  }

  function updateForm<K extends keyof PlaybookFormValues>(
    key: K,
    value: PlaybookFormValues[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updateDefaultField(
    key: keyof PlaybookFormValues["defaultCampaignFields"],
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      defaultCampaignFields: { ...prev.defaultCampaignFields, [key]: value },
    }))
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Playbook name is required")
      return
    }

    setSaving(true)
    try {
      const record = recordFromPlaybookForm(recordId, form, {
        createdAt,
        updatedAt: Date.now(),
      })
      if (isEditingSaved) {
        await updatePlaybook(record)
        toast.success("Playbook updated")
      } else {
        await createPlaybook(record)
        toast.success("Playbook saved")
      }
      await loadPlaybooks()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save playbook.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(record: PlaybookRecord) {
    setPendingDelete(record)
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    try {
      const result = await deletePlaybook(pendingDelete.id)
      if (!result.ok) {
        toast.error(result.message ?? "Could not delete playbook.")
        return
      }
      if (recordId === pendingDelete.id) resetDraft()
      toast.success("Playbook deleted")
      await loadPlaybooks()
    } catch {
      toast.error("Could not delete playbook.")
    } finally {
      setPendingDelete(null)
    }
  }

  async function handleDuplicate(record: PlaybookRecord) {
    try {
      const copy = await duplicatePlaybook(record.id)
      if (!copy) {
        toast.error("Playbook not found.")
        return
      }
      await loadPlaybooks()
      openPlaybook(copy)
      toast.success("Playbook duplicated")
    } catch {
      toast.error("Could not duplicate playbook.")
    }
  }

  async function handleSeedStarters() {
    try {
      const result = await seedStarterPlaybooks()
      toast.success(`Starter playbooks seeded (${result.created} created, ${result.skipped} skipped).`)
      await loadPlaybooks()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not seed starter playbooks.")
    }
  }

  function handleExport() {
    downloadJson("creatorops-playbooks.json", playbooks)
    toast.success("Playbooks exported")
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    try {
      const text = await file.text()
      const parsed = parseImportJsonText(text)
      const records = (Array.isArray(parsed) ? parsed : [parsed]) as PlaybookRecord[]
      const count = await importPlaybooks(records)
      toast.success(`Imported ${count} playbook(s)`)
      await loadPlaybooks()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import playbooks.")
    }
  }

  function handleGenerateDefaultChecklist() {
    const campaignType =
      form.defaultCampaignFields.campaignType?.trim() ||
      form.targetCampaignType.trim() ||
      form.playbookType
    const checklist = generateDefaultPublishingChecklist(campaignType)
    updateForm("publishingChecklistTemplate", {
      version: 1,
      items: checklist.items.map((item) => ({
        phase: item.phase,
        title: item.title,
        status: "todo",
        dueOffset: "",
        notes: "",
      })),
    })
    toast.success("Default publishing checklist generated")
  }

  async function handleCreateCampaign() {
    if (!campaignForm.campaignName.trim()) {
      toast.error("Campaign name is required")
      return
    }

    setCreatingCampaign(true)
    try {
      const result = await createCampaignFromPlaybook({
        playbookId: recordId,
        campaignName: campaignForm.campaignName.trim(),
        artistName: campaignForm.artistName.trim(),
        songTitle: campaignForm.songTitle.trim(),
        productName: campaignForm.productName.trim(),
        launchDate: campaignForm.launchDate.trim(),
        presetId: campaignForm.presetId.trim(),
        options: campaignOptions,
      })

      if (!result.success) {
        toast.error(result.message)
        return
      }

      if (result.warnings?.length) {
        toast.warning(result.warnings.join(" "))
      }
      toast.success(result.message)
      setCreateCampaignOpen(false)
      if (result.campaignId) {
        router.push(`/campaigns?campaignId=${encodeURIComponent(result.campaignId)}`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create campaign.")
    } finally {
      setCreatingCampaign(false)
    }
  }

  function updateListItem<T>(
    key:
      | "taskTemplate"
      | "publishingChecklistTemplate"
      | "assetChecklist"
      | "promptChecklist"
      | "experimentTemplate",
    index: number,
    updater: (item: T) => T,
  ) {
    setForm((prev) => {
      if (key === "publishingChecklistTemplate") {
        const items = [...prev.publishingChecklistTemplate.items]
        items[index] = updater(items[index] as T) as PlaybookChecklistTemplateItem
        return {
          ...prev,
          publishingChecklistTemplate: { version: 1, items },
        }
      }
      const list = [...prev[key]] as T[]
      list[index] = updater(list[index])
      return { ...prev, [key]: list }
    })
  }

  function addListItem(
    key:
      | "taskTemplate"
      | "assetChecklist"
      | "promptChecklist"
      | "experimentTemplate",
    item:
      | PlaybookTaskTemplateItem
      | PlaybookAssetChecklistItem
      | PlaybookPromptChecklistItem
      | PlaybookExperimentTemplateItem,
  ) {
    setForm((prev) => ({ ...prev, [key]: [...prev[key], item] }))
  }

  function removeListItem(
    key:
      | "taskTemplate"
      | "publishingChecklistTemplate"
      | "assetChecklist"
      | "promptChecklist"
      | "experimentTemplate",
    index: number,
  ) {
    setForm((prev) => {
      if (key === "publishingChecklistTemplate") {
        return {
          ...prev,
          publishingChecklistTemplate: {
            version: 1,
            items: prev.publishingChecklistTemplate.items.filter((_, i) => i !== index),
          },
        }
      }
      return { ...prev, [key]: prev[key].filter((_, i) => i !== index) }
    })
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ModulePageHeader
        title="Playbook Builder"
        description="Design reusable launch SOPs with campaign defaults, tasks, publishing checklists, assets, prompts, and experiments."
        action={
          <>
            <Button type="button" size="sm" onClick={resetDraft}>
              <Plus className="size-4" />
              New Playbook
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!form.name.trim()}
              onClick={() => setCreateCampaignOpen(true)}
            >
              <Megaphone className="size-4" />
              Create Campaign from Playbook
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void handleSeedStarters()}>
              <Sparkles className="size-4" />
              Seed Starter Playbooks
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
              onChange={(event) => void handleImport(event)}
            />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className={RECENT_RECORDS_CARD_CLASS}>
          <CardHeader className="pb-2">
            <CardDescription>Tasks</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{counts.tasks}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={RECENT_RECORDS_CARD_CLASS}>
          <CardHeader className="pb-2">
            <CardDescription>Checklist items</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{counts.checklist}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={RECENT_RECORDS_CARD_CLASS}>
          <CardHeader className="pb-2">
            <CardDescription>Assets / prompts</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {counts.assets}/{counts.prompts}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className={RECENT_RECORDS_CARD_CLASS}>
          <CardHeader className="pb-2">
            <CardDescription>Experiments</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{counts.experiments}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {isEditingSaved ? (
        <p className="text-sm text-muted-foreground">
          Editing: <span className="font-medium text-foreground">{form.name || "Untitled playbook"}</span>
        </p>
      ) : null}

      <ModuleWorkflowTabs defaultTab={defaultTab} tabs={PLAYBOOK_WORKFLOW_TABS}>
        <ModuleTabPanel value="details">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Playbook details</CardTitle>
              <CardDescription>
                Name, type, status, recommended preset/workflow, and automation notes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormSection>
                <FormGrid>
                  <div className="space-y-1.5">
                    <Label htmlFor="playbook-name">Playbook name</Label>
                    <Input
                      id="playbook-name"
                      value={form.name}
                      onChange={(event) => updateForm("name", event.target.value)}
                      placeholder="Dark K-Pop Release Playbook"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Playbook type</Label>
                    <Select
                      value={form.playbookType}
                      onValueChange={(value) => updateForm("playbookType", value ?? "Other")}
                    >
                      <SelectTrigger className="w-full">
                        <span className="truncate">{form.playbookType}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {PLAYBOOK_TYPES.map((type) => (
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
                      value={form.status}
                      onValueChange={(value) => updateForm("status", value ?? "Active")}
                    >
                      <SelectTrigger className="w-full">
                        <span className="truncate">{form.status}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {PLAYBOOK_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="playbook-category">Category</Label>
                    <Input
                      id="playbook-category"
                      value={form.category}
                      onChange={(event) => updateForm("category", event.target.value)}
                      placeholder="AI Music / Dark Pop"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Target campaign type</Label>
                    <Select
                      value={form.targetCampaignType || "none"}
                      onValueChange={(value) =>
                        updateForm("targetCampaignType", value === "none" ? "" : value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <span className="truncate">
                          {form.targetCampaignType || "Not set"}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not set</SelectItem>
                        {CAMPAIGN_BUILDER_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="recommended-preset-id">Recommended preset ID</Label>
                    <Input
                      id="recommended-preset-id"
                      value={form.recommendedPresetId}
                      onChange={(event) =>
                        updateForm("recommendedPresetId", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="recommended-preset-name">Recommended preset name</Label>
                    <Input
                      id="recommended-preset-name"
                      value={form.recommendedPresetName}
                      onChange={(event) =>
                        updateForm("recommendedPresetName", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="recommended-workflow-id">Recommended workflow ID</Label>
                    <Input
                      id="recommended-workflow-id"
                      value={form.recommendedWorkflowId}
                      onChange={(event) =>
                        updateForm("recommendedWorkflowId", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="recommended-workflow-name">Recommended workflow name</Label>
                    <Input
                      id="recommended-workflow-name"
                      value={form.recommendedWorkflowName}
                      onChange={(event) =>
                        updateForm("recommendedWorkflowName", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="export-pack-template">Export pack template</Label>
                    <Input
                      id="export-pack-template"
                      value={form.exportPackTemplate}
                      onChange={(event) =>
                        updateForm("exportPackTemplate", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="playbook-tags">Tags</Label>
                    <Input
                      id="playbook-tags"
                      value={form.tags}
                      onChange={(event) => updateForm("tags", event.target.value)}
                      placeholder="music, youtube, launch"
                    />
                  </div>
                </FormGrid>
                <div className="space-y-1.5">
                  <Label htmlFor="playbook-description">Description</Label>
                  <Textarea
                    id="playbook-description"
                    value={form.description}
                    onChange={(event) => updateForm("description", event.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="automation-notes">Automation notes</Label>
                  <Textarea
                    id="automation-notes"
                    value={form.automationNotes}
                    onChange={(event) => updateForm("automationNotes", event.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="playbook-notes">Notes</Label>
                  <Textarea
                    id="playbook-notes"
                    value={form.notes}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    rows={3}
                  />
                </div>
              </FormSection>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving…
                    </>
                  ) : isEditingSaved ? (
                    "Update Playbook"
                  ) : (
                    "Save Playbook"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="campaign-defaults">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Campaign defaults</CardTitle>
              <CardDescription>
                Default campaign fields applied when creating a campaign from this playbook.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormGrid>
                <div className="space-y-1.5">
                  <Label>Campaign type</Label>
                  <Select
                    value={form.defaultCampaignFields.campaignType || "none"}
                    onValueChange={(value) =>
                      updateDefaultField("campaignType", value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <span className="truncate">
                        {form.defaultCampaignFields.campaignType || "Not set"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not set</SelectItem>
                      {CAMPAIGN_BUILDER_TYPES.map((type) => (
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
                    value={form.defaultCampaignFields.status || "none"}
                    onValueChange={(value) =>
                      updateDefaultField("status", value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <span className="truncate">
                        {form.defaultCampaignFields.status || "Not set"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not set</SelectItem>
                      {CAMPAIGN_BUILDER_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select
                    value={form.defaultCampaignFields.priority || "none"}
                    onValueChange={(value) =>
                      updateDefaultField("priority", value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <span className="truncate">
                        {form.defaultCampaignFields.priority || "Not set"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not set</SelectItem>
                      {CAMPAIGN_PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="default-niche">Niche</Label>
                  <Input
                    id="default-niche"
                    value={form.defaultCampaignFields.niche ?? ""}
                    onChange={(event) => updateDefaultField("niche", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="default-primary-goal">Primary goal</Label>
                  <Input
                    id="default-primary-goal"
                    value={form.defaultCampaignFields.primaryGoal ?? ""}
                    onChange={(event) => updateDefaultField("primaryGoal", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="default-target-audience">Target audience</Label>
                  <Input
                    id="default-target-audience"
                    value={form.defaultCampaignFields.targetAudience ?? ""}
                    onChange={(event) =>
                      updateDefaultField("targetAudience", event.target.value)
                    }
                  />
                </div>
              </FormGrid>
              <div className="space-y-1.5">
                <Label htmlFor="default-description">Description</Label>
                <Textarea
                  id="default-description"
                  value={form.defaultCampaignFields.description ?? ""}
                  onChange={(event) => updateDefaultField("description", event.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="default-notes">Notes</Label>
                <Textarea
                  id="default-notes"
                  value={form.defaultCampaignFields.notes ?? ""}
                  onChange={(event) => updateDefaultField("notes", event.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="default-launch-timeline-notes">Launch timeline notes</Label>
                <Textarea
                  id="default-launch-timeline-notes"
                  value={form.defaultCampaignFields.launchTimelineNotes ?? ""}
                  onChange={(event) =>
                    updateDefaultField("launchTimelineNotes", event.target.value)
                  }
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="tasks">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base">Task template</CardTitle>
                <CardDescription>
                  Tasks created when launching a campaign from this playbook.
                </CardDescription>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => addListItem("taskTemplate", emptyTask())}>
                <Plus className="size-4" />
                Add task
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.taskTemplate.length ? (
                form.taskTemplate.map((task, index) => (
                  <div
                    key={`task-${index}`}
                    className="space-y-3 rounded-xl border border-border/80 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary">Task {index + 1}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeListItem("taskTemplate", index)}
                        aria-label="Remove task"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <FormGrid>
                      <div className="space-y-1.5 lg:col-span-2">
                        <Label>Title</Label>
                        <Input
                          value={task.title}
                          onChange={(event) =>
                            updateListItem<PlaybookTaskTemplateItem>(
                              "taskTemplate",
                              index,
                              (item) => ({ ...item, title: event.target.value }),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Due offset</Label>
                        <Input
                          value={task.dueOffset ?? ""}
                          onChange={(event) =>
                            updateListItem<PlaybookTaskTemplateItem>(
                              "taskTemplate",
                              index,
                              (item) => ({ ...item, dueOffset: event.target.value }),
                            )
                          }
                          placeholder="-7 days, launch day"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Phase</Label>
                        <Input
                          value={task.phase ?? ""}
                          onChange={(event) =>
                            updateListItem<PlaybookTaskTemplateItem>(
                              "taskTemplate",
                              index,
                              (item) => ({ ...item, phase: event.target.value }),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Priority</Label>
                        <Input
                          value={task.priority ?? ""}
                          onChange={(event) =>
                            updateListItem<PlaybookTaskTemplateItem>(
                              "taskTemplate",
                              index,
                              (item) => ({ ...item, priority: event.target.value }),
                            )
                          }
                        />
                      </div>
                    </FormGrid>
                    <div className="space-y-1.5">
                      <Label>Description</Label>
                      <Textarea
                        value={task.description ?? ""}
                        onChange={(event) =>
                          updateListItem<PlaybookTaskTemplateItem>(
                            "taskTemplate",
                            index,
                            (item) => ({ ...item, description: event.target.value }),
                          )
                        }
                        rows={2}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={Plus}
                  title="No tasks yet"
                  description="Add task templates with due offsets relative to launch day."
                />
              )}
            </CardContent>
          </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="publishing-checklist">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base">Publishing checklist template</CardTitle>
                <CardDescription>
                  Checklist items generated for campaigns created from this playbook.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={handleGenerateDefaultChecklist}>
                  <Wand2 className="size-4" />
                  Generate default checklist
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      publishingChecklistTemplate: {
                        version: 1,
                        items: [...prev.publishingChecklistTemplate.items, emptyChecklistItem()],
                      },
                    }))
                  }
                >
                  <Plus className="size-4" />
                  Add item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.publishingChecklistTemplate.items.length ? (
                form.publishingChecklistTemplate.items.map((item, index) => (
                  <div
                    key={`checklist-${index}`}
                    className="space-y-3 rounded-xl border border-border/80 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary">Item {index + 1}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeListItem("publishingChecklistTemplate", index)}
                        aria-label="Remove checklist item"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <FormGrid>
                      <div className="space-y-1.5">
                        <Label>Phase</Label>
                        <Select
                          value={item.phase}
                          onValueChange={(value) =>
                            updateListItem<PlaybookChecklistTemplateItem>(
                              "publishingChecklistTemplate",
                              index,
                              (row) => ({
                                ...row,
                                phase: (value ?? "Pre-Publish") as PlaybookChecklistTemplateItem["phase"],
                              }),
                            )
                          }
                        >
                          <SelectTrigger className="w-full">
                            <span className="truncate">{item.phase}</span>
                          </SelectTrigger>
                          <SelectContent>
                            {PUBLISHING_CHECKLIST_PHASES.map((phase) => (
                              <SelectItem key={phase} value={phase}>
                                {phase}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 lg:col-span-2">
                        <Label>Title</Label>
                        <Input
                          value={item.title}
                          onChange={(event) =>
                            updateListItem<PlaybookChecklistTemplateItem>(
                              "publishingChecklistTemplate",
                              index,
                              (row) => ({ ...row, title: event.target.value }),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Due offset</Label>
                        <Input
                          value={item.dueOffset ?? ""}
                          onChange={(event) =>
                            updateListItem<PlaybookChecklistTemplateItem>(
                              "publishingChecklistTemplate",
                              index,
                              (row) => ({ ...row, dueOffset: event.target.value }),
                            )
                          }
                        />
                      </div>
                    </FormGrid>
                    <div className="space-y-1.5">
                      <Label>Notes</Label>
                      <Textarea
                        value={item.notes ?? ""}
                        onChange={(event) =>
                          updateListItem<PlaybookChecklistTemplateItem>(
                            "publishingChecklistTemplate",
                            index,
                            (row) => ({ ...row, notes: event.target.value }),
                          )
                        }
                        rows={2}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={Wand2}
                  title="No checklist items yet"
                  description='Generate a default checklist for the playbook type or add items manually.'
                />
              )}
            </CardContent>
          </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="assets-prompts">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className={RECENT_RECORDS_CARD_CLASS}>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base">Asset checklist</CardTitle>
                  <CardDescription>Placeholder assets to create from this playbook.</CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addListItem("assetChecklist", emptyAssetItem())}
                >
                  <Plus className="size-4" />
                  Add asset
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {form.assetChecklist.map((asset, index) => (
                  <div
                    key={`asset-${index}`}
                    className="space-y-3 rounded-xl border border-border/80 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary">Asset {index + 1}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeListItem("assetChecklist", index)}
                        aria-label="Remove asset"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <FormGrid>
                      <div className="space-y-1.5">
                        <Label>Asset type</Label>
                        <Select
                          value={asset.assetType}
                          onValueChange={(value) =>
                            updateListItem<PlaybookAssetChecklistItem>(
                              "assetChecklist",
                              index,
                              (item) => ({ ...item, assetType: value ?? "Other" }),
                            )
                          }
                        >
                          <SelectTrigger className="w-full">
                            <span className="truncate">{asset.assetType}</span>
                          </SelectTrigger>
                          <SelectContent>
                            {ASSET_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Title</Label>
                        <Input
                          value={asset.title}
                          onChange={(event) =>
                            updateListItem<PlaybookAssetChecklistItem>(
                              "assetChecklist",
                              index,
                              (item) => ({ ...item, title: event.target.value }),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Suggested module</Label>
                        <Input
                          value={asset.suggestedModule ?? ""}
                          onChange={(event) =>
                            updateListItem<PlaybookAssetChecklistItem>(
                              "assetChecklist",
                              index,
                              (item) => ({ ...item, suggestedModule: event.target.value }),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Due offset</Label>
                        <Input
                          value={asset.dueOffset ?? ""}
                          onChange={(event) =>
                            updateListItem<PlaybookAssetChecklistItem>(
                              "assetChecklist",
                              index,
                              (item) => ({ ...item, dueOffset: event.target.value }),
                            )
                          }
                        />
                      </div>
                    </FormGrid>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 rounded border border-input"
                        checked={Boolean(asset.required)}
                        onChange={(event) =>
                          updateListItem<PlaybookAssetChecklistItem>(
                            "assetChecklist",
                            index,
                            (item) => ({ ...item, required: event.target.checked }),
                          )
                        }
                      />
                      Required asset
                    </label>
                    <div className="space-y-1.5">
                      <Label>Notes</Label>
                      <Textarea
                        value={asset.notes ?? ""}
                        onChange={(event) =>
                          updateListItem<PlaybookAssetChecklistItem>(
                            "assetChecklist",
                            index,
                            (item) => ({ ...item, notes: event.target.value }),
                          )
                        }
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className={RECENT_RECORDS_CARD_CLASS}>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base">Prompt checklist</CardTitle>
                  <CardDescription>Prompts and modules to run during launch.</CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addListItem("promptChecklist", emptyPromptItem())}
                >
                  <Plus className="size-4" />
                  Add prompt
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {form.promptChecklist.map((prompt, index) => (
                  <div
                    key={`prompt-${index}`}
                    className="space-y-3 rounded-xl border border-border/80 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary">Prompt {index + 1}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeListItem("promptChecklist", index)}
                        aria-label="Remove prompt"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <FormGrid>
                      <div className="space-y-1.5">
                        <Label>Module type</Label>
                        <Select
                          value={prompt.moduleType}
                          onValueChange={(value) =>
                            updateListItem<PlaybookPromptChecklistItem>(
                              "promptChecklist",
                              index,
                              (item) => ({ ...item, moduleType: value ?? "Other" }),
                            )
                          }
                        >
                          <SelectTrigger className="w-full">
                            <span className="truncate">{prompt.moduleType}</span>
                          </SelectTrigger>
                          <SelectContent>
                            {PROMPT_RUN_MODULE_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Prompt name</Label>
                        <Input
                          value={prompt.promptName ?? ""}
                          onChange={(event) =>
                            updateListItem<PlaybookPromptChecklistItem>(
                              "promptChecklist",
                              index,
                              (item) => ({ ...item, promptName: event.target.value }),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Prompt type</Label>
                        <Input
                          value={prompt.promptType ?? ""}
                          onChange={(event) =>
                            updateListItem<PlaybookPromptChecklistItem>(
                              "promptChecklist",
                              index,
                              (item) => ({ ...item, promptType: event.target.value }),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Suggested prompt ID</Label>
                        <Input
                          value={prompt.suggestedPromptId ?? ""}
                          onChange={(event) =>
                            updateListItem<PlaybookPromptChecklistItem>(
                              "promptChecklist",
                              index,
                              (item) => ({ ...item, suggestedPromptId: event.target.value }),
                            )
                          }
                        />
                      </div>
                    </FormGrid>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 rounded border border-input"
                        checked={Boolean(prompt.required)}
                        onChange={(event) =>
                          updateListItem<PlaybookPromptChecklistItem>(
                            "promptChecklist",
                            index,
                            (item) => ({ ...item, required: event.target.checked }),
                          )
                        }
                      />
                      Required prompt
                    </label>
                    <div className="space-y-1.5">
                      <Label>Notes</Label>
                      <Textarea
                        value={prompt.notes ?? ""}
                        onChange={(event) =>
                          updateListItem<PlaybookPromptChecklistItem>(
                            "promptChecklist",
                            index,
                            (item) => ({ ...item, notes: event.target.value }),
                          )
                        }
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </ModuleTabPanel>

        <ModuleTabPanel value="experiments">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base">Experiment template</CardTitle>
                <CardDescription>
                  Experiment ideas created when launching from this playbook.
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => addListItem("experimentTemplate", emptyExperimentItem())}
              >
                <Plus className="size-4" />
                Add experiment
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.experimentTemplate.length ? (
                form.experimentTemplate.map((experiment, index) => (
                  <div
                    key={`experiment-${index}`}
                    className="space-y-3 rounded-xl border border-border/80 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary">Experiment {index + 1}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeListItem("experimentTemplate", index)}
                        aria-label="Remove experiment"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <FormGrid>
                      <div className="space-y-1.5 lg:col-span-2">
                        <Label>Experiment name</Label>
                        <Input
                          value={experiment.experimentName}
                          onChange={(event) =>
                            updateListItem<PlaybookExperimentTemplateItem>(
                              "experimentTemplate",
                              index,
                              (item) => ({ ...item, experimentName: event.target.value }),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Type</Label>
                        <Select
                          value={experiment.experimentType}
                          onValueChange={(value) =>
                            updateListItem<PlaybookExperimentTemplateItem>(
                              "experimentTemplate",
                              index,
                              (item) => ({ ...item, experimentType: value ?? "Other" }),
                            )
                          }
                        >
                          <SelectTrigger className="w-full">
                            <span className="truncate">{experiment.experimentType}</span>
                          </SelectTrigger>
                          <SelectContent>
                            {EXPERIMENT_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Platform</Label>
                        <Input
                          value={experiment.platform ?? ""}
                          onChange={(event) =>
                            updateListItem<PlaybookExperimentTemplateItem>(
                              "experimentTemplate",
                              index,
                              (item) => ({ ...item, platform: event.target.value }),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Metric focus</Label>
                        <Input
                          value={experiment.metricFocus ?? ""}
                          onChange={(event) =>
                            updateListItem<PlaybookExperimentTemplateItem>(
                              "experimentTemplate",
                              index,
                              (item) => ({ ...item, metricFocus: event.target.value }),
                            )
                          }
                        />
                      </div>
                    </FormGrid>
                    <div className="space-y-1.5">
                      <Label>Hypothesis</Label>
                      <Textarea
                        value={experiment.hypothesis ?? ""}
                        onChange={(event) =>
                          updateListItem<PlaybookExperimentTemplateItem>(
                            "experimentTemplate",
                            index,
                            (item) => ({ ...item, hypothesis: event.target.value }),
                          )
                        }
                        rows={2}
                      />
                    </div>
                    <FormGrid columns={3}>
                      <div className="space-y-1.5">
                        <Label>Variant A</Label>
                        <Input
                          value={experiment.variantA ?? ""}
                          onChange={(event) =>
                            updateListItem<PlaybookExperimentTemplateItem>(
                              "experimentTemplate",
                              index,
                              (item) => ({ ...item, variantA: event.target.value }),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Variant B</Label>
                        <Input
                          value={experiment.variantB ?? ""}
                          onChange={(event) =>
                            updateListItem<PlaybookExperimentTemplateItem>(
                              "experimentTemplate",
                              index,
                              (item) => ({ ...item, variantB: event.target.value }),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Variant C</Label>
                        <Input
                          value={experiment.variantC ?? ""}
                          onChange={(event) =>
                            updateListItem<PlaybookExperimentTemplateItem>(
                              "experimentTemplate",
                              index,
                              (item) => ({ ...item, variantC: event.target.value }),
                            )
                          }
                        />
                      </div>
                    </FormGrid>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={Plus}
                  title="No experiments yet"
                  description="Add experiment ideas to seed the Experiment Tracker on campaign launch."
                />
              )}
            </CardContent>
          </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="saved">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader className="flex flex-col gap-4">
              <div>
                <CardTitle className="text-base">Saved playbooks</CardTitle>
                <CardDescription>
                  {loading
                    ? "Loading playbooks…"
                    : `${playbooks.length} saved playbook${playbooks.length === 1 ? "" : "s"}`}
                </CardDescription>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="relative lg:col-span-3">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={recordSearch}
                    onChange={(event) => setRecordSearch(event.target.value)}
                    placeholder="Search playbooks…"
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
                      {PLAYBOOK_TYPES.map((type) => (
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
                      {PLAYBOOK_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading playbooks…
                </div>
              ) : filteredRecords.length ? (
                filteredRecords.map((record) => {
                  const summary = playbookSummaryCounts(record)
                  return (
                    <div
                      key={record.id}
                      className="flex flex-col gap-3 rounded-xl border border-border/80 p-4 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-pretty">{record.name || "Untitled playbook"}</p>
                          <Badge variant="secondary">{record.playbookType}</Badge>
                          <Badge variant="outline">{record.status}</Badge>
                        </div>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {record.description || "No description"}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{summary.tasks} tasks</Badge>
                          <Badge variant="outline">{summary.checklist} checklist</Badge>
                          <Badge variant="outline">{summary.experiments} experiments</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Updated {formatDate(record.updatedAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" onClick={() => openPlaybook(record)}>
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
                          onClick={() => void handleDelete(record)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <EmptyState
                  icon={BookOpen}
                  title="No saved playbooks"
                  description="Save a playbook or seed starter playbooks to get started."
                />
              )}
            </CardContent>
          </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="starters">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Starter playbooks</CardTitle>
              <CardDescription>
                Built-in launch SOP templates. Use Seed Starter Playbooks to install missing starters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {starters.map((starter) => {
                const installed = playbooks.some((item) => item.id === starter.id)
                const summary = playbookSummaryCounts(starter)
                return (
                  <div
                    key={starter.id}
                    className="flex flex-col gap-3 rounded-xl border border-border/80 p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-pretty">{starter.name}</p>
                        <Badge variant="secondary">{starter.playbookType}</Badge>
                        {installed ? <Badge variant="outline">Installed</Badge> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{starter.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{summary.tasks} tasks</Badge>
                        <Badge variant="outline">{summary.checklist} checklist</Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {installed ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            const record = playbooks.find((item) => item.id === starter.id)
                            if (record) openPlaybook(record)
                          }}
                        >
                          Open
                        </Button>
                      ) : (
                        <Button type="button" size="sm" variant="outline" onClick={() => void handleSeedStarters()}>
                          Install starters
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </ModuleTabPanel>
      </ModuleWorkflowTabs>

      <Dialog open={createCampaignOpen} onOpenChange={setCreateCampaignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create campaign from playbook</DialogTitle>
            <DialogDescription>
              Launch a campaign using &ldquo;{form.name || "this playbook"}&rdquo; with optional
              tasks, checklist, experiments, and assets.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="campaign-name">Campaign name</Label>
              <Input
                id="campaign-name"
                value={campaignForm.campaignName}
                onChange={(event) =>
                  setCampaignForm((prev) => ({ ...prev, campaignName: event.target.value }))
                }
              />
            </div>
            <FormGrid>
              <div className="space-y-1.5">
                <Label htmlFor="campaign-artist">Artist</Label>
                <Input
                  id="campaign-artist"
                  value={campaignForm.artistName}
                  onChange={(event) =>
                    setCampaignForm((prev) => ({ ...prev, artistName: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="campaign-song">Song / track</Label>
                <Input
                  id="campaign-song"
                  value={campaignForm.songTitle}
                  onChange={(event) =>
                    setCampaignForm((prev) => ({ ...prev, songTitle: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="campaign-product">Product</Label>
                <Input
                  id="campaign-product"
                  value={campaignForm.productName}
                  onChange={(event) =>
                    setCampaignForm((prev) => ({ ...prev, productName: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="campaign-launch-date">Launch date</Label>
                <Input
                  id="campaign-launch-date"
                  type="date"
                  value={campaignForm.launchDate}
                  onChange={(event) =>
                    setCampaignForm((prev) => ({ ...prev, launchDate: event.target.value }))
                  }
                />
              </div>
            </FormGrid>
            <div className="space-y-1.5">
              <Label htmlFor="campaign-preset-id">Preset ID override (optional)</Label>
              <Input
                id="campaign-preset-id"
                value={campaignForm.presetId}
                onChange={(event) =>
                  setCampaignForm((prev) => ({ ...prev, presetId: event.target.value }))
                }
                placeholder={form.recommendedPresetId || "Use recommended preset"}
              />
            </div>
            <div className="space-y-3 rounded-lg border border-border/80 p-3">
              <p className="text-sm font-medium">Include when creating campaign</p>
              {(
                [
                  ["createTasks", "Create tasks from template"],
                  ["createPublishingChecklist", "Create publishing checklist"],
                  ["createExperimentIdeas", "Create experiment ideas"],
                  ["createPlaceholderAssets", "Create placeholder assets"],
                  ["applyRecommendedPreset", "Apply recommended preset"],
                  ["linkRecommendedWorkflow", "Link recommended workflow"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border border-input"
                    checked={campaignOptions[key]}
                    onChange={(event) =>
                      setCampaignOptions((prev) => ({ ...prev, [key]: event.target.checked }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateCampaignOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCreateCampaign()} disabled={creatingCampaign}>
              {creatingCampaign ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create campaign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingDelete)} onOpenChange={() => setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete playbook?</DialogTitle>
            <DialogDescription>
              Delete &ldquo;{pendingDelete?.name || "this playbook"}&rdquo; permanently?
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
