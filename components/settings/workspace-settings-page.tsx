"use client"

import * as React from "react"
import { Download, Loader2, RotateCcw, Save, Upload } from "lucide-react"
import { toast } from "sonner"

import {
  getWorkspaceSettings,
  resetWorkspaceSettings,
  upsertWorkspaceSettings,
} from "@/lib/actions/workspace-settings"
import { downloadJson } from "@/lib/storage"
import type { WorkspaceSettingsRecord } from "@/lib/types"
import {
  defaultWorkspaceSettingsRecord,
  workspaceSettingsToFormValues,
  WORKSPACE_SETTINGS_ID,
} from "@/lib/workspace-settings"
import { useStore } from "@/lib/store"
import { ModulePageHeader } from "@/components/app-shell"
import {
  FormGrid,
  FormSection,
  RECENT_RECORDS_CARD_CLASS,
} from "@/components/module/form-layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TabRow } from "@/components/ui/tab-row"
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

const SETTINGS_TABS = [
  { value: "workspace", label: "Workspace" },
  { value: "brand", label: "Brand Defaults" },
  { value: "content", label: "Content Defaults" },
  { value: "commerce", label: "Commerce Defaults" },
  { value: "marketing", label: "Marketing Defaults" },
  { value: "advanced", label: "Backup/Advanced" },
] as const

function formFromRecord(record: WorkspaceSettingsRecord) {
  return workspaceSettingsToFormValues(record)
}

