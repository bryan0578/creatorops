"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Music, Palette, Pencil, Plus, ScrollText, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { getArtistBibleById } from "@/lib/actions/artist-bible"
import {
  createMockupPromptFromVisualIdentity,
  createThumbnailPromptFromVisualIdentity,
  createVisualIdentity,
  getVisualIdentityById,
  getVisualIdentityProfiles,
  updateVisualIdentity,
} from "@/lib/actions/visual-identity"
import type { VisualIdentityProfileRecord } from "@/lib/artist-universe/types"
import {
  buildVisualIdentityPrompt,
  prefillVisualIdentityFromArtistBible,
} from "@/lib/artist-universe/visual-identity-prefill"
import {
  formatListForInput,
  formatTagsForInput,
  orNotSet,
  parseListFromInput,
  parseTagsFromInput,
} from "@/lib/artist-universe/utils"
import { agentHref } from "@/lib/agents/routes"
import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { FieldRow, TagList, useModuleTab, useRecordDeepLink } from "@/components/artist-universe/shared"
import {
  EMPTY_VISUAL_IDENTITY_FORM,
  VisualIdentityForm,
  type VisualIdentityFormState,
} from "@/components/artist-universe/visual-identity-form"
import { CopyButton } from "@/components/copy-button"
import { RecordNotFound } from "@/components/record-not-found"
import { PageErrorState } from "@/components/page-error-state"
import { ModuleShell, ModuleTabPanel, ModuleWorkflowTabs } from "@/components/module/form-layout"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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

const TAB_ALIASES: Record<string, string> = {
  profiles: "profiles",
  style: "style",
  "style-rules": "style",
  colors: "colors",
  "color-palettes": "colors",
  character: "character",
  "character-rules": "character",
  thumbnail: "thumbnail",
  "thumbnail-rules": "thumbnail",
  merch: "merch",
  "merch-rules": "merch",
  assets: "assets",
  "reference-assets": "assets",
  prompt: "prompt",
  "prompt-builder": "prompt",
}

type EditorMode = "closed" | "create" | "edit"

function formFromRecord(record: VisualIdentityProfileRecord): VisualIdentityFormState {
  return {
    artistName: record.artistName,
    profileName: record.profileName,
    status: record.status,
    visualStyle: record.visualStyle,
    colorPalette: formatListForInput(record.colorPalette),
    typographyRules: record.typographyRules,
    characterRules: record.characterRules,
    environmentRules: record.environmentRules,
    imagePromptRules: record.imagePromptRules,
    thumbnailRules: record.thumbnailRules,
    merchDesignRules: record.merchDesignRules,
    forbiddenElements: formatListForInput(record.forbiddenElements),
    referenceAssetIds: formatListForInput(record.referenceAssetIds),
    referenceDriveFileIds: formatListForInput(record.referenceDriveFileIds),
    tags: formatTagsForInput(record.tags),
    notes: record.notes,
  }
}

function recordFromForm(form: VisualIdentityFormState): Omit<
  VisualIdentityProfileRecord,
  "id" | "createdAt" | "updatedAt"
> {
  return {
    artistName: form.artistName.trim(),
    profileName: form.profileName.trim(),
    status: form.status.trim() || "Active",
    visualStyle: form.visualStyle.trim(),
    colorPalette: parseListFromInput(form.colorPalette),
    typographyRules: form.typographyRules.trim(),
    characterRules: form.characterRules.trim(),
    environmentRules: form.environmentRules.trim(),
    imagePromptRules: form.imagePromptRules.trim(),
    thumbnailRules: form.thumbnailRules.trim(),
    merchDesignRules: form.merchDesignRules.trim(),
    forbiddenElements: parseListFromInput(form.forbiddenElements),
    referenceAssetIds: parseListFromInput(form.referenceAssetIds),
    referenceDriveFileIds: parseListFromInput(form.referenceDriveFileIds),
    tags: parseTagsFromInput(form.tags),
    notes: form.notes.trim(),
  }
}

