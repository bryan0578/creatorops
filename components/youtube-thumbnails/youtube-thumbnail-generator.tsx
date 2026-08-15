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
  YouTubeThumbnailFormValues,
  YouTubeThumbnailRecord,
} from "@/lib/types"
import {
  THUMBNAIL_CONTENT_FORMATS,
  THUMBNAIL_CTA_GOALS,
  THUMBNAIL_VIDEO_TYPES,
} from "@/lib/types"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import { downloadJson } from "@/lib/storage"
import {
  buildFinalThumbnailText,
  buildYouTubeThumbnailCompletedPrompt,
  emptyFinalThumbnailFields,
  emptyYouTubeThumbnailForm,
  finalFieldsFromThumbnailRecord,
  getYouTubeThumbnailTemplate,
  normalizeYouTubeThumbnailRecord,
  YOUTUBE_THUMBNAIL_PROMPT_ID,
  YOUTUBE_THUMBNAIL_PROMPT_NAME,
  type YouTubeThumbnailFinalFields,
} from "@/lib/youtube-thumbnails"

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
  "mood",
  "targetAudience",
  "visualTheme",
  "hookAngle",
  "mainSubject",
  "textOverlay",
  "colorDirection",
  "brandingNotes",
  "referenceStyle",
  "notes",
])

const FIELD_LABELS: Record<keyof YouTubeThumbnailFormValues, string> = {
  trackTitle: "Track title",
  artistName: "Artist name",
  videoTitle: "Video title",
  contentFormat: "Content format",
  videoType: "Video type",
  genre: "Genre",
  mood: "Mood",
  targetAudience: "Target audience",
  visualTheme: "Visual theme",
  hookAngle: "Hook angle",
  mainSubject: "Main subject",
  textOverlay: "Text overlay",
  colorDirection: "Color direction",
  brandingNotes: "Branding notes",
  referenceStyle: "Reference style",
  ctaGoal: "CTA goal",
  notes: "Notes",
}

const FORM_FIELD_ORDER: (keyof YouTubeThumbnailFormValues)[] = [
  "trackTitle",
  "artistName",
  "videoTitle",
  "contentFormat",
  "videoType",
  "genre",
  "mood",
  "targetAudience",
  "visualTheme",
  "hookAngle",
  "mainSubject",
  "textOverlay",
  "colorDirection",
  "brandingNotes",
  "referenceStyle",
  "ctaGoal",
  "notes",
]

const FINAL_THUMBNAIL_FIELDS: {
  key: keyof YouTubeThumbnailFinalFields
  label: string
  copyLabel: string
}[] = [
  { key: "finalConcept", label: "Final concept", copyLabel: "concept" },
  {
    key: "finalTextOverlay",
    label: "Final text overlay",
    copyLabel: "text overlay",
  },
  {
    key: "finalComposition",
    label: "Final composition",
    copyLabel: "composition",
  },
  {
    key: "finalColorDirection",
    label: "Final color direction",
    copyLabel: "color direction",
  },
  {
    key: "finalImagePrompt",
    label: "Final image prompt",
    copyLabel: "image prompt",
  },
  {
    key: "finalAltVariation",
    label: "Final alternate variation",
    copyLabel: "alternate variation",
  },
  {
    key: "finalShortsVersion",
    label: "Final shorts version",
    copyLabel: "shorts version",
  },
]

