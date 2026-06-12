"use client"

import * as React from "react"
import Link from "next/link"
import { BookOpen, Copy, Loader2, Music2, Pencil, Plus, Sparkles } from "lucide-react"
import { toast } from "sonner"

import {
  createArtistBible,
  createPrettyWiseStarterBible,
  deleteArtistBible,
  duplicateArtistBible,
  generateArtistContextSummary,
  getArtistBibles,
  getArtistBibleById,
  updateArtistBible,
} from "@/lib/actions/artist-bible"
import { getVisualIdentityForArtist } from "@/lib/actions/visual-identity"
import { agentHref } from "@/lib/agents/routes"
import type { ArtistBibleRecord } from "@/lib/artist-universe/types"
import type { VisualIdentityProfileRecord } from "@/lib/artist-universe/types"
import {
  artistBibleCompletenessBreakdown,
  scoreArtistBibleCompleteness,
  summarizeArtistUniverse,
} from "@/lib/artist-universe/summary"
import {
  formatListForInput,
  formatTagsForInput,
  parseListFromInput,
  parseTagsFromInput,
} from "@/lib/artist-universe/utils"
import { ModulePageHeader } from "@/components/app-shell"
import {
  ArtistBibleEditor,
  type ArtistBibleFormSection,
  type ArtistBibleFormState,
} from "@/components/artist-universe/artist-bible-form"
import { EmptyState } from "@/components/empty-state"
import { FieldRow, StatCard, TagList, useModuleTab, useRecordDeepLink } from "@/components/artist-universe/shared"
import { CopyButton } from "@/components/copy-button"
import { RecordNotFound } from "@/components/record-not-found"
import { PageErrorState } from "@/components/page-error-state"
import { ModuleShell, ModuleTabPanel, ModuleWorkflowTabs } from "@/components/module/form-layout"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