function ColorSwatches({ colors }: { colors: string[] }) {
  if (!colors.length) return <span className="text-sm text-muted-foreground">Not set</span>
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <div key={color} className="flex items-center gap-2 rounded-md border border-border/80 px-2 py-1">
          <span
            className="size-4 shrink-0 rounded border border-border/60"
            style={{ backgroundColor: color.startsWith("#") ? color : undefined }}
            title={color}
          />
          <span className="font-mono text-xs">{color}</span>
        </div>
      ))}
    </div>
  )
}

const TAB_EMPTY: Record<
  string,
  { title: string; description: string; actionLabel?: string }
> = {
  profiles: {
    title: "No visual identity profiles yet",
    description:
      "Create a visual identity profile to keep covers, thumbnails, videos, and products consistent.",
    actionLabel: "New Profile",
  },
  style: {
    title: "No style rules yet",
    description:
      "Style rules define visual style, typography, environment, and image prompt guidance.",
    actionLabel: "New Profile",
  },
  colors: {
    title: "No color palette yet",
    description: "Add colors to keep thumbnails, covers, and merch consistent.",
    actionLabel: "New Profile",
  },
  character: {
    title: "No character rules yet",
    description: "Character rules keep your artist avatar and visual persona consistent.",
    actionLabel: "New Profile",
  },
  thumbnail: {
    title: "No thumbnail rules yet",
    description: "Thumbnail rules guide YouTube packaging and cover art.",
    actionLabel: "New Profile",
  },
  merch: {
    title: "No merch rules yet",
    description: "Merch rules guide product mockups and wearable graphics.",
    actionLabel: "New Profile",
  },
  assets: {
    title: "No reference assets linked",
    description: "Link reference assets or Drive files to guide image generation.",
    actionLabel: "New Profile",
  },
  prompt: {
    title: "Create a visual identity profile first",
    description: "Create a visual identity profile to build reusable image prompts.",
    actionLabel: "New Profile",
  },
}

function TabEmpty({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <EmptyState
      icon={Palette}
      title={title}
      description={description}
      primaryActionLabel={actionLabel}
      primaryActionOnClick={onAction}
    />
  )
}

function TabEmptyFor({
  tabKey,
  onAction,
}: {
  tabKey: string
  onAction?: () => void
}) {
  const config = TAB_EMPTY[tabKey] ?? TAB_EMPTY.profiles
  return (
    <TabEmpty
      title={config.title}
      description={config.description}
      actionLabel={config.actionLabel}
      onAction={onAction}
    />
  )
}

