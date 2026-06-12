"use client"

import * as React from "react"
import Link from "next/link"
import { GitBranch, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { createStoryArc, getStoryArcs, addSongConceptToArc, addCampaignToArc, addLoreToArc } from "@/lib/actions/story-arcs"
import { STORY_ARC_TYPES } from "@/lib/artist-universe/types"
import { parseTagsFromInput } from "@/lib/artist-universe/utils"
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
  const { tab, setTab } = useModuleTab("arcs")
  const [items, setItems] = React.useState<Awaited<ReturnType<typeof getStoryArcs>>>([])
  const [loading, setLoading] = React.useState(true)
  const [form, setForm] = React.useState(EMPTY)
  const [showForm, setShowForm] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try { setItems(await getStoryArcs()) } catch (e) { toast.error(e instanceof Error ? e.message : "Load failed") } finally { setLoading(false) }
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
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {showForm ? (
        <Card className="mb-4"><CardHeader><CardTitle className="text-base">New story arc</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Artist</Label><Input value={form.artistName} onChange={(e) => setForm({ ...form, artistName: e.target.value })} /></div>
            <div><Label>Arc type</Label><Input list="arc-types" value={form.arcType} onChange={(e) => setForm({ ...form, arcType: e.target.value })} /><datalist id="arc-types">{STORY_ARC_TYPES.map((t) => <option key={t} value={t} />)}</datalist></div>
            <div className="md:col-span-2"><Label>Summary</Label><Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></div>
            <div className="flex gap-2 md:col-span-2"><Button size="sm" onClick={() => void handleCreate()}>Save</Button><Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button></div>
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
