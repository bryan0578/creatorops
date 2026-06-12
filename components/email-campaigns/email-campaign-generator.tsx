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
import { formatFieldLabel } from "@/lib/ui/labels"
import { formLabelClassName } from "@/components/ui/form-field"

import { useStore, createId } from "@/lib/store"
import type { EmailCampaignFormValues, EmailCampaignRecord } from "@/lib/types"
import {
  EMAIL_BUSINESS_AREAS,
  EMAIL_CAMPAIGN_TYPES,
} from "@/lib/types"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import { migrateLocalEmailCampaignRecordsToDatabase } from "@/lib/actions/email-campaigns"
import { downloadJson, loadEmailCampaignRecords } from "@/lib/storage"
import {
  buildEmailCampaignCompletedPrompt,
  buildFinalEmailText,
  emptyEmailCampaignForm,
  emptyFinalEmailFields,
  finalFieldsFromEmailRecord,
  getEmailCampaignTemplate,
  normalizeEmailCampaignRecord,
  EMAIL_CAMPAIGN_PROMPT_ID,
  EMAIL_CAMPAIGN_PROMPT_NAME,
  type EmailCampaignFinalFields,
} from "@/lib/email-campaigns"
import {
  campaignPrefillToastMessage,
  emailCampaignLinkTitle,
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
import { QualityReviewActionLink } from "@/components/quality/quality-review-action"
import { SaveLinkedPromptRunButton } from "@/components/module/save-linked-prompt-run-button"
import { AIGenerationPanel } from "@/components/ai/ai-generation-panel"
import { ApplyAIOutputPanel } from "@/components/ai-output/apply-ai-output-panel"
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
import { useGeneratorDefaultTab } from "@/hooks/use-smart-default-tab"

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

const TEXTAREA_FIELDS = new Set([
  "audience",
  "offerOrAnnouncement",
  "keyBenefits",
  "tone",
  "callToAction",
  "urgency",
  "notes",
])

const FIELD_LABELS: Record<keyof EmailCampaignFormValues, string> = {
  campaignName: "Campaign name",
  campaignType: "Campaign type",
  businessArea: "Business area",
  audience: "Audience",
  offerOrAnnouncement: "Offer or announcement",
  productOrReleaseName: "Product or release name",
  keyBenefits: "Key benefits",
  tone: "Tone",
  callToAction: "Call to action",
  link: "Link",
  urgency: "Urgency",
  senderName: "Sender name",
  notes: "Notes",
}

const FORM_FIELD_ORDER: (keyof EmailCampaignFormValues)[] = [
  "campaignName",
  "campaignType",
  "businessArea",
  "audience",
  "offerOrAnnouncement",
  "productOrReleaseName",
  "keyBenefits",
  "tone",
  "callToAction",
  "link",
  "urgency",
  "senderName",
  "notes",
]

const FINAL_EMAIL_FIELDS: {
  key: keyof EmailCampaignFinalFields
  label: string
  copyLabel: string
}[] = [
  {
    key: "finalSubjectLine",
    label: "Final subject line",
    copyLabel: "subject line",
  },
  {
    key: "finalPreviewText",
    label: "Final preview text",
    copyLabel: "preview text",
  },
  {
    key: "finalEmailBody",
    label: "Final email body",
    copyLabel: "email body",
  },
  { key: "finalCTA", label: "Final CTA", copyLabel: "CTA" },
  {
    key: "finalFollowUpEmail",
    label: "Final follow-up email",
    copyLabel: "follow-up email",
  },
  {
    key: "finalResendSubject",
    label: "Final resend subject",
    copyLabel: "resend subject",
  },
  {
    key: "finalResendBody",
    label: "Final resend body",
    copyLabel: "resend body",
  },
]

export function EmailCampaignGenerator() {
  const {
    prompts,
    emailCampaignRecords,
    emailCampaignRecordsUseDatabase,
    addEmailCampaignRecord,
    updateEmailCampaignRecord,
    deleteEmailCampaignRecord,
    importEmailCampaignRecords,
    reloadEmailCampaignRecords,
    campaigns,
    updateCampaign,
    hydrated,
  } = useStore()

  const { activeTab, setActiveTab } = useGeneratorDefaultTab(
    emailCampaignRecords.length,
    hydrated,
  )

  const [form, setForm] = React.useState<EmailCampaignFormValues>(
    emptyEmailCampaignForm(),
  )
  const [aiResponse, setAiResponse] = React.useState("")
  const [finalEmail, setFinalEmail] = React.useState<EmailCampaignFinalFields>(
    emptyFinalEmailFields(),
  )
  const [editingId, setEditingId] = React.useState<string | null>(null)

  const [recordSearch, setRecordSearch] = React.useState("")
  const [migrating, setMigrating] = React.useState(false)
  const [pendingDelete, setPendingDelete] =
    React.useState<EmailCampaignRecord | null>(null)
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
    () => getEmailCampaignTemplate(prompts),
    [prompts],
  )

  const completedPrompt = React.useMemo(
    () => buildEmailCampaignCompletedPrompt(template, form),
    [template, form],
  )

  const usingSavedTemplate = React.useMemo(
    () =>
      prompts.some(
        (p) =>
          p.id === EMAIL_CAMPAIGN_PROMPT_ID ||
          p.name === EMAIL_CAMPAIGN_PROMPT_NAME,
      ),
    [prompts],
  )

  const filteredRecords = React.useMemo(() => {
    const q = recordSearch.trim().toLowerCase()
    const sorted = [...emailCampaignRecords].sort(
      (a, b) => b.updatedAt - a.updatedAt,
    )
    if (!q) return sorted
    return sorted.filter(
      (record) =>
        record.campaignName.toLowerCase().includes(q) ||
        record.campaignType.toLowerCase().includes(q) ||
        record.businessArea.toLowerCase().includes(q) ||
        record.productOrReleaseName.toLowerCase().includes(q) ||
        record.finalSubjectLine.toLowerCase().includes(q) ||
        record.audience.toLowerCase().includes(q),
    )
  }, [emailCampaignRecords, recordSearch])

  function setField<K extends keyof EmailCampaignFormValues>(
    key: K,
    value: EmailCampaignFormValues[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setForm(emptyEmailCampaignForm())
    setAiResponse("")
    setFinalEmail(emptyFinalEmailFields())
    setEditingId(null)
  }

  function clearFinalEmail() {
    setFinalEmail(emptyFinalEmailFields())
    toast.success("Final email cleared")
  }

  function setFinalField<K extends keyof EmailCampaignFinalFields>(
    key: K,
    value: EmailCampaignFinalFields[K],
  ) {
    setFinalEmail((prev) => ({ ...prev, [key]: value }))
  }

  async function handleCopy(text: string, label: string) {
    try {
      await copyToClipboard(text)
      toast.success(`Copied ${label}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not copy")
    }
  }

  async function handleSave() {
    const now = Date.now()
    const record = normalizeEmailCampaignRecord({
      id: editingId ?? createId("email"),
      ...form,
      completedPrompt,
      aiResponse,
      ...finalEmail,
      createdAt: editingId
        ? (emailCampaignRecords.find((r) => r.id === editingId)?.createdAt ??
          now)
        : now,
      updatedAt: now,
    })

    try {
      if (editingId) {
        await updateEmailCampaignRecord(record)
        toast.success("Email campaign updated")
      } else {
        await addEmailCampaignRecord(record)
        setEditingId(record.id)
        toast.success("Email campaign saved")
      }

      const linked = await linkRecordToCampaign(
        campaigns,
        updateCampaign,
        campaignPrefill.campaignId,
        "email-campaign",
        record.id,
        emailCampaignLinkTitle(record),
        "/email-campaigns",
      )
      if (linked) toast.message("Linked to campaign")
    } catch {
      toast.error("Could not save email campaign to database")
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

    const campaignName = searchParams.get("campaignName")
    const campaignType = searchParams.get("campaignType")
    const productOrReleaseName = searchParams.get("productOrReleaseName")
    const audience = searchParams.get("audience")
    const callToAction = searchParams.get("callToAction")
    const notes = searchParams.get("notes")

    if (
      !context.campaignId &&
      !campaignName &&
      !campaignType &&
      !productOrReleaseName &&
      !audience &&
      !callToAction &&
      !notes
    ) {
      return
    }

    prefillApplied.current = true
    setForm((prev) => ({
      ...prev,
      campaignName: campaignName ?? prev.campaignName,
      campaignType: campaignType ?? prev.campaignType,
      productOrReleaseName: productOrReleaseName ?? prev.productOrReleaseName,
      audience: audience ?? prev.audience,
      callToAction: callToAction ?? prev.callToAction,
      notes: notes ?? prev.notes,
    }))
    toast.success(campaignPrefillToastMessage(context.campaignName))
  }, [searchParams, editingId])

  function openRecord(record: EmailCampaignRecord) {
    const normalized = normalizeEmailCampaignRecord(record)
    setForm({
      campaignName: normalized.campaignName,
      campaignType: normalized.campaignType,
      businessArea: normalized.businessArea,
      audience: normalized.audience,
      offerOrAnnouncement: normalized.offerOrAnnouncement,
      productOrReleaseName: normalized.productOrReleaseName,
      keyBenefits: normalized.keyBenefits,
      tone: normalized.tone,
      callToAction: normalized.callToAction,
      link: normalized.link,
      urgency: normalized.urgency,
      senderName: normalized.senderName,
      notes: normalized.notes,
    })
    setAiResponse(normalized.aiResponse)
    setFinalEmail(finalFieldsFromEmailRecord(normalized))
    setEditingId(normalized.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
    toast.success("Email campaign loaded")
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    try {
      await deleteEmailCampaignRecord(pendingDelete.id)
      if (editingId === pendingDelete.id) resetForm()
      setPendingDelete(null)
      toast.success("Email campaign deleted")
    } catch {
      toast.error("Could not delete email campaign from database")
    }
  }

  function handleExport() {
    downloadJson("creatorops-email-campaigns.json", emailCampaignRecords)
    toast.success("Exported email campaign records")
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
          normalizeEmailCampaignRecord(item as EmailCampaignRecord),
        )
        await importEmailCampaignRecords(items)
        toast.success(`Imported ${items.length} record(s) to database`)
      } catch {
        toast.error("Invalid JSON file or import failed")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  async function handleMigrateLocal() {
    const local = loadEmailCampaignRecords()
    if (local.length === 0) {
      toast.error("No email campaigns found in localStorage to migrate")
      return
    }
    setMigrating(true)
    try {
      const { migrated, total } =
        await migrateLocalEmailCampaignRecordsToDatabase(local)
      await reloadEmailCampaignRecords()
      toast.success(
        `Migrated ${migrated} local record(s). Database now has ${total} total.`,
      )
    } catch {
      toast.error("Migration to database failed")
    } finally {
      setMigrating(false)
    }
  }

  const finalEmailText = buildFinalEmailText(form.campaignName, finalEmail)

  return (
    <div className="flex flex-col gap-8">
      <ModulePageHeader
        title="Email Campaign Generator"
        description="Generate, save, and organize email campaigns for music releases, merch drops, product launches, newsletters, and more."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ApplyWorkspaceDefaultsButton
              module="email-campaign"
              form={form}
              setForm={setForm}
            />
            <Button type="button" onClick={handleSave}>
              {editingId ? "Update email campaign" : "Save email campaign"}
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
              sourceRecordType="email-campaign"
              reviewType="Email Campaign"
              label="Review Email Campaign"
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

      <ModuleWorkflowTabs
        tabs={GENERATOR_WORKFLOW_TABS}
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <ModuleTabPanel value="details">
          <Card>
            <CardContent className="pt-6">
              <FormSection
                title="Campaign details"
                description="Describe the email campaign you want to generate"
              >
            {FORM_FIELD_ORDER.map((field) => {
              const id = `email-${field}`
              const label = formatFieldLabel(field)

              if (field === "campaignType") {
                return (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={id}>{label}</Label>
                    <Select
                      value={form.campaignType}
                      onValueChange={(v) => setField("campaignType", v)}
                    >
                      <SelectTrigger id={id} className="w-full">
                        <span className="truncate">{form.campaignType}</span>
                      </SelectTrigger>
                      <SelectContent className="min-w-[280px]">
                        {EMAIL_CAMPAIGN_TYPES.map((type) => (
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
                    <Label htmlFor={id}>{label}</Label>
                    <Select
                      value={form.businessArea}
                      onValueChange={(v) => setField("businessArea", v)}
                    >
                      <SelectTrigger id={id} className="w-full">
                        <span className="truncate">{form.businessArea}</span>
                      </SelectTrigger>
                      <SelectContent className="min-w-[260px]">
                        {EMAIL_BUSINESS_AREAS.map((area) => (
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
                  <Label htmlFor={id}>{label}</Label>
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
                ? "Using Email Campaign Generator from library"
                : "Using built-in fallback template"
            }
            basePrompt={completedPrompt}
            onCopy={handleCopy}
            contextInput={{
              moduleType: "email-campaigns",
              campaigns,
              urlCampaignId: campaignPrefill.campaignId,
              urlCampaignName: campaignPrefill.campaignName,
              formCampaignName: form.campaignName,
            }}
          />
        </ModuleTabPanel>

        <ModuleTabPanel value="ai-response">
          <div className="space-y-4">
            <AIGenerationPanel
              moduleType="Email Campaign"
              promptText={completedPrompt}
              campaignId={campaignPrefill.campaignId}
              campaignName={campaignPrefill.campaignName}
              outputRecordId={editingId ?? undefined}
              outputRecordType="email-campaign"
              onInsertResponse={setAiResponse}
              compact
              templateModuleSlug="email-campaigns"
            />
            <ApplyAIOutputPanel
              moduleType="Email Campaign"
              aiResponse={aiResponse}
              existingValues={finalEmail}
              onApply={(fields) => setFinalEmail((prev) => ({ ...prev, ...fields }))}
              onApplied={() => setActiveTab("final")}
              finalTabLabel="Final Email"
              compact
              qualityReview={{
                reviewType: "Email Campaign",
                campaignId: campaignPrefill.campaignId,
                campaignName: campaignPrefill.campaignName,
                sourceRecordType: "email-campaign",
                recordId: editingId,
              }}
            />
          <OutputSection
            title="AI response"
            description="Paste the response from ChatGPT or generate with AI above"
          >
            <Textarea
              id="email-ai-response"
              value={aiResponse}
              onChange={(e) => setAiResponse(e.target.value)}
              placeholder="Paste AI response here..."
              className="min-h-[min(24rem,50vh)] w-full font-mono text-xs"
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
                  moduleType="Email Campaign"
                  campaignId={campaignPrefill.campaignId}
                  campaignName={campaignPrefill.campaignName}
                  outputRecordId={editingId ?? undefined}
                  promptName="Email Campaign Generator"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Paste your AI output here after running the completed prompt.
              </p>
            )}
          </OutputSection>
          </div>
        </ModuleTabPanel>

        <ModuleTabPanel value="final">
          <OutputSection
            title="Final Email"
            description="Paste or edit your chosen subject lines, body copy, and follow-ups"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFinalEmail}
              >
                Clear final email
              </Button>
            }
          >
              {FINAL_EMAIL_FIELDS.map(({ key, label, copyLabel }) => {
                const value = finalEmail[key]
                const id = `final-${key}`

                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={id}>{label}</Label>
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
                    <Textarea
                      id={id}
                      value={value}
                      onChange={(e) => setFinalField(key, e.target.value)}
                      className="min-h-20 w-full"
                    />
                  </div>
                )
              })}

              {finalEmailText.trim() ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(finalEmailText, "final email")}
                >
                  <Copy className="size-4" />
                  Copy final email
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Fill in final email copy after reviewing the AI response.
                </p>
              )}
          </OutputSection>
        </ModuleTabPanel>

        <ModuleTabPanel value="related">
          <RelationshipPanel
            input={{
              currentType: "email-campaign",
              currentId: editingId,
              campaignId: campaignPrefill.campaignId,
              campaignName: form.campaignName || campaignPrefill.campaignName || undefined,
              productOrReleaseName: form.productOrReleaseName,
            }}
          />
        </ModuleTabPanel>

        <ModuleTabPanel value="saved">
      <Card className={RECENT_RECORDS_CARD_CLASS}>
        <CardHeader className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Recent email campaigns</CardTitle>
            <CardDescription>
              {emailCampaignRecords.length} saved record
              {emailCampaignRecords.length === 1 ? "" : "s"}
              {emailCampaignRecordsUseDatabase
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
                placeholder="Search campaigns..."
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
              {emailCampaignRecords.length === 0
                ? "No email campaigns saved yet. Fill in the form and save your first campaign."
                : "No records match your search."}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredRecords.map((record) => {
                const normalized = normalizeEmailCampaignRecord(record)
                const emailText = buildFinalEmailText(
                  normalized.campaignName,
                  finalFieldsFromEmailRecord(normalized),
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
                        {normalized.campaignType ? (
                          <Badge variant="secondary">
                            {normalized.campaignType}
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
                      {normalized.productOrReleaseName ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {normalized.productOrReleaseName}
                        </p>
                      ) : null}
                      {normalized.finalSubjectLine ? (
                        <p className="mt-1 line-clamp-1 text-sm text-pretty">
                          {normalized.finalSubjectLine}
                        </p>
                      ) : null}
                      {normalized.senderName ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          From: {normalized.senderName}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Updated {formatDate(normalized.updatedAt)}
                        {normalized.createdAt !== normalized.updatedAt
                          ? ` · Created ${formatDate(normalized.createdAt)}`
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
                      {emailText.trim() ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(emailText, "final email")
                          }
                        >
                          <Copy className="size-4" />
                          Final
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
                        aria-label="Delete email campaign"
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
            <DialogTitle>Delete email campaign?</DialogTitle>
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
