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
import type {
  SocialRepurposingFormValues,
  SocialRepurposingRecord,
} from "@/lib/types"
import { SOCIAL_BUSINESS_AREAS, SOCIAL_CONTENT_TYPES } from "@/lib/types"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import { migrateLocalSocialRepurposingRecordsToDatabase } from "@/lib/actions/social-repurposing"
import { downloadJson, loadSocialRepurposingRecords } from "@/lib/storage"
import {
  buildFinalContentText,
  buildSocialRepurposingCompletedPrompt,
  emptyFinalContentFields,
  emptySocialRepurposingForm,
  finalFieldsFromSocialRecord,
  getSocialRepurposingTemplate,
  normalizeSocialRepurposingRecord,
  type SocialRepurposingFinalFields,
} from "@/lib/social-repurposing"
import {
  campaignPrefillToastMessage,
  linkRecordToCampaign,
  parseCampaignPrefillContext,
  shouldSkipCampaignUrlPrefill,
  socialRepurposingLinkTitle,
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
  "sourceContent",
  "audience",
  "tone",
  "platforms",
  "callToAction",
  "notes",
])

const FIELD_LABELS: Record<keyof SocialRepurposingFormValues, string> = {
  sourceContent: "Source content",
  businessArea: "Business area",
  goal: "Goal",
  audience: "Audience",
  tone: "Tone",
  platforms: "Platforms",
  callToAction: "Call to action",
  productOrReleaseLink: "Product or release link",
  contentType: "Content type",
  campaignName: "Campaign name",
  notes: "Notes",
}

const FORM_FIELD_ORDER: (keyof SocialRepurposingFormValues)[] = [
  "sourceContent",
  "businessArea",
  "goal",
  "audience",
  "tone",
  "platforms",
  "callToAction",
  "productOrReleaseLink",
  "contentType",
  "campaignName",
  "notes",
]

const FINAL_CONTENT_FIELDS: {
  key: keyof SocialRepurposingFinalFields
  label: string
  multiline: boolean
  copyLabel: string
}[] = [
  {
    key: "finalCoreMessage",
    label: "Final core message",
    multiline: true,
    copyLabel: "core message",
  },
  {
    key: "finalTikTokCaption",
    label: "Final TikTok caption",
    multiline: true,
    copyLabel: "TikTok caption",
  },
  {
    key: "finalInstagramCaption",
    label: "Final Instagram caption",
    multiline: true,
    copyLabel: "Instagram caption",
  },
  {
    key: "finalXPost",
    label: "Final X post",
    multiline: true,
    copyLabel: "X post",
  },
  {
    key: "finalYouTubeShortsIdea",
    label: "Final YouTube Shorts idea",
    multiline: true,
    copyLabel: "YouTube Shorts idea",
  },
  {
    key: "finalYouTubeCommunityPost",
    label: "Final YouTube Community post",
    multiline: true,
    copyLabel: "YouTube Community post",
  },
  {
    key: "finalEmailSnippet",
    label: "Final email snippet",
    multiline: true,
    copyLabel: "email snippet",
  },
  {
    key: "finalHashtags",
    label: "Final hashtags",
    multiline: true,
    copyLabel: "hashtags",
  },
  {
    key: "finalCTA",
    label: "Final CTA",
    multiline: false,
    copyLabel: "CTA",
  },
]

