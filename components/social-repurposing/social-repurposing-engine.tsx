"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  Copy,
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
import { downloadJson } from "@/lib/storage"
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
  DialogClose,
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
    addSocialRepurposingRecord,
    updateSocialRepurposingRecord,
    deleteSocialRepurposingRecord,
    importSocialRepurposingRecords,
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
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [prefillApplied, setPrefillApplied] = React.useState(false)
  const searchParams = useSearchParams()

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

  function handleSaveRecord() {
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

    if (editingId) {
      updateSocialRepurposingRecord(record)
      toast.success("Social content updated")
    } else {
      addSocialRepurposingRecord(record)
      setEditingId(record.id)
      toast.success("Social content saved")
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

  // Prefill once from artist-CRM query params. Applied during render (not an
  // effect) so the state update stays synchronous with the initial paint;
  // the toast is the only real side effect, so it's the only part left in
  // an effect, and that effect never calls a state setter.
  if (!prefillApplied) {
    const campaignName = searchParams.get("campaignName")
    const audience = searchParams.get("audience")
    const tone = searchParams.get("tone")
    const sourceContent = searchParams.get("sourceContent")
    const productOrReleaseLink = searchParams.get("productOrReleaseLink")

    if (campaignName || audience || tone || sourceContent || productOrReleaseLink) {
      setPrefillApplied(true)
      setForm((prev) => ({
        ...prev,
        campaignName: campaignName ?? prev.campaignName,
        audience: audience ?? prev.audience,
        tone: tone ?? prev.tone,
        sourceContent: sourceContent ?? prev.sourceContent,
        productOrReleaseLink: productOrReleaseLink ?? prev.productOrReleaseLink,
      }))
    }
  }

  React.useEffect(() => {
    if (prefillApplied) toast.success("Prefilled from artist CRM")
  }, [prefillApplied])

  function confirmDelete() {
    if (!pendingDelete) return
    deleteSocialRepurposingRecord(pendingDelete.id)
    if (editingId === pendingDelete.id) resetForm()
    setPendingDelete(null)
    toast.success("Social content deleted")
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
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        const items = (Array.isArray(parsed) ? parsed : [parsed]).map(
          (item) =>
            normalizeSocialRepurposingRecord(item as SocialRepurposingRecord),
        )
        importSocialRepurposingRecords(items)
        toast.success(`Imported ${items.length} record(s)`)
      } catch {
        toast.error("Invalid JSON file")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const finalContentText = buildFinalContentText(
    form.campaignName,
    finalContent,
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Social Repurposing Engine"
        description="Turn one source idea into platform-specific content for TikTok, Instagram, X, YouTube, and email."
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
            <CardTitle className="text-base">Source details</CardTitle>
            <CardDescription>
              Describe the source content and campaign to build your prompt
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                      onValueChange={(v) => v !== null && setField("contentType", v)}
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
                      onValueChange={(v) => v !== null && setField("businessArea", v)}
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
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">Completed prompt</CardTitle>
                <CardDescription>
                  {usingSavedTemplate
                    ? "Using Social Repurposing Engine from library"
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
                id="social-ai-response"
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
                <CardTitle className="text-base">Final Content</CardTitle>
                <CardDescription>
                  Paste or edit your platform-specific content
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFinalContent}
              >
                Clear final content
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSaveRecord}>
              {editingId ? "Update social content" : "Save social content"}
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Recent social content</CardTitle>
            <CardDescription>
              {socialRepurposingRecords.length} saved record
              {socialRepurposingRecords.length === 1 ? "" : "s"}
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
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