export function YouTubeThumbnailGenerator() {
  const {
    prompts,
    youtubeThumbnailRecords,
    addYouTubeThumbnailRecord,
    updateYouTubeThumbnailRecord,
    deleteYouTubeThumbnailRecord,
    importYouTubeThumbnailRecords,
  } = useStore()

  const [form, setForm] = React.useState<YouTubeThumbnailFormValues>(
    emptyYouTubeThumbnailForm(),
  )
  const [aiResponse, setAiResponse] = React.useState("")
  const [finalThumbnail, setFinalThumbnail] =
    React.useState<YouTubeThumbnailFinalFields>(emptyFinalThumbnailFields())
  const [editingId, setEditingId] = React.useState<string | null>(null)

  const [recordSearch, setRecordSearch] = React.useState("")
  const [pendingDelete, setPendingDelete] =
    React.useState<YouTubeThumbnailRecord | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [prefillApplied, setPrefillApplied] = React.useState(false)
  const [prefillNotice, setPrefillNotice] = React.useState<
    "record" | "fields" | null
  >(null)
  const searchParams = useSearchParams()

  const template = React.useMemo(
    () => getYouTubeThumbnailTemplate(prompts),
    [prompts],
  )

  const completedPrompt = React.useMemo(
    () => buildYouTubeThumbnailCompletedPrompt(template, form),
    [template, form],
  )

  const usingSavedTemplate = React.useMemo(
    () =>
      prompts.some(
        (p) =>
          p.id === YOUTUBE_THUMBNAIL_PROMPT_ID ||
          p.name === YOUTUBE_THUMBNAIL_PROMPT_NAME,
      ),
    [prompts],
  )

  const filteredRecords = React.useMemo(() => {
    const q = recordSearch.trim().toLowerCase()
    const sorted = [...youtubeThumbnailRecords].sort(
      (a, b) => b.updatedAt - a.updatedAt,
    )
    if (!q) return sorted
    return sorted.filter(
      (record) =>
        record.trackTitle.toLowerCase().includes(q) ||
        record.artistName.toLowerCase().includes(q) ||
        record.videoTitle.toLowerCase().includes(q) ||
        record.contentFormat.toLowerCase().includes(q) ||
        record.genre.toLowerCase().includes(q) ||
        record.videoType.toLowerCase().includes(q) ||
        record.hookAngle.toLowerCase().includes(q),
    )
  }, [youtubeThumbnailRecords, recordSearch])

  function setField<K extends keyof YouTubeThumbnailFormValues>(
    key: K,
    value: YouTubeThumbnailFormValues[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setForm(emptyYouTubeThumbnailForm())
    setAiResponse("")
    setFinalThumbnail(emptyFinalThumbnailFields())
    setEditingId(null)
  }

  function clearFinalThumbnail() {
    setFinalThumbnail(emptyFinalThumbnailFields())
    toast.success("Final thumbnail cleared")
  }

  function setFinalField<K extends keyof YouTubeThumbnailFinalFields>(
    key: K,
    value: YouTubeThumbnailFinalFields[K],
  ) {
    setFinalThumbnail((prev) => ({ ...prev, [key]: value }))
  }

  async function handleCopy(text: string, label: string) {
    try {
      await copyToClipboard(text)
      toast.success(`Copied ${label}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not copy")
    }
  }

  function handleSave() {
    const now = Date.now()
    const record = normalizeYouTubeThumbnailRecord({
      id: editingId ?? createId("thumbnail"),
      ...form,
      completedPrompt,
      aiResponse,
      ...finalThumbnail,
      createdAt: editingId
        ? (youtubeThumbnailRecords.find((r) => r.id === editingId)
            ?.createdAt ?? now)
        : now,
      updatedAt: now,
    })

    if (editingId) {
      updateYouTubeThumbnailRecord(record)
      toast.success("Thumbnail updated")
    } else {
      addYouTubeThumbnailRecord(record)
      setEditingId(record.id)
      toast.success("Thumbnail saved")
    }
  }

  function openRecord(record: YouTubeThumbnailRecord) {
    const normalized = normalizeYouTubeThumbnailRecord(record)
    setForm({
      trackTitle: normalized.trackTitle,
      artistName: normalized.artistName,
      videoTitle: normalized.videoTitle,
      contentFormat: normalized.contentFormat,
      videoType: normalized.videoType,
      genre: normalized.genre,
      mood: normalized.mood,
      targetAudience: normalized.targetAudience,
      visualTheme: normalized.visualTheme,
      hookAngle: normalized.hookAngle,
      mainSubject: normalized.mainSubject,
      textOverlay: normalized.textOverlay,
      colorDirection: normalized.colorDirection,
      brandingNotes: normalized.brandingNotes,
      referenceStyle: normalized.referenceStyle,
      ctaGoal: normalized.ctaGoal,
      notes: normalized.notes,
    })
    setAiResponse(normalized.aiResponse)
    setFinalThumbnail(finalFieldsFromThumbnailRecord(normalized))
    setEditingId(normalized.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
    toast.success("Thumbnail loaded")
  }

  // Prefill once from either an existing record (?recordId) or loose
  // artist-CRM query params. Applied during render (not an effect) so the
  // state updates stay synchronous with the paint they belong to; the
  // toast/scroll are real side effects, so they're deferred to a small
  // effect below that only reacts to `prefillNotice` and never calls a
  // state setter itself.
  if (!prefillApplied) {
    const recordId = searchParams.get("recordId")
    const matchedRecord =
      recordId && youtubeThumbnailRecords.length > 0
        ? youtubeThumbnailRecords.find((r) => r.id === recordId)
        : undefined

    if (matchedRecord) {
      setPrefillApplied(true)
      const normalized = normalizeYouTubeThumbnailRecord(matchedRecord)
      setForm({
        trackTitle: normalized.trackTitle,
        artistName: normalized.artistName,
        videoTitle: normalized.videoTitle,
        contentFormat: normalized.contentFormat,
        videoType: normalized.videoType,
        genre: normalized.genre,
        mood: normalized.mood,
        targetAudience: normalized.targetAudience,
        visualTheme: normalized.visualTheme,
        hookAngle: normalized.hookAngle,
        mainSubject: normalized.mainSubject,
        textOverlay: normalized.textOverlay,
        colorDirection: normalized.colorDirection,
        brandingNotes: normalized.brandingNotes,
        referenceStyle: normalized.referenceStyle,
        ctaGoal: normalized.ctaGoal,
        notes: normalized.notes,
      })
      setAiResponse(normalized.aiResponse)
      setFinalThumbnail(finalFieldsFromThumbnailRecord(normalized))
      setEditingId(normalized.id)
      setPrefillNotice("record")
    } else {
      const artistName = searchParams.get("artistName")
      const trackTitle = searchParams.get("trackTitle")
      const videoTitle = searchParams.get("videoTitle")
      const genre = searchParams.get("genre")
      const mood = searchParams.get("mood")
      const visualTheme = searchParams.get("visualTheme")

      if (artistName || trackTitle || videoTitle || genre || mood || visualTheme) {
        setPrefillApplied(true)
        setForm((prev) => ({
          ...prev,
          artistName: artistName ?? prev.artistName,
          trackTitle: trackTitle ?? prev.trackTitle,
          videoTitle: videoTitle ?? prev.videoTitle,
          genre: genre ?? prev.genre,
          mood: mood ?? prev.mood,
          visualTheme: visualTheme ?? prev.visualTheme,
        }))
        setPrefillNotice("fields")
      }
    }
  }

  React.useEffect(() => {
    if (prefillNotice === "record") {
      window.scrollTo({ top: 0, behavior: "smooth" })
      toast.success("Thumbnail loaded")
    } else if (prefillNotice === "fields") {
      toast.success("Prefilled from artist CRM")
    }
  }, [prefillNotice])

  function confirmDelete() {
    if (!pendingDelete) return
    deleteYouTubeThumbnailRecord(pendingDelete.id)
    if (editingId === pendingDelete.id) resetForm()
    setPendingDelete(null)
    toast.success("Thumbnail deleted")
  }

  function handleExport() {
    downloadJson(
      "creatorops-youtube-thumbnails.json",
      youtubeThumbnailRecords,
    )
    toast.success("Exported thumbnail records")
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        const items = (Array.isArray(parsed) ? parsed : [parsed]).map((item) =>
          normalizeYouTubeThumbnailRecord(item as YouTubeThumbnailRecord),
        )
        importYouTubeThumbnailRecords(items)
        toast.success(`Imported ${items.length} record(s)`)
      } catch {
        toast.error("Invalid JSON file")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const finalThumbnailText = buildFinalThumbnailText(
    {
      trackTitle: form.trackTitle,
      artistName: form.artistName,
      videoTitle: form.videoTitle,
      contentFormat: form.contentFormat,
      videoType: form.videoType,
    },
    finalThumbnail,
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="YouTube Thumbnail Generator"
        description="Generate, save, and organize thumbnail concepts for standard YouTube videos and Shorts covers."
        action={
          editingId ? (
            <Button type="button" variant="outline" onClick={resetForm}>
              New thumbnail
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thumbnail details</CardTitle>
            <CardDescription>
              Describe the video, visual direction, and thumbnail goals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {FORM_FIELD_ORDER.map((field) => {
              const id = `thumbnail-${field}`
              const label = FIELD_LABELS[field]

              if (field === "contentFormat") {
                return (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={id}>{label}</Label>
                    <Select
                      value={form.contentFormat}
                      onValueChange={(v) => v !== null && setField("contentFormat", v)}
                    >
                      <SelectTrigger id={id} className="w-full">
                        <span className="truncate">{form.contentFormat}</span>
                      </SelectTrigger>
                      <SelectContent className="min-w-[280px]">
                        {THUMBNAIL_CONTENT_FORMATS.map((format) => (
                          <SelectItem key={format} value={format}>
                            {format}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              }

              if (field === "videoType") {
                return (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={id}>{label}</Label>
                    <Select
                      value={form.videoType}
                      onValueChange={(v) => v !== null && setField("videoType", v)}
                    >
                      <SelectTrigger id={id} className="w-full">
                        <span className="truncate">{form.videoType}</span>
                      </SelectTrigger>
                      <SelectContent className="min-w-[260px]">
                        {THUMBNAIL_VIDEO_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              }

              if (field === "ctaGoal") {
                return (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={id}>{label}</Label>
                    <Select
                      value={form.ctaGoal}
                      onValueChange={(v) => v !== null && setField("ctaGoal", v)}
                    >
                      <SelectTrigger id={id} className="w-full">
                        <span className="truncate">{form.ctaGoal}</span>
                      </SelectTrigger>
                      <SelectContent className="min-w-[280px]">
                        {THUMBNAIL_CTA_GOALS.map((goal) => (
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
                  e: React.ChangeEvent<
                    HTMLInputElement | HTMLTextAreaElement
                  >,
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
                    ? "Using YouTube Thumbnail Generator from library"
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
                id="thumbnail-ai-response"
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
                <CardTitle className="text-base">Final Thumbnail</CardTitle>
                <CardDescription>
                  Paste or edit your chosen concept, composition, and image
                  prompt
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFinalThumbnail}
              >
                Clear final thumbnail
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {FINAL_THUMBNAIL_FIELDS.map(({ key, label, copyLabel }) => {
                const value = finalThumbnail[key]
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

              {finalThumbnailText.trim() ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleCopy(finalThumbnailText, "final thumbnail")
                  }
                >
                  <Copy className="size-4" />
                  Copy final thumbnail
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Button type="button" onClick={handleSave}>
            {editingId ? "Update thumbnail" : "Save thumbnail"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Recent thumbnails</CardTitle>
            <CardDescription>
              {youtubeThumbnailRecords.length} saved record
              {youtubeThumbnailRecords.length === 1 ? "" : "s"}
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-56">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={recordSearch}
                onChange={(e) => setRecordSearch(e.target.value)}
                placeholder="Search thumbnails..."
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
              {youtubeThumbnailRecords.length === 0
                ? "No thumbnails saved yet. Fill in the form and save your first project."
                : "No records match your search."}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredRecords.map((record) => {
                const normalized = normalizeYouTubeThumbnailRecord(record)
                const thumbnailText = buildFinalThumbnailText(
                  {
                    trackTitle: normalized.trackTitle,
                    artistName: normalized.artistName,
                    videoTitle: normalized.videoTitle,
                    contentFormat: normalized.contentFormat,
                    videoType: normalized.videoType,
                  },
                  finalFieldsFromThumbnailRecord(normalized),
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
                          {normalized.trackTitle ||
                            normalized.videoTitle ||
                            "Untitled thumbnail"}
                        </p>
                        {normalized.contentFormat ? (
                          <Badge variant="secondary">
                            {normalized.contentFormat}
                          </Badge>
                        ) : null}
                        {normalized.videoType ? (
                          <Badge variant="outline">
                            {normalized.videoType}
                          </Badge>
                        ) : null}
                        {editingId === normalized.id ? (
                          <Badge variant="outline" className="text-xs">
                            Editing
                          </Badge>
                        ) : null}
                      </div>
                      {normalized.artistName ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {normalized.artistName}
                          {normalized.genre ? ` · ${normalized.genre}` : ""}
                        </p>
                      ) : null}
                      {normalized.hookAngle ? (
                        <p className="mt-1 line-clamp-1 text-sm text-pretty">
                          {normalized.hookAngle}
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
                      {thumbnailText.trim() ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(thumbnailText, "final thumbnail")
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
                        aria-label="Delete thumbnail"
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
            <DialogTitle>Delete thumbnail?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `"${pendingDelete.trackTitle || pendingDelete.videoTitle || "Untitled"}" will be permanently removed.`
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
