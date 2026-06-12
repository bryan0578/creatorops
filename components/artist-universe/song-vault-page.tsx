"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Copy, Loader2, Music, Pencil, Plus, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { getArtistBibleByArtistName, getArtistBibleById, getArtistBibles } from "@/lib/actions/artist-bible"
import { loadArtistUniverseContext } from "@/lib/actions/artist-universe"
import { getLoreEntryById } from "@/lib/actions/lore"
import {
  convertSongConceptToCampaign,
  convertSongConceptToReleasePlan,
  createPrettyWiseStarterSongConcepts,
  createPromptRunFromSongConcept,
  createQualityReviewFromSongConcept,
  createSongConcept,
  getSongConceptById,
  getSongConcepts,
  updateSongConcept,
} from "@/lib/actions/song-concepts"
import { getStoryArcById } from "@/lib/actions/story-arcs"
import { getVisualIdentityById, getVisualIdentityForArtist } from "@/lib/actions/visual-identity"
import type { ArtistBibleRecord, SongConceptRecord } from "@/lib/artist-universe/types"
import {
  buildSongContextFromArtistBible,
  buildSongContextFromLore,
  buildSongContextFromStoryArc,
  buildSongContextFromVisualIdentity,
  emptySongConceptForm,
  filterSongConceptForTab,
  isPrettyWiseArtist,
  mergeEmptySongConceptFields,
  prefillSongFromArtistBible,
  prefillSongFromLore,
  prefillSongFromStoryArc,
  prefillSongFromVisualIdentity,
  tabEmptyState,
} from "@/lib/artist-universe/song-vault-prefill"
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
import {
  SongConceptForm,
  type SongConceptFormState,
} from "@/components/artist-universe/song-concept-form"
import { RecordNotFound } from "@/components/record-not-found"
import { PageErrorState } from "@/components/page-error-state"
import { ModuleShell, ModuleTabPanel, ModuleWorkflowTabs } from "@/components/module/form-layout"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormTextarea } from "@/components/ui/form-field"
import { cn } from "@/lib/utils"

const TABS = [
  { value: "concepts", label: "Concepts" },
  { value: "writing", label: "Writing" },
  { value: "prompting", label: "Prompting" },
  { value: "planned", label: "Planned Releases" },
  { value: "visual", label: "Visual Ideas" },
  { value: "products", label: "Product Tie-ins" },
  { value: "ai", label: "AI Prompt Context" },
] as const

const VALID_TABS = new Set(TABS.map((t) => t.value))

const TAB_ALIASES: Record<string, string> = {
  concepts: "concepts",
  writing: "writing",
  prompting: "prompting",
  planned: "planned",
  "planned-releases": "planned",
  visual: "visual",
  visuals: "visual",
  "visual-ideas": "visual",
  products: "products",
  "product-tie-ins": "products",
  ai: "ai",
  "ai-prompt-context": "ai",
}

type EditorMode = "closed" | "create" | "edit"

function formFromRecord(record: SongConceptRecord): SongConceptFormState {
  return {
    title: record.title,
    artistName: record.artistName,
    status: record.status,
    songTitle: record.songTitle,
    conceptSummary: record.conceptSummary,
    genre: record.genre,
    mood: record.mood,
    lyricalTheme: record.lyricalTheme,
    storyRole: record.storyRole,
    hookIdea: record.hookIdea,
    chorusIdea: record.chorusIdea,
    sunoPrompt: record.sunoPrompt,
    lyricDraft: record.lyricDraft,
    visualConcept: record.visualConcept,
    youtubeAngle: record.youtubeAngle,
    productTieIn: record.productTieIn,
    campaignId: record.campaignId,
    campaignName: record.campaignName,
    releasePlanId: record.releasePlanId,
    relatedLoreIds: formatListForInput(record.relatedLoreIds),
    relatedAssetIds: formatListForInput(record.relatedAssetIds),
    relatedPromptRunIds: formatListForInput(record.relatedPromptRunIds),
    qualityReviewId: record.qualityReviewId,
    tags: formatTagsForInput(record.tags),
    notes: record.notes,
  }
}

