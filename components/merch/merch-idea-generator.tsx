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
import type { MerchIdea, MerchIdeaFormValues } from "@/lib/types"
import { MERCH_PRODUCT_TYPES, MERCH_STORE_TYPES } from "@/lib/types"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import { migrateLocalMerchIdeasToDatabase } from "@/lib/actions/merch-ideas"
import { downloadJson, loadMerchIdeas } from "@/lib/storage"
import {
  buildMerchIdeaCompletedPrompt,
  buildSelectedConceptText,
  emptyMerchIdeaForm,
  emptySelectedConceptFields,
  getMerchIdeaTemplate,
  normalizeMerchIdea,
  selectedConceptFromMerchIdea,
  type MerchIdeaSelectedConcept,
} from "@/lib/merch-ideas"
import {
  campaignPrefillToastMessage,
  linkRecordToCampaign,
  merchIdeaLinkTitle,
  parseCampaignPrefillContext,
  shouldSkipCampaignUrlPrefill,
} from "@/lib/campaign-prefill"
import type { PresetPrefillContext } from "@/lib/preset-prefill"
import {
  presetPrefillToastMessage,
  tryConsumePresetPrefill,
} from "@/lib/preset-prefill"

import { ModulePageHeader } from "@/components/app-shell"
import { QualityReviewActionLink } from "@/components/quality/quality-review-action"
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
  "audience",
  "tone",
  "designStyle",
  "primaryGoal",
  "notes",
])

const SELECT_FIELDS = {
  productType: MERCH_PRODUCT_TYPES,
  storeType: MERCH_STORE_TYPES,
} as const

const SELECT_LABELS: Record<keyof typeof SELECT_FIELDS, string> = {
  productType: "Product type",
  storeType: "Store type",
}

const FIELD_LABELS: Record<keyof MerchIdeaFormValues, string> = {
  niche: "Niche",
  audience: "Audience",
  productType: "Product type",
  tone: "Tone",
  noun: "Noun",
  verb: "Verb",
  designStyle: "Design style",
  storeType: "Store type",
  primaryGoal: "Primary goal",
  notes: "Notes",
}

const SELECTED_CONCEPT_FIELDS: {
  key: keyof MerchIdeaSelectedConcept
  label: string
  multiline: boolean
  copyLabel: string
}[] = [
  {
    key: "selectedConceptName",
    label: "Selected concept name",
    multiline: false,
    copyLabel: "concept name",
  },
  {
    key: "selectedSlogan",
    label: "Selected slogan",
    multiline: false,
    copyLabel: "slogan",
  },
  {
    key: "selectedDesignDirection",
    label: "Selected design direction",
    multiline: true,
    copyLabel: "design direction",
  },
  {
    key: "selectedProductTitle",
    label: "Selected product title",
    multiline: false,
    copyLabel: "product title",
  },
  {
    key: "selectedProductDescription",
    label: "Selected product description",
    multiline: true,
    copyLabel: "product description",
  },
  {
    key: "selectedTags",
    label: "Selected tags",
    multiline: true,
    copyLabel: "tags",
  },
  {
    key: "selectedMockupIdea",
    label: "Selected mockup idea",
    multiline: true,
    copyLabel: "mockup idea",
  },
  {
    key: "selectedSocialCaption",
    label: "Selected social caption",
    multiline: true,
    copyLabel: "social caption",
  },
]

const FORM_FIELD_ORDER: (keyof MerchIdeaFormValues)[] = [
  "niche",
  "audience",
  "productType",
  "tone",
  "noun",
  "verb",
  "designStyle",
  "storeType",
  "primaryGoal",
  "notes",
]

