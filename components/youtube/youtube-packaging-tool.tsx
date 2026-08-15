"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  Copy,
  Download,
  Eye,
  Search,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { useStore, createId } from "@/lib/store"
import type { YouTubePackage, YouTubePackageFormValues } from "@/lib/types"
import { PRIMARY_GOALS, VIDEO_TYPES } from "@/lib/types"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import { downloadJson } from "@/lib/storage"
import {
  buildFinalPackageText,
  buildYouTubeCompletedPrompt,
  emptyFinalPackageFields,
  emptyYouTubePackageForm,
  finalFieldsFromPackage,
  getYouTubeMetadataTemplate,
  normalizeYouTubePackage,
  type YouTubePackageFinalFields,
} from "@/lib/youtube-packaging"
import { variableToLabel } from "@/lib/prompt-variables"

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
  "targetListener",
  "visualTheme",
  "merchTieIn",
  "keywords",
  "notes",
])

const FINAL_PACKAGE_FIELDS: {
  key: keyof YouTubePackageFinalFields
  label: string
  multiline: boolean
  copyLabel: string
}[] = [
  { key: "finalTitle", label: "Final title", multiline: false, copyLabel: "title" },
  {
    key: "finalDescription",
    label: "Final description",
    multiline: true,
    copyLabel: "description",
  },
  { key: "finalTags", label: "Final tags", multiline: true, copyLabel: "tags" },
  {
    key: "finalHashtags",
    label: "Final hashtags",
    multiline: false,
    copyLabel: "hashtags",
  },
  {
    key: "finalPinnedComment",
    label: "Final pinned comment",
    multiline: true,
    copyLabel: "pinned comment",
  },
  {
    key: "finalThumbnailText",
    label: "Final thumbnail text",
    multiline: false,
    copyLabel: "thumbnail text",
  },
  {
    key: "finalShortsCaption",
    label: "Final Shorts caption",
    multiline: true,
    copyLabel: "Shorts caption",
  },
  {
    key: "finalCommunityPost",
    label: "Final Community post",
    multiline: true,
    copyLabel: "Community post",
  },
]