function recordFromForm(
  form: SongConceptFormState,
): Omit<SongConceptRecord, "id" | "createdAt" | "updatedAt"> {
  return {
    title: form.title.trim(),
    artistName: form.artistName.trim(),
    status: form.status.trim() || "Idea",
    songTitle: form.songTitle.trim(),
    conceptSummary: form.conceptSummary.trim(),
    genre: form.genre.trim(),
    mood: form.mood.trim(),
    lyricalTheme: form.lyricalTheme.trim(),
    storyRole: form.storyRole.trim(),
    hookIdea: form.hookIdea.trim(),
    chorusIdea: form.chorusIdea.trim(),
    sunoPrompt: form.sunoPrompt.trim(),
    lyricDraft: form.lyricDraft.trim(),
    visualConcept: form.visualConcept.trim(),
    youtubeAngle: form.youtubeAngle.trim(),
    productTieIn: form.productTieIn.trim(),
    campaignId: form.campaignId.trim(),
    campaignName: form.campaignName.trim(),
    releasePlanId: form.releasePlanId.trim(),
    relatedLoreIds: parseListFromInput(form.relatedLoreIds),
    relatedAssetIds: parseListFromInput(form.relatedAssetIds),
    relatedPromptRunIds: parseListFromInput(form.relatedPromptRunIds),
    qualityReviewId: form.qualityReviewId.trim(),
    tags: parseTagsFromInput(form.tags),
    notes: form.notes.trim(),
  }
}

function CompactTags({ tags, max = 4 }: { tags: string[]; max?: number }) {
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
          +{extra}
        </Badge>
      ) : null}
    </div>
  )
}

