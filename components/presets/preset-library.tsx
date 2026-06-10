"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { parseImportJsonText } from "@/lib/safe-json"
import {
  Copy,
  Download,
  Loader2,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react"
import { toast } from "sonner"

import { useStore, createId } from "@/lib/store"
import type { PresetRecord, PresetType } from "@/lib/types"
import { PRESET_TYPES } from "@/lib/types"
import { migrateLocalPresetsToDatabase } from "@/lib/actions/presets"
import {
  buildPresetRecordFromForm,
  duplicatePresetRecord,
  emptyPresetForm,
  filterPresets,
  presetFormFromRecord,
  PRESET_VALUES_PLACEHOLDERS,
  validatePresetValuesJson,
} from "@/lib/presets"
import { preparePresetNavigation } from "@/lib/preset-prefill"
import { STARTER_PRESETS } from "@/lib/starter-presets"
import { downloadJson, loadPresets } from "@/lib/storage"
import { ModulePageHeader } from "@/components/app-shell"
import {
  FormGrid,
  FormSection,
  ModuleTabPanel,
} from "@/components/module/form-layout"
import { TabRow } from "@/components/ui/tab-row"
import { Tabs, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function starterTag(starterId: string) {
  return `starter:${starterId}`
}

export function PresetLibrary() {
  const router = useRouter()
  const store = useStore()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = React.useState("library")
  const [libraryQuery, setLibraryQuery] = React.useState("")
  const [libraryType, setLibraryType] = React.useState<PresetType | "all">("all")
  const [recordId, setRecordId] = React.useState(() => createId("preset"))
  const [createdAt, setCreatedAt] = React.useState(() => Date.now())
  const [form, setForm] = React.useState(emptyPresetForm())
  const [saving, setSaving] = React.useState(false)

  const filteredPresets = React.useMemo(
    () => filterPresets(store.presets, libraryQuery, libraryType),
    [store.presets, libraryQuery, libraryType],
  )

  function openPreset(record: PresetRecord) {
    setRecordId(record.id)
    setCreatedAt(record.createdAt)
    setForm(presetFormFromRecord(record))
    setActiveTab("edit")
  }

  function resetDraft(type: PresetType = "Campaign") {
    setRecordId(createId("preset"))
    setCreatedAt(Date.now())
    setForm(emptyPresetForm(type))
    setActiveTab("edit")
  }

  function updateForm<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Preset name is required")
      return
    }
    const validation = validatePresetValuesJson(form.valuesJson)
    if (!validation.valid) {
      toast.error(validation.error ?? "Invalid preset values JSON")
      return
    }

    setSaving(true)
    try {
      const record = buildPresetRecordFromForm(recordId, form, {
        createdAt,
        updatedAt: Date.now(),
      })
      const exists = store.presets.some((p) => p.id === recordId)
      if (exists) {
        await store.updatePreset(record)
        toast.success("Preset updated")
      } else {
        await store.addPreset(record)
        toast.success("Preset saved")
      }
      setActiveTab("library")
    } catch {
      toast.error("Could not save preset")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(record: PresetRecord) {
    if (!confirm(`Delete preset "${record.name}"?`)) return
    try {
      await store.deletePreset(record.id)
      if (recordId === record.id) resetDraft(record.presetType)
      toast.success("Preset deleted")
    } catch {
      toast.error("Could not delete preset")
    }
  }

  async function handleDuplicate(record: PresetRecord) {
    const copy = duplicatePresetRecord(record, createId("preset"))
    try {
      await store.addPreset(copy)
      openPreset(copy)
      toast.success("Preset duplicated")
    } catch {
      toast.error("Could not duplicate preset")
    }
  }

  function handleUsePreset(record: PresetRecord) {
    const href = preparePresetNavigation(record)
    router.push(href)
    toast.message(`Opening ${record.presetType} with preset "${record.name}"`)
  }

  async function handleInstallStarter(starterId: string) {
    const starter = STARTER_PRESETS.find((item) => item.starterId === starterId)
    if (!starter) return

    const tag = starterTag(starter.starterId)
    const alreadyInstalled = store.presets.some((preset) => preset.tags.includes(tag))
    if (alreadyInstalled) {
      toast.message(`"${starter.name}" is already installed`)
      return
    }

    const now = Date.now()
    const record: PresetRecord = {
      id: createId("preset"),
      name: starter.name,
      description: starter.description,
      presetType: starter.presetType,
      category: starter.category,
      tags: [...starter.tags, tag],
      values: starter.values,
      notes: starter.notes,
      createdAt: now,
      updatedAt: now,
    }

    try {
      await store.addPreset(record)
      toast.success(`Installed starter preset "${starter.name}"`)
    } catch {
      toast.error("Could not install starter preset")
    }
  }

  function handleExport() {
    downloadJson("creatorops-presets.json", store.presets)
    toast.success("Presets exported")
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    try {
      const text = await file.text()
      const importResult = parseImportJsonText(text)
      if (!importResult.ok) {
        toast.error(importResult.message)
        return
      }
      const parsed = importResult.value
      if (!Array.isArray(parsed)) throw new Error("Expected JSON array")
      await store.importPresets(parsed as PresetRecord[])
      toast.success("Presets imported")
    } catch {
      toast.error("Could not import presets JSON")
    }
  }

  async function handleMigrateLocal() {
    const local = loadPresets()
    if (local.length === 0) {
      toast.message("No local presets to migrate")
      return
    }
    try {
      const result = await migrateLocalPresetsToDatabase(local)
      await store.reloadPresets()
      toast.success(`Migrated ${result.migrated} presets`)
    } catch {
      toast.error("Migration failed")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ModulePageHeader
        title="Presets"
        description="Reusable templates for campaigns, releases, packaging, and content workflows."
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => resetDraft()}>
              <Plus className="size-4" />
              New Preset
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="size-4" />
              Export JSON
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" />
              Import JSON
            </Button>
            {!store.presetsUseDatabase ? (
              <Button variant="outline" onClick={handleMigrateLocal}>
                Migrate local
              </Button>
            ) : null}
          </div>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportFile}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full gap-6">
        <TabRow>
          <TabsTrigger value="library">Preset Library</TabsTrigger>
          <TabsTrigger value="edit">Create/Edit Preset</TabsTrigger>
          <TabsTrigger value="starters">Starter Presets</TabsTrigger>
        </TabRow>

      <ModuleTabPanel value="library">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base">Saved presets</CardTitle>
            <CardDescription>
              Search, filter, and use templates across CreatorOps modules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={libraryQuery}
                  onChange={(e) => setLibraryQuery(e.target.value)}
                  placeholder="Search by name, type, category, tag…"
                />
              </div>
              <Select
                value={libraryType}
                onValueChange={(v) => setLibraryType(v as PresetType | "all")}
              >
                <SelectTrigger className="w-full sm:w-56">
                  <span>{libraryType === "all" ? "All types" : libraryType}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {PRESET_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredPresets.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No presets yet. Create one or install a starter preset.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex flex-col gap-3 rounded-xl border border-border/80 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{preset.name}</span>
                        <Badge variant="secondary">{preset.presetType}</Badge>
                        {preset.category ? (
                          <Badge variant="outline">{preset.category}</Badge>
                        ) : null}
                      </div>
                      {preset.description ? (
                        <p className="text-sm text-muted-foreground">{preset.description}</p>
                      ) : null}
                      <div className="flex flex-wrap gap-1.5">
                        {preset.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Updated {formatDate(preset.updatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => handleUsePreset(preset)}>
                        <Wand2 className="size-4" />
                        Use Preset
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openPreset(preset)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicate(preset)}
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(preset)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </ModuleTabPanel>

      <ModuleTabPanel value="edit">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base">
              {store.presets.some((p) => p.id === recordId) ? "Edit preset" : "Create preset"}
            </CardTitle>
            <CardDescription>
              Define reusable field values as JSON for fast module prefill
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormSection title="Preset details">
              <FormGrid>
                <div className="space-y-2">
                  <Label htmlFor="presetName">Name</Label>
                  <Input
                    id="presetName"
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    placeholder="Dark AI Music Release"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preset type</Label>
                  <Select
                    value={form.presetType}
                    onValueChange={(v) => {
                      const type = v as PresetType
                      updateForm("presetType", type)
                      if (!form.valuesJson.trim() || form.valuesJson === "{}") {
                        updateForm("valuesJson", PRESET_VALUES_PLACEHOLDERS[type])
                      }
                    }}
                  >
                    <SelectTrigger>
                      <span>{form.presetType}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {PRESET_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="presetCategory">Category</Label>
                  <Input
                    id="presetCategory"
                    value={form.category}
                    onChange={(e) => updateForm("category", e.target.value)}
                    placeholder="Music Release"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="presetTags">Tags</Label>
                  <Input
                    id="presetTags"
                    value={form.tags}
                    onChange={(e) => updateForm("tags", e.target.value)}
                    placeholder="dark, ai-music, release"
                  />
                </div>
              </FormGrid>
              <div className="space-y-2">
                <Label htmlFor="presetDescription">Description</Label>
                <Textarea
                  id="presetDescription"
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  rows={2}
                />
              </div>
            </FormSection>

            <FormSection
              title="Values JSON"
              description="Object keys should match target module form field names."
            >
              <Textarea
                value={form.valuesJson}
                onChange={(e) => updateForm("valuesJson", e.target.value)}
                rows={14}
                className="font-mono text-xs"
                placeholder={PRESET_VALUES_PLACEHOLDERS[form.presetType]}
              />
            </FormSection>

            <FormSection title="Notes">
              <Textarea
                value={form.notes}
                onChange={(e) => updateForm("notes", e.target.value)}
                rows={3}
              />
            </FormSection>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save preset
              </Button>
              <Button variant="outline" onClick={() => setActiveTab("library")}>
                Back to library
              </Button>
            </div>
          </CardContent>
        </Card>
      </ModuleTabPanel>

      <ModuleTabPanel value="starters">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base">Starter presets</CardTitle>
            <CardDescription>
              Install built-in templates into your workspace, then customize or use them
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {STARTER_PRESETS.map((starter) => {
              const installed = store.presets.some((preset) =>
                preset.tags.includes(starterTag(starter.starterId)),
              )
              return (
                <div
                  key={starter.starterId}
                  className="flex flex-col gap-3 rounded-xl border border-border/80 p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" />
                      <span className="font-medium">{starter.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{starter.description}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Badge variant="secondary">{starter.presetType}</Badge>
                      {starter.category ? (
                        <Badge variant="outline">{starter.category}</Badge>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={installed ? "outline" : "default"}
                    onClick={() => handleInstallStarter(starter.starterId)}
                    disabled={installed}
                  >
                    {installed ? "Installed" : "Install to library"}
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </ModuleTabPanel>
      </Tabs>
    </div>
  )
}
