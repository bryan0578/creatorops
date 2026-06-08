"use client"

import * as React from "react"
import {
  Copy,
  Download,
  Search,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { useStore, createId } from "@/lib/store"
import type { MockupPromptFormValues, MockupPromptRecord } from "@/lib/types"
import {
  MOCKUP_ASPECT_RATIOS,
  MOCKUP_PLATFORM_USES,
  MOCKUP_TYPES,
} from "@/lib/types"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import { downloadJson } from "@/lib/storage"
import {
  buildFinalMockupPromptText,
  buildMockupPromptCompletedPrompt,
  emptyFinalMockupPromptFields,
  emptyMockupPromptForm,
  finalFieldsFromMockupRecord,
  getMockupPromptTemplate,
  normalizeMockupPromptRecord,
  type MockupPromptFinalFields,
} from "@/lib/mockup-prompts"

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
  "audience",
  "designConcept",
  "visualStyle",
  "colors",
  "setting",
  "modelDescription",
  "lighting",
  "mood",
  "textToInclude",
  "textToAvoid",
  "brandNotes",
  "notes",
])

const FIELD_LABELS: Record<keyof MockupPromptFormValues, string> = {
  projectName: "Project name",
  mockupType: "Mockup type",
  productType: "Product type",
  niche: "Niche",
  audience: "Audience",
  designConcept: "Design concept",
  visualStyle: "Visual style",
  colors: "Colors",
  setting: "Setting",
  modelDescription: "Model description",
  cameraAngle: "Camera angle",
  lighting: "Lighting",
  mood: "Mood",
  platformUse: "Platform use",
  aspectRatio: "Aspect ratio",
  textToInclude: "Text to include",
  textToAvoid: "Text to avoid",
  brandNotes: "Brand notes",
  notes: "Notes",
}

const FORM_FIELD_ORDER: (keyof MockupPromptFormValues)[] = [
  "projectName",
  "mockupType",
  "productType",
  "niche",
  "audience",
  "designConcept",
  "visualStyle",
  "colors",
  "setting",
  "modelDescription",
  "cameraAngle",
  "lighting",
  "mood",
  "platformUse",
  "aspectRatio",
  "textToInclude",
  "textToAvoid",
  "brandNotes",
  "notes",
]

const FINAL_MOCKUP_FIELDS: {
  key: keyof MockupPromptFinalFields
  label: string
  copyLabel: string
}[] = [
  {
    key: "finalImagePrompt",
    label: "Final image prompt",
    copyLabel: "image prompt",
  },
  {
    key: "finalNegativePrompt",
    label: "Final negative prompt",
    copyLabel: "negative prompt",
  },
  {
    key: "finalLayoutNotes",
    label: "Final layout notes",
    copyLabel: "layout notes",
  },
  {
    key: "finalTextPlacement",
    label: "Final text placement",
    copyLabel: "text placement",
  },
  {
    key: "finalUsageNotes",
    label: "Final usage notes",
    copyLabel: "usage notes",
  },
]

