"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2, ScrollText } from "lucide-react"
import { toast } from "sonner"

import {
  archiveLoreEntry,
  createLoreEntry,
  getLoreEntries,
  markLoreCanon,
  markLoreFlexible,
} from "@/lib/actions/lore"
import { LORE_TYPES } from "@/lib/artist-universe/types"
import { formatTagsForInput, parseTagsFromInput } from "@/lib/artist-universe/utils"
import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { RecordMeta, TagList, useModuleTab } from "@/components/artist-universe/shared"
import { ModuleShell, ModuleTabPanel, ModuleWorkflowTabs } from "@/components/module/form-layout"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { LoreEntryRecord } from "@/lib/artist-universe/types"

const TABS = [
  { value: "board", label: "Lore Board" },
  { value: "canon", label: "Canon" },
  { value: "characters", label: "Characters" },
  { value: "symbols", label: "Symbols & Motifs" },
  { value: "timeline", label: "Timeline" },
  { value: "ideas", label: "Story Ideas" },
  { value: "songs", label: "Related Songs" },
] as const

const EMPTY = { title: "", artistName: "", loreType: "Character", summary: "", details: "", tags: "" }

export function LorePage() {
  const { tab, setTab } = useModuleTab("board")
  const [items, setItems] = React.useState<LoreEntryRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [form, setForm] = React.useState(EMPTY)
  const [showForm, setShowForm] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      setItems(await getLoreEntries())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load lore")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { void load() }, [load])

  function filterTab(list: LoreEntryRecord[]) {
    if (tab === "canon") return list.filter((l) => l.canonStatus === "Canon")
    if (tab === "characters") return list.filter((l) => l.loreType === "Character")
    if (tab === "symbols") return list.filter((l) => ["Symbol", "Visual Motif"].includes(l.loreType))
    if (tab === "timeline") return list.filter((l) => l.loreType === "Timeline")
    if (tab === "ideas") return list.filter((l) => ["Story Event", "Theme", "Idea"].includes(l.loreType) || l.canonStatus === "Idea")
    if (tab === "songs") return list.filter((l) => l.relatedSongs.length > 0)
    return list
  }

  const visible = filterTab(items)

  async function handleCreate() {
    if (!form.title.trim() || !form.artistName.trim()) {
      toast.error("Title and artist name required")
      return
    }
    try {
      await createLoreEntry({
        title: form.title,
        artistName: form.artistName,
        loreType: form.loreType,
        status: "Draft",
        canonStatus: "Flexible",
        summary: form.summary,
        details: form.details,
        characters: [],
        locations: [],
        symbols: [],
        themes: [],
        relatedSongs: [],
        relatedCampaignIds: [],
        relatedAssetIds: [],
        tags: parseTagsFromInput(form.tags),
        notes: "",
      })
      setForm(EMPTY)
      setShowForm(false)
      toast.success("Lore entry created")
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed")
    }
  }

  return (
    <ModuleShell>
      <ModulePageHeader title="Lore Manager" description="Manage canon, flexible ideas, characters, symbols, story events, motifs, and worldbuilding for artist projects." actions={<Button size="sm" onClick={() => setShowForm(true)}>New Lore Entry</Button>} />
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {showForm ? (
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">New lore entry</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Artist</Label><Input value={form.artistName} onChange={(e) => setForm({ ...form, artistName: e.target.value })} /></div>
            <div><Label>Type</Label><Input list="lore-types" value={form.loreType} onChange={(e) => setForm({ ...form, loreType: e.target.value })} /><datalist id="lore-types">{LORE_TYPES.map((t) => <option key={t} value={t} />)}</datalist></div>
            <div className="md:col-span-2"><Label>Summary</Label><Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></div>
            <div><Label>Tags</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder={formatTagsForInput(["worldbuilding"])} /></div>
            <div className="flex gap-2 md:col-span-2"><Button size="sm" onClick={() => void handleCreate()}>Save</Button><Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button></div>
          </CardContent>
        </Card>
      ) : null}
      <ModuleWorkflowTabs tabs={[...TABS]} value={tab} onValueChange={setTab}>
        {TABS.map((t) => (
          <ModuleTabPanel key={t.value} value={t.value}>
            {visible.length === 0 ? (
              <EmptyState icon={ScrollText} title="No lore entries" description="Lore entries will appear here after you add worldbuilding, characters, symbols, or story ideas." primaryActionLabel="New Lore Entry" primaryActionOnClick={() => setShowForm(true)} />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {visible.map((entry) => (
                  <Card key={entry.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{entry.title}</CardTitle>
                      <RecordMeta artistName={entry.artistName} status={entry.canonStatus} extra={<span>{entry.loreType}</span>} />
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p className="text-muted-foreground">{entry.summary || "No summary"}</p>
                      <TagList tags={[...entry.symbols, ...entry.themes].slice(0, 6)} />
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => void markLoreCanon(entry.id).then(load)}>Mark Canon</Button>
                        <Button size="sm" variant="outline" onClick={() => void markLoreFlexible(entry.id).then(load)}>Mark Flexible</Button>
                        <Link href={`/song-vault?artist=${encodeURIComponent(entry.artistName)}`} className={buttonVariants({ size: "sm", variant: "outline" })}>Create Song Concept</Link>
                        <Button size="sm" variant="ghost" onClick={() => void archiveLoreEntry(entry.id).then(load)}>Archive</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ModuleTabPanel>
        ))}
      </ModuleWorkflowTabs>
    </ModuleShell>
  )
}