function SongCard({
  concept,
  highlighted,
  onEdit,
  onRefresh,
}: {
  concept: SongConceptRecord
  highlighted?: boolean
  onEdit: (concept: SongConceptRecord) => void
  onRefresh: () => Promise<void>
}) {
  const displayTitle = concept.songTitle || concept.title
  const genreMood = [concept.genre, concept.mood].filter(Boolean).join(" · ")

  return (
    <Card
      className={cn(
        "border-border/80",
        highlighted ? "border-primary/50 ring-1 ring-primary/25" : undefined,
      )}
    >
      <CardHeader className="gap-1.5 p-3 pb-1">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-sm font-semibold leading-snug">{displayTitle}</CardTitle>
          <Button size="sm" variant="ghost" className="h-7 shrink-0 px-2 text-xs" onClick={() => onEdit(concept)}>
            <Pencil className="mr-1 size-3" />
            Edit
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{concept.artistName}</span>
          <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
            {concept.status || "Idea"}
          </Badge>
          {genreMood ? <span className="line-clamp-1">{genreMood}</span> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0">
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {concept.conceptSummary || "No summary"}
        </p>
        <CompactTags tags={concept.tags} />
        <div className="flex flex-wrap gap-1 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() =>
              void createPromptRunFromSongConcept(concept.id)
                .then(() => toast.success("Prompt run created"))
                .then(onRefresh)
            }
          >
            Suno Prompt
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() =>
              void convertSongConceptToReleasePlan(concept.id)
                .then(() => toast.success("Release plan created"))
                .then(onRefresh)
            }
          >
            Release Plan
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() =>
              void convertSongConceptToCampaign(concept.id)
                .then(() => toast.success("Campaign created"))
                .then(onRefresh)
            }
          >
            Campaign
          </Button>
          <Link
            href={`/youtube-packaging?artist=${encodeURIComponent(concept.artistName)}&fromSongConcept=${encodeURIComponent(concept.id)}`}
            className={buttonVariants({ size: "sm", variant: "outline", className: "h-7 px-2 text-xs" })}
          >
            YouTube
          </Link>
          <Link
            href={`/youtube-thumbnails?artist=${encodeURIComponent(concept.artistName)}&fromSongConcept=${encodeURIComponent(concept.id)}`}
            className={buttonVariants({ size: "sm", variant: "outline", className: "h-7 px-2 text-xs" })}
          >
            Thumbnail
          </Link>
          <Link
            href={`/campaigns?artist=${encodeURIComponent(concept.artistName)}&fromSongConcept=${encodeURIComponent(concept.id)}`}
            className={buttonVariants({ size: "sm", variant: "outline", className: "h-7 px-2 text-xs" })}
          >
            Campaign Link
          </Link>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() =>
              void createQualityReviewFromSongConcept(concept.id)
                .then(() => toast.success("Quality review created"))
                .then(onRefresh)
            }
          >
            Quality Review
          </Button>
          <Link
            href={`/story-arcs?artist=${encodeURIComponent(concept.artistName)}&fromSongConcept=${encodeURIComponent(concept.id)}`}
            className={buttonVariants({ size: "sm", variant: "outline", className: "h-7 px-2 text-xs" })}
          >
            Story Arc
          </Link>
          {concept.relatedLoreIds[0] ? (
            <Link
              href={`/lore?recordId=${encodeURIComponent(concept.relatedLoreIds[0])}&artist=${encodeURIComponent(concept.artistName)}`}
              className={buttonVariants({ size: "sm", variant: "outline", className: "h-7 px-2 text-xs" })}
            >
              Related Lore
            </Link>
          ) : (
            <Link
              href={`/lore?artist=${encodeURIComponent(concept.artistName)}`}
              className={buttonVariants({ size: "sm", variant: "outline", className: "h-7 px-2 text-xs" })}
            >
              Lore Manager
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function AiPromptPanel({
  concept,
  artistName,
}: {
  concept: SongConceptRecord | null
  artistName: string
}) {
  const [context, setContext] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!concept && !artistName.trim()) {
      setContext("")
      return
    }
    let cancelled = false
    setLoading(true)
    void loadArtistUniverseContext({
      artistName: concept?.artistName || artistName,
      songConceptId: concept?.id,
      includeLore: true,
      includeVisualIdentity: true,
    })
      .then((bundle) => {
        if (!cancelled) setContext(bundle.compactText || bundle.summary)
      })
      .catch(() => {
        if (!cancelled) setContext("")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [concept, artistName])

  if (!concept && !artistName.trim()) {
    const empty = tabEmptyState("ai")
    return (
      <EmptyState icon={Music} title={empty.title} description={empty.description} />
    )
  }

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {concept ? `AI context — ${concept.songTitle || concept.title}` : `AI context — ${artistName}`}
        </CardTitle>
        <CardDescription>
          Copyable prompt context from artist bible, visual identity, lore, and this song concept.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Building context…
          </div>
        ) : (
          <>
            <FormTextarea readOnly value={context || "No context available yet."} rows={14} className="font-mono text-xs" />
            <Button
              size="sm"
              variant="outline"
              disabled={!context.trim()}
              onClick={() => {
                void navigator.clipboard.writeText(context).then(() => toast.success("Copied to clipboard"))
              }}
            >
              <Copy className="mr-1 size-4" />
              Copy context
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function TabPanelContent({
  tabKey,
  concepts,
  showStarterConcepts,
  focusedId,
  contextArtist,
  onNew,
  onStarterConcepts,
  onEdit,
  onRefresh,
}: {
  tabKey: string
  concepts: SongConceptRecord[]
  showStarterConcepts: boolean
  focusedId: string | null
  contextArtist: string
  onNew: () => void
  onStarterConcepts: () => void
  onEdit: (concept: SongConceptRecord) => void
  onRefresh: () => Promise<void>
}) {
  if (tabKey === "ai") {
    const concept = focusedId ? concepts.find((c) => c.id === focusedId) ?? null : null
    return <AiPromptPanel concept={concept} artistName={contextArtist} />
  }

  const visible = filterSongConceptForTab(concepts, tabKey)
  const empty = tabEmptyState(tabKey)
  const tabLabel = TABS.find((t) => t.value === tabKey)?.label ?? "Concepts"

  if (visible.length === 0) {
    return (
      <EmptyState
        icon={Music}
        title={empty.title}
        description={empty.description}
        primaryActionLabel="New Song Concept"
        primaryActionOnClick={onNew}
        secondaryActionLabel={showStarterConcepts ? "Create PrettyWise Starter Song Concepts" : undefined}
        secondaryActionOnClick={showStarterConcepts ? onStarterConcepts : undefined}
      />
    )
  }

  return (
    <div className="space-y-3">
      {tabKey !== "concepts" ? (
        <p className="text-xs text-muted-foreground">
          {tabLabel}: {visible.length} {visible.length === 1 ? "concept" : "concepts"}
          {concepts.length !== visible.length ? ` · ${concepts.length} total for this artist` : ""}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((concept) => (
          <SongCard
            key={concept.id}
            concept={concept}
            highlighted={focusedId === concept.id}
            onEdit={onEdit}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  )
}

export function SongVaultPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const artistQuery = searchParams.get("artist")?.trim() ?? ""
  const fromArtistBibleId = searchParams.get("fromArtistBible")?.trim() ?? ""
  const fromVisualIdentityId = searchParams.get("fromVisualIdentity")?.trim() ?? ""
  const fromLoreId = searchParams.get("fromLore")?.trim() ?? ""
  const fromStoryArcId = searchParams.get("fromStoryArc")?.trim() ?? ""

  const { tab: rawTab, setTab, recordId } = useModuleTab("concepts", TAB_ALIASES)
  const tab = VALID_TABS.has(rawTab) ? rawTab : "concepts"

  const [items, setItems] = React.useState<SongConceptRecord[]>([])
  const [artistBibles, setArtistBibles] = React.useState<ArtistBibleRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<SongConceptFormState>(() => emptySongConceptForm(artistQuery))
  const [editorMode, setEditorMode] = React.useState<EditorMode>("closed")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [starterLoading, setStarterLoading] = React.useState(false)
  const [prefillBanner, setPrefillBanner] = React.useState<string | null>(null)
  const [prefillApplied, setPrefillApplied] = React.useState(false)
  const [sourceMissing, setSourceMissing] = React.useState<string | null>(null)
  const [hasPrettyWiseBible, setHasPrettyWiseBible] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [hasArtistContext, setHasArtistContext] = React.useState(false)
  const [titleHelper, setTitleHelper] = React.useState<string | undefined>()

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
    fetchById: getSongConceptById,
  })

  const filteredItems = React.useMemo(() => {
    if (!artistQuery) return items
    return items.filter((item) => item.artistName.toLowerCase() === artistQuery.toLowerCase())
  }, [items, artistQuery])

  const focused =
    deepLinked ??
    (selectedId ? items.find((item) => item.id === selectedId) ?? null : null) ??
    (recordId ? items.find((item) => item.id === recordId) ?? null : null)

  const showStarterConcepts =
    isPrettyWiseArtist(artistQuery) ||
    hasPrettyWiseBible ||
    filteredItems.some((c) => isPrettyWiseArtist(c.artistName))

  const load = React.useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [concepts, bibles] = await Promise.all([getSongConcepts(), getArtistBibles()])
      setItems(concepts)
      setArtistBibles(bibles)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load song concepts"
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
    if (deepLinked) setSelectedId(deepLinked.id)
  }, [deepLinked])

  React.useEffect(() => {
    setPrefillApplied(false)
    setPrefillBanner(null)
    setSourceMissing(null)
  }, [fromArtistBibleId, fromVisualIdentityId, fromLoreId, fromStoryArcId])

  React.useEffect(() => {
    if (prefillApplied || loading) return
    if (editorMode !== "closed" || recordId) return

    const openPrefill = (
      banner: string,
      nextForm: SongConceptFormState,
      helper?: string,
    ) => {
      setForm(nextForm)
      setEditorMode("create")
      setEditingId(null)
      setPrefillBanner(banner)
      setTitleHelper(helper)
      setPrefillApplied(true)
    }

    if (fromLoreId) {
      let cancelled = false
      void getLoreEntryById(fromLoreId).then((entry) => {
        if (cancelled) return
        if (!entry) {
          setSourceMissing("Lore entry not found — you can still create a song concept manually.")
          return
        }
        openPrefill(
          "Lore Entry",
          prefillSongFromLore(entry),
          `Suggested title: Song Concept: ${entry.title}`,
        )
      })
      return () => {
        cancelled = true
      }
    }

    if (fromStoryArcId) {
      let cancelled = false
      void getStoryArcById(fromStoryArcId).then((arc) => {
        if (cancelled) return
        if (!arc) {
          setSourceMissing("Story arc not found — you can still create a song concept manually.")
          return
        }
        openPrefill("Story Arc", prefillSongFromStoryArc(arc))
      })
      return () => {
        cancelled = true
      }
    }

    if (fromVisualIdentityId) {
      let cancelled = false
      void getVisualIdentityById(fromVisualIdentityId).then((profile) => {
        if (cancelled) return
        if (!profile) {
          setSourceMissing("Visual identity profile not found — you can still create a song concept manually.")
          return
        }
        openPrefill("Visual Identity", prefillSongFromVisualIdentity(profile))
      })
      return () => {
        cancelled = true
      }
    }

    if (fromArtistBibleId) {
      let cancelled = false
      void getArtistBibleById(fromArtistBibleId).then((bible) => {
        if (cancelled) return
        if (!bible) {
          setSourceMissing("Artist Bible not found — you can still create a song concept manually.")
          return
        }
        if (isPrettyWiseArtist(bible.artistName)) setHasPrettyWiseBible(true)
        openPrefill("Artist Bible", prefillSongFromArtistBible(bible))
      })
      return () => {
        cancelled = true
      }
    }
  }, [
    fromArtistBibleId,
    fromVisualIdentityId,
    fromLoreId,
    fromStoryArcId,
    prefillApplied,
    loading,
    recordId,
    editorMode,
  ])

  async function applyArtistContext(
    artistName: string,
    current: SongConceptFormState,
  ): Promise<SongConceptFormState> {
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

    let next: SongConceptFormState = { ...current, artistName: trimmed }
    if (bible) {
      next = mergeEmptySongConceptFields(next, {
        ...emptySongConceptForm(trimmed),
        ...buildSongContextFromArtistBible(bible),
      })
    }
    if (profile) {
      next = mergeEmptySongConceptFields(next, {
        ...emptySongConceptForm(trimmed),
        ...buildSongContextFromVisualIdentity(profile),
      })
    }
    if (!bible && !profile && isPrettyWiseArtist(trimmed)) {
      next = mergeEmptySongConceptFields(next, emptySongConceptForm(trimmed))
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
    const emptyForm = emptySongConceptForm(preselected)
    setForm(emptyForm)
    setEditingId(null)
    setEditorMode("create")
    setPrefillBanner(null)
    setTitleHelper(undefined)
    setHasArtistContext(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
    if (preselected) {
      void applyArtistContext(preselected, emptyForm).then(setForm)
    }
  }

  function openEdit(concept: SongConceptRecord) {
    setForm(formFromRecord(concept))
    setEditingId(concept.id)
    setSelectedId(concept.id)
    setEditorMode("edit")
    setPrefillBanner(null)
    setTitleHelper(undefined)
    setHasArtistContext(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function closeEditor() {
    setEditorMode("closed")
    setEditingId(null)
    setPrefillBanner(null)
    setTitleHelper(undefined)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.artistName.trim()) {
      toast.error("Title and artist name are required")
      return
    }
    setSaving(true)
    try {
      const payload = recordFromForm(form)
      if (editorMode === "edit" && editingId) {
        const updated = await updateSongConcept(editingId, payload)
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
        setSelectedId(updated.id)
        setEditorMode("closed")
        setEditingId(null)
        toast.success("Song concept updated")
        router.replace(
          `/song-vault?recordId=${encodeURIComponent(updated.id)}&artist=${encodeURIComponent(updated.artistName)}&tab=${tab}`,
        )
      } else {
        const created = await createSongConcept(payload)
        setItems((prev) => [created, ...prev])
        setSelectedId(created.id)
        setEditorMode("closed")
        setPrefillBanner(null)
        toast.success("Song concept created")
        router.replace(
          `/song-vault?recordId=${encodeURIComponent(created.id)}&artist=${encodeURIComponent(created.artistName)}&tab=concepts`,
        )
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleStarterConcepts() {
    setStarterLoading(true)
    try {
      const result = await createPrettyWiseStarterSongConcepts()
      toast.success(result.message)
      await load()
      setTab("concepts")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create starter song concepts")
    } finally {
      setStarterLoading(false)
    }
  }

  const editorOpen = editorMode !== "closed"
  const contextArtist = artistQuery || focused?.artistName || form.artistName

  return (
    <ModuleShell>
      <ModulePageHeader
        title="Song Concept Vault"
        description="Capture song ideas, hooks, Suno prompts, lyric drafts, visuals, YouTube angles, and release concepts."
        action={
          <Button size="sm" disabled={editorOpen} onClick={openCreate}>
            <Plus className="mr-1 size-4" />
            New Song Concept
          </Button>
        }
      />

      {isPrettyWiseArtist(contextArtist) ? (
        <Badge variant="secondary" className="w-fit">
          Creating song concepts for PrettyWise
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
      ) : fromLoreId ? (
        <Badge variant="outline" className="w-fit gap-1">
          <Sparkles className="size-3" />
          Using context from Lore Entry
        </Badge>
      ) : fromStoryArcId ? (
        <Badge variant="outline" className="w-fit gap-1">
          <Sparkles className="size-3" />
          Using context from Story Arc
        </Badge>
      ) : prefillBanner ? (
        <Badge variant="outline" className="w-fit gap-1">
          <Sparkles className="size-3" />
          Using context from {prefillBanner}
        </Badge>
      ) : null}

      {sourceMissing ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3 text-sm text-muted-foreground">{sourceMissing}</CardContent>
        </Card>
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
          recordLabel="Song concept"
          moduleHref="/song-vault"
          moduleLabel="Song Concept Vault"
        />
      ) : null}

      {focused && !editorOpen ? (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Selected: {focused.songTitle || focused.title}
            </CardTitle>
            <CardDescription>{focused.conceptSummary || "No summary"}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {filteredItems.length > 0 && !editorOpen ? (
        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Guided next actions</CardTitle>
            <CardDescription>Continue building release concepts from song ideas.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link
              href={`/lore?artist=${encodeURIComponent(contextArtist)}`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              Open Lore Manager
            </Link>
            <Link
              href={`/artist-bible?artist=${encodeURIComponent(contextArtist)}`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              Open Artist Bible
            </Link>
            <Link
              href={`/visual-identity?artist=${encodeURIComponent(contextArtist)}`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              Open Visual Identity
            </Link>
            <Link
              href={`/story-arcs?artist=${encodeURIComponent(contextArtist)}`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              Open Story Arcs
            </Link>
            {showStarterConcepts ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={starterLoading}
                onClick={() => void handleStarterConcepts()}
              >
                {starterLoading ? "Creating…" : "Create PrettyWise Starter Song Concepts"}
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
                    ? `Edit Song Concept — ${form.title || "Untitled"}`
                    : form.artistName.trim()
                      ? `New Song Concept for ${form.artistName.trim()}`
                      : "New Song Concept"}
                </CardTitle>
                <CardDescription className="max-w-2xl text-pretty">
                  {prefillBanner
                    ? `Review prefilled values from ${prefillBanner}, then save.`
                    : "Select an artist, then capture hooks, prompts, visuals, and release context."}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" disabled={saving} onClick={closeEditor}>
                  Cancel
                </Button>
                <Button size="sm" disabled={saving} onClick={() => void handleSave()}>
                  {saving ? "Saving…" : editorMode === "edit" ? "Save Changes" : "Save Song Concept"}
                </Button>
              </div>
            </CardHeader>
          </Card>
          <SongConceptForm
            mode={editorMode === "edit" ? "edit" : "create"}
            values={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            artistOptions={artistOptions}
            onArtistChange={(artistName) => void handleArtistChange(artistName)}
            onUseArtistContext={() => void handleUseArtistContext()}
            hasArtistContext={hasArtistContext}
            titleHelper={titleHelper}
          />
          <Card className="border-border/80">
            <CardContent className="flex justify-end gap-2 py-4">
              <Button variant="ghost" size="sm" disabled={saving} onClick={closeEditor}>
                Cancel
              </Button>
              <Button size="sm" disabled={saving} onClick={() => void handleSave()}>
                {saving ? "Saving…" : editorMode === "edit" ? "Save Changes" : "Save Song Concept"}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground text-pretty">
            Song vault tabs are filtered views of the same concept database. Use status, writing fields,
            prompts, visuals, and release links to organize ideas.
          </p>
          <ModuleWorkflowTabs tabs={[...TABS]} value={tab} onValueChange={setTab}>
            {TABS.map((t) => (
              <ModuleTabPanel key={t.value} value={t.value} keepMounted={false}>
                {tab === t.value ? (
                  <TabPanelContent
                    tabKey={t.value}
                    concepts={filteredItems}
                    showStarterConcepts={showStarterConcepts}
                    focusedId={focused?.id ?? null}
                    contextArtist={contextArtist}
                    onNew={openCreate}
                    onStarterConcepts={() => void handleStarterConcepts()}
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