export function SocialRepurposingEngine() {
  const {
    prompts,
    socialRepurposingRecords,
    socialRepurposingRecordsUseDatabase,
    addSocialRepurposingRecord,
    updateSocialRepurposingRecord,
    deleteSocialRepurposingRecord,
    importSocialRepurposingRecords,
    reloadSocialRepurposingRecords,
    campaigns,
    updateCampaign,
  } = useStore()

  const [form, setForm] = React.useState<SocialRepurposingFormValues>(
    emptySocialRepurposingForm(),
  )
  const [aiResponse, setAiResponse] = React.useState("")
  const [finalContent, setFinalContent] =
    React.useState<SocialRepurposingFinalFields>(emptyFinalContentFields())
  const [editingId, setEditingId] = React.useState<string | null>(null)

  const [recordSearch, setRecordSearch] = React.useState("")
  const [pendingDelete, setPendingDelete] =
    React.useState<SocialRepurposingRecord | null>(null)
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
    () => getSocialRepurposingTemplate(prompts),
    [prompts],
  )

  const completedPrompt = React.useMemo(
    () => buildSocialRepurposingCompletedPrompt(template, form),
    [template, form],
  )

  const usingSavedTemplate = React.useMemo(
    () =>
      prompts.some(
        (p) =>
          p.id === "p-social-repurposing" ||
          p.name === "Social Repurposing Engine",
      ),
    [prompts],
  )

  const filteredRecords = React.useMemo(() => {
    const q = recordSearch.trim().toLowerCase()
    const sorted = [...socialRepurposingRecords].sort(
      (a, b) => b.updatedAt - a.updatedAt,
    )
    if (!q) return sorted
    return sorted.filter(
      (record) =>
        record.campaignName.toLowerCase().includes(q) ||
        record.contentType.toLowerCase().includes(q) ||
        record.businessArea.toLowerCase().includes(q) ||
        record.sourceContent.toLowerCase().includes(q) ||
        record.platforms.toLowerCase().includes(q),
    )
  }, [socialRepurposingRecords, recordSearch])

  function setField<K extends keyof SocialRepurposingFormValues>(
    key: K,
    value: SocialRepurposingFormValues[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setForm(emptySocialRepurposingForm())
    setAiResponse("")
    setFinalContent(emptyFinalContentFields())
    setEditingId(null)
  }

  function clearFinalContent() {
    setFinalContent(emptyFinalContentFields())
    toast.success("Final content cleared")
  }

  function setFinalField<K extends keyof SocialRepurposingFinalFields>(
    key: K,
    value: SocialRepurposingFinalFields[K],
  ) {
    setFinalContent((prev) => ({ ...prev, [key]: value }))
  }

  async function handleCopy(text: string, label: string) {
    try {
      await copyToClipboard(text)
      toast.success(`Copied ${label}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not copy")
    }
  }

  async function handleSaveRecord() {
    const now = Date.now()
    const record = normalizeSocialRepurposingRecord({
      id: editingId ?? createId("social"),
      ...form,
      completedPrompt,
      aiResponse,
      ...finalContent,
      createdAt: editingId
        ? (socialRepurposingRecords.find((r) => r.id === editingId)
            ?.createdAt ?? now)
        : now,
      updatedAt: now,
    })

    try {
      if (editingId) {
        await updateSocialRepurposingRecord(record)
        toast.success("Social content updated")
      } else {
        await addSocialRepurposingRecord(record)
        setEditingId(record.id)
        toast.success("Social content saved")
      }

      const linked = await linkRecordToCampaign(
        campaigns,
        updateCampaign,
        campaignPrefill.campaignId,
        "social-repurposing",
        record.id,
        socialRepurposingLinkTitle(record),
        "/social-repurposing",
      )
      if (linked) toast.message("Linked to campaign")
    } catch {
      toast.error("Could not save social content to database")
    }
  }

  function openRecord(record: SocialRepurposingRecord) {
    const normalized = normalizeSocialRepurposingRecord(record)
    setForm({
      sourceContent: normalized.sourceContent,
      businessArea: normalized.businessArea,
      goal: normalized.goal,
      audience: normalized.audience,
      tone: normalized.tone,
      platforms: normalized.platforms,
      callToAction: normalized.callToAction,
      productOrReleaseLink: normalized.productOrReleaseLink,
      contentType: normalized.contentType,
      campaignName: normalized.campaignName,
      notes: normalized.notes,
    })
    setAiResponse(normalized.aiResponse)
    setFinalContent(finalFieldsFromSocialRecord(normalized))
    setEditingId(normalized.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
    toast.success("Social content loaded")
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

    const campaignName = searchParams.get("campaignName")
    const audience = searchParams.get("audience")
    const tone = searchParams.get("tone")
    const sourceContent = searchParams.get("sourceContent")
    const productOrReleaseLink = searchParams.get("productOrReleaseLink")
    const businessArea = searchParams.get("businessArea")
    const goal = searchParams.get("goal")

    if (
      !context.campaignId &&
      !campaignName &&
      !audience &&
      !tone &&
      !sourceContent &&
      !productOrReleaseLink &&
      !businessArea &&
      !goal
    ) {
      return
    }

    prefillApplied.current = true
    setForm((prev) => ({
      ...prev,
      campaignName: campaignName ?? prev.campaignName,
      audience: audience ?? prev.audience,
      tone: tone ?? prev.tone,
      sourceContent: sourceContent ?? prev.sourceContent,
      productOrReleaseLink: productOrReleaseLink ?? prev.productOrReleaseLink,
      businessArea: businessArea ?? prev.businessArea,
      goal: goal ?? prev.goal,
    }))
    toast.success(
      context.campaignId
        ? campaignPrefillToastMessage(context.campaignName)
        : "Prefilled from artist CRM",
    )
  }, [searchParams, editingId])

  async function confirmDelete() {
    if (!pendingDelete) return
    try {
      await deleteSocialRepurposingRecord(pendingDelete.id)
      if (editingId === pendingDelete.id) resetForm()
      setPendingDelete(null)
      toast.success("Social content deleted")
    } catch {
      toast.error("Could not delete social content from database")
    }
  }

  function handleExport() {
    downloadJson(
      "creatorops-social-repurposing.json",
      socialRepurposingRecords,
    )
    toast.success("Exported social repurposing records")
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
          (item) =>
            normalizeSocialRepurposingRecord(item as SocialRepurposingRecord),
        )
        await importSocialRepurposingRecords(items)
        toast.success(`Imported ${items.length} record(s) to database`)
      } catch {
        toast.error("Invalid JSON file or import failed")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  async function handleMigrateLocal() {
    const local = loadSocialRepurposingRecords()
    if (local.length === 0) {
      toast.error("No social repurposing records found in localStorage to migrate")
      return
    }
    setMigrating(true)
    try {
      const { migrated, total } =
        await migrateLocalSocialRepurposingRecordsToDatabase(local)
      await reloadSocialRepurposingRecords()
      toast.success(
        `Migrated ${migrated} local record(s). Database now has ${total} total.`,
      )
    } catch {
      toast.error("Migration to database failed")
    } finally {
      setMigrating(false)
    }
  }

  const finalContentText = buildFinalContentText(
    form.campaignName,
    finalContent,
  )

  return (
    <div className="flex flex-col gap-8">
      <ModulePageHeader
        title="Social Repurposing Engine"
        description="Turn one source idea into platform-specific content for TikTok, Instagram, X, YouTube, and email."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ApplyWorkspaceDefaultsButton
              module="social-repurposing"
              form={form}
              setForm={setForm}
            />
            <Button type="button" onClick={handleSaveRecord}>
              {editingId ? "Update social content" : "Save social content"}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                New campaign
              </Button>
            ) : null}
            <QualityReviewActionLink
              recordId={editingId}
              campaignId={campaignPrefill.campaignId}
              campaignName={campaignPrefill.campaignName}
              sourceRecordType="social-repurposing"
              reviewType="Social Caption"
              label="Review Social Captions"
              contextTitle={form.campaignName}
            />
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
            <CardContent className="space-y-4 pt-6">
              <FormSection
                title="Source details"
                description="Describe the source content and campaign to build your prompt"
              >
            {FORM_FIELD_ORDER.map((field) => {
              const id = `social-${field}`
              const label = FIELD_LABELS[field]

              if (field === "contentType") {
                return (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={id} className="text-sm font-medium">
                      Content type
                    </Label>
                    <Select
                      value={form.contentType}
                      onValueChange={(v) => setField("contentType", v)}
                    >
                      <SelectTrigger id={id} className="w-full">
                        <span className="truncate">{form.contentType}</span>
                      </SelectTrigger>
                      <SelectContent className="min-w-[260px]">
                        {SOCIAL_CONTENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              }

              if (field === "businessArea") {
                return (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={id} className="text-sm font-medium">
                      Business area
                    </Label>
                    <Select
                      value={form.businessArea}
                      onValueChange={(v) => setField("businessArea", v)}
                    >
                      <SelectTrigger id={id} className="w-full">
                        <span className="truncate">{form.businessArea}</span>
                      </SelectTrigger>
                      <SelectContent className="min-w-[260px]">
                        {SOCIAL_BUSINESS_AREAS.map((area) => (
                          <SelectItem key={area} value={area}>
                            {area}
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
                      className={
                        field === "sourceContent"
                          ? "min-h-32 w-full"
                          : "min-h-20 w-full"
                      }
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
                ? "Using Social Repurposing Engine from library"
                : "Using built-in fallback template"
            }
            basePrompt={completedPrompt}
            onCopy={handleCopy}
            contextInput={{
              moduleType: "social-repurposing",
              campaigns,
              urlCampaignId: campaignPrefill.campaignId,
              urlCampaignName: campaignPrefill.campaignName,
              formCampaignName: form.campaignName,
            }}
          />
        </ModuleTabPanel>

        <ModuleTabPanel value="ai-response">
          <OutputSection
            title="AI response"
            description="Paste the response from ChatGPT or your AI tool"
          >
            <Textarea
              id="social-ai-response"
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
                  moduleType="Social Repurposing"
                  campaignId={campaignPrefill.campaignId}
                  campaignName={campaignPrefill.campaignName}
                  outputRecordId={editingId ?? undefined}
                  promptName="Social Repurposing"
                />
              </div>
            ) : null}
          </OutputSection>
        </ModuleTabPanel>

        <ModuleTabPanel value="final">
          <OutputSection
            title="Final Content"
            description="Paste or edit your platform-specific content"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFinalContent}
              >
                Clear final content
              </Button>
            }
          >
              {FINAL_CONTENT_FIELDS.map(({ key, label, multiline, copyLabel }) => {
                const value = finalContent[key]
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
              })}

              {finalContentText.trim() ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleCopy(finalContentText, "final content")
                  }
                >
                  <Copy className="size-4" />
                  Copy final content
                </Button>
              ) : null}
          </OutputSection>
        </ModuleTabPanel>

        <ModuleTabPanel value="related">
          <RelationshipPanel
            input={{
              currentType: "social-repurposing",
              currentId: editingId,
              campaignId: campaignPrefill.campaignId,
              campaignName: form.campaignName || campaignPrefill.campaignName || undefined,
              productName: form.productOrReleaseLink,
              trackTitle: form.sourceContent,
            }}
          />
        </ModuleTabPanel>

        <ModuleTabPanel value="saved">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
        <CardHeader className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Recent social content</CardTitle>
            <CardDescription>
              {socialRepurposingRecords.length} saved record
              {socialRepurposingRecords.length === 1 ? "" : "s"}
              {socialRepurposingRecordsUseDatabase
                ? " · stored in SQLite"
                : " · using localStorage fallback"}
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-56">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={recordSearch}
                onChange={(e) => setRecordSearch(e.target.value)}
                placeholder="Search records..."
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
          {filteredRecords.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {socialRepurposingRecords.length === 0
                ? "No social content saved yet. Fill in the form and save your first campaign."
                : "No records match your search."}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredRecords.map((record) => {
                const normalized = normalizeSocialRepurposingRecord(record)
                const contentText = buildFinalContentText(
                  normalized.campaignName,
                  finalFieldsFromSocialRecord(normalized),
                )

                return (
                  <div
                    key={normalized.id}
                    className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <button
                      type="button"
                      onClick={() => openRecord(normalized)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {normalized.campaignName || "Untitled campaign"}
                        </p>
                        {normalized.contentType ? (
                          <Badge variant="secondary">
                            {normalized.contentType}
                          </Badge>
                        ) : null}
                        {normalized.businessArea ? (
                          <Badge variant="outline">
                            {normalized.businessArea}
                          </Badge>
                        ) : null}
                        {editingId === normalized.id ? (
                          <Badge variant="outline" className="text-xs">
                            Editing
                          </Badge>
                        ) : null}
                      </div>
                      {normalized.finalCoreMessage ? (
                        <p className="mt-1 line-clamp-2 text-sm text-pretty">
                          {normalized.finalCoreMessage}
                        </p>
                      ) : normalized.sourceContent ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground text-pretty">
                          {normalized.sourceContent}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(normalized.updatedAt)}
                        {normalized.platforms
                          ? ` · ${normalized.platforms.split(",")[0]?.trim()}`
                          : ""}
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
                      {contentText.trim() ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(contentText, "final content")
                          }
                        >
                          <Copy className="size-4" />
                          Content
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openRecord(normalized)}
                      >
                        Open
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => setPendingDelete(normalized)}
                        aria-label="Delete social content"
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
            <DialogTitle>Delete social content?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `"${pendingDelete.campaignName || "Untitled"}" will be permanently removed.`
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
