"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2, Palette } from "lucide-react"
import { toast } from "sonner"

import {
  createMockupPromptFromVisualIdentity,
  createThumbnailPromptFromVisualIdentity,
  createVisualIdentity,
  getVisualIdentityProfiles,
} from "@/lib/actions/visual-identity"
import { formatListForInput, parseListFromInput, parseTagsFromInput } from "@/lib/artist-universe/utils"
import { agentHref } from "@/lib/agents/routes"
import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { RecordMeta, TagList, useModuleTab } from "@/components/artist-universe/shared"
import { ModuleShell, ModuleTabPanel, ModuleWorkflowTabs } from "@/components/module/form-layout"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const TABS = [
  { value: "profiles", label: "Profiles" },
  { value: "style", label: "Style Rules" },
  { value: "colors", label: "Color Palettes" },
  { value: "character", label: "Character Rules" },
  { value: "thumbnail", label: "Thumbnail Rules" },
  { value: "merch", label: "Merch Rules" },
  { value: "assets", label: "Reference Assets" },
  { value: "prompt", label: "Prompt Builder" },
] as const

const EMPTY = { artistName: "", profileName: "", visualStyle: "", colorPalette: "", thumbnailRules: "", merchDesignRules: "", characterRules: "", imagePromptRules: "", tags: "" }

export function VisualIdentityPage() {
  const { tab, setTab } = useModuleTab("profiles")
  const [items, setItems] = React.useState<Awaited<ReturnType<typeof getVisualIdentityProfiles>>>([])
  const [loading, setLoading] = React.useState(true)
  const [form, setForm] = React.useState(EMPTY)
  const [showForm, setShowForm] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try { setItems(await getVisualIdentityProfiles()) } catch (e) { toast.error(e instanceof Error ? e.message : "Load failed") } finally { setLoading(false) }
  }, [])
  React.useEffect(() => { void load() }, [load])

  async function handleCreate() {
    if (!form.artistName.trim() || !form.profileName.trim()) { toast.error("Artist and profile name required"); return }
    try {
      await createVisualIdentity({
        artistName: form.artistName,
        profileName: form.profileName,
        status: "Active",
        visualStyle: form.visualStyle,
        colorPalette: parseListFromInput(form.colorPalette),
        typographyRules: "",
        characterRules: form.characterRules,
        environmentRules: "",
        imagePromptRules: form.imagePromptRules,
        thumbnailRules: form.thumbnailRules,
        merchDesignRules: form.merchDesignRules,
        forbiddenElements: [],
        referenceAssetIds: [],
        referenceDriveFileIds: [],
        tags: parseTagsFromInput(form.tags),
        notes: "",
      })
      setShowForm(false); setForm(EMPTY); toast.success("Visual identity created"); await load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Create failed") }
  }

  return (
    <ModuleShell>
      <ModulePageHeader title="Visual Identity" description="Define artist visual rules for thumbnails, videos, merch, covers, mockups, and image generation prompts." actions={<Button size="sm" onClick={() => setShowForm(true)}>New Profile</Button>} />
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {showForm ? (
        <Card className="mb-4"><CardHeader><CardTitle className="text-base">New visual identity profile</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div><Label>Artist</Label><Input value={form.artistName} onChange={(e) => setForm({ ...form, artistName: e.target.value })} /></div>
            <div><Label>Profile name</Label><Input value={form.profileName} onChange={(e) => setForm({ ...form, profileName: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Visual style</Label><Textarea value={form.visualStyle} onChange={(e) => setForm({ ...form, visualStyle: e.target.value })} /></div>
            <div><Label>Colors (one per line)</Label><Textarea value={form.colorPalette} onChange={(e) => setForm({ ...form, colorPalette: e.target.value })} placeholder={formatListForInput(["#FF0033", "#0A0A0A"])} /></div>
            <div><Label>Thumbnail rules</Label><Textarea value={form.thumbnailRules} onChange={(e) => setForm({ ...form, thumbnailRules: e.target.value })} /></div>
            <div className="flex gap-2 md:col-span-2"><Button size="sm" onClick={() => void handleCreate()}>Save</Button><Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button></div>
          </CardContent>
        </Card>
      ) : null}
      <ModuleWorkflowTabs tabs={[...TABS]} value={tab} onValueChange={setTab}>
        <ModuleTabPanel value={tab}>
          {items.length === 0 ? (
            <EmptyState icon={Palette} title="No visual identity profiles" description="Create a visual identity profile to keep covers, thumbnails, videos, and products consistent." primaryActionLabel="New Profile" primaryActionOnClick={() => setShowForm(true)} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((profile) => (
                <Card key={profile.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{profile.profileName}</CardTitle>
                    <RecordMeta artistName={profile.artistName} status={profile.status} />
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>{profile.visualStyle || "No style defined"}</p>
                    <TagList tags={profile.colorPalette} />
                    {(tab === "thumbnail" || tab === "profiles") && profile.thumbnailRules ? <p className="text-muted-foreground">{profile.thumbnailRules}</p> : null}
                    {(tab === "merch" || tab === "profiles") && profile.merchDesignRules ? <p className="text-muted-foreground">{profile.merchDesignRules}</p> : null}
                    {(tab === "assets") ? <p className="text-xs text-muted-foreground">{profile.referenceAssetIds.length} reference assets · {profile.referenceDriveFileIds.length} drive files</p> : null}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => void createThumbnailPromptFromVisualIdentity(profile.id).then((r) => { window.location.href = r.href })}>Create Thumbnail Prompt</Button>
                      <Button size="sm" variant="outline" onClick={() => void createMockupPromptFromVisualIdentity(profile.id).then(() => toast.success("Mockup prompt created"))}>Create Mockup Prompt</Button>
                      <Link href="/assets" className={buttonVariants({ size: "sm", variant: "outline" })}>Link Assets</Link>
                      <Link href={agentHref("product-strategist", { artistName: profile.artistName })} className={buttonVariants({ size: "sm", variant: "outline" })}>Run Product Strategist</Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ModuleTabPanel>
      </ModuleWorkflowTabs>
    </ModuleShell>
  )
}
