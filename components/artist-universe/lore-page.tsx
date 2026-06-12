"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Pencil, Plus, ScrollText, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { getArtistBibleByArtistName, getArtistBibleById, getArtistBibles } from "@/lib/actions/artist-bible"
import {
  archiveLoreEntry,
  createLoreEntry,
  createPrettyWiseStarterLore,
  getLoreEntries,
  getLoreEntryById,
  markLoreCanon,
  markLoreFlexible,
  updateLoreEntry,
} from "@/lib/actions/lore"
import { getVisualIdentityById, getVisualIdentityForArtist } from "@/lib/actions/visual-identity"
import type { ArtistBibleRecord, LoreEntryRecord } from "@/lib/artist-universe/types"
import {
  buildLoreContextFromArtistBible,
  buildLoreContextFromVisualIdentity,
  emptyLoreForm,
  filterLoreForTab,
  isPrettyWiseArtist,
  mergeEmptyLoreFields,
  prefillLoreFromArtistBible,
  prefillLoreFromVisualIdentity,
  tabEmptyState,
} from "@/lib/artist-universe/lore-prefill"
import { joinLoreTypes, parseLoreTypes } from "@/lib/artist-universe/lore-types"
import {
  formatListForInput,
  formatTagsForInput,
  normalizeTagsForDisplay,
  parseListFromInput,
  parseTagsFromInput,
} from "@/lib/artist-universe/utils"
import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { useModuleTab, useRecordDeepLink } from "@/components/artist-universe/shared"
import { LoreForm, type LoreFormState } from "@/components/artist-universe/lore-form"
import { RecordNotFound } from "@/components/record-not-found"
import { PageErrorState } from "@/components/page-error-state"
import { ModuleShell, ModuleTabPanel, ModuleWorkflowTabs } from "@/components/module/form-layout"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const TABS = [
  { value: "board", label: "Lore Board" },
  { value: "canon", label: "Canon" },
  { value: "characters", label: "Characters" },
  { value: "symbols", label: "Symbols & Motifs" },
  { value: "timeline", label: "Timeline" },
  { value: "ideas", label: "Story Ideas" },
  { value: "songs", label: "Related Songs" },
] as const

const TAB_ALIASES: Record<string, string> = {
  board: "board",
  canon: "canon",
  characters: "characters",
  symbols: "symbols",
  "symbols-motifs": "symbols",
  timeline: "timeline",
  ideas: "ideas",
  "story-ideas": "ideas",
  songs: "songs",
  "related-songs": "songs",
}

type EditorMode = "closed" | "create" | "edit"

function formFromRecord(record: LoreEntryRecord): LoreFormState {
  return {
    title: record.title,
    artistName: record.artistName,
    loreType: record.loreType,
    status: record.status,
    canonStatus: record.canonStatus,
    summary: record.summary,
    details: record.details,
    characters: formatListForInput(record.characters),
    locations: formatListForInput(record.locations),
    symbols: formatListForInput(record.symbols),
    themes: formatListForInput(record.themes),
    relatedSongs: formatListForInput(record.relatedSongs),
    relatedCampaignIds: formatListForInput(record.relatedCampaignIds),
    relatedAssetIds: formatListForInput(record.relatedAssetIds),
    tags: formatTagsForInput(record.tags),
    notes: record.notes,
  }
}

function recordFromForm(form: LoreFormState): Omit<LoreEntryRecord, "id" | "createdAt" | "updatedAt"> {
  return {
    title: form.title.trim(),
    artistName: form.artistName.trim(),
    loreType: joinLoreTypes(parseLoreTypes(form.loreType)) || "Theme",
    status: form.status.trim() || "Draft",
    canonStatus: form.canonStatus.trim() || "Flexible",
    summary: form.summary.trim(),
    details: form.details.trim(),
    characters: parseListFromInput(form.characters),
    locations: parseListFromInput(form.locations),
    symbols: parseListFromInput(form.symbols),
    themes: parseListFromInput(form.themes),
    relatedSongs: parseListFromInput(form.relatedSongs),
    relatedCampaignIds: parseListFromInput(form.relatedCampaignIds),
    relatedAssetIds: parseListFromInput(form.relatedAssetIds),
    tags: parseTagsFromInput(form.tags),
    notes: form.notes.trim(),
  }
}

