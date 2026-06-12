"use client"

import * as React from "react"
import Link from "next/link"
import { GitBranch, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { createStoryArc, getStoryArcs, getStoryArcById, addSongConceptToArc, addCampaignToArc, addLoreToArc } from "@/lib/actions/story-arcs"
import { STORY_ARC_TYPES } from "@/lib/artist-universe/types"
import { parseTagsFromInput } from "@/lib/artist-universe/utils"
import { agentHref } from "@/lib/agents/routes"
import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { RecordMeta, TagList, useModuleTab, useRecordDeepLink } from "@/components/artist-universe/shared"
import { RecordNotFound } from "@/components/record-not-found"
import { PageErrorState } from "@/components/page-error-state"
import { ModuleShell, FormGrid, ModuleTabPanel, ModuleWorkflowTabs } from "@/components/module/form-layout"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormTextarea } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"

const TABS = [
  { value: "arcs", label: "Arcs" },
  { value: "timeline", label: "Timeline" },
  { value: "songs", label: "Songs" },
  { value: "campaigns", label: "Campaigns" },
  { value: "lore", label: "Lore" },
  { value: "products", label: "Products" },
  { value: "launch", label: "Launch Plan" },
] as const

const EMPTY = { title: "", artistName: "", arcType: "Album Era", summary: "", theme: "", tags: "" }

export function StoryArcsPage() {
  const { tab, setTab, recordId } = useModuleTab("arcs")
  const [items, setItems] = React.useState<Awaited<ReturnType<typeof getStoryArcs>>>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [form, setForm] = React.useState(EMPTY)
  const [showForm, setShowForm] = React.useState(false)

  const { resolved: focused, missingRecordId, resolving } = useRecordDeepLink({
    recordId,
    items,
    loading,
    fetchById: getStoryArcById,
  })

  const load = React.useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try { setItems(await getStoryArcs()) } catch (e) {
      const message = e instanceof Error ? e.message : "Load failed"
      setLoadError(message)
      toast.error(message)
    } finally { setLoading(false) }
  }, [])
  React.useEffect(() => { void load() }, [load])

  function filterTab(list: typeof items) {
    if (tab === "timeline") return list.filter((a) => a.startDate || a.endDate)
    if (tab === "songs") return list.filter((a) => a.songConceptIds.length > 0)
    if (tab === "campaigns") return list.filter((a) => a.campaignIds.length > 0)
    if (tab === "lore") return list.filter((a) => a.loreEntryIds.length > 0)
    if (tab === "products") return list.filter((a) => a.productCollectionIds.length > 0)
    if (tab === "launch") return list.filter((a) => a.launchNotes.trim() || a.narrativeBeats.length > 0)
    return list
  }

  async function handleCreate() {
    if (!form.title.trim() || !form.artistName.trim()) { toast.error("Title and artist required"); return }
    try {
      await createStoryArc({
        ...form,
        status: "Planning",
        startDate: null,
        endDate: null,
        campaignIds: [],
        releasePlanIds: [],
        songConceptIds: [],
        loreEntryIds: [],
        productCollectionIds: [],
        visualDirection: "",
        narrativeBeats: [],
        launchNotes: "",
        tags: parseTagsFromInput(form.tags),
      })
      setShowForm(false); setForm(EMPTY); toast.success("Story arc created"); await load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Create failed") }
  }

  const visible = filterTab(items)

  return (
    <ModuleShell>
      <ModulePageHeader title="Release Story Arcs" description="Plan connected songs, campaigns, visuals, products, lore, and releases across an artist era." actions={<Button size="sm" onClick={() => setShowForm(true)}>New Story Arc</Button>} />
      {loading || resolving ? <Loader2 className="size-4 animate-spin" /> : null}
      {loadError ? <PageErrorState description={loadError} onRetry={() => void load()} /> : null}
      {missingRecordId ? (
        <RecordNotFound recordId={missingRecordId} recordLabel="Story arc" moduleHref="/story-arcs" moduleLabel="Story Arcs" />
      ) : null}
      {focused ? (
        <Card className="mb-4 border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-base">Opened from link: {focused.title}</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">{focused.summary}</CardContent>
        </Card>
      ) : null}
      {showForm ? (
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">New Story Arc</CardTitle></CardHeader>
          <CardContent>
            <FormGrid>
              <FormField fieldKey="title" required>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </FormField>
              <FormField fieldKey="artistName" required>
                <Input value={form.artistName} onChange={(e) => setForm({ ...form, artistName: e.target.value })} />
              </FormField>
              <FormField fieldKey="arcType">
                <Input list="arc-types" value={form.arcType} onChange={(e) => setForm({ ...form, arcType: e.target.value })} />
                <datalist id="arc-types">{STORY_ARC_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
              </FormField>
              <FormField fieldKey="theme">
                <Input value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} />
              </FormField>
              <div className="sm:col-span-2">
                <FormField fieldKey="summary">
                  <FormTextarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={3} />
                </FormField>
              </div>
              <FormField fieldKey="tags" hint="Comma-separated.">
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </FormField>
            </FormGrid>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => void handleCreate()}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <ModuleWorkflowTabs tabs={[...TABS]} value={tab} onValueChange={setTab}>
        <ModuleTabPanel value={tab}>
          {visible.length === 0 ? (
            <EmptyState icon={GitBranch} title="No story arcs" description="Story arcs help you connect songs, visuals, campaigns, and products into a larger artist era." primaryActionLabel="New Story Arc" primaryActionOnClick={() => setShowForm(true)} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {visible.map((arc) => (
                <Card key={arc.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{arc.title}</CardTitle>
                    <RecordMeta artistName={arc.artistName} status={arc.status} extra={<span>{arc.arcType}</span>} />
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground">{arc.summary}</p>
                    <TagList tags={arc.narrativeBeats.slice(0, 4)} />
                    <p className="text-xs text-muted-foreground">{arc.songConceptIds.length} songs · {arc.campaignIds.length} campaigns · {arc.loreEntryIds.length} lore</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => { const id = prompt("Song concept ID to link"); if (id) void addSongConceptToArc(arc.id, id).then(load) }}>Add Song Concept</Button>
                      <Button size="sm" variant="outline" onClick={() => { const id = prompt("Campaign ID to link"); if (id) void addCampaignToArc(arc.id, id).then(load) }}>Add Campaign</Button>
                      <Button size="sm" variant="outline" onClick={() => { const id = prompt("Lore entry ID to link"); if (id) void addLoreToArc(arc.id, id).then(load) }}>Add Lore</Button>
                      <Link href={agentHref("release-strategist", { artistName: arc.artistName })} className={buttonVariants({ size: "sm", variant: "outline" })}>Run Release Strategist</Link>
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