export function VisualIdentityPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const artistQuery = searchParams.get("artist")?.trim() ?? ""
  const fromArtistBibleId = searchParams.get("fromArtistBible")?.trim() ?? ""
  const { tab, setTab, recordId } = useModuleTab("profiles", TAB_ALIASES)

  const [items, setItems] = React.useState<VisualIdentityProfileRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<VisualIdentityFormState>(EMPTY_VISUAL_IDENTITY_FORM)
  const [editorMode, setEditorMode] = React.useState<EditorMode>("closed")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [prefillBanner, setPrefillBanner] = React.useState(false)
  const [prefillApplied, setPrefillApplied] = React.useState(false)

  const { resolved: deepLinked, missingRecordId, resolving } = useRecordDeepLink({
    recordId,
    items,
    loading,
    fetchById: getVisualIdentityById,
  })

  const filteredItems = React.useMemo(() => {
    if (!artistQuery) return items
    return items.filter(
      (item) => item.artistName.toLowerCase() === artistQuery.toLowerCase(),
    )
  }, [items, artistQuery])

  const profilePool = artistQuery ? filteredItems : items

  const selected =
    deepLinked ??
    (selectedId ? items.find((item) => item.id === selectedId) ?? null : null) ??
    profilePool[0] ??
    null

  const load = React.useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setItems(await getVisualIdentityProfiles())
    } catch (e) {
      const message = e instanceof Error ? e.message : "Load failed"
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
    if (deepLinked) setSelectedId(deepLinked.id)
  }, [deepLinked])

  React.useEffect(() => {
    if (recordId && items.some((item) => item.id === recordId)) {
      setSelectedId(recordId)
    }
  }, [recordId, items])

  React.useEffect(() => {
    if (editorMode === "closed" && selected) {
      setForm(formFromRecord(selected))
    }
  }, [selected, editorMode])

  React.useEffect(() => {
    setPrefillApplied(false)
  }, [fromArtistBibleId])

  React.useEffect(() => {
    if (prefillApplied || loading) return
    if (!fromArtistBibleId || editorMode !== "closed") return
    if (recordId) return

    let cancelled = false
    void getArtistBibleById(fromArtistBibleId).then((bible) => {
      if (cancelled || !bible) return
      setForm(prefillVisualIdentityFromArtistBible(bible))
      setEditorMode("create")
      setEditingId(null)
      setPrefillBanner(true)
      setPrefillApplied(true)
    })
    return () => {
      cancelled = true
    }
  }, [fromArtistBibleId, prefillApplied, loading, recordId, editorMode])

  function openCreate(prefillArtist?: string) {
    setForm({
      ...EMPTY_VISUAL_IDENTITY_FORM,
      artistName: prefillArtist ?? artistQuery,
    })
    setEditingId(null)
    setEditorMode("create")
    setPrefillBanner(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function openEdit(profile: VisualIdentityProfileRecord = selected!) {
    setForm(formFromRecord(profile))
    setEditingId(profile.id)
    setEditorMode("edit")
    setPrefillBanner(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function closeEditor() {
    setEditorMode("closed")
    setEditingId(null)
    setPrefillBanner(false)
    if (selected) setForm(formFromRecord(selected))
  }

  async function handleSave() {
    if (!form.artistName.trim() || !form.profileName.trim()) {
      toast.error("Artist name and profile name are required")
      return
    }
    setSaving(true)
    try {
      const payload = recordFromForm(form)
      if (editorMode === "edit" && editingId) {
        const updated = await updateVisualIdentity(editingId, payload)
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
        setSelectedId(updated.id)
        setEditorMode("closed")
        setEditingId(null)
        toast.success("Visual identity updated")
      } else if (editorMode === "create") {
        const created = await createVisualIdentity(payload)
        setItems((prev) => [created, ...prev])
        setSelectedId(created.id)
        setEditorMode("closed")
        setPrefillBanner(false)
        toast.success(`Visual identity created for ${created.artistName}`)
        router.replace(
          `/visual-identity?recordId=${encodeURIComponent(created.id)}&artist=${encodeURIComponent(created.artistName)}`,
        )
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const editorOpen = editorMode !== "closed"
  const promptText = selected ? buildVisualIdentityPrompt(selected) : ""

  return (
    <ModuleShell>
      <ModulePageHeader
        title="Visual Identity"
        description="Define artist visual rules for thumbnails, videos, merch, covers, mockups, and image generation prompts."
        action={
          <Button size="sm" disabled={editorOpen} onClick={() => openCreate(artistQuery || undefined)}>
            <Plus className="mr-1 size-4" />
            New Profile
          </Button>
        }
      />

      {editorOpen && editorMode === "create" && artistQuery ? (
        <Badge variant="secondary" className="w-fit">
          Creating profile for {artistQuery}
        </Badge>
      ) : artistQuery && !editorOpen ? (
        <Badge variant="secondary" className="w-fit">
          Filtered to {artistQuery}
        </Badge>
      ) : null}
      {prefillBanner ? (
        <Badge variant="outline" className="w-fit gap-1">
          <Sparkles className="size-3" />
          Prefilled from Artist Bible
        </Badge>
      ) : null}

      {loading || resolving ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : loadError ? (
        <PageErrorState description={loadError} onRetry={() => void load()} />
      ) : missingRecordId ? (
        <RecordNotFound
          recordId={missingRecordId}
          recordLabel="Visual identity profile"
          moduleHref="/visual-identity"
          moduleLabel="Visual Identity"
        />
      ) : editorOpen ? (
        <div className="space-y-6">
          <Card className="border-border/80">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-xl">
                  {editorMode === "edit"
                    ? `Edit Visual Identity — ${form.profileName || "Untitled"}`
                    : "New Visual Identity Profile"}
                </CardTitle>
                <CardDescription className="max-w-2xl text-pretty">
                  {prefillBanner
                    ? "Review prefilled values from the Artist Bible, then save."
                    : "Define style, colors, character, thumbnail, merch, and prompt rules."}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" disabled={saving} onClick={closeEditor}>
                  Cancel
                </Button>
                <Button size="sm" disabled={saving} onClick={() => void handleSave()}>
                  {saving ? "Saving…" : editorMode === "edit" ? "Save Changes" : "Save Profile"}
                </Button>
              </div>
            </CardHeader>
          </Card>
          <VisualIdentityForm
            mode={editorMode === "edit" ? "edit" : "create"}
            values={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          />
          <Card className="border-border/80">
            <CardContent className="flex justify-end gap-2 py-4">
              <Button variant="ghost" size="sm" disabled={saving} onClick={closeEditor}>
                Cancel
              </Button>
              <Button size="sm" disabled={saving} onClick={() => void handleSave()}>
                {saving ? "Saving…" : editorMode === "edit" ? "Save Changes" : "Save Profile"}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {items.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {artistQuery ? `Profiles for ${artistQuery}` : "All profiles"}
              </p>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {(artistQuery ? filteredItems : items).map((profile) => (
                  <Button
                    key={profile.id}
                    size="sm"
                    variant={profile.id === selected?.id ? "default" : "outline"}
                    className="shrink-0"
                    onClick={() => setSelectedId(profile.id)}
                  >
                    {profile.profileName}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => openCreate(artistQuery || selected?.artistName)}
                >
                  <Plus className="mr-1 size-4" />
                  New Profile
                </Button>
              </div>
            </div>
          ) : null}

          <ModuleWorkflowTabs tabs={[...TABS]} value={tab} onValueChange={setTab}>
            <ModuleTabPanel value="profiles">
              {items.length === 0 ? (
                <TabEmptyFor tabKey="profiles" onAction={() => openCreate(artistQuery || undefined)} />
              ) : selected ? (
                <Card className="border-border/80">
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">{selected.profileName}</CardTitle>
                        <CardDescription>{selected.artistName} · {selected.status}</CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(selected)}>
                          <Pencil className="mr-1 size-4" /> Edit Profile
                        </Button>
                        <Link
                          href={`/lore?artist=${encodeURIComponent(selected.artistName)}&fromVisualIdentity=${encodeURIComponent(selected.id)}`}
                          className={buttonVariants({ size: "sm", variant: "outline" })}
                        >
                          <ScrollText className="mr-1 size-4" />
                          Create Lore from Visual Identity
                        </Link>
                        <Link
                          href={`/song-vault?artist=${encodeURIComponent(selected.artistName)}&fromVisualIdentity=${encodeURIComponent(selected.id)}`}
                          className={buttonVariants({ size: "sm", variant: "outline" })}
                        >
                          <Music className="mr-1 size-4" />
                          Create Song Concept
                        </Link>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <FieldRow label="Visual style" value={selected.visualStyle} />
                    <FieldRow label="Thumbnail rules" value={selected.thumbnailRules} />
                    <div className="md:col-span-2">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Color palette</p>
                      <ColorSwatches colors={selected.colorPalette} />
                    </div>
                    <div className="md:col-span-2">
                      <TagList tags={selected.tags} />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <TabEmpty
                  title="Select a profile"
                  description="Choose a profile above or create a new one."
                  actionLabel="New Profile"
                  onAction={() => openCreate(artistQuery || undefined)}
                />
              )}
            </ModuleTabPanel>

            <ModuleTabPanel value="style">
              {!selected ? (
                <TabEmptyFor tabKey="style" onAction={() => openCreate(artistQuery || undefined)} />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <FieldRow label="Visual style" value={selected.visualStyle} />
                  <FieldRow label="Typography rules" value={selected.typographyRules} />
                  <FieldRow label="Environment rules" value={selected.environmentRules} />
                  <FieldRow label="Image prompt rules" value={selected.imagePromptRules} />
                  <div className="md:col-span-2 flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => openEdit(selected)}>
                      Edit style rules
                    </Button>
                  </div>
                </div>
              )}
            </ModuleTabPanel>

            <ModuleTabPanel value="colors">
              {!selected ? (
                <TabEmptyFor tabKey="colors" onAction={() => openCreate(artistQuery || undefined)} />
              ) : selected.colorPalette.length === 0 ? (
                <TabEmpty
                  title="No colors defined"
                  description="Add colors to keep thumbnails, covers, and merch consistent."
                  actionLabel="Add colors"
                  onAction={() => openEdit(selected)}
                />
              ) : (
                <Card className="border-border/80">
                  <CardHeader>
                    <CardTitle className="text-base">Color palette</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ColorSwatches colors={selected.colorPalette} />
                  </CardContent>
                </Card>
              )}
            </ModuleTabPanel>

            <ModuleTabPanel value="character">
              {!selected ? (
                <TabEmptyFor tabKey="character" onAction={() => openCreate(artistQuery || undefined)} />
              ) : !selected.characterRules.trim() && selected.forbiddenElements.length === 0 ? (
                <TabEmpty
                  title="No character rules yet"
                  description="Add character rules and forbidden elements for consistent visuals."
                  actionLabel="Add character rules"
                  onAction={() => openEdit(selected)}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <FieldRow label="Character rules" value={selected.characterRules} />
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Forbidden elements</p>
                    <TagList tags={selected.forbiddenElements} />
                  </div>
                </div>
              )}
            </ModuleTabPanel>

            <ModuleTabPanel value="thumbnail">
              {!selected ? (
                <TabEmptyFor tabKey="thumbnail" onAction={() => openCreate(artistQuery || undefined)} />
              ) : (
                <div className="space-y-4">
                  <FieldRow label="Thumbnail rules" value={selected.thumbnailRules} />
                  <FieldRow label="Image prompt rules" value={selected.imagePromptRules} />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void createThumbnailPromptFromVisualIdentity(selected.id).then((r) => {
                          window.location.href = r.href
                        })
                      }
                    >
                      Create Thumbnail Prompt
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(selected)}>
                      Edit thumbnail rules
                    </Button>
                  </div>
                </div>
              )}
            </ModuleTabPanel>

            <ModuleTabPanel value="merch">
              {!selected ? (
                <TabEmptyFor tabKey="merch" onAction={() => openCreate(artistQuery || undefined)} />
              ) : (
                <div className="space-y-4">
                  <FieldRow label="Merch design rules" value={selected.merchDesignRules} />
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Forbidden elements</p>
                    <TagList tags={selected.forbiddenElements} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void createMockupPromptFromVisualIdentity(selected.id).then(() =>
                          toast.success("Mockup prompt created"),
                        )
                      }
                    >
                      Create Mockup Prompt
                    </Button>
                    <Link href={agentHref("product-strategist", { artistName: selected.artistName })} className={buttonVariants({ size: "sm", variant: "outline" })}>
                      Run Product Strategist
                    </Link>
                  </div>
                </div>
              )}
            </ModuleTabPanel>

            <ModuleTabPanel value="assets">
              {!selected ? (
                <TabEmptyFor tabKey="assets" onAction={() => openCreate(artistQuery || undefined)} />
              ) : selected.referenceAssetIds.length === 0 &&
                selected.referenceDriveFileIds.length === 0 ? (
                <TabEmpty
                  title="No reference assets linked"
                  description="Link reference assets or Drive files to guide image generation."
                  actionLabel="Edit references"
                  onAction={() => openEdit(selected)}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Reference asset IDs</p>
                    <TagList tags={selected.referenceAssetIds} />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Reference Drive file IDs</p>
                    <TagList tags={selected.referenceDriveFileIds} />
                  </div>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/assets" className={buttonVariants({ size: "sm", variant: "outline" })}>Open Assets</Link>
                <Link href="/integrations?tab=google-drive" className={buttonVariants({ size: "sm", variant: "outline" })}>Open Google Drive Integration</Link>
              </div>
            </ModuleTabPanel>

            <ModuleTabPanel value="prompt">
              {!selected ? (
                <TabEmptyFor tabKey="prompt" onAction={() => openCreate(artistQuery || undefined)} />
              ) : (
                <Card className="border-border/80">
                  <CardHeader>
                    <CardTitle className="text-base">Visual identity prompt</CardTitle>
                    <CardDescription>Copy this block into Prompt Runner, mockups, or thumbnail tools.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <CopyButton value={promptText} label="Copy prompt" />
                    <pre className="max-h-96 overflow-auto rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
                      {promptText || orNotSet("")}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </ModuleTabPanel>
          </ModuleWorkflowTabs>
        </>
      )}
    </ModuleShell>
  )
}
