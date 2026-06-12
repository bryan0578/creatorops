"use client"

import * as React from "react"
import Link from "next/link"
import { BookOpen, Loader2, Music2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import {
  createArtistBible,
  createPrettyWiseStarterBible,
  deleteArtistBible,
  generateArtistContextSummary,
  getArtistBibles,
  updateArtistBible,
} from "@/lib/actions/artist-bible"
import { agentHref } from "@/lib/agents/routes"
import type { ArtistBibleRecord } from "@/lib/artist-universe/types"
import {
  formatListForInput,
  formatTagsForInput,
  parseListFromInput,
  parseTagsFromInput,
} from "@/lib/artist-universe/utils"
import { summarizeArtistUniverse } from "@/lib/artist-universe/summary"
import { scoreArtistBibleCompleteness } from "@/lib/artist-universe/summary"
import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { FieldRow, StatCard, TagList, useModuleTab } from "@/components/artist-universe/shared"
import { ModuleShell, ModuleTabPanel, ModuleWorkflowTabs } from "@/components/module/form-layout"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "identity", label: "Identity" },
  { value: "voice", label: "Voice & Lyrics" },
  { value: "sonic", label: "Sonic Rules" },
  { value: "visual", label: "Visual Rules" },
  { value: "references", label: "References" },
  { value: "ai-context", label: "AI Context" },
  { value: "related", label: "Related Records" },
] as const

const EMPTY_FORM = {
  artistName: "",
  projectName: "",
  labelName: "",
  status: "Active",
  genre: "",
  subgenre: "",
  mood: "",
  aesthetic: "",
  targetAudience: "",
  brandPromise: "",
  shortBio: "",
  longBio: "",
  voiceRules: "",
  lyricalThemes: "",
  visualRules: "",
  sonicRules: "",
  doList: "",
  dontList: "",
  referenceArtists: "",
  referenceMedia: "",
  colorPalette: "",
  keywords: "",
  tags: "",
  notes: "",
}

function formFromRecord(record: ArtistBibleRecord | null) {
  if (!record) return EMPTY_FORM
  return {
    artistName: record.artistName,
    projectName: record.projectName,
    labelName: record.labelName,
    status: record.status,
    genre: record.genre,
    subgenre: record.subgenre,
    mood: record.mood,
    aesthetic: record.aesthetic,
    targetAudience: record.targetAudience,
    brandPromise: record.brandPromise,
    shortBio: record.shortBio,
    longBio: record.longBio,
    voiceRules: record.voiceRules,
    lyricalThemes: record.lyricalThemes,
    visualRules: record.visualRules,
    sonicRules: record.sonicRules,
    doList: formatListForInput(record.doList),
    dontList: formatListForInput(record.dontList),
    referenceArtists: formatListForInput(record.referenceArtists),
    referenceMedia: formatListForInput(record.referenceMedia),
    colorPalette: formatListForInput(record.colorPalette),
    keywords: formatTagsForInput(record.keywords),
    tags: formatTagsForInput(record.tags),
    notes: record.notes,
  }
}

function recordFromForm(form: typeof EMPTY_FORM): Omit<ArtistBibleRecord, "id" | "createdAt" | "updatedAt"> {
  return {
    artistName: form.artistName,
    projectName: form.projectName,
    labelName: form.labelName,
    status: form.status,
    genre: form.genre,
    subgenre: form.subgenre,
    mood: form.mood,
    aesthetic: form.aesthetic,
    targetAudience: form.targetAudience,
    brandPromise: form.brandPromise,
    shortBio: form.shortBio,
    longBio: form.longBio,
    voiceRules: form.voiceRules,
    lyricalThemes: form.lyricalThemes,
    visualRules: form.visualRules,
    sonicRules: form.sonicRules,
    doList: parseListFromInput(form.doList),
    dontList: parseListFromInput(form.dontList),
    referenceArtists: parseListFromInput(form.referenceArtists),
    referenceMedia: parseListFromInput(form.referenceMedia),
    colorPalette: parseListFromInput(form.colorPalette),
    keywords: parseTagsFromInput(form.keywords),
    tags: parseTagsFromInput(form.tags),
    notes: form.notes,
    sourceArtistId: "",
  }
}