export function YouTubePackagingTool() {
  const {
    prompts,
    youtubePackages,
    addYouTubePackage,
    updateYouTubePackage,
    deleteYouTubePackage,
    importYouTubePackages,
  } = useStore()

  const [form, setForm] = React.useState<YouTubePackageFormValues>(
    emptyYouTubePackageForm(),
  )
  const [aiResponse, setAiResponse] = React.useState("")
  const [finalPackage, setFinalPackage] = React.useState<YouTubePackageFinalFields>(
    emptyFinalPackageFields(),
  )
  const [editingId, setEditingId] = React.useState<string | null>(null)

  const [packageSearch, setPackageSearch] = React.useState("")
  const [pendingDelete, setPendingDelete] = React.useState<YouTubePackage | null>(
    null,
  )
  const [viewingPackage, setViewingPackage] = React.useState<YouTubePackage | null>(
    null,
  )
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [prefillApplied, setPrefillApplied] = React.useState(false)
  const searchParams = useSearchParams()

  const template = React.useMemo(
    () => getYouTubeMetadataTemplate(prompts),
    [prompts],
  )

  const completedPrompt = React.useMemo(
    () => buildYouTubeCompletedPrompt(template, form),
    [template, form],
  )

  const usingSavedTemplate = React.useMemo(
    () =>
      prompts.some(
        (p) =>
          p.id === "p-yt-metadata" ||
          p.name === "YouTube Metadata Generator",
      ),
    [prompts],
  )

  const filteredPackages = React.useMemo(() => {
    const q = packageSearch.trim().toLowerCase()
    const sorted = [...youtubePackages].sort((a, b) => b.updatedAt - a.updatedAt)
    if (!q) return sorted
    return sorted.filter(
      (p) =>
        p.trackTitle.toLowerCase().includes(q) ||
        p.artistName.toLowerCase().includes(q) ||
        p.genre.toLowerCase().includes(q) ||
        p.channelName.toLowerCase().includes(q),
    )
  }, [youtubePackages, packageSearch])

  function setField<K extends keyof YouTubePackageFormValues>(
    key: K,
    value: YouTubePackageFormValues[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setForm(emptyYouTubePackageForm())
    setAiResponse("")
    setFinalPackage(emptyFinalPackageFields())
    setEditingId(null)
  }

  function clearFinalPackage() {
    setFinalPackage(emptyFinalPackageFields())
    toast.success("Final package cleared")
  }

  function setFinalField<K extends keyof YouTubePackageFinalFields>(
    key: K,
    value: YouTubePackageFinalFields[K],
  ) {
    setFinalPackage((prev) => ({ ...prev, [key]: value }))
  }

  async function handleCopy(text: string, label: string) {
    try {
      await copyToClipboard(text)
      toast.success(`Copied ${label}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not copy")
    }
  }

  function handleSavePackage() {
    const now = Date.now()
    const pkg = normalizeYouTubePackage({
      id: editingId ?? createId("ytpkg"),
      ...form,
      completedPrompt,
      aiResponse,
      ...finalPackage,
      createdAt: editingId
        ? (youtubePackages.find((p) => p.id === editingId)?.createdAt ?? now)
        : now,
      updatedAt: now,
    })

    if (editingId) {
      updateYouTubePackage(pkg)
      toast.success("Package updated")
    } else {
      addYouTubePackage(pkg)
      setEditingId(pkg.id)
      toast.success("Package saved")
    }
  }

  function openPackage(pkg: YouTubePackage) {
    const normalized = normalizeYouTubePackage(pkg)
    setForm({
      trackTitle: normalized.trackTitle,
      artistName: normalized.artistName,
      channelName: normalized.channelName,
      genre: normalized.genre,
      mood: normalized.mood,
      targetListener: normalized.targetListener,
      visualTheme: normalized.visualTheme,
      primaryGoal: normalized.primaryGoal,
      merchTieIn: normalized.merchTieIn,
      streamingLink: normalized.streamingLink,
      releaseDate: normalized.releaseDate,
      videoType: normalized.videoType,
      keywords: normalized.keywords,
      notes: normalized.notes,
    })
    setAiResponse(normalized.aiResponse)
    setFinalPackage(finalFieldsFromPackage(normalized))
    setEditingId(normalized.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
    toast.success("Package loaded")
  }

  // Prefill once from artist-CRM query params. Applied during render (not an
  // effect) so the state update stays synchronous with the initial paint;
  // the toast is the only real side effect, so it's the only part left in
  // an effect, and that effect never calls a state setter.
  if (!prefillApplied) {
    const artistName = searchParams.get("artistName")
    const trackTitle = searchParams.get("trackTitle")
    const genre = searchParams.get("genre")
    const mood = searchParams.get("mood")
    const visualTheme = searchParams.get("visualTheme")
    const channelName = searchParams.get("channelName")
    const targetListener = searchParams.get("targetListener")
    const releaseDate = searchParams.get("releaseDate")
    const streamingLink = searchParams.get("streamingLink")

    if (
      artistName ||
      trackTitle ||
      genre ||
      mood ||
      visualTheme ||
      channelName ||
      targetListener ||
      releaseDate ||
      streamingLink
    ) {
      setPrefillApplied(true)
      setForm((prev) => ({
        ...prev,
        artistName: artistName ?? prev.artistName,
        trackTitle: trackTitle ?? prev.trackTitle,
        genre: genre ?? prev.genre,
        mood: mood ?? prev.mood,
        visualTheme: visualTheme ?? prev.visualTheme,
        channelName: channelName ?? prev.channelName,
        targetListener: targetListener ?? prev.targetListener,
        releaseDate: releaseDate ?? prev.releaseDate,
        streamingLink: streamingLink ?? prev.streamingLink,
      }))
    }
  }

  React.useEffect(() => {
    if (prefillApplied) toast.success("Prefilled from artist CRM")
  }, [prefillApplied])

  function confirmDelete() {
    if (!pendingDelete) return
    deleteYouTubePackage(pendingDelete.id)
    if (editingId === pendingDelete.id) resetForm()
    setPendingDelete(null)
    toast.success("Package deleted")
  }

  function handleExport() {
    downloadJson("creatorops-youtube-packages.json", youtubePackages)
    toast.success("Exported YouTube packages")
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        const items = (Array.isArray(parsed) ? parsed : [parsed]).map(
          (item) => normalizeYouTubePackage(item as YouTubePackage),
        )
        importYouTubePackages(items)
        toast.success(`Imported ${items.length} package(s)`)
      } catch {
        toast.error("Invalid JSON file")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const finalPackageText = buildFinalPackageText(finalPackage)

  const formFields: (keyof YouTubePackageFormValues)[] = [
    "trackTitle",
    "artistName",
    "channelName",
    "genre",
    "mood",
    "targetListener",
    "visualTheme",
    "primaryGoal",
    "merchTieIn",
    "streamingLink",
    "releaseDate",
    "videoType",
    "keywords",
    "notes",
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="YouTube Packaging"
        description="Generate, save, and organize YouTube upload metadata for AI music videos."
        action={
          editingId ? (
            <Button type="button" variant="outline" onClick={resetForm}>
              New package
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left — form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Track details</CardTitle>
            <CardDescription>
              Fill in release info to build your metadata prompt
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formFields.map((field) => {
              const id = `yt-${field}`
              const label = variableToLabel(field)

              if (field === "videoType") {
                return (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={id} className="text-sm font-medium">
                      Video type
                    </Label>
                    <Select
                      value={form.videoType}
                      onValueChange={(v) => v !== null && setField("videoType", v)}
                    >
                      <SelectTrigger id={id} className="w-full">
                        <span className="truncate">{form.videoType}</span>
                      </SelectTrigger>
                      <SelectContent className="min-w-[260px]">
                        {VIDEO_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              }

              if (field === "primaryGoal") {
                return (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={id} className="text-sm font-medium">
                      Primary goal
                    </Label>
                    <Select
                      value={form.primaryGoal}
                      onValueChange={(v) => v !== null && setField("primaryGoal", v)}
                    >
                      <SelectTrigger id={id} className="w-full">
                        <span className="truncate">{form.primaryGoal}</span>
                      </SelectTrigger>
                      <SelectContent className="min-w-[260px]">
                        {PRIMARY_GOALS.map((goal) => (
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
                    <Input {...commonProps} />
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Right — preview & outputs */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">Completed prompt</CardTitle>
                <CardDescription>
                  {usingSavedTemplate
                    ? "Using YouTube Metadata Generator from library"
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
                {completedPrompt || "Fill in track details to generate a prompt."}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI response</CardTitle>
              <CardDescription>
                Paste the metadata response from ChatGPT
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="yt-ai-response" className="text-sm font-medium">
                  AI response
                </Label>
                <Textarea
                  id="yt-ai-response"
                  value={aiResponse}
                  onChange={(e) => setAiResponse(e.target.value)}
                  placeholder="Paste the AI-generated metadata here..."
                  className="min-h-36 w-full font-mono text-xs"
                />
              </div>
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
                <CardTitle className="text-base">Final Package</CardTitle>
                <CardDescription>
                  Paste or edit your chosen upload metadata
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFinalPackage}
              >
                Clear Final Package
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {FINAL_PACKAGE_FIELDS.map(({ key, label, multiline, copyLabel }) => {
                const value = finalPackage[key]
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

              {finalPackageText.trim() ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleCopy(finalPackageText, "final package")
                  }
                >
                  <Copy className="size-4" />
                  Copy final package
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Button type="button" className="w-full" onClick={handleSavePackage}>
            {editingId ? "Update package" : "Save package"}
          </Button>
        </div>
      </div>

      {/* Recent packages */}
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Recent packages</CardTitle>
            <CardDescription>
              Search, reopen, copy, or delete saved YouTube packages
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImport}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              Import
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={youtubePackages.length === 0}
            >
              <Download className="size-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={packageSearch}
              onChange={(e) => setPackageSearch(e.target.value)}
              placeholder="Search by track, artist, genre, channel..."
              className="pl-9"
            />
          </div>

          {filteredPackages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {youtubePackages.length === 0
                ? "No saved packages yet. Fill in the form and save your first package."
                : "No packages match your search."}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredPackages.map((pkg) => {
                const normalized = normalizeYouTubePackage(pkg)
                const finalText = buildFinalPackageText(
                  finalFieldsFromPackage(normalized),
                )

                return (
                <div
                  key={normalized.id}
                  className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <button
                    type="button"
                    onClick={() => openPackage(normalized)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {normalized.trackTitle || "Untitled track"}
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
                    {normalized.finalTitle ? (
                      <p className="mt-1 text-sm font-medium text-pretty">
                        Final title: {normalized.finalTitle}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {normalized.channelName ? `${normalized.channelName} · ` : ""}
                      {formatDate(normalized.updatedAt)}
                      {normalized.videoType ? ` · ${normalized.videoType}` : ""}
                    </p>
                  </button>
                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingPackage(normalized)}
                    >
                      <Eye className="size-4" />
                      View
                    </Button>
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
                    {normalized.finalCommunityPost.trim() ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(
                            normalized.finalCommunityPost,
                            "Community post",
                          )
                        }
                      >
                        <Copy className="size-4" />
                        Community
                      </Button>
                    ) : null}
                    {finalText.trim() ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(finalText, "final package")
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
                      onClick={() => openPackage(normalized)}
                    >
                      Open
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => setPendingDelete(normalized)}
                      aria-label="Delete package"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              )})}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!viewingPackage}
        onOpenChange={(open) => !open && setViewingPackage(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {viewingPackage?.trackTitle || "Package details"}
            </DialogTitle>
            <DialogDescription>
              {viewingPackage?.artistName
                ? `${viewingPackage.artistName} · ${viewingPackage.genre || "No genre"}`
                : "Saved YouTube package"}
            </DialogDescription>
          </DialogHeader>
          {viewingPackage ? (
            <div className="space-y-4 text-sm">
              {FINAL_PACKAGE_FIELDS.map(({ key, label }) => {
                const value = finalFieldsFromPackage(viewingPackage)[key]
                if (!value.trim()) return null
                return (
                  <div key={key} className="space-y-1">
                    <p className="font-medium">{label}</p>
                    <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-xs leading-relaxed">
                      {value}
                    </pre>
                  </div>
                )
              })}
              {!FINAL_PACKAGE_FIELDS.some(({ key }) =>
                finalFieldsFromPackage(viewingPackage)[key].trim(),
              ) ? (
                <p className="text-muted-foreground">
                  No final package fields saved yet.
                </p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Close
            </DialogClose>
            {viewingPackage?.finalCommunityPost.trim() ? (
              <Button
                onClick={() =>
                  handleCopy(
                    viewingPackage.finalCommunityPost,
                    "Community post",
                  )
                }
              >
                <Copy className="size-4" />
                Copy Community Post
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete package?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `"${pendingDelete.trackTitle || "Untitled"}" will be permanently removed.`
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
