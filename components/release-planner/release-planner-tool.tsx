"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { parseImportJsonText } from "@/lib/safe-json"
import {
  Copy,
  Database,
  Download,
  Search,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { useStore, createId } from "@/lib/store"
import type { ReleasePlan, ReleasePlanFormValues } from "@/lib/types"
import { RELEASE_PLANNER_GOALS } from "@/lib/types"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import { migrateLocalReleasePlansToDatabase } from "@/lib/actions/release-plans"
import { downloadJson, loadReleasePlans } from "@/lib/storage"
import {
  buildFinalReleasePlanText,
  buildReleasePlannerCompletedPrompt,
  emptyFinalReleasePlanFields,
  emptyReleasePlanForm,
  finalFieldsFromReleasePlan,
  getReleasePlannerTemplate,
  normalizeReleasePlan,
  type ReleasePlanFinalFields,
} from "@/lib/release-planner"
import {
  campaignPrefillToastMessage,
  linkRecordToCampaign,
  parseCampaignPrefillContext,
  releasePlanLinkTitle,
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
import { RelationshipPanel } from "@/components/relationships/relationship-panel"
import { ApplyWorkspaceDefaultsButton } from "@/components/settings/apply-workspace-defaults-button"
import {
  FormSection,
  GENERATOR_WORKFLOW_TABS,
  ModuleTabPanel,
  ModuleWorkflowTabs,
  OutputSection,
  PromptPreviewBlock,
  RECENT_RECORDS_CARD_CLASS,
} from "@/components/module/form-layout"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

const TEXTAREA_FIELDS = new Set([
  "mood",
  "targetAudience",
  "visualTheme",
  "merchTieIn",
  "streamingPlatforms",
  "notes",
])

const FIELD_LABELS: Record<keyof ReleasePlanFormValues, string> = {
  artistName: "Artist name",
  songTitle: "Song title",
  genre: "Genre",
  mood: "Mood",
  releaseDate: "Release date",
  youtubeChannel: "YouTube channel",
  targetAudience: "Target audience",
  visualTheme: "Visual theme",
  merchTieIn: "Merch tie-in",
  streamingPlatforms: "Streaming platforms",
  primaryGoal: "Primary goal",
  notes: "Notes",
}

const FORM_FIELD_ORDER: (keyof ReleasePlanFormValues)[] = [
  "artistName",
  "songTitle",
  "genre",
  "mood",
  "releaseDate",
  "youtubeChannel",
  "targetAudience",
  "visualTheme",
  "merchTieIn",
  "streamingPlatforms",
  "primaryGoal",
  "notes",
]

const FINAL_RELEASE_PLAN_FIELDS: {
  key: keyof ReleasePlanFinalFields
  label: string
  multiline: boolean
  copyLabel: string
}[] = [
  {
    key: "finalStrategySummary",
    label: "Final strategy summary",
    multiline: true,
    copyLabel: "strategy summary",
  },
  {
    key: "finalTargetListener",
    label: "Final target listener",
    multiline: true,
    copyLabel: "target listener",
  },
  {
    key: "finalPreReleasePlan",
    label: "Final 14-day pre-release plan",
    multiline: true,
    copyLabel: "pre-release plan",
  },
  {
    key: "finalReleaseDayChecklist",
    label: "Final release day checklist",
    multiline: true,
    copyLabel: "release day checklist",
  },
  {
    key: "finalPostReleasePlan",
    label: "Final 7-day post-release plan",
    multiline: true,
    copyLabel: "post-release plan",
  },
  {
    key: "finalYouTubePackage",
    label: "Final YouTube package",
    multiline: true,
    copyLabel: "YouTube package",
  },
  {
    key: "finalShortFormIdeas",
    label: "Final short-form content ideas",
    multiline: true,
    copyLabel: "short-form ideas",
  },
  {
    key: "finalSocialCaptions",
    label: "Final social captions",
    multiline: true,
    copyLabel: "social captions",
  },
  {
    key: "finalEmailAnnouncement",
    label: "Final email announcement",
    multiline: true,
    copyLabel: "email announcement",
  },
  {
    key: "finalMerchTieIns",
    label: "Final merch tie-ins",
    multiline: true,
    copyLabel: "merch tie-ins",
  },
  {
    key: "finalPriorityTasks",
    label: "Final priority tasks",
    multiline: true,
    copyLabel: "priority tasks",
  },
  {
    key: "finalChecklist",
    label: "Final checklist",
    multiline: true,
    copyLabel: "checklist",
  },
]

export function ReleasePlannerTool() {
  const {
    prompts,
    releasePlans,
    releasePlansUseDatabase,
    addReleasePlan,
    updateReleasePlan,
    deleteReleasePlan,
    importReleasePlans,
    reloadReleasePlans,
    campaigns,
    updateCampaign,
  } = useStore()

  const [form, setForm] = React.useState<ReleasePlanFormValues>(
    emptyReleasePlanForm(),
  )
  const [aiResponse, setAiResponse] = React.useState("")
  const [finalPlan, setFinalPlan] = React.useState<ReleasePlanFinalFields>(
    emptyFinalReleasePlanFields(),
  )
  const [editingId, setEditingId] = React.useState<string | null>(null)

  const [planSearch, setPlanSearch] = React.useState("")
  const [pendingDelete, setPendingDelete] = React.useState<ReleasePlan | null>(
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

  const template = React.useMemo(
    () => getReleasePlannerTemplate(prompts),
    [prompts],
  )

  const completedPrompt = React.useMemo(
    () => buildReleasePlannerCompletedPrompt(template, form),
    [template, form],
  )

  const usingSavedTemplate = React.useMemo(
    () =>
      prompts.some(
        (p) =>
          p.id === "p-release-planner" ||
          p.name === "AI Music Release Planner",
      ),
    [prompts],
  )

  const filteredPlans = React.useMemo(() => {
    const q = planSearch.trim().toLowerCase()
    const sorted = [...releasePlans].sort((a, b) => b.updatedAt - a.updatedAt)
    if (!q) return sorted
    return sorted.filter(
      (plan) =>
        plan.artistName.toLowerCase().includes(q) ||
        plan.songTitle.toLowerCase().includes(q) ||
        plan.genre.toLowerCase().includes(q) ||
        plan.releaseDate.toLowerCase().includes(q) ||
        plan.primaryGoal.toLowerCase().includes(q),
    )
  }, [releasePlans, planSearch])

  function setField<K extends keyof ReleasePlanFormValues>(
    key: K,
    value: ReleasePlanFormValues[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setForm(emptyReleasePlanForm())
    setAiResponse("")
    setFinalPlan(emptyFinalReleasePlanFields())
    setEditingId(null)
  }

  function clearFinalPlan() {
    setFinalPlan(emptyFinalReleasePlanFields())
    toast.success("Final release plan cleared")
  }

  function setFinalField<K extends keyof ReleasePlanFinalFields>(
    key: K,
    value: ReleasePlanFinalFields[K],
  ) {
    setFinalPlan((prev) => ({ ...prev, [key]: value }))
  }

  async function handleCopy(text: string, label: string) {
    try {
      await copyToClipboard(text)
      toast.success(`Copied ${label}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not copy")
    }
  }

  async function handleSavePlan() {
    const now = Date.now()
    const plan = normalizeReleasePlan({
      id: editingId ?? createId("release"),
      ...form,
      completedPrompt,
      aiResponse,
      ...finalPlan,
      createdAt: editingId
        ? (releasePlans.find((p) => p.id === editingId)?.createdAt ?? now)
        : now,
      updatedAt: now,
    })

    try {
      if (editingId) {
        await updateReleasePlan(plan)
        toast.success("Release plan updated")
      } else {
        await addReleasePlan(plan)
        setEditingId(plan.id)
        toast.success("Release plan saved")
      }

      const linked = await linkRecordToCampaign(
        campaigns,
        updateCampaign,
        campaignPrefill.campaignId,
        "release-plan",
        plan.id,
        releasePlanLinkTitle(plan),
        "/release-planner",
      )
      if (linked) toast.message("Linked to campaign")
    } catch {
      toast.error("Could not save release plan to database")
    }
  }

  function openPlan(plan: ReleasePlan) {
    const normalized = normalizeReleasePlan(plan)
    setForm({
      artistName: normalized.artistName,
      songTitle: normalized.songTitle,
      genre: normalized.genre,
      mood: normalized.mood,
      releaseDate: normalized.releaseDate,
      youtubeChannel: normalized.youtubeChannel,
      targetAudience: normalized.targetAudience,
      visualTheme: normalized.visualTheme,
      merchTieIn: normalized.merchTieIn,
      streamingPlatforms: normalized.streamingPlatforms,
      primaryGoal: normalized.primaryGoal,
      notes: normalized.notes,
    })
    setAiResponse(normalized.aiResponse)
    setFinalPlan(finalFieldsFromReleasePlan(normalized))
    setEditingId(normalized.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
    toast.success("Release plan loaded")
  }

  React.useEffect(() => {
    if (prefillApplied.current || shouldSkipCampaignUrlPrefill(editingId)) return

    const recordId = searchParams.get("recordId")
    if (recordId && releasePlans.length > 0) {
      const plan = releasePlans.find((p) => p.id === recordId)
      if (plan) {
        prefillApplied.current = true
        openPlan(normalizeReleasePlan(plan))
        return
      }
    }

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

    const artistName = searchParams.get("artistName")
    const songTitle = searchParams.get("songTitle")
    const genre = searchParams.get("genre")
    const mood = searchParams.get("mood")
    const visualTheme = searchParams.get("visualTheme")
    const targetAudience = searchParams.get("targetAudience")
    const youtubeChannel = searchParams.get("youtubeChannel")
    const releaseDate = searchParams.get("releaseDate")
    const primaryGoal = searchParams.get("primaryGoal")
    const notes = searchParams.get("notes")

    if (
      !context.campaignId &&
      !artistName &&
      !songTitle &&
      !genre &&
      !mood &&
      !visualTheme &&
      !targetAudience &&
      !youtubeChannel &&
      !releaseDate &&
      !primaryGoal &&
      !notes
    ) {
      return
    }

    prefillApplied.current = true
    setForm((prev) => ({
      ...prev,
      artistName: artistName ?? prev.artistName,
      songTitle: songTitle ?? prev.songTitle,
      genre: genre ?? prev.genre,
      mood: mood ?? prev.mood,
      visualTheme: visualTheme ?? prev.visualTheme,
      targetAudience: targetAudience ?? prev.targetAudience,
      youtubeChannel: youtubeChannel ?? prev.youtubeChannel,
      releaseDate: releaseDate ?? prev.releaseDate,
      primaryGoal: primaryGoal ?? prev.primaryGoal,
      notes: notes ?? prev.notes,
    }))
    toast.success(
      context.campaignId
        ? campaignPrefillToastMessage(context.campaignName)
        : "Prefilled from artist CRM",
    )
  }, [searchParams, editingId, releasePlans])

  async function confirmDelete() {
    if (!pendingDelete) return
    try {
      await deleteReleasePlan(pendingDelete.id)
      if (editingId === pendingDelete.id) resetForm()
      setPendingDelete(null)
      toast.success("Release plan deleted")
    } catch {
      toast.error("Could not delete release plan from database")
    }
  }

  function handleExport() {
    downloadJson("creatorops-release-plans.json", releasePlans)
    toast.success("Exported release plans")
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
          normalizeReleasePlan(item as ReleasePlan),
        )
        await importReleasePlans(items)
        toast.success(`Imported ${items.length} release plan(s) to database`)
      } catch {
        toast.error("Invalid JSON file or import failed")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  async function handleMigrateLocal() {
    const local = loadReleasePlans()
    if (local.length === 0) {
      toast.error("No release plans found in localStorage to migrate")
      return
    }
    setMigrating(true)
    try {
      const { migrated, total } =
        await migrateLocalReleasePlansToDatabase(local)
      await reloadReleasePlans()
      toast.success(
        `Migrated ${migrated} local release plan(s). Database now has ${total} total.`,
      )
    } catch {
      toast.error("Migration to database failed")
    } finally {
      setMigrating(false)
    }
  }

  const finalPlanText = buildFinalReleasePlanText(
    {
      artistName: form.artistName,
      songTitle: form.songTitle,
      releaseDate: form.releaseDate,
    },
    finalPlan,
  )

  return (
    <div className="flex flex-col gap-8">
      <ModulePageHeader
        title="AI Music Release Planner"
        description="Plan, save, and organize AI music releases across YouTube, streaming, social, email, merch, and post-release tracking."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ApplyWorkspaceDefaultsButton
              module="release-plan"
              form={form}
              setForm={setForm}
            />
            <Button type="button" onClick={handleSavePlan}>
              {editingId ? "Update release plan" : "Save release plan"}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                New plan
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

      <ModuleWorkflowTabs defaultTab="details" tabs={GENERATOR_WORKFLOW_TABS}>
        <ModuleTabPanel value="details">
          <Card>
            <CardContent className="pt-6">
              <FormSection
                title="Release details"
                description="Fill in track and campaign info to build your release plan prompt"
              >
            {FORM_FIELD_ORDER.map((field) => {
              const id = `release-${field}`
              const label = FIELD_LABELS[field]

              if (field === "primaryGoal") {
                return (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={id} className="text-sm font-medium">
                      Primary goal
                    </Label>
                    <Select
                      value={form.primaryGoal}
                      onValueChange={(v) => setField("primaryGoal", v)}
                    >
                      <SelectTrigger id={id} className="w-full">
                        <span className="truncate">{form.primaryGoal}</span>
                      </SelectTrigger>
                      <SelectContent className="min-w-[280px]">
                        {RELEASE_PLANNER_GOALS.map((goal) => (
                          <SelectItem key={goal} value={goal}>
                            {goal}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              }

              const commonProps = {
                id,
                value: form[field],
                onChange: (
                  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                ) => setField(field, e.target.value),
                placeholder: `Enter ${label.toLowerCase()}...`,
                className: "w-full",
              }

              return (
                <div key={field} className="space-y-2">
                  <Label htmlFor={id} className="text-sm font-medium">
                    {label}
                  </Label>
                  {TEXTAREA_FIELDS.has(field) ? (
                    <Textarea
                      {...commonProps}
                      className="min-h-20 w-full"
                    />
                  ) : (
                    <Input
                      {...commonProps}
                      type={field === "releaseDate" ? "date" : "text"}
                    />
                  )}
                </div>
              )
            })}
              </FormSection>
            </CardContent>
          </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="prompt">
          <CampaignPromptOutputSection
            description={
              usingSavedTemplate
                ? "Using AI Music Release Planner from library"
                : "Using built-in fallback template"
            }
            basePrompt={completedPrompt}
            onCopy={handleCopy}
            contextInput={{
              moduleType: "release-planner",
              campaigns,
              urlCampaignId: campaignPrefill.campaignId,
              urlCampaignName: campaignPrefill.campaignName,
              artistName: form.artistName,
              songTitle: form.songTitle,
            }}
          />
        </ModuleTabPanel>

        <ModuleTabPanel value="ai-response">
          <OutputSection
            title="AI response"
            description="Paste the response from ChatGPT or your AI tool"
          >
            <Textarea
              id="release-ai-response"
              value={aiResponse}
              onChange={(e) => setAiResponse(e.target.value)}
              placeholder="Paste AI response here..."
              className="min-h-40 w-full font-mono text-xs"
            />
            {(aiResponse.trim() || completedPrompt.trim()) ? (
              <div className="flex flex-wrap gap-2">
                {aiResponse.trim() ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(aiResponse, "AI response")}
                  >
                    <Copy className="size-4" />
                    Copy AI response
                  </Button>
                ) : null}
                <SaveLinkedPromptRunButton
                  completedPrompt={completedPrompt}
                  aiResponse={aiResponse}
                  moduleType="Release Plan"
                  campaignId={campaignPrefill.campaignId}
                  campaignName={campaignPrefill.campaignName}
                  outputRecordId={editingId ?? undefined}
                  promptName="Release Planner"
                />
              </div>
            ) : null}
          </OutputSection>
        </ModuleTabPanel>

        <ModuleTabPanel value="final">
          <OutputSection
            title="Final Release Plan"
            description="Paste or edit your chosen release plan"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFinalPlan}
              >
                Clear final release plan
              </Button>
            }
          >
              {FINAL_RELEASE_PLAN_FIELDS.map(
                ({ key, label, multiline, copyLabel }) => {
                  const value = finalPlan[key]
                  const id = `final-${key}`

                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor={id} className="text-sm font-medium">
                          {label}
                        </Label>
                        {value.trim() ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => handleCopy(value, copyLabel)}
                          >
                            <Copy className="size-3.5" />
                            Copy
                          </Button>
                        ) : null}
                      </div>
                      {multiline ? (
                        <Textarea
                          id={id}
                          value={value}
                          onChange={(e) => setFinalField(key, e.target.value)}
                          className="min-h-20 w-full"
                        />
                      ) : (
                        <Input
                          id={id}
                          value={value}
                          onChange={(e) => setFinalField(key, e.target.value)}
                          className="w-full"
                        />
                      )}
                    </div>
                  )
                },
              )}

              {finalPlanText.trim() ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleCopy(finalPlanText, "final release plan")
                  }
                >
                  <Copy className="size-4" />
                  Copy final release plan
                </Button>
              ) : null}
          </OutputSection>
        </ModuleTabPanel>

        <ModuleTabPanel value="related">
          <RelationshipPanel
            input={{
              currentType: "release-plan",
              currentId: editingId,
              campaignId: campaignPrefill.campaignId,
              campaignName: campaignPrefill.campaignName ?? undefined,
              artistName: form.artistName,
              songTitle: form.songTitle,
            }}
          />
        </ModuleTabPanel>

        <ModuleTabPanel value="saved">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
        <CardHeader className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Recent release plans</CardTitle>
            <CardDescription>
              {releasePlans.length} saved plan
              {releasePlans.length === 1 ? "" : "s"}
              {releasePlansUseDatabase
                ? " · stored in SQLite"
                : " · using localStorage fallback"}
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-56">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={planSearch}
                onChange={(e) => setPlanSearch(e.target.value)}
                placeholder="Search plans..."
                className="pl-8"
              />
            </div>
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
          {filteredPlans.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {releasePlans.length === 0
                ? "No release plans saved yet. Fill in the form and save your first plan."
                : "No plans match your search."}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredPlans.map((plan) => {
                const normalized = normalizeReleasePlan(plan)
                const planText = buildFinalReleasePlanText(
                  {
                    artistName: normalized.artistName,
                    songTitle: normalized.songTitle,
                    releaseDate: normalized.releaseDate,
                  },
                  finalFieldsFromReleasePlan(normalized),
                )

                return (
                  <div
                    key={normalized.id}
                    className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <button
                      type="button"
                      onClick={() => openPlan(normalized)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {normalized.songTitle || "Untitled song"}
                        </p>
                        {normalized.artistName ? (
                          <span className="text-sm text-muted-foreground">
                            · {normalized.artistName}
                          </span>
                        ) : null}
                        {normalized.genre ? (
                          <Badge variant="secondary">{normalized.genre}</Badge>
                        ) : null}
                        {editingId === normalized.id ? (
                          <Badge variant="outline" className="text-xs">
                            Editing
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {normalized.releaseDate ? (
                          <span>Release: {normalized.releaseDate}</span>
                        ) : null}
                        {normalized.primaryGoal ? (
                          <span>· {normalized.primaryGoal}</span>
                        ) : null}
                      </div>
                      {normalized.finalStrategySummary ? (
                        <p className="mt-1 line-clamp-2 text-sm text-pretty">
                          {normalized.finalStrategySummary}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(normalized.updatedAt)}
                      </p>
                    </button>
                    <div className="flex shrink-0 flex-wrap items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(
                            normalized.completedPrompt,
                            "completed prompt",
                          )
                        }
                      >
                        <Copy className="size-4" />
                        Prompt
                      </Button>
                      {normalized.aiResponse.trim() ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(normalized.aiResponse, "AI response")
                          }
                        >
                          <Copy className="size-4" />
                          Response
                        </Button>
                      ) : null}
                      {planText.trim() ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(planText, "final release plan")
                          }
                        >
                          <Copy className="size-4" />
                          Plan
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openPlan(normalized)}
                      >
                        Open
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => setPendingDelete(normalized)}
                        aria-label="Delete release plan"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
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
            <DialogTitle>Delete release plan?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `"${pendingDelete.songTitle || pendingDelete.artistName || "Untitled"}" will be permanently removed.`
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
