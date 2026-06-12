"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2, Music } from "lucide-react"
import { toast } from "sonner"

import {
  convertSongConceptToCampaign,
  convertSongConceptToReleasePlan,
  createPromptRunFromSongConcept,
  createQualityReviewFromSongConcept,
  createSongConcept,
  getSongConcepts,
} from "@/lib/actions/song-concepts"
import { SONG_CONCEPT_STATUSES } from "@/lib/artist-universe/types"
import { parseTagsFromInput } from "@/lib/artist-universe/utils"
import { topReadyConcepts } from "@/lib/artist-universe/scoring"
import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { RecordMeta, useModuleTab } from "@/components/artist-universe/shared"
import { ModuleShell, ModuleTabPanel, ModuleWorkflowTabs } from "@/components/module/form-layout"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { SongConceptRecord } from "@/lib/artist-universe/types"

const TABS = [
  { value: "concepts", label: "Concepts" },
  { value: "writing", label: "Writing" },
  { value: "prompting", label: "Prompting" },
  { value: "planned", label: "Planned Releases" },
  { value: "visual", label: "Visual Ideas" },
  { value: "products", label: "Product Tie-ins" },
  { value: "ai", label: "AI Prompt Context" },
] as const

const EMPTY = { title: "", artistName: "", songTitle: "", conceptSummary: "", genre: "", mood: "", hookIdea: "", visualConcept: "", youtubeAngle: "", productTieIn: "", sunoPrompt: "", tags: "" }

export function SongVaultPage() {
  const { tab, setTab } = useModuleTab("concepts")
  const [items, setItems] = React.useState<SongConceptRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [form, setForm] = React.useState(EMPTY)
  const [showForm, setShowForm] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try { setItems(await getSongConcepts()) } catch (e) { toast.error(e instanceof Error ? e.message : "Load failed") } finally { setLoading(false) }
  }, [])
  React.useEffect(() => { void load() }, [load])

  function filterTab(list: SongConceptRecord[]) {
    if (tab === "writing") return list.filter((c) => c.status === "Writing" || c.lyricDraft.trim())
    if (tab === "prompting") return list.filter((c) => c.status === "Prompting" || c.sunoPrompt.trim())
    if (tab === "planned") return list.filter((c) => ["Planned", "Selected"].includes(c.status))
    if (tab === "visual") return list.filter((c) => c.visualConcept.trim())
    if (tab === "products") return list.filter((c) => c.productTieIn.trim())
    if (tab === "ai") return topReadyConcepts(list, 10)
    return list
  }

  async function handleCreate() {
    if (!form.title.trim() || !form.artistName.trim()) { toast.error("Title and artist required"); return }
    try {
      await createSongConcept({ ...form, status: "Idea", lyricalTheme: "", storyRole: "", chorusIdea: "", lyricDraft: "", campaignId: "", campaignName: "", releasePlanId: "", relatedLoreIds: [], relatedAssetIds: [], relatedPromptRunIds: [], qualityReviewId: "", notes: "", tags: parseTagsFromInput(form.tags) })
      setShowForm(false); setForm(EMPTY); toast.success("Song concept created"); await load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Create failed") }
  }

  const visible = filterTab(items)

  return (
    <ModuleShell>
      <ModulePageHeader title="Song Concept Vault" description="Capture song ideas, hooks, Suno prompts, lyric drafts, visuals, YouTube angles, and release concepts." actions={<Button size="sm" onClick={() => setShowForm(true)}>New Song Concept</Button>} />
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {showForm ? (
        <Card className="mb-4"><CardHeader><CardTitle className="text-base">New song concept</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {(["title", "artistName", "songTitle", "genre", "mood"] as const).map((k) => <div key={k}><Label>{k}</Label><Input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>)}
            <div className="md:col-span-2"><Label>Concept summary</Label><Textarea value={form.conceptSummary} onChange={(e) => setForm({ ...form, conceptSummary: e.target.value })} /></div>
            <div><Label>Hook idea</Label><Input value={form.hookIdea} onChange={(e) => setForm({ ...form, hookIdea: e.target.value })} /></div>
            <div><Label>Visual concept</Label><Input value={form.visualConcept} onChange={(e) => setForm({ ...form, visualConcept: e.target.value })} /></div>
            <div className="flex gap-2 md:col-span-2"><Button size="sm" onClick={() => void handleCreate()}>Save</Button><Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button></div>
          </CardContent>
        </Card>
      ) : null}
      <ModuleWorkflowTabs tabs={[...TABS]} value={tab} onValueChange={setTab}>
        <ModuleTabPanel value={tab}>
          {visible.length === 0 ? (
            <EmptyState icon={Music} title="No song concepts" description="Song ideas and release concepts will appear here." primaryActionLabel="New Song Concept" primaryActionOnClick={() => setShowForm(true)} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {visible.map((c) => (
                <Card key={c.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{c.songTitle || c.title}</CardTitle>
                    <RecordMeta artistName={c.artistName} status={c.status} />
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground">{c.conceptSummary || "No summary"}</p>
                    {c.hookIdea ? <p><span className="font-medium">Hook:</span> {c.hookIdea}</p> : null}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => void createPromptRunFromSongConcept(c.id).then(() => toast.success("Prompt run created"))}>Create Prompt Run</Button>
                      <Button size="sm" variant="outline" onClick={() => void convertSongConceptToReleasePlan(c.id).then(() => toast.success("Release plan created"))}>Convert to Release Plan</Button>
                      <Button size="sm" variant="outline" onClick={() => void convertSongConceptToCampaign(c.id).then(() => toast.success("Campaign created"))}>Create Campaign</Button>
                      <Link href={`/youtube-packaging?artistName=${encodeURIComponent(c.artistName)}&trackTitle=${encodeURIComponent(c.songTitle || c.title)}`} className={buttonVariants({ size: "sm", variant: "outline" })}>YouTube Package</Link>
                      <Link href={`/youtube-thumbnails?artistName=${encodeURIComponent(c.artistName)}`} className={buttonVariants({ size: "sm", variant: "outline" })}>Thumbnail Prompt</Link>
                      <Button size="sm" variant="outline" onClick={() => void createQualityReviewFromSongConcept(c.id).then(() => toast.success("Quality review created"))}>Quality Review</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Statuses: {SONG_CONCEPT_STATUSES.join(", ")}</p>
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