function Field({
  id,
  label,
  value,
  onChange,
  multiline = false,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}

export function WorkspaceSettingsPage() {
  const { workspaceSettings, setWorkspaceSettings, reloadWorkspaceSettings } =
    useStore()
  const [form, setForm] = React.useState(() =>
    formFromRecord(defaultWorkspaceSettingsRecord()),
  )
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const settings = await getWorkspaceSettings()
        if (!cancelled) {
          setForm(formFromRecord(settings))
          setWorkspaceSettings(settings)
        }
      } catch {
        if (!cancelled) toast.error("Could not load workspace settings")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [setWorkspaceSettings])

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const now = Date.now()
      const saved = await upsertWorkspaceSettings({
        id: WORKSPACE_SETTINGS_ID,
        ...form,
        createdAt: workspaceSettings?.createdAt ?? now,
        updatedAt: now,
      })
      setWorkspaceSettings(saved)
      setForm(formFromRecord(saved))
      toast.success("Workspace settings saved")
    } catch {
      toast.error("Could not save workspace settings")
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    setSaving(true)
    try {
      const saved = await resetWorkspaceSettings()
      setWorkspaceSettings(saved)
      setForm(formFromRecord(saved))
      toast.success("Workspace settings reset to defaults")
    } catch {
      toast.error("Could not reset workspace settings")
    } finally {
      setSaving(false)
    }
  }

  function handleExport() {
    const record: WorkspaceSettingsRecord = {
      id: WORKSPACE_SETTINGS_ID,
      ...form,
      createdAt: workspaceSettings?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    }
    downloadJson("creatorops-workspace-settings.json", [record])
    toast.success("Settings exported")
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as unknown
        const items = Array.isArray(parsed) ? parsed : [parsed]
        const first = items[0] as WorkspaceSettingsRecord
        if (!first || typeof first !== "object") {
          toast.error("Invalid settings JSON")
          return
        }
        setForm(formFromRecord({ ...first, id: WORKSPACE_SETTINGS_ID }))
        toast.success("Settings imported — click Save to persist")
      } catch {
        toast.error("Invalid JSON file")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading workspace settings…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <ModulePageHeader
        title="Workspace Settings"
        description="Manage reusable brand, channel, store, and marketing defaults across CreatorOps modules."
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void reloadWorkspaceSettings()}>
              Refresh
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save settings
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="workspace" className="w-full gap-6">
        <TabRow>
          {SETTINGS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabRow>

        <TabsContent value="workspace" className="mt-0">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Workspace</CardTitle>
              <CardDescription>Identity and general workspace notes.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormGrid>
                <Field
                  id="workspaceName"
                  label="Workspace name"
                  value={form.workspaceName}
                  onChange={(v) => setField("workspaceName", v)}
                />
                <Field
                  id="labelName"
                  label="Label name"
                  value={form.labelName}
                  onChange={(v) => setField("labelName", v)}
                />
                <Field
                  id="defaultWebsiteLink"
                  label="Default website link"
                  value={form.defaultWebsiteLink}
                  onChange={(v) => setField("defaultWebsiteLink", v)}
                />
                <div className="space-y-2 sm:col-span-2">
                  <Field
                    id="notes"
                    label="Notes"
                    value={form.notes}
                    onChange={(v) => setField("notes", v)}
                    multiline
                  />
                </div>
              </FormGrid>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brand" className="mt-0">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Brand defaults</CardTitle>
            </CardHeader>
            <CardContent>
              <FormGrid>
                <Field
                  id="defaultBrandTone"
                  label="Default brand tone"
                  value={form.defaultBrandTone}
                  onChange={(v) => setField("defaultBrandTone", v)}
                />
                <Field
                  id="defaultVisualStyle"
                  label="Default visual style"
                  value={form.defaultVisualStyle}
                  onChange={(v) => setField("defaultVisualStyle", v)}
                />
                <Field
                  id="brandPrimaryColor"
                  label="Brand primary color"
                  value={form.brandPrimaryColor}
                  onChange={(v) => setField("brandPrimaryColor", v)}
                />
                <Field
                  id="brandSecondaryColor"
                  label="Brand secondary color"
                  value={form.brandSecondaryColor}
                  onChange={(v) => setField("brandSecondaryColor", v)}
                />
                <Field
                  id="brandAccentColor"
                  label="Brand accent color"
                  value={form.brandAccentColor}
                  onChange={(v) => setField("brandAccentColor", v)}
                />
                <div className="space-y-2 sm:col-span-2">
                  <Field
                    id="defaultAudience"
                    label="Default audience"
                    value={form.defaultAudience}
                    onChange={(v) => setField("defaultAudience", v)}
                    multiline
                  />
                </div>
              </FormGrid>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="mt-0">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Content defaults</CardTitle>
            </CardHeader>
            <CardContent>
              <FormGrid>
                <Field
                  id="defaultYouTubeChannel"
                  label="Default YouTube channel"
                  value={form.defaultYouTubeChannel}
                  onChange={(v) => setField("defaultYouTubeChannel", v)}
                />
                <Field
                  id="defaultStreamingLink"
                  label="Default streaming link"
                  value={form.defaultStreamingLink}
                  onChange={(v) => setField("defaultStreamingLink", v)}
                />
                <div className="space-y-2 sm:col-span-2">
                  <Field
                    id="defaultPlatforms"
                    label="Default platforms"
                    value={form.defaultPlatforms}
                    onChange={(v) => setField("defaultPlatforms", v)}
                    multiline
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Field
                    id="defaultPrimaryGoal"
                    label="Default primary goal"
                    value={form.defaultPrimaryGoal}
                    onChange={(v) => setField("defaultPrimaryGoal", v)}
                    multiline
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Field
                    id="defaultCTA"
                    label="Default CTA"
                    value={form.defaultCTA}
                    onChange={(v) => setField("defaultCTA", v)}
                    multiline
                  />
                </div>
                <Field
                  id="defaultHashtagSet"
                  label="Default hashtag set"
                  value={form.defaultHashtagSet}
                  onChange={(v) => setField("defaultHashtagSet", v)}
                />
              </FormGrid>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commerce" className="mt-0">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Commerce defaults</CardTitle>
            </CardHeader>
            <CardContent>
              <FormGrid>
                <Field
                  id="defaultStoreName"
                  label="Default store name"
                  value={form.defaultStoreName}
                  onChange={(v) => setField("defaultStoreName", v)}
                />
                <Field
                  id="defaultStoreType"
                  label="Default store type"
                  value={form.defaultStoreType}
                  onChange={(v) => setField("defaultStoreType", v)}
                />
                <Field
                  id="defaultMerchStoreLink"
                  label="Default merch store link"
                  value={form.defaultMerchStoreLink}
                  onChange={(v) => setField("defaultMerchStoreLink", v)}
                />
              </FormGrid>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketing" className="mt-0">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Marketing defaults</CardTitle>
            </CardHeader>
            <CardContent>
              <FormGrid>
                <Field
                  id="defaultEmailSender"
                  label="Default email sender"
                  value={form.defaultEmailSender}
                  onChange={(v) => setField("defaultEmailSender", v)}
                />
                <Field
                  id="defaultBusinessArea"
                  label="Default business area"
                  value={form.defaultBusinessArea}
                  onChange={(v) => setField("defaultBusinessArea", v)}
                />
                <div className="space-y-2 sm:col-span-2">
                  <Field
                    id="marketingDefaultCTA"
                    label="Default CTA"
                    value={form.defaultCTA}
                    onChange={(v) => setField("defaultCTA", v)}
                    multiline
                  />
                </div>
                <Field
                  id="marketingHashtags"
                  label="Default hashtag set"
                  value={form.defaultHashtagSet}
                  onChange={(v) => setField("defaultHashtagSet", v)}
                />
              </FormGrid>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="mt-0">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Backup / Advanced</CardTitle>
              <CardDescription>
                Export, import, or reset workspace defaults. Full backups also include
                these settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button type="button" variant="outline" onClick={handleExport}>
                <Download className="size-4" />
                Export settings JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4" />
                Import settings JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleReset()}
                disabled={saving}
              >
                <RotateCcw className="size-4" />
                Reset to defaults
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImportFile}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