const EMPTY_FORM: ArtistBibleFormState = {
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

type EditorMode = "closed" | "create" | "edit"

function formFromRecord(record: ArtistBibleRecord | null): ArtistBibleFormState {
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

function recordFromForm(form: ArtistBibleFormState): Omit<ArtistBibleRecord, "id" | "createdAt" | "updatedAt"> {
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

function completenessFromForm(form: ArtistBibleFormState): number {
  return scoreArtistBibleCompleteness({
    ...recordFromForm(form),
    id: "draft",
    createdAt: 0,
    updatedAt: 0,
  })
}

function ArtistSelector({
  items,
  selectedId,
  editorMode,
  onSelect,
  onNew,
}: {
  items: ArtistBibleRecord[]
  selectedId: string | null
  editorMode: EditorMode
  onSelect: (id: string) => void
  onNew: () => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your artists</p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {items.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={editorMode !== "create" && item.id === selectedId ? "default" : "outline"}
            className="shrink-0"
            onClick={() => onSelect(item.id)}
          >
            {item.artistName}
          </Button>
        ))}
        <Button
          size="sm"
          variant={editorMode === "create" ? "default" : "outline"}
          className="shrink-0"
          onClick={onNew}
        >
          <Plus className="mr-1 size-4" />
          New Artist Bible
        </Button>
      </div>
    </div>
  )
}

function visualIdentityLinks(selected: ArtistBibleRecord, profiles: VisualIdentityProfileRecord[]) {
  const artist = encodeURIComponent(selected.artistName)
  const fromBible = encodeURIComponent(selected.id)
  if (profiles.length === 0) {
    return {
      primaryHref: `/visual-identity?artist=${artist}&fromArtistBible=${fromBible}`,
      primaryLabel: "Create Visual Identity from Bible",
      secondaryHref: null as string | null,
    }
  }
  const primary = profiles[0]
  return {
    primaryHref: `/visual-identity?artist=${artist}&recordId=${encodeURIComponent(primary.id)}`,
    primaryLabel: "Open Visual Identity",
    secondaryHref: `/visual-identity?artist=${artist}&fromArtistBible=${fromBible}`,
  }
}

function ViewActions({
  selected,
  visualProfiles,
  onNew,
  onEdit,
  onCompleteMissing,
  saving,
  editorOpen,
}: {
  selected: ArtistBibleRecord
  visualProfiles: VisualIdentityProfileRecord[]
  onNew: () => void
  onEdit: () => void
  onCompleteMissing: () => void
  saving: boolean
  editorOpen: boolean
}) {
  const completeness = scoreArtistBibleCompleteness(selected)
  const vi = visualIdentityLinks(selected, visualProfiles)
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={saving || editorOpen} onClick={onNew}>
        <Plus className="mr-1 size-4" />
        New Artist Bible
      </Button>
      <Button size="sm" onClick={onEdit} disabled={saving || editorOpen}>
        <Pencil className="mr-1 size-4" />
        Edit Artist Bible
      </Button>
      {completeness < 100 ? (
        <Button size="sm" variant="secondary" disabled={saving} onClick={onCompleteMissing}>
          Complete Missing Sections
        </Button>
      ) : null}
      <Link href={vi.primaryHref} className={buttonVariants({ size: "sm", variant: "default" })}>
        {vi.primaryLabel}
      </Link>
      {vi.secondaryHref ? (
        <Link href={vi.secondaryHref} className={buttonVariants({ size: "sm", variant: "outline" })}>
          Create Another Visual Identity
        </Link>
      ) : null}
      <Link
        href={`/lore?artist=${encodeURIComponent(selected.artistName)}&fromArtistBible=${encodeURIComponent(selected.id)}`}
        className={buttonVariants({ size: "sm", variant: "outline" })}
      >
        Lore Manager
      </Link>
      <Link
        href={`/song-vault?artist=${encodeURIComponent(selected.artistName)}&fromArtistBible=${encodeURIComponent(selected.id)}`}
        className={buttonVariants({ size: "sm", variant: "outline" })}
      >
        Open Song Concept Vault
      </Link>
      <Link
        href={`/visual-identity?artist=${encodeURIComponent(selected.artistName)}`}
        className={buttonVariants({ size: "sm", variant: "outline" })}
      >
        Visual Identity Module
      </Link>
    </div>
  )
}

