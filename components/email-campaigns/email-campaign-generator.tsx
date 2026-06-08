"use client"

import * as React from "react"
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

import { PageHeader } from "@/components/app-shell"
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
  } = useStore()

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
    } catch {
      toast.error("Could not save email campaign to database")
    }
  }

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
        const parsed = JSON.parse(String(reader.result))
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Email Campaign Generator"
        description="Generate, save, and organize email campaigns for music releases, merch drops, product launches, newsletters, and more."
        action={
          editingId ? (
            <Button type="button" variant="outline" onClick={resetForm}>
              New campaign
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign details</CardTitle>
            <CardDescription>
              Describe the email campaign you want to generate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {FORM_FIELD_ORDER.map((field) => {
              const id = `email-${field}`
              const label = FIELD_LABELS[field]

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
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">Completed prompt</CardTitle>
                <CardDescription>
                  {usingSavedTemplate
                    ? "Using Email Campaign Generator from library"
                    : "Using built-in fallback template"}
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={!completedPrompt.trim()}
                onClick={() => handleCopy(completedPrompt, "prompt")}
              >
                <Copy className="size-4" />
                Copy prompt
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
                {completedPrompt || "Fill in the form to preview your prompt."}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI response</CardTitle>
              <CardDescription>
                Paste the response from ChatGPT or your AI tool
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                id="email-ai-response"
                value={aiResponse}
                onChange={(e) => setAiResponse(e.target.value)}
                placeholder="Paste AI response here..."
                className="min-h-40 w-full font-mono text-xs"
              />
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">Final Email</CardTitle>
                <CardDescription>
                  Paste or edit your chosen subject lines, body copy, and
                  follow-ups
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFinalEmail}
              >
                Clear final email
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
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
              ) : null}
            </CardContent>
          </Card>

          <Button type="button" onClick={handleSave}>
            {editingId ? "Update email campaign" : "Save email campaign"}
          </Button>
        </div>
      </div>

      <Card>
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