export function MockupPromptGenerator() {
  const {
    prompts,
    mockupPromptRecords,
    addMockupPromptRecord,
    updateMockupPromptRecord,
    deleteMockupPromptRecord,
    importMockupPromptRecords,
  } = useStore()

  const [form, setForm] = React.useState<MockupPromptFormValues>(
    emptyMockupPromptForm(),
  )
  const [aiResponse, setAiResponse] = React.useState("")
  const [finalMockup, setFinalMockup] = React.useState<MockupPromptFinalFields>(
    emptyFinalMockupPromptFields(),
  )
  const [editingId, setEditingId] = React.useState<string | null>(null)

  const [recordSearch, setRecordSearch] = React.useState("")
  const [pendingDelete, setPendingDelete] =
    React.useState<MockupPromptRecord | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const template = React.useMemo(
    () => getMockupPromptTemplate(prompts),
    [prompts],
  )

  const completedPrompt = React.useMemo(
    () => buildMockupPromptCompletedPrompt(template, form),
    [template, form],
  )

  const usingSavedTemplate = React.useMemo(
    () =>
      prompts.some(
        (p) =>
          p.id === "p-mockup-prompt" || p.name === "Mockup Prompt Generator",
      ),
    [prompts],
  )

  const filteredRecords = React.useMemo(() => {
    const q = recordSearch.trim().toLowerCase()
    const sorted = [...mockupPromptRecords].sort(
      (a, b) => b.updatedAt - a.updatedAt,
    )
    if (!q) return sorted
    return sorted.filter(
      (record) =>
        record.projectName.toLowerCase().includes(q) ||
        record.mockupType.toLowerCase().includes(q) ||
        record.productType.toLowerCase().includes(q) ||
        record.niche.toLowerCase().includes(q) ||
        record.platformUse.toLowerCase().includes(q) ||
        record.visualStyle.toLowerCase().includes(q),
    )
  }, [mockupPromptRecords, recordSearch])

  function setField<K extends keyof MockupPromptFormValues>(
    key: K,
    value: MockupPromptFormValues[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setForm(emptyMockupPromptForm())
    setAiResponse("")
    setFinalMockup(emptyFinalMockupPromptFields())
    setEditingId(null)
  }

  function clearFinalMockup() {
    setFinalMockup(emptyFinalMockupPromptFields())
    toast.success("Final mockup prompt cleared")
  }

  function setFinalField<K extends keyof MockupPromptFinalFields>(
    key: K,
    value: MockupPromptFinalFields[K],
  ) {
    setFinalMockup((prev) => ({ ...prev, [key]: value }))
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
    const record = normalizeMockupPromptRecord({
      id: editingId ?? createId("mockup"),
      ...form,
      completedPrompt,
      aiResponse,
      ...finalMockup,
      createdAt: editingId
        ? (mockupPromptRecords.find((r) => r.id === editingId)?.createdAt ?? now)
        : now,
      updatedAt: now,
    })

    if (editingId) {
      updateMockupPromptRecord(record)
      toast.success("Mockup prompt updated")
    } else {
      addMockupPromptRecord(record)
      setEditingId(record.id)
      toast.success("Mockup prompt saved")
    }
  }

  function openRecord(record: MockupPromptRecord) {
    const normalized = normalizeMockupPromptRecord(record)
    setForm({
      projectName: normalized.projectName,
      mockupType: normalized.mockupType,
      productType: normalized.productType,
      niche: normalized.niche,
      audience: normalized.audience,
      designConcept: normalized.designConcept,
      visualStyle: normalized.visualStyle,
      colors: normalized.colors,
      setting: normalized.setting,
      modelDescription: normalized.modelDescription,
      cameraAngle: normalized.cameraAngle,
      lighting: normalized.lighting,
      mood: normalized.mood,
      platformUse: normalized.platformUse,
      aspectRatio: normalized.aspectRatio,
      textToInclude: normalized.textToInclude,
      textToAvoid: normalized.textToAvoid,
      brandNotes: normalized.brandNotes,
      notes: normalized.notes,
    })
    setAiResponse(normalized.aiResponse)
    setFinalMockup(finalFieldsFromMockupRecord(normalized))
    setEditingId(normalized.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
    toast.success("Mockup prompt loaded")
  }

  function confirmDelete() {
    if (!pendingDelete) return
    deleteMockupPromptRecord(pendingDelete.id)
    if (editingId === pendingDelete.id) resetForm()
    setPendingDelete(null)
    toast.success("Mockup prompt deleted")
  }

  function handleExport() {
    downloadJson("creatorops-mockup-prompts.json", mockupPromptRecords)
    toast.success("Exported mockup prompt records")
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        const items = (Array.isArray(parsed) ? parsed : [parsed]).map((item) =>
          normalizeMockupPromptRecord(item as MockupPromptRecord),
        )
        importMockupPromptRecords(items)
        toast.success(`Imported ${items.length} record(s)`)
      } catch {
        toast.error("Invalid JSON file")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const finalMockupText = buildFinalMockupPromptText(
    { projectName: form.projectName, mockupType: form.mockupType },
    finalMockup,
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mockup Prompt Generator"
        description="Generate, save, and organize image and mockup prompts for merch, thumbnails, ads, and ecommerce visuals."
        action={
          editingId ? (
            <Button type="button" variant="outline" onClick={resetForm}>
              New project
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project details</CardTitle>
            <CardDescription>
              Describe the mockup or visual you want to generate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {FORM_FIELD_ORDER.map((field) => {
              const id = `mockup-${field}`
              const label = FIELD_LABELS[field]

              if (field === "mockupType") {
                return (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={id}>{label}</Label>
                    <Select
                      value={form.mockupType}
                      onValueChange={(v) => setField("mockupType", v)}
                    >
                      <SelectTrigger id={id} className="w-full">
                        <span className="truncate">{form.mockupType}</span>
                      </SelectTrigger>
                      <SelectContent className="min-w-[280px]">
                        {MOCKUP_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              }

              if (field === "platformUse") {
                return (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={id}>{label}</Label>
                    <Select
                      value={form.platformUse}
                      onValueChange={(v) => setField("platformUse", v)}
                    >
                      <SelectTrigger id={id} className="w-full">
                        <span className="truncate">{form.platformUse}</span>
                      </SelectTrigger>
                      <SelectContent className="min-w-[260px]">
                        {MOCKUP_PLATFORM_USES.map((platform) => (
                          <SelectItem key={platform} value={platform}>
                            {platform}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              }

              if (field === "aspectRatio") {
                return (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={id}>{label}</Label>
                    <Select
                      value={form.aspectRatio}
                      onValueChange={(v) => setField("aspectRatio", v)}
                    >
                      <SelectTrigger id={id} className="w-full">
                        <span className="truncate">{form.aspectRatio}</span>
                      </SelectTrigger>
                      <SelectContent className="min-w-[260px]">
                        {MOCKUP_ASPECT_RATIOS.map((ratio) => (
                          <SelectItem key={ratio} value={ratio}>
                            {ratio}
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
                    ? "Using Mockup Prompt Generator from library"
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
                id="mockup-ai-response"
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
                <CardTitle className="text-base">Final Mockup Prompt</CardTitle>
                <CardDescription>
                  Paste or edit your chosen image generation prompts
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFinalMockup}
              >
                Clear final mockup prompt
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {FINAL_MOCKUP_FIELDS.map(({ key, label, copyLabel }) => {
                const value = finalMockup[key]
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

              {finalMockupText.trim() ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleCopy(finalMockupText, "final mockup prompt")
                  }
                >
                  <Copy className="size-4" />
                  Copy final mockup prompt
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Button type="button" onClick={handleSave}>
            {editingId ? "Update mockup prompt" : "Save mockup prompt"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Recent mockup prompts</CardTitle>
            <CardDescription>
              {mockupPromptRecords.length} saved record
              {mockupPromptRecords.length === 1 ? "" : "s"}
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-56">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={recordSearch}
                onChange={(e) => setRecordSearch(e.target.value)}
                placeholder="Search prompts..."
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
              {mockupPromptRecords.length === 0
                ? "No mockup prompts saved yet. Fill in the form and save your first project."
                : "No records match your search."}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredRecords.map((record) => {
                const normalized = normalizeMockupPromptRecord(record)
                const mockupText = buildFinalMockupPromptText(
                  {
                    projectName: normalized.projectName,
                    mockupType: normalized.mockupType,
                  },
                  finalFieldsFromMockupRecord(normalized),
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
                          {normalized.projectName || "Untitled project"}
                        </p>
                        {normalized.mockupType ? (
                          <Badge variant="secondary">
                            {normalized.mockupType}
                          </Badge>
                        ) : null}
                        {normalized.platformUse ? (
                          <Badge variant="outline">
                            {normalized.platformUse}
                          </Badge>
                        ) : null}
                        {editingId === normalized.id ? (
                          <Badge variant="outline" className="text-xs">
                            Editing
                          </Badge>
                        ) : null}
                      </div>
                      {normalized.productType ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {normalized.productType}
                          {normalized.niche ? ` · ${normalized.niche}` : ""}
                        </p>
                      ) : null}
                      {normalized.visualStyle ? (
                        <p className="mt-1 line-clamp-1 text-sm text-pretty">
                          {normalized.visualStyle}
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
                      {mockupText.trim() ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(mockupText, "final mockup prompt")
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
                        aria-label="Delete mockup prompt"
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
            <DialogTitle>Delete mockup prompt?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `"${pendingDelete.projectName || "Untitled"}" will be permanently removed.`
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