function CompletenessCard({ bible }: { bible: ArtistBibleRecord }) {
  const { score, missing } = artistBibleCompletenessBreakdown(bible)
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Completeness</CardTitle>
        <CardDescription>
          {score}% complete — {missing.length ? `${missing.length} fields still open` : "All core fields filled"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${score}%` }} />
        </div>
        {missing.length ? (
          <p className="text-xs text-muted-foreground text-pretty">
            Missing: {missing.slice(0, 8).join(", ")}
            {missing.length > 8 ? ` +${missing.length - 8} more` : ""}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Core artist bible fields are in good shape.</p>
        )}
      </CardContent>
    </Card>
  )
}

export function ArtistBiblePage() {
  const { tab, setTab, recordId } = useModuleTab("overview")
  const [items, setItems] = React.useState<ArtistBibleRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [scrollToSection, setScrollToSection] = React.useState<ArtistBibleFormSection | null>(null)
  const [editorMode, setEditorMode] = React.useState<EditorMode>("closed")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [aiContext, setAiContext] = React.useState("")
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [visualProfiles, setVisualProfiles] = React.useState<VisualIdentityProfileRecord[]>([])

  const { resolved: deepLinked, missingRecordId, resolving } = useRecordDeepLink({
    recordId,
    items,
    loading,
    fetchById: getArtistBibleById,
  })

  const selected =
    deepLinked ?? items.find((i) => i.id === selectedId) ?? items[0] ?? null

  const load = React.useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const rows = await getArtistBibles()
      setItems(rows)
      if (recordId && rows.some((r) => r.id === recordId)) {
        setSelectedId(recordId)
      } else if (!recordId && !selectedId && rows[0]) {
        setSelectedId(rows[0].id)
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load artist bibles"
      setLoadError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [recordId, selectedId])

  React.useEffect(() => {
    if (deepLinked) setSelectedId(deepLinked.id)
  }, [deepLinked])

  React.useEffect(() => {
    void load()
  }, [load])

  React.useEffect(() => {
    if (!selected?.artistName) {
      setVisualProfiles([])
      return
    }
    let cancelled = false
    void getVisualIdentityForArtist(selected.artistName).then((rows) => {
      if (!cancelled) setVisualProfiles(rows)
    })
    return () => {
      cancelled = true
    }
  }, [selected?.artistName])

  React.useEffect(() => {
    if (editorMode === "closed" && selected) {
      setForm(formFromRecord(selected))
    }
  }, [selected, editorMode])

  const summary = summarizeArtistUniverse({ bibles: items, lore: [], concepts: [], arcs: [], visual: [] })

  function openCreate() {
    setForm(EMPTY_FORM)
    setScrollToSection("identity")
    setEditingId(null)
    setEditorMode("create")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function selectArtist(id: string) {
    if (editorMode !== "closed") closeEditor()
    setSelectedId(id)
  }

  function openEdit(
    record: ArtistBibleRecord = selected!,
    section: ArtistBibleFormSection = "identity",
  ) {
    setForm(formFromRecord(record))
    setScrollToSection(section)
    setEditingId(record.id)
    setEditorMode("edit")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function closeEditor() {
    setEditorMode("closed")
    setEditingId(null)
    setScrollToSection(null)
    if (selected) setForm(formFromRecord(selected))
  }

  async function refreshAiContext(artistName: string) {
    try {
      const text = await generateArtistContextSummary(artistName)
      setAiContext(text)
    } catch {
      // Non-blocking after save
    }
  }

  async function nudgeVisualIdentityIfMissing(record: ArtistBibleRecord) {
    const profiles = await getVisualIdentityForArtist(record.artistName)
    setVisualProfiles(profiles)
    if (profiles.length === 0) {
      const href = `/visual-identity?artist=${encodeURIComponent(record.artistName)}&fromArtistBible=${encodeURIComponent(record.id)}`
      toast.message(`Next: create a Visual Identity for ${record.artistName}`, {
        action: {
          label: "Create Visual Identity",
          onClick: () => {
            window.location.href = href
          },
        },
      })
    }
  }

  async function handleSave() {
    const artistName = form.artistName.trim()
    if (!artistName) {
      toast.error("Artist name is required")
      return
    }

    if (editorMode === "create") {
      const duplicate = items.find(
        (item) => item.artistName.toLowerCase() === artistName.toLowerCase(),
      )
      if (duplicate) {
        toast.error(
          `An artist bible for "${duplicate.artistName}" already exists. Choose a different artist name or edit the existing record.`,
        )
        return
      }
    }

    setSaving(true)
    try {
      const payload = recordFromForm(form)
      if (editorMode === "edit" && editingId) {
        const updated = await updateArtistBible(editingId, payload)
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
        setSelectedId(updated.id)
        setEditorMode("closed")
        setEditingId(null)
        toast.success("Artist bible updated")
        if (aiContext) await refreshAiContext(updated.artistName)
        await nudgeVisualIdentityIfMissing(updated)
      } else if (editorMode === "create") {
        const created = await createArtistBible(payload)
        setItems((prev) => [created, ...prev])
        setSelectedId(created.id)
        setEditorMode("closed")
        setEditingId(null)
        toast.success(`Artist bible created for ${created.artistName}`)
        await nudgeVisualIdentityIfMissing(created)
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
      await refreshAiContext(selected.artistName)
      setTab("ai-context")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Context generation failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDuplicate() {
    if (!selected) return
    setSaving(true)
    try {
      const copy = await duplicateArtistBible(selected.id)
      setItems((prev) => [copy, ...prev])
      setSelectedId(copy.id)
      toast.success("Artist bible duplicated")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Duplicate failed")
    } finally {
      setSaving(false)
    }
  }

  const editorOpen = editorMode !== "closed"

  return (
    <ModuleShell>
      <ModulePageHeader
        title="Artist Bible"
        description="Define the identity, voice, sonic rules, visual style, audience, and creative boundaries for each artist project."
        action={
          <>
            <Button size="sm" disabled={saving || editorOpen} onClick={openCreate}>
              <Plus className="mr-1 size-4" />
              New Artist Bible
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!selected || saving || editorOpen}
              onClick={() => selected && openEdit(selected)}
            >
              <Pencil className="mr-1 size-4" />
              Edit Artist Bible
            </Button>
            <Button size="sm" variant="outline" disabled={!selected || saving} onClick={() => void handleGenerateContext()}>
              Generate AI Context
            </Button>
            <Link href={agentHref("release-strategist", { artistName: selected?.artistName })} className={buttonVariants({ size: "sm", variant: "outline" })}>
              Run Release Strategist
            </Link>
          </>
        }
      />

      {loading || resolving ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : loadError ? (
        <PageErrorState description={loadError} onRetry={() => void load()} />
      ) : missingRecordId ? (
        <RecordNotFound
          recordId={missingRecordId}
          recordLabel="Artist bible"
          moduleHref="/artist-bible"
          moduleLabel="Artist Bible"
        />
      ) : items.length === 0 && !editorOpen ? (
        <EmptyState
          icon={BookOpen}
          title="No artist bible yet"
          description="Create an artist bible to keep songs, visuals, products, campaigns, and AI prompts consistent."
          primaryActionLabel="Create Artist Bible"
          primaryActionOnClick={openCreate}
          secondaryActionLabel="Create PrettyWise Starter Bible"
          secondaryActionOnClick={() => void handlePrettyWiseStarter()}
        />
      ) : (
        <>
          {items.length > 0 ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Artist Bibles" value={summary.bibleCount} />
                <StatCard label="Selected completeness" value={selected ? `${scoreArtistBibleCompleteness(selected)}%` : "—"} />
                <StatCard label="Active" value={items.filter((i) => i.status === "Active").length} />
                <StatCard label="With visual rules" value={items.filter((i) => i.visualRules.trim()).length} />
              </div>

              <ArtistSelector
                items={items}
                selectedId={selectedId}
                editorMode={editorMode}
                onSelect={selectArtist}
                onNew={openCreate}
              />
            </>
          ) : null}

          {editorOpen ? (
            <ArtistBibleEditor
              mode={editorMode === "edit" ? "edit" : "create"}
              values={form}
              onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
              onSave={handleSave}
              onCancel={closeEditor}
              saving={saving}
              completenessScore={editorMode === "edit" ? completenessFromForm(form) : undefined}
              scrollToSection={scrollToSection}
              onPrettyWiseStarter={
                editorMode === "create"
                  ? async () => {
                      await handlePrettyWiseStarter()
                      closeEditor()
                    }
                  : undefined
              }
            />
          ) : selected ? (
            <>
              <ViewActions
                selected={selected}
                visualProfiles={visualProfiles}
                onNew={openCreate}
                onEdit={() => openEdit(selected)}
                onCompleteMissing={() => openEdit(selected)}
                saving={saving}
                editorOpen={editorOpen}
              />

              <ModuleWorkflowTabs tabs={[...TABS]} value={tab} onValueChange={setTab}>
                <ModuleTabPanel value="overview">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="border-border/80 lg:col-span-2">
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <Music2 className="size-5" /> {selected.artistName}
                            </CardTitle>
                            <CardDescription>
                              {selected.brandPromise || selected.shortBio || "No summary yet"}
                            </CardDescription>
                          </div>
                          <Badge variant="outline">{selected.status}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2">
                        <FieldRow label="Project" value={selected.projectName} />
                        <FieldRow label="Label" value={selected.labelName} />
                        <FieldRow label="Genre" value={selected.genre} />
                        <FieldRow label="Subgenre" value={selected.subgenre} />
                        <FieldRow label="Mood" value={selected.mood} />
                        <FieldRow label="Aesthetic" value={selected.aesthetic} />
                        <FieldRow label="Target audience" value={selected.targetAudience} />
                        <FieldRow label="Brand promise" value={selected.brandPromise} />
                        <div className="md:col-span-2">
                          <FieldRow label="Short bio" value={selected.shortBio} />
                        </div>
                        <div className="md:col-span-2">
                          <TagList tags={selected.tags} />
                        </div>
                      </CardContent>
                    </Card>
                    <CompletenessCard bible={selected} />
                  </div>
                </ModuleTabPanel>

                <ModuleTabPanel value="identity">
                  <div className="mb-4 flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => openEdit(selected, "identity")}>
                      <Pencil className="mr-1 size-4" /> Edit identity
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldRow label="Artist name" value={selected.artistName} />
                    <FieldRow label="Project name" value={selected.projectName} />
                    <FieldRow label="Label name" value={selected.labelName} />
                    <FieldRow label="Status" value={selected.status} />
                    <FieldRow label="Genre" value={selected.genre} />
                    <FieldRow label="Subgenre" value={selected.subgenre} />
                    <FieldRow label="Mood" value={selected.mood} />
                    <FieldRow label="Aesthetic" value={selected.aesthetic} />
                    <div className="md:col-span-2">
                      <FieldRow label="Target audience" value={selected.targetAudience} />
                    </div>
                    <div className="md:col-span-2">
                      <FieldRow label="Brand promise" value={selected.brandPromise} />
                    </div>
                    <div className="md:col-span-2">
                      <FieldRow label="Long bio" value={selected.longBio} />
                    </div>
                  </div>
                </ModuleTabPanel>

                <ModuleTabPanel value="voice">
                  <div className="mb-4 flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => openEdit(selected, "voice")}>
                      <Pencil className="mr-1 size-4" /> Edit voice & lyrics
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldRow label="Voice rules" value={selected.voiceRules} />
                    <FieldRow label="Lyrical themes" value={selected.lyricalThemes} />
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Do (lyrics-related)</p>
                      <TagList tags={selected.doList} />
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Don't</p>
                      <TagList tags={selected.dontList} />
                    </div>
                  </div>
                </ModuleTabPanel>

                <ModuleTabPanel value="sonic">
                  <div className="mb-4 flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => openEdit(selected, "sonic")}>
                      <Pencil className="mr-1 size-4" /> Edit sonic rules
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <FieldRow label="Sonic rules" value={selected.sonicRules} />
                    </div>
                    <FieldRow label="Genre" value={selected.genre} />
                    <FieldRow label="Subgenre" value={selected.subgenre} />
                    <FieldRow label="Mood" value={selected.mood} />
                    <div className="md:col-span-2">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Reference artists</p>
                      <TagList tags={selected.referenceArtists} />
                    </div>
                  </div>
                </ModuleTabPanel>

                <ModuleTabPanel value="visual">
                  <div className="mb-4 flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => openEdit(selected, "visual")}>
                      <Pencil className="mr-1 size-4" /> Edit visual rules
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <FieldRow label="Visual rules" value={selected.visualRules} />
                    </div>
                    <FieldRow label="Aesthetic" value={selected.aesthetic} />
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Color palette</p>
                      <TagList tags={selected.colorPalette} />
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Avoid / don't</p>
                      <TagList tags={selected.dontList} />
                    </div>
                  </div>
                </ModuleTabPanel>

                <ModuleTabPanel value="references">
                  <div className="mb-4 flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => openEdit(selected, "references")}>
                      <Pencil className="mr-1 size-4" /> Edit references
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Reference artists</p>
                      <TagList tags={selected.referenceArtists} />
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Reference media</p>
                      <TagList tags={selected.referenceMedia} />
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Keywords</p>
                      <TagList tags={selected.keywords} />
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</p>
                      <TagList tags={selected.tags} />
                    </div>
                    <div className="md:col-span-2">
                      <FieldRow label="Notes" value={selected.notes} />
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => openEdit(selected, "boundaries")}>
                        <Pencil className="mr-1 size-4" /> Edit creative boundaries
                      </Button>
                    </div>
                  </div>
                </ModuleTabPanel>

                <ModuleTabPanel value="ai-context">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Sparkles className="size-4" /> AI Context Preview
                      </CardTitle>
                      <CardDescription>
                        Compact context for agents and prompt runs. Regenerate after edits to refresh.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={saving} onClick={() => void handleGenerateContext()}>
                          Generate AI Context
                        </Button>
                        {aiContext ? <CopyButton value={aiContext} label="Copy context" /> : null}
                      </div>
                      <pre className="max-h-96 overflow-auto rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
                        {aiContext || "Click Generate AI Context to preview identity, sound, lyrics, visuals, rules, and references."}
                      </pre>
                    </CardContent>
                  </Card>
                </ModuleTabPanel>

                <ModuleTabPanel value="related">
                  <Card className="border-border/80">
                    <CardHeader>
                      <CardTitle className="text-base">Related modules</CardTitle>
                      <CardDescription>Jump to lore, songs, visuals, and campaigns for this artist.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/lore?artist=${encodeURIComponent(selected.artistName)}&fromArtistBible=${encodeURIComponent(selected.id)}`} className={buttonVariants({ size: "sm", variant: "outline" })}>Lore Manager</Link>
                        <Link href={`/song-vault?artist=${encodeURIComponent(selected.artistName)}&fromArtistBible=${encodeURIComponent(selected.id)}`} className={buttonVariants({ size: "sm", variant: "outline" })}>Open Song Concept Vault</Link>
                        <Link href={`/story-arcs?artist=${encodeURIComponent(selected.artistName)}`} className={buttonVariants({ size: "sm", variant: "outline" })}>Story Arcs</Link>
                        <Link href={`/visual-identity?artist=${encodeURIComponent(selected.artistName)}`} className={buttonVariants({ size: "sm", variant: "outline" })}>Visual Identity</Link>
                        <Link href="/campaigns" className={buttonVariants({ size: "sm", variant: "outline" })}>Campaigns</Link>
                        <Link href="/assets" className={buttonVariants({ size: "sm", variant: "outline" })}>Assets</Link>
                        <Link href="/artist-crm" className={buttonVariants({ size: "sm", variant: "outline" })}>Artist CRM</Link>
                      </div>
                      <div className="flex flex-wrap gap-2 border-t pt-4">
                        {(() => {
                          const vi = visualIdentityLinks(selected, visualProfiles)
                          return (
                            <>
                              <Link href={vi.primaryHref} className={buttonVariants({ size: "sm", variant: "default" })}>
                                {vi.primaryLabel}
                              </Link>
                              {vi.secondaryHref ? (
                                <Link href={vi.secondaryHref} className={buttonVariants({ size: "sm", variant: "outline" })}>
                                  Create Another Visual Identity
                                </Link>
                              ) : null}
                            </>
                          )
                        })()}
                        <Button size="sm" variant="outline" disabled={saving} onClick={() => void handleDuplicate()}>
                          <Copy className="mr-1 size-4" />
                          Duplicate Artist Bible
                        </Button>
                      </div>
                      {selected.notes.includes("DEMO_DATA") ? <Badge variant="secondary">Demo / starter record</Badge> : null}
                      <Button size="sm" variant="destructive" onClick={() => void deleteArtistBible(selected.id).then(load).then(() => toast.success("Deleted"))}>
                        Delete bible
                      </Button>
                    </CardContent>
                  </Card>
                </ModuleTabPanel>
              </ModuleWorkflowTabs>
            </>
          ) : items.length > 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Select an artist bible"
              description="Choose an artist above or create a new one."
              primaryActionLabel="New Artist Bible"
              primaryActionOnClick={openCreate}
            />
          ) : null}
        </>
      )}
    </ModuleShell>
  )
}