export function ArtistBiblePage() {
  const { tab, setTab, recordId } = useModuleTab("overview")
  const [items, setItems] = React.useState<ArtistBibleRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [aiContext, setAiContext] = React.useState("")
  const [showForm, setShowForm] = React.useState(false)

  const selected = items.find((i) => i.id === selectedId) ?? items[0] ?? null

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const rows = await getArtistBibles()
      setItems(rows)
      if (recordId) setSelectedId(recordId)
      else if (!selectedId && rows[0]) setSelectedId(rows[0].id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load artist bibles")
    } finally {
      setLoading(false)
    }
  }, [recordId, selectedId])

  React.useEffect(() => {
    void load()
  }, [load])

  React.useEffect(() => {
    setForm(formFromRecord(selected))
  }, [selected])

  const summary = summarizeArtistUniverse({ bibles: items, lore: [], concepts: [], arcs: [], visual: [] })

  async function handleSave() {
    if (!form.artistName.trim()) {
      toast.error("Artist name is required")
      return
    }
    setSaving(true)
    try {
      const payload = recordFromForm(form)
      if (selected && !showForm) {
        const updated = await updateArtistBible(selected.id, payload)
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
        toast.success("Artist bible updated")
      } else {
        const created = await createArtistBible(payload)
        setItems((prev) => [created, ...prev])
        setSelectedId(created.id)
        setShowForm(false)
        toast.success("Artist bible created")
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handlePrettyWiseStarter() {
    setSaving(true)
    try {
      const result = await createPrettyWiseStarterBible()
      toast.message(result.message)
      if (result.record) {
        setSelectedId(result.record.id)
        await load()
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Starter creation failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateContext() {
    if (!selected?.artistName) return
    setSaving(true)
    try {
      const text = await generateArtistContextSummary(selected.artistName)
      setAiContext(text)
      setTab("ai-context")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Context generation failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModuleShell>
      <ModulePageHeader
        title="Artist Bible"
        description="Define the identity, voice, sonic rules, visual style, audience, and creative boundaries for each artist project."
        actions={
          <>
            <Button size="sm" onClick={() => { setShowForm(true); setForm(EMPTY_FORM) }}>
              New Artist Bible
            </Button>
            <Button size="sm" variant="outline" disabled={!selected || saving} onClick={() => void handleGenerateContext()}>
              Generate AI Context
            </Button>
            <Link href={agentHref("release-strategist", { artistName: selected?.artistName })} className={buttonVariants({ size: "sm", variant: "outline" })}>
              Run Release Strategist
            </Link>
            <Link href={agentHref("learning-synthesizer", { artistName: selected?.artistName })} className={buttonVariants({ size: "sm", variant: "outline" })}>
              Run Learning Synthesizer
            </Link>
          </>
        }
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 && !showForm ? (
        <EmptyState
          icon={BookOpen}
          title="No artist bible yet"
          description="Create an artist bible to keep songs, visuals, products, campaigns, and AI prompts consistent."
          primaryActionLabel="New Artist Bible"
          primaryActionOnClick={() => setShowForm(true)}
          secondaryActionLabel="Create PrettyWise Starter Bible"
          secondaryActionOnClick={() => void handlePrettyWiseStarter()}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Artist Bibles" value={summary.bibleCount} />
            <StatCard label="Selected completeness" value={selected ? `${scoreArtistBibleCompleteness(selected)}%` : "—"} />
            <StatCard label="Active" value={items.filter((i) => i.status === "Active").length} />
            <StatCard label="With visual rules" value={items.filter((i) => i.visualRules.trim()).length} />
          </div>

          {(showForm || !selected) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{selected && !showForm ? "Edit Artist Bible" : "New Artist Bible"}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {(["artistName", "projectName", "labelName", "status", "genre", "subgenre"] as const).map((key) => (
                  <div key={key} className="space-y-1">
                    <Label>{key.replace(/([A-Z])/g, " $1")}</Label>
                    <Input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
                {(["mood", "aesthetic", "targetAudience", "brandPromise"] as const).map((key) => (
                  <div key={key} className="space-y-1 md:col-span-2">
                    <Label>{key.replace(/([A-Z])/g, " $1")}</Label>
                    <Textarea value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} rows={2} />
                  </div>
                ))}
                <div className="flex gap-2 md:col-span-2">
                  <Button size="sm" disabled={saving} onClick={() => void handleSave()}>{saving ? "Saving…" : "Save"}</Button>
                  {showForm ? <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button> : null}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <Button key={item.id} size="sm" variant={item.id === selected?.id ? "default" : "outline"} onClick={() => { setSelectedId(item.id); setShowForm(false) }}>
                {item.artistName}
              </Button>
            ))}
          </div>

          {selected ? (
            <ModuleWorkflowTabs tabs={[...TABS]} value={tab} onValueChange={setTab}>
              <ModuleTabPanel value="overview">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Music2 className="size-5" /> {selected.artistName}
                    </CardTitle>
                    <CardDescription>{selected.brandPromise || selected.shortBio || "No summary yet"}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <FieldRow label="Project" value={selected.projectName} />
                    <FieldRow label="Label" value={selected.labelName} />
                    <FieldRow label="Genre" value={selected.genre} />
                    <FieldRow label="Mood" value={selected.mood} />
                    <FieldRow label="Aesthetic" value={selected.aesthetic} />
                    <FieldRow label="Target audience" value={selected.targetAudience} />
                    <div className="md:col-span-2"><FieldRow label="Short bio" value={selected.shortBio} /></div>
                    <div className="md:col-span-2"><TagList tags={selected.tags} /></div>
                  </CardContent>
                </Card>
              </ModuleTabPanel>
              <ModuleTabPanel value="identity">
                <div className="grid gap-4 md:grid-cols-2">
                  <FieldRow label="Long bio" value={selected.longBio} />
                  <FieldRow label="Brand promise" value={selected.brandPromise} />
                </div>
              </ModuleTabPanel>
              <ModuleTabPanel value="voice">
                <div className="grid gap-4">
                  <FieldRow label="Voice rules" value={selected.voiceRules} />
                  <FieldRow label="Lyrical themes" value={selected.lyricalThemes} />
                </div>
              </ModuleTabPanel>
              <ModuleTabPanel value="sonic"><FieldRow label="Sonic rules" value={selected.sonicRules} /></ModuleTabPanel>
              <ModuleTabPanel value="visual"><FieldRow label="Visual rules" value={selected.visualRules} /></ModuleTabPanel>
              <ModuleTabPanel value="references">
                <div className="grid gap-4 md:grid-cols-2">
                  <div><p className="mb-2 text-sm font-medium">Do</p><TagList tags={selected.doList} /></div>
                  <div><p className="mb-2 text-sm font-medium">Don't</p><TagList tags={selected.dontList} /></div>
                  <div><p className="mb-2 text-sm font-medium">Reference artists</p><TagList tags={selected.referenceArtists} /></div>
                  <div><p className="mb-2 text-sm font-medium">Color palette</p><TagList tags={selected.colorPalette} /></div>
                </div>
              </ModuleTabPanel>
              <ModuleTabPanel value="ai-context">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="size-4" /> AI Context Preview</CardTitle>
                    <CardDescription>Compact context for agents and prompt runs. Generate on demand — never auto-overwrites canon.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button size="sm" variant="outline" disabled={saving} onClick={() => void handleGenerateContext()}>Generate AI Context</Button>
                    <pre className="max-h-96 overflow-auto rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap">{aiContext || "Click Generate AI Context to preview."}</pre>
                  </CardContent>
                </Card>
              </ModuleTabPanel>
              <ModuleTabPanel value="related">
                <div className="flex flex-wrap gap-2">
                  <Link href={`/lore?artist=${encodeURIComponent(selected.artistName)}`} className={buttonVariants({ size: "sm", variant: "outline" })}>Lore Manager</Link>
                  <Link href={`/song-vault?artist=${encodeURIComponent(selected.artistName)}`} className={buttonVariants({ size: "sm", variant: "outline" })}>Song Vault</Link>
                  <Link href={`/story-arcs?artist=${encodeURIComponent(selected.artistName)}`} className={buttonVariants({ size: "sm", variant: "outline" })}>Story Arcs</Link>
                  <Link href={`/visual-identity?artist=${encodeURIComponent(selected.artistName)}`} className={buttonVariants({ size: "sm", variant: "outline" })}>Visual Identity</Link>
                  <Link href="/artist-crm" className={buttonVariants({ size: "sm", variant: "outline" })}>Artist CRM</Link>
                </div>
                {selected.notes.includes("DEMO_DATA") ? <Badge className="mt-3" variant="secondary">Demo / starter record</Badge> : null}
                <Button size="sm" variant="destructive" className="mt-4" onClick={() => void deleteArtistBible(selected.id).then(load).then(() => toast.success("Deleted"))}>Delete bible</Button>
              </ModuleTabPanel>
            </ModuleWorkflowTabs>
          ) : null}
        </>
      )}
    </ModuleShell>
  )
}