export function MerchIdeaGenerator() {
  const {
    prompts,
    merchIdeas,
    merchIdeasUseDatabase,
    addMerchIdea,
    updateMerchIdea,
    deleteMerchIdea,
    importMerchIdeas,
    reloadMerchIdeas,
    campaigns,
    updateCampaign,
  } = useStore()

  const [form, setForm] = React.useState<MerchIdeaFormValues>(
    emptyMerchIdeaForm(),
  )
  const [aiResponse, setAiResponse] = React.useState("")
  const [selectedConcept, setSelectedConcept] =
    React.useState<MerchIdeaSelectedConcept>(emptySelectedConceptFields())
  const [editingId, setEditingId] = React.useState<string | null>(null)

  const [ideaSearch, setIdeaSearch] = React.useState("")
  const [pendingDelete, setPendingDelete] = React.useState<MerchIdea | null>(
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
    () => getMerchIdeaTemplate(prompts),
    [prompts],
  )

  const completedPrompt = React.useMemo(
    () => buildMerchIdeaCompletedPrompt(template, form),
    [template, form],
  )

  const usingSavedTemplate = React.useMemo(
    () =>
      prompts.some(
        (p) =>
          p.id === "p-merch-idea" || p.name === "Merch Idea Generator",
      ),
    [prompts],
  )

  const filteredIdeas = React.useMemo(() => {
    const q = ideaSearch.trim().toLowerCase()
    const sorted = [...merchIdeas].sort((a, b) => b.updatedAt - a.updatedAt)
    if (!q) return sorted
    return sorted.filter(
      (idea) =>
        idea.niche.toLowerCase().includes(q) ||
        idea.productType.toLowerCase().includes(q) ||
        idea.selectedSlogan.toLowerCase().includes(q) ||
        idea.selectedConceptName.toLowerCase().includes(q) ||
        idea.storeType.toLowerCase().includes(q),
    )
  }, [merchIdeas, ideaSearch])

  function setField<K extends keyof MerchIdeaFormValues>(
    key: K,
    value: MerchIdeaFormValues[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setForm(emptyMerchIdeaForm())
    setAiResponse("")
    setSelectedConcept(emptySelectedConceptFields())
    setEditingId(null)
  }

  function clearSelectedConcept() {
    setSelectedConcept(emptySelectedConceptFields())
    toast.success("Selected concept cleared")
  }

  function setConceptField<K extends keyof MerchIdeaSelectedConcept>(
    key: K,
    value: MerchIdeaSelectedConcept[K],
  ) {
    setSelectedConcept((prev) => ({ ...prev, [key]: value }))
  }

  async function handleCopy(text: string, label: string) {
    try {
      await copyToClipboard(text)
      toast.success(`Copied ${label}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not copy")
    }
  }

  async function handleSaveIdea() {
    const now = Date.now()
    const idea = normalizeMerchIdea({
      id: editingId ?? createId("merch"),
      ...form,
      completedPrompt,
      aiResponse,
      ...selectedConcept,
      createdAt: editingId
        ? (merchIdeas.find((i) => i.id === editingId)?.createdAt ?? now)
        : now,
      updatedAt: now,
    })

    try {
      if (editingId) {
        await updateMerchIdea(idea)
        toast.success("Merch idea updated")
      } else {
        await addMerchIdea(idea)
        setEditingId(idea.id)
        toast.success("Merch idea saved")
      }

      const linked = await linkRecordToCampaign(
        campaigns,
        updateCampaign,
        campaignPrefill.campaignId,
        "merch-idea",
        idea.id,
        merchIdeaLinkTitle(idea),
        "/merch-ideas",
      )
      if (linked) toast.message("Linked to campaign")
    } catch {
      toast.error("Could not save merch idea to database")
    }
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

    const niche = searchParams.get("niche")
    const audience = searchParams.get("audience")
    const primaryGoal = searchParams.get("primaryGoal")
    const notes = searchParams.get("notes")

    if (!context.campaignId && !niche && !audience && !primaryGoal && !notes) {
      return
    }

    prefillApplied.current = true
    setForm((prev) => ({
      ...prev,
      niche: niche ?? prev.niche,
      audience: audience ?? prev.audience,
      primaryGoal: primaryGoal ?? prev.primaryGoal,
      notes: notes ?? prev.notes,
    }))
    toast.success(campaignPrefillToastMessage(context.campaignName))
  }, [searchParams, editingId])

  function openIdea(idea: MerchIdea) {
    const normalized = normalizeMerchIdea(idea)
    setForm({
      niche: normalized.niche,
      audience: normalized.audience,
      productType: normalized.productType,
      tone: normalized.tone,
      noun: normalized.noun,
      verb: normalized.verb,
      designStyle: normalized.designStyle,
      storeType: normalized.storeType,
      primaryGoal: normalized.primaryGoal,
      notes: normalized.notes,
    })
    setAiResponse(normalized.aiResponse)
    setSelectedConcept(selectedConceptFromMerchIdea(normalized))
    setEditingId(normalized.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
    toast.success("Merch idea loaded")
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    try {
      await deleteMerchIdea(pendingDelete.id)
      if (editingId === pendingDelete.id) resetForm()
      setPendingDelete(null)
      toast.success("Merch idea deleted")
    } catch {
      toast.error("Could not delete merch idea from database")
    }
  }

  function handleExport() {
    downloadJson("creatorops-merch-ideas.json", merchIdeas)
    toast.success("Exported merch ideas")
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
        const items = (Array.isArray(parsed) ? parsed : [parsed]).map(
          (item) => normalizeMerchIdea(item as MerchIdea),
        )
        await importMerchIdeas(items)
        toast.success(`Imported ${items.length} merch idea(s) to database`)
      } catch {
        toast.error("Invalid JSON file or import failed")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  async function handleMigrateLocal() {
    const local = loadMerchIdeas()
    if (local.length === 0) {
      toast.error("No merch ideas found in localStorage to migrate")
      return
    }
    setMigrating(true)
    try {
      const { migrated, total } = await migrateLocalMerchIdeasToDatabase(local)
      await reloadMerchIdeas()
      toast.success(
        `Migrated ${migrated} local merch idea(s). Database now has ${total} total.`,
      )
    } catch {
      toast.error("Migration to database failed")
    } finally {
      setMigrating(false)
    }
  }

  const selectedConceptText = buildSelectedConceptText(selectedConcept)

  return (
    <div className="flex flex-col gap-8">
      <ModulePageHeader
        title="Merch Idea Generator"
        description="Generate, save, and organize merch concepts for artist stores, Fourthwall, and niche ecommerce."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ApplyWorkspaceDefaultsButton
              module="merch-idea"
              form={form}
              setForm={setForm}
            />
            <Button type="button" onClick={handleSaveIdea}>
              {editingId ? "Update merch idea" : "Save merch idea"}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                New idea
              </Button>
            ) : null}
            {editingId ? (
              <QualityReviewActionLink
                recordId={editingId}
                campaignId={campaignPrefill.campaignId}
                sourceRecordType="merch-idea"
                reviewType="Merch Concept"
                label="Review Merch Concept"
              />
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
                title="Concept inputs"
                description="Describe the niche and product to build your merch prompt"
              >
            {FORM_FIELD_ORDER.map((field) => {
              const id = `merch-${field}`
              const label = FIELD_LABELS[field]

              if (field in SELECT_FIELDS) {
                const options =
                  SELECT_FIELDS[field as keyof typeof SELECT_FIELDS]
                return (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={id} className="text-sm font-medium">
                      {SELECT_LABELS[field as keyof typeof SELECT_FIELDS]}
                    </Label>
                    <Select
                      value={form[field]}
                      onValueChange={(v) => setField(field, v)}
                    >
                      <SelectTrigger id={id} className="w-full">
                        <span className="truncate">{form[field]}</span>
                      </SelectTrigger>
                      <SelectContent className="min-w-[260px]">
                        {options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
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
                    <Input {...commonProps} />
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
                ? "Using Merch Idea Generator from library"
                : "Using built-in fallback template"
            }
            basePrompt={completedPrompt}
            onCopy={handleCopy}
            contextInput={{
              moduleType: "merch-ideas",
              campaigns,
              urlCampaignId: campaignPrefill.campaignId,
              urlCampaignName: campaignPrefill.campaignName,
              niche: form.niche,
            }}
          />
        </ModuleTabPanel>

        <ModuleTabPanel value="ai-response">
          <OutputSection
            title="AI response"
            description="Paste the response from ChatGPT or your AI tool"
          >
            <Textarea
              id="merch-ai-response"
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
                  moduleType="Merch Idea"
                  campaignId={campaignPrefill.campaignId}
                  campaignName={campaignPrefill.campaignName}
                  outputRecordId={editingId ?? undefined}
                  promptName="Merch Idea Generator"
                />
              </div>
            ) : null}
          </OutputSection>
        </ModuleTabPanel>

        <ModuleTabPanel value="final">
          <OutputSection
            title="Selected Concept"
            description="Paste or edit your chosen merch concept"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSelectedConcept}
              >
                Clear selected concept
              </Button>
            }
          >
              {SELECTED_CONCEPT_FIELDS.map(({ key, label, multiline, copyLabel }) => {
                const value = selectedConcept[key]
                const id = `selected-${key}`

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
                        onChange={(e) => setConceptField(key, e.target.value)}
                        className="min-h-20 w-full"
                      />
                    ) : (
                      <Input
                        id={id}
                        value={value}
                        onChange={(e) => setConceptField(key, e.target.value)}
                        className="w-full"
                      />
                    )}
                  </div>
                )
              })}

              {selectedConceptText.trim() ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleCopy(selectedConceptText, "selected concept")
                  }
                >
                  <Copy className="size-4" />
                  Copy selected concept
                </Button>
              ) : null}
          </OutputSection>
        </ModuleTabPanel>

        <ModuleTabPanel value="related">
          <RelationshipPanel
            input={{
              currentType: "merch-idea",
              currentId: editingId,
              campaignId: campaignPrefill.campaignId,
              campaignName: campaignPrefill.campaignName ?? undefined,
              niche: form.niche,
              productName: form.productType,
              selectedConceptName: selectedConcept.selectedConceptName,
              selectedProductTitle: selectedConcept.selectedProductTitle,
            }}
          />
        </ModuleTabPanel>

        <ModuleTabPanel value="saved">
      <Card className={RECENT_RECORDS_CARD_CLASS}>
        <CardHeader className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Recent merch ideas</CardTitle>
            <CardDescription>
              {merchIdeas.length} saved concept
              {merchIdeas.length === 1 ? "" : "s"}
              {merchIdeasUseDatabase
                ? " · stored in SQLite"
                : " · using localStorage fallback"}
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-56">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={ideaSearch}
                onChange={(e) => setIdeaSearch(e.target.value)}
                placeholder="Search ideas..."
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
          {filteredIdeas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {merchIdeas.length === 0
                ? "No merch ideas saved yet. Fill in the form and save your first concept."
                : "No ideas match your search."}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredIdeas.map((idea) => {
                const normalized = normalizeMerchIdea(idea)
                const conceptText = buildSelectedConceptText(
                  selectedConceptFromMerchIdea(normalized),
                )

                return (
                  <div
                    key={normalized.id}
                    className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <button
                      type="button"
                      onClick={() => openIdea(normalized)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {normalized.niche || "Untitled niche"}
                        </p>
                        {normalized.productType ? (
                          <Badge variant="secondary">
                            {normalized.productType}
                          </Badge>
                        ) : null}
                        {normalized.storeType ? (
                          <Badge variant="outline">{normalized.storeType}</Badge>
                        ) : null}
                        {editingId === normalized.id ? (
                          <Badge variant="outline" className="text-xs">
                            Editing
                          </Badge>
                        ) : null}
                      </div>
                      {normalized.selectedConceptName ? (
                        <p className="mt-1 text-sm font-medium text-pretty">
                          {normalized.selectedConceptName}
                        </p>
                      ) : null}
                      {normalized.selectedSlogan ? (
                        <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
                          {normalized.selectedSlogan}
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
                          handleCopy(normalized.completedPrompt, "completed prompt")
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
                      {conceptText.trim() ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(conceptText, "selected concept")
                          }
                        >
                          <Copy className="size-4" />
                          Concept
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openIdea(normalized)}
                      >
                        Open
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => setPendingDelete(normalized)}
                        aria-label="Delete merch idea"
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
            <DialogTitle>Delete merch idea?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `"${pendingDelete.niche || pendingDelete.selectedConceptName || "Untitled"}" will be permanently removed.`
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