function LoreTypeChips({ loreType }: { loreType: string }) {
  const types = parseLoreTypes(loreType)
  if (!types.length) {
    return (
      <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
        Not set
      </Badge>
    )
  }
  return (
    <>
      {types.map((type, index) => (
        <Badge key={`${type}-${index}`} variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
          {type}
        </Badge>
      ))}
    </>
  )
}

function CompactTags({ tags, max = 5 }: { tags: string[]; max?: number }) {
  const normalized = normalizeTagsForDisplay(tags)
  if (!normalized.length) return null
  const visible = normalized.slice(0, max)
  const extra = normalized.length - visible.length
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((tag, index) => (
        <Badge key={`${tag}-${index}`} variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
          {tag}
        </Badge>
      ))}
      {extra > 0 ? (
        <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
          +{extra} more
        </Badge>
      ) : null}
    </div>
  )
}

function LoreCard({
  entry,
  highlighted,
  onEdit,
  onRefresh,
}: {
  entry: LoreEntryRecord
  highlighted?: boolean
  onEdit: (entry: LoreEntryRecord) => void
  onRefresh: () => Promise<void>
}) {
  const cardTags = normalizeTagsForDisplay([...entry.tags, ...entry.symbols.slice(0, 3)])

  return (
    <Card
      className={cn(
        "border-border/80",
        highlighted ? "border-primary/50 ring-1 ring-primary/25" : undefined,
      )}
    >
      <CardHeader className="gap-1.5 p-3 pb-1">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-sm font-semibold leading-snug">{entry.title}</CardTitle>
          <Button size="sm" variant="ghost" className="h-7 shrink-0 px-2 text-xs" onClick={() => onEdit(entry)}>
            <Pencil className="mr-1 size-3" />
            Edit
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{entry.artistName}</span>
          <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
            {entry.canonStatus}
          </Badge>
          <LoreTypeChips loreType={entry.loreType} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0">
        <p className="line-clamp-2 text-xs text-muted-foreground">{entry.summary || "No summary"}</p>
        <CompactTags tags={cardTags} max={5} />
        <div className="flex flex-wrap gap-1 pt-1">
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => void markLoreCanon(entry.id).then(onRefresh)}>
            Canon
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => void markLoreFlexible(entry.id).then(onRefresh)}>
            Flexible
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => void updateLoreEntry(entry.id, { canonStatus: "Idea" }).then(onRefresh)}
          >
            Idea
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => void archiveLoreEntry(entry.id).then(onRefresh)}>
            Deprecated
          </Button>
          <Link
            href={`/song-vault?artist=${encodeURIComponent(entry.artistName)}&fromLore=${encodeURIComponent(entry.id)}`}
            className={buttonVariants({ size: "sm", variant: "outline", className: "h-7 px-2 text-xs" })}
          >
            Create Song Concept
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function TabPanelContent({
  tabKey,
  entries,
  showStarterLore,
  focusedId,
  onNew,
  onStarterLore,
  onEdit,
  onRefresh,
}: {
  tabKey: string
  entries: LoreEntryRecord[]
  showStarterLore: boolean
  focusedId: string | null
  onNew: () => void
  onStarterLore: () => void
  onEdit: (entry: LoreEntryRecord) => void
  onRefresh: () => Promise<void>
}) {
  const visible = filterLoreForTab(entries, tabKey)
  const empty = tabEmptyState(tabKey)
  const tabLabel = TABS.find((t) => t.value === tabKey)?.label ?? "Lore"

  if (visible.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title={empty.title}
        description={empty.description}
        primaryActionLabel="New Lore Entry"
        primaryActionOnClick={onNew}
        secondaryActionLabel={showStarterLore ? "Create PrettyWise Starter Lore" : undefined}
        secondaryActionOnClick={showStarterLore ? onStarterLore : undefined}
      />
    )
  }

  return (
    <div className="space-y-3">
      {tabKey !== "board" ? (
        <p className="text-xs text-muted-foreground">
          {tabLabel}: {visible.length} {visible.length === 1 ? "entry" : "entries"}
          {entries.length !== visible.length ? ` · ${entries.length} total for this artist` : ""}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {visible.map((entry) => (
        <LoreCard
          key={entry.id}
          entry={entry}
          highlighted={focusedId === entry.id}
          onEdit={onEdit}
          onRefresh={onRefresh}
        />
      ))}
      </div>
    </div>
  )
}

export function LorePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const artistQuery = searchParams.get("artist")?.trim() ?? ""
  const fromArtistBibleId = searchParams.get("fromArtistBible")?.trim() ?? ""
  const fromVisualIdentityId = searchParams.get("fromVisualIdentity")?.trim() ?? ""
  const { tab, setTab, recordId } = useModuleTab("board", TAB_ALIASES)

  const [items, setItems] = React.useState<LoreEntryRecord[]>([])
  const [artistBibles, setArtistBibles] = React.useState<ArtistBibleRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<LoreFormState>(() => emptyLoreForm(artistQuery))
  const [editorMode, setEditorMode] = React.useState<EditorMode>("closed")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [starterLoading, setStarterLoading] = React.useState(false)
  const [prefillBanner, setPrefillBanner] = React.useState<string | null>(null)
  const [prefillApplied, setPrefillApplied] = React.useState(false)
  const [hasPrettyWiseBible, setHasPrettyWiseBible] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [hasArtistContext, setHasArtistContext] = React.useState(false)

  const artistOptions = React.useMemo(
    () =>
      [...new Set(artistBibles.map((bible) => bible.artistName.trim()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [artistBibles],
  )

  const { resolved: deepLinked, missingRecordId, resolving } = useRecordDeepLink({
    recordId,
    items,
    loading,
    fetchById: getLoreEntryById,
  })

  const filteredItems = React.useMemo(() => {
    if (!artistQuery) return items
    return items.filter((item) => item.artistName.toLowerCase() === artistQuery.toLowerCase())
  }, [items, artistQuery])

  const focused =
    deepLinked ??
    (selectedId ? items.find((item) => item.id === selectedId) ?? null : null) ??
    (recordId ? items.find((item) => item.id === recordId) ?? null : null)

  const showStarterLore =
    isPrettyWiseArtist(artistQuery) ||
    hasPrettyWiseBible ||
    filteredItems.some((e) => isPrettyWiseArtist(e.artistName))

  const load = React.useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [entries, bibles] = await Promise.all([getLoreEntries(), getArtistBibles()])
      setItems(entries)
      setArtistBibles(bibles)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load lore"
      setLoadError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  React.useEffect(() => {
    let cancelled = false
    void getArtistBibleByArtistName("PrettyWise").then((bible) => {
      if (!cancelled) setHasPrettyWiseBible(Boolean(bible))
    })
    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    if (!fromArtistBibleId) return
    let cancelled = false
    void getArtistBibleById(fromArtistBibleId).then((bible) => {
      if (cancelled) return
      if (bible && isPrettyWiseArtist(bible.artistName)) setHasPrettyWiseBible(true)
    })
    return () => {
      cancelled = true
    }
  }, [fromArtistBibleId])

  React.useEffect(() => {
    if (deepLinked) setSelectedId(deepLinked.id)
  }, [deepLinked])

  React.useEffect(() => {
    setPrefillApplied(false)
    setPrefillBanner(null)
  }, [fromArtistBibleId, fromVisualIdentityId])

  React.useEffect(() => {
    if (prefillApplied || loading) return
    if (editorMode !== "closed" || recordId) return

    if (fromArtistBibleId) {
      let cancelled = false
      void getArtistBibleById(fromArtistBibleId).then((bible) => {
        if (cancelled || !bible) return
        setForm(prefillLoreFromArtistBible(bible))
        setEditorMode("create")
        setEditingId(null)
        setPrefillBanner("Artist Bible")
        setPrefillApplied(true)
      })
      return () => {
        cancelled = true
      }
    }

    if (fromVisualIdentityId) {
      let cancelled = false
      void getVisualIdentityById(fromVisualIdentityId).then((profile) => {
        if (cancelled || !profile) return
        setForm(prefillLoreFromVisualIdentity(profile))
        setEditorMode("create")
        setEditingId(null)
        setPrefillBanner("Visual Identity")
        setPrefillApplied(true)
      })
      return () => {
        cancelled = true
      }
    }
  }, [
    fromArtistBibleId,
    fromVisualIdentityId,
    prefillApplied,
    loading,
    recordId,
    editorMode,
  ])

  async function applyArtistContext(
    artistName: string,
    current: LoreFormState,
  ): Promise<LoreFormState> {
    const trimmed = artistName.trim()
    if (!trimmed) {
      setHasArtistContext(false)
      return { ...current, artistName: "" }
    }

    const [bible, profiles] = await Promise.all([
      getArtistBibleByArtistName(trimmed),
      getVisualIdentityForArtist(trimmed),
    ])
    const profile = profiles[0] ?? null
    setHasArtistContext(Boolean(bible || profile))

    let next: LoreFormState = { ...current, artistName: trimmed }
    if (bible) {
      next = mergeEmptyLoreFields(next, {
        ...emptyLoreForm(trimmed),
        ...buildLoreContextFromArtistBible(bible),
      } as LoreFormState)
    }
    if (profile) {
      next = mergeEmptyLoreFields(next, {
        ...emptyLoreForm(trimmed),
        ...buildLoreContextFromVisualIdentity(profile),
      } as LoreFormState)
    }
    if (!bible && !profile && isPrettyWiseArtist(trimmed)) {
      next = mergeEmptyLoreFields(next, emptyLoreForm(trimmed))
    }
    return next
  }

  async function handleArtistChange(artistName: string) {
    const next = await applyArtistContext(artistName, { ...form, artistName })
    setForm(next)
  }

  async function handleUseArtistContext() {
    if (!form.artistName.trim()) {
      toast.error("Select an artist first")
      return
    }
    const next = await applyArtistContext(form.artistName, form)
    setForm(next)
    toast.success("Filled empty fields from artist context")
  }

  function openCreate() {
    const preselected =
      artistQuery || (artistOptions.length === 1 ? artistOptions[0] : "")
    const emptyForm = emptyLoreForm(preselected)
    setForm(emptyForm)
    setEditingId(null)
    setEditorMode("create")
    setPrefillBanner(null)
    setHasArtistContext(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
    if (preselected) {
      void applyArtistContext(preselected, emptyForm).then(setForm)
    }
  }

  function openEdit(entry: LoreEntryRecord) {
    setForm(formFromRecord(entry))
    setEditingId(entry.id)
    setSelectedId(entry.id)
    setEditorMode("edit")
    setPrefillBanner(null)
    setHasArtistContext(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function closeEditor() {
    setEditorMode("closed")
    setEditingId(null)
    setPrefillBanner(null)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.artistName.trim()) {
      toast.error("Title and artist name are required")
      return
    }
    if (!form.loreType.trim() || parseLoreTypes(form.loreType).length === 0) {
      toast.error("Select at least one lore type")
      return
    }
    if (!form.status.trim() || !form.canonStatus.trim() || !form.summary.trim()) {
      toast.error("Status, canon status, and summary are required")
      return
    }
    setSaving(true)
    try {
      const payload = recordFromForm(form)
      if (editorMode === "edit" && editingId) {
        const updated = await updateLoreEntry(editingId, payload)
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
        setSelectedId(updated.id)
        setEditorMode("closed")
        setEditingId(null)
        toast.success("Lore entry updated")
        router.replace(
          `/lore?recordId=${encodeURIComponent(updated.id)}&artist=${encodeURIComponent(updated.artistName)}&tab=${tab}`,
        )
      } else {
        const created = await createLoreEntry(payload)
        setItems((prev) => [created, ...prev])
        setSelectedId(created.id)
        setEditorMode("closed")
        setPrefillBanner(null)
        toast.success("Lore entry created")
        router.replace(
          `/lore?recordId=${encodeURIComponent(created.id)}&artist=${encodeURIComponent(created.artistName)}&tab=board`,
        )
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleStarterLore() {
    setStarterLoading(true)
    try {
      const result = await createPrettyWiseStarterLore()
      toast.success(result.message)
      await load()
      setTab("board")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create starter lore")
    } finally {
      setStarterLoading(false)
    }
  }

  const editorOpen = editorMode !== "closed"
  const contextArtist = artistQuery || focused?.artistName || form.artistName

  return (
    <ModuleShell>
      <ModulePageHeader
        title="Lore Manager"
        description="Manage canon, flexible ideas, characters, symbols, story events, motifs, and worldbuilding for artist projects."
        action={
          <Button size="sm" disabled={editorOpen} onClick={openCreate}>
            <Plus className="mr-1 size-4" />
            New Lore Entry
          </Button>
        }
      />

      {isPrettyWiseArtist(contextArtist) ? (
        <Badge variant="secondary" className="w-fit">
          Creating lore for PrettyWise
        </Badge>
      ) : artistQuery ? (
        <Badge variant="secondary" className="w-fit">
          Filtered to {artistQuery}
        </Badge>
      ) : null}

      {fromArtistBibleId ? (
        <Badge variant="outline" className="w-fit gap-1">
          <Sparkles className="size-3" />
          Using context from Artist Bible
        </Badge>
      ) : fromVisualIdentityId ? (
        <Badge variant="outline" className="w-fit gap-1">
          <Sparkles className="size-3" />
          Using context from Visual Identity
        </Badge>
      ) : prefillBanner ? (
        <Badge variant="outline" className="w-fit gap-1">
          <Sparkles className="size-3" />
          Using context from {prefillBanner}
        </Badge>
      ) : null}

      {loading || resolving ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : null}

      {loadError ? <PageErrorState description={loadError} onRetry={() => void load()} /> : null}

      {missingRecordId ? (
        <RecordNotFound
          recordId={missingRecordId}
          recordLabel="Lore entry"
          moduleHref="/lore"
          moduleLabel="Lore Manager"
        />
      ) : null}

      {focused && !editorOpen ? (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Selected: {focused.title}</CardTitle>
            <CardDescription>{focused.summary}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {filteredItems.length > 0 && !editorOpen ? (
        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Guided next actions</CardTitle>
            <CardDescription>Continue building the artist universe from lore.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link
              href={`/song-vault?artist=${encodeURIComponent(contextArtist)}`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              Open Song Concept Vault
            </Link>
            {focused ? (
              <Link
                href={`/song-vault?artist=${encodeURIComponent(focused.artistName)}&fromLore=${encodeURIComponent(focused.id)}`}
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                Create Song Concept from Lore
              </Link>
            ) : null}
            <Link
              href={`/story-arcs?artist=${encodeURIComponent(contextArtist)}`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              Open Story Arcs
            </Link>
            <Link
              href={`/visual-identity?artist=${encodeURIComponent(contextArtist)}`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              Open Visual Identity
            </Link>
            <Link
              href={`/artist-bible?artist=${encodeURIComponent(contextArtist)}`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              Open Artist Bible
            </Link>
            {showStarterLore ? (
              <Button size="sm" variant="secondary" disabled={starterLoading} onClick={() => void handleStarterLore()}>
                {starterLoading ? "Creating…" : "Create PrettyWise Starter Lore"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {editorOpen ? (
        <div className="space-y-6">
          <Card className="border-border/80">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-xl">
                  {editorMode === "edit"
                    ? `Edit Lore — ${form.title || "Untitled"}`
                    : form.artistName.trim()
                      ? `New Lore Entry for ${form.artistName.trim()}`
                      : "New Lore Entry"}
                </CardTitle>
                <CardDescription className="max-w-2xl text-pretty">
                  {prefillBanner
                    ? `Review prefilled values from ${prefillBanner}, then save.`
                    : "Start with a symbol, character, location, theme, or story event that can connect songs, visuals, campaigns, and products."}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" disabled={saving} onClick={closeEditor}>
                  Cancel
                </Button>
                <Button size="sm" disabled={saving} onClick={() => void handleSave()}>
                  {saving ? "Saving…" : editorMode === "edit" ? "Save Changes" : "Save Lore Entry"}
                </Button>
              </div>
            </CardHeader>
          </Card>
          <LoreForm
            mode={editorMode === "edit" ? "edit" : "create"}
            values={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            artistOptions={artistOptions}
            onArtistChange={(artistName) => void handleArtistChange(artistName)}
            onUseArtistContext={() => void handleUseArtistContext()}
            hasArtistContext={hasArtistContext}
          />
          <Card className="border-border/80">
            <CardContent className="flex justify-end gap-2 py-4">
              <Button variant="ghost" size="sm" disabled={saving} onClick={closeEditor}>
                Cancel
              </Button>
              <Button size="sm" disabled={saving} onClick={() => void handleSave()}>
                {saving ? "Saving…" : editorMode === "edit" ? "Save Changes" : "Save Lore Entry"}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground text-pretty">
            Lore tabs are filtered views of the same lore database. Use Lore Type, Canon Status,
            Symbols, Characters, and Related Songs to organize entries.
          </p>
          <ModuleWorkflowTabs tabs={[...TABS]} value={tab} onValueChange={setTab}>
            {TABS.map((t) => (
              <ModuleTabPanel key={t.value} value={t.value} keepMounted={false}>
                {tab === t.value ? (
                  <TabPanelContent
                    tabKey={t.value}
                    entries={filteredItems}
                    showStarterLore={showStarterLore}
                    focusedId={focused?.id ?? null}
                    onNew={openCreate}
                    onStarterLore={() => void handleStarterLore()}
                    onEdit={openEdit}
                    onRefresh={load}
                  />
                ) : null}
              </ModuleTabPanel>
            ))}
          </ModuleWorkflowTabs>
        </div>
      )}
    </ModuleShell>
  )
}
