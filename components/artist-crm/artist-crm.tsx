"use client"

import * as React from "react"
import Link from "next/link"
import { parseImportJsonText } from "@/lib/safe-json"
import {
  BarChart3,
  CalendarDays,
  Copy,
  Database,
  Download,
  ExternalLink,
  ImagePlus,
  Plus,
  Search,
  Share2,
  Shirt,
  Trash2,
  Upload,
  Video,
} from "lucide-react"
import { toast } from "sonner"

import { useStore, createId } from "@/lib/store"
import type {
  ArtistCampaign,
  ArtistFormValues,
  ArtistMerchProduct,
  ArtistRecord,
  ArtistRelease,
  AssetRecord,
} from "@/lib/types"
import {
  ARTIST_CAMPAIGN_STATUSES,
  ARTIST_PRODUCT_STATUSES,
  ARTIST_TYPES,
  RELEASE_STATUSES,
} from "@/lib/types"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import { migrateLocalArtistsToDatabase } from "@/lib/actions/artists"
import { getAssets } from "@/lib/actions/assets"
import { filterAssetsForArtist } from "@/lib/assets"
import { downloadJson, loadArtistRecords } from "@/lib/storage"
import {
  buildFinalThumbnailText,
  finalFieldsFromThumbnailRecord,
} from "@/lib/youtube-thumbnails"
import {
  analyticsRecordLabel,
  buildArtistAnalyticsHref,
  buildArtistProfileText,
  buildArtistReleasePlannerHref,
  buildArtistSocialCampaignHref,
  buildArtistThumbnailHref,
  buildArtistYouTubePackagingHref,
  buildMerchIdeaPromptFromArtist,
  buildReleasePlannerPromptFromArtist,
  buildSocialRepurposingPromptFromArtist,
  buildYouTubePromptFromArtist,
  buildYouTubeThumbnailPromptFromArtist,
  emptyArtistCampaign,
  emptyArtistForm,
  emptyArtistMerchProduct,
  emptyArtistRelease,
  findRelatedThumbnails,
  normalizeArtistRecord,
  releasePlanLabel,
  thumbnailRecordLabel,
  youtubePackageLabel,
} from "@/lib/artist-crm"

import {
  ARTIST_CRM_WORKFLOW_TABS,
  ModulePageHeader,
  ModuleTabPanel,
  ModuleWorkflowTabs,
  RECENT_RECORDS_CARD_CLASS,
} from "@/components/module/form-layout"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { RelationshipPanel } from "@/components/relationships/relationship-panel"
import { EmptyState } from "@/components/empty-state"

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

const TEXTAREA_FIELDS = new Set([
  "subGenres",
  "mood",
  "brandDescription",
  "visualIdentity",
  "targetAudience",
  "contentStyle",
  "socialLinks",
  "notes",
])

const FIELD_LABELS: Record<keyof ArtistFormValues, string> = {
  artistName: "Artist name",
  artistType: "Artist type",
  genre: "Genre",
  subGenres: "Sub-genres",
  mood: "Mood",
  brandDescription: "Brand description",
  visualIdentity: "Visual identity",
  targetAudience: "Target audience",
  contentStyle: "Content style",
  youtubeChannel: "YouTube channel",
  spotifyLink: "Spotify link",
  appleMusicLink: "Apple Music link",
  amazonMusicLink: "Amazon Music link",
  websiteLink: "Website link",
  merchStoreLink: "Merch store link",
  socialLinks: "Social links",
  notes: "Notes",
}

const FORM_FIELD_ORDER: (keyof ArtistFormValues)[] = [
  "artistName",
  "artistType",
  "genre",
  "subGenres",
  "mood",
  "brandDescription",
  "visualIdentity",
  "targetAudience",
  "contentStyle",
  "youtubeChannel",
  "spotifyLink",
  "appleMusicLink",
  "amazonMusicLink",
  "websiteLink",
  "merchStoreLink",
  "socialLinks",
  "notes",
]

function DetailSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{title}</h4>
      <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
        {children}
      </div>
    </div>
  )
}

function LinkRow({ label, href }: { label: string; href: string }) {
  if (!href.trim()) return null
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
      >
        {href}
        <ExternalLink className="size-3" />
      </a>
    </div>
  )
}

const DETAIL_TAB_EMPTY_MESSAGE =
  "Save an artist or select one from Saved Artists to manage releases, products, and related records."

function DetailTabEmptyState() {
  return (
    <Card>
      <CardContent className="py-12 text-center text-sm text-muted-foreground">
        {DETAIL_TAB_EMPTY_MESSAGE}
      </CardContent>
    </Card>
  )
}

export function ArtistCrm() {
  const {
    prompts,
    artistRecords,
    artistRecordsUseDatabase,
    youtubeThumbnailRecords,
    youtubePackages,
    releasePlans,
    analyticsRecords,
    addArtistRecord,
    updateArtistRecord,
    deleteArtistRecord,
    importArtistRecords,
    reloadArtistRecords,
  } = useStore()

  const [form, setForm] = React.useState<ArtistFormValues>(emptyArtistForm())
  const [releases, setReleases] = React.useState<ArtistRelease[]>([])
  const [merchProducts, setMerchProducts] = React.useState<ArtistMerchProduct[]>(
    [],
  )
  const [campaigns, setCampaigns] = React.useState<ArtistCampaign[]>([])
  const [editingId, setEditingId] = React.useState<string | null>(null)

  const [recordSearch, setRecordSearch] = React.useState("")
  const [pendingDelete, setPendingDelete] = React.useState<ArtistRecord | null>(
    null,
  )
  const [migrating, setMigrating] = React.useState(false)
  const [assetRecords, setAssetRecords] = React.useState<AssetRecord[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const showDetail = Boolean(editingId || form.artistName.trim())

  const filteredRecords = React.useMemo(() => {
    const q = recordSearch.trim().toLowerCase()
    const sorted = [...artistRecords].sort((a, b) => b.updatedAt - a.updatedAt)
    if (!q) return sorted
    return sorted.filter(
      (record) =>
        record.artistName.toLowerCase().includes(q) ||
        record.genre.toLowerCase().includes(q) ||
        record.artistType.toLowerCase().includes(q) ||
        record.mood.toLowerCase().includes(q) ||
        record.targetAudience.toLowerCase().includes(q),
    )
  }, [artistRecords, recordSearch])

  function setField<K extends keyof ArtistFormValues>(
    key: K,
    value: ArtistFormValues[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setForm(emptyArtistForm())
    setReleases([])
    setMerchProducts([])
    setCampaigns([])
    setEditingId(null)
  }

  async function handleCopy(text: string, label: string) {
    try {
      await copyToClipboard(text)
      toast.success(`Copied ${label}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not copy")
    }
  }

  async function handleSave() {
    const now = Date.now()
    const record = normalizeArtistRecord({
      id: editingId ?? createId("artist"),
      ...form,
      releases,
      merchProducts,
      campaigns,
      createdAt: editingId
        ? (artistRecords.find((r) => r.id === editingId)?.createdAt ?? now)
        : now,
      updatedAt: now,
    })

    try {
      if (editingId) {
        await updateArtistRecord(record)
        toast.success("Artist updated")
      } else {
        await addArtistRecord(record)
        setEditingId(record.id)
        toast.success("Artist saved")
      }
    } catch {
      toast.error("Could not save artist to database")
    }
  }

  function openRecord(record: ArtistRecord) {
    const normalized = normalizeArtistRecord(record)
    setForm({
      artistName: normalized.artistName,
      artistType: normalized.artistType,
      genre: normalized.genre,
      subGenres: normalized.subGenres,
      mood: normalized.mood,
      brandDescription: normalized.brandDescription,
      visualIdentity: normalized.visualIdentity,
      targetAudience: normalized.targetAudience,
      contentStyle: normalized.contentStyle,
      youtubeChannel: normalized.youtubeChannel,
      spotifyLink: normalized.spotifyLink,
      appleMusicLink: normalized.appleMusicLink,
      amazonMusicLink: normalized.amazonMusicLink,
      websiteLink: normalized.websiteLink,
      merchStoreLink: normalized.merchStoreLink,
      socialLinks: normalized.socialLinks,
      notes: normalized.notes,
    })
    setReleases(normalized.releases)
    setMerchProducts(normalized.merchProducts)
    setCampaigns(normalized.campaigns)
    setEditingId(normalized.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
    toast.success("Artist loaded")
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    try {
      await deleteArtistRecord(pendingDelete.id)
      if (editingId === pendingDelete.id) resetForm()
      setPendingDelete(null)
      toast.success("Artist deleted")
    } catch {
      toast.error("Could not delete artist from database")
    }
  }

  function handleExport() {
    downloadJson("creatorops-artist-crm.json", artistRecords)
    toast.success("Exported artist CRM records")
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const importResult = parseImportJsonText(String(reader.result))
        if (!importResult.ok) {
          toast.error(importResult.message)
          return
        }
        const parsed = importResult.value
        const items = (Array.isArray(parsed) ? parsed : [parsed]).map((item) =>
          normalizeArtistRecord(item as ArtistRecord),
        )
        await importArtistRecords(items)
        toast.success(`Imported ${items.length} record(s) to database`)
      } catch {
        toast.error("Invalid JSON file or import failed")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  async function handleMigrateLocal() {
    const local = loadArtistRecords()
    if (local.length === 0) {
      toast.error("No artists found in localStorage to migrate")
      return
    }
    setMigrating(true)
    try {
      const { migrated, total } = await migrateLocalArtistsToDatabase(local)
      await reloadArtistRecords()
      toast.success(
        `Migrated ${migrated} local artist(s). Database now has ${total} total.`,
      )
    } catch {
      toast.error("Migration to database failed")
    } finally {
      setMigrating(false)
    }
  }

  function updateRelease(id: string, patch: Partial<ArtistRelease>) {
    setReleases((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    )
  }

  function updateMerch(id: string, patch: Partial<ArtistMerchProduct>) {
    setMerchProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    )
  }

  function updateCampaign(id: string, patch: Partial<ArtistCampaign>) {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    )
  }

  const relatedThumbnails = React.useMemo(
    () =>
      findRelatedThumbnails(
        form.artistName,
        releases,
        youtubeThumbnailRecords,
      ),
    [form.artistName, releases, youtubeThumbnailRecords],
  )

  const relatedAssets = React.useMemo(
    () => filterAssetsForArtist(assetRecords, form.artistName),
    [assetRecords, form.artistName],
  )

  React.useEffect(() => {
    void getAssets()
      .then(setAssetRecords)
      .catch(() => setAssetRecords([]))
  }, [])

  const primaryRelease = React.useMemo(
    () => releases.find((r) => r.songTitle.trim()) ?? releases[0],
    [releases],
  )

  const profileText = buildArtistProfileText(form, {
    releases,
    thumbnails: relatedThumbnails,
    thumbnailRecords: youtubeThumbnailRecords,
    youtubePackages,
    releasePlans,
    analyticsRecords,
    merchProducts,
    campaigns,
  })

  return (
    <div className="flex flex-col gap-8">
      <ModulePageHeader
        title="Artist / Label CRM"
        description="Manage artists, songs, releases, brand details, platform links, merch ideas, and campaigns for your AI music label."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleSave}>
              {editingId ? "Update artist" : "Save artist"}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                New artist
              </Button>
            ) : null}
          </div>
        }
      />

      <ModuleWorkflowTabs defaultTab="profile" tabs={ARTIST_CRM_WORKFLOW_TABS}>
        <ModuleTabPanel value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Artist profile</CardTitle>
              <CardDescription>
                Core brand and platform details for this artist or label brand
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {FORM_FIELD_ORDER.map((field) => {
                const id = `artist-${field}`
                const label = FIELD_LABELS[field]

                if (field === "artistType") {
                  return (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={id}>{label}</Label>
                      <Select
                        value={form.artistType}
                        onValueChange={(v) => setField("artistType", v)}
                      >
                        <SelectTrigger id={id} className="w-full">
                          <span className="truncate">{form.artistType}</span>
                        </SelectTrigger>
                        <SelectContent className="min-w-[260px]">
                          {ARTIST_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                }

                const commonProps = {
                  id,
                  value: form[field],
                  onChange: (
                    e: React.ChangeEvent<
                      HTMLInputElement | HTMLTextAreaElement
                    >,
                  ) => setField(field, e.target.value),
                  placeholder: `Enter ${label.toLowerCase()}...`,
                  className: "w-full",
                }

                return (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={id}>{label}</Label>
                    {TEXTAREA_FIELDS.has(field) ? (
                      <Textarea
                        {...commonProps}
                        className="min-h-20 w-full"
                      />
                    ) : (
                      <Input {...commonProps} />
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="releases">
          {showDetail ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="text-base">Songs / releases</CardTitle>
                  <CardDescription>
                    Track releases and production status
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setReleases((prev) => [...prev, emptyArtistRelease()])
                  }
                >
                  <Plus className="size-4" />
                  Add release
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {releases.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No releases added yet.
                  </p>
                ) : (
                  releases.map((release) => (
                    <div
                      key={release.id}
                      className="space-y-3 rounded-md border p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-sm font-medium">Release</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={() =>
                            setReleases((prev) =>
                              prev.filter((r) => r.id !== release.id),
                            )
                          }
                          aria-label="Remove release"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Song title</Label>
                          <Input
                            value={release.songTitle}
                            onChange={(e) =>
                              updateRelease(release.id, {
                                songTitle: e.target.value,
                              })
                            }
                            placeholder="Song title..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Release date</Label>
                          <Input
                            value={release.releaseDate}
                            onChange={(e) =>
                              updateRelease(release.id, {
                                releaseDate: e.target.value,
                              })
                            }
                            placeholder="YYYY-MM-DD"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select
                            value={release.status}
                            onValueChange={(v) =>
                              updateRelease(release.id, { status: v })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <span className="truncate">{release.status}</span>
                            </SelectTrigger>
                            <SelectContent>
                              {RELEASE_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Genre</Label>
                          <Input
                            value={release.genre}
                            onChange={(e) =>
                              updateRelease(release.id, {
                                genre: e.target.value,
                              })
                            }
                            placeholder="Genre..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Mood</Label>
                          <Input
                            value={release.mood}
                            onChange={(e) =>
                              updateRelease(release.id, {
                                mood: e.target.value,
                              })
                            }
                            placeholder="Mood..."
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>YouTube URL</Label>
                          <Input
                            value={release.youtubeUrl}
                            onChange={(e) =>
                              updateRelease(release.id, {
                                youtubeUrl: e.target.value,
                              })
                            }
                            placeholder="https://..."
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Streaming links</Label>
                          <Textarea
                            value={release.streamingLinks}
                            onChange={(e) =>
                              updateRelease(release.id, {
                                streamingLinks: e.target.value,
                              })
                            }
                            className="min-h-16"
                            placeholder="Spotify, Apple Music, etc."
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Notes</Label>
                          <Textarea
                            value={release.notes}
                            onChange={(e) =>
                              updateRelease(release.id, {
                                notes: e.target.value,
                              })
                            }
                            className="min-h-16"
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Linked thumbnail</Label>
                          <Select
                            value={release.thumbnailRecordId || "none"}
                            onValueChange={(v) =>
                              updateRelease(release.id, {
                                thumbnailRecordId: v === "none" ? "" : v,
                              })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <span className="truncate">
                                {(() => {
                                  if (!release.thumbnailRecordId) {
                                    return "None linked"
                                  }
                                  const linked = youtubeThumbnailRecords.find(
                                    (t) => t.id === release.thumbnailRecordId,
                                  )
                                  return linked
                                    ? thumbnailRecordLabel(linked)
                                    : "Missing thumbnail record"
                                })()}
                              </span>
                            </SelectTrigger>
                            <SelectContent className="min-w-[280px]">
                              <SelectItem value="none">None linked</SelectItem>
                              {youtubeThumbnailRecords.map((record) => (
                                <SelectItem key={record.id} value={record.id}>
                                  {thumbnailRecordLabel(record)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Linked YouTube packaging</Label>
                          <Select
                            value={release.youtubePackagingRecordId || "none"}
                            onValueChange={(v) =>
                              updateRelease(release.id, {
                                youtubePackagingRecordId:
                                  v === "none" ? "" : v,
                              })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <span className="truncate">
                                {(() => {
                                  if (!release.youtubePackagingRecordId) {
                                    return "None linked"
                                  }
                                  const linked = youtubePackages.find(
                                    (p) =>
                                      p.id === release.youtubePackagingRecordId,
                                  )
                                  return linked
                                    ? youtubePackageLabel(linked)
                                    : "Missing packaging record"
                                })()}
                              </span>
                            </SelectTrigger>
                            <SelectContent className="min-w-[280px]">
                              <SelectItem value="none">None linked</SelectItem>
                              {youtubePackages.map((record) => (
                                <SelectItem key={record.id} value={record.id}>
                                  {youtubePackageLabel(record)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Linked release plan</Label>
                          <Select
                            value={release.releasePlanRecordId || "none"}
                            onValueChange={(v) =>
                              updateRelease(release.id, {
                                releasePlanRecordId: v === "none" ? "" : v,
                              })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <span className="truncate">
                                {(() => {
                                  if (!release.releasePlanRecordId) {
                                    return "None linked"
                                  }
                                  const linked = releasePlans.find(
                                    (p) => p.id === release.releasePlanRecordId,
                                  )
                                  return linked
                                    ? releasePlanLabel(linked)
                                    : "Missing release plan"
                                })()}
                              </span>
                            </SelectTrigger>
                            <SelectContent className="min-w-[280px]">
                              <SelectItem value="none">None linked</SelectItem>
                              {releasePlans.map((record) => (
                                <SelectItem key={record.id} value={record.id}>
                                  {releasePlanLabel(record)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Linked analytics record</Label>
                          <Select
                            value={release.analyticsRecordId || "none"}
                            onValueChange={(v) =>
                              updateRelease(release.id, {
                                analyticsRecordId: v === "none" ? "" : v,
                              })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <span className="truncate">
                                {(() => {
                                  if (!release.analyticsRecordId) {
                                    return "None linked"
                                  }
                                  const linked = analyticsRecords.find(
                                    (a) => a.id === release.analyticsRecordId,
                                  )
                                  return linked
                                    ? analyticsRecordLabel(linked)
                                    : "Missing analytics record"
                                })()}
                              </span>
                            </SelectTrigger>
                            <SelectContent className="min-w-[280px]">
                              <SelectItem value="none">None linked</SelectItem>
                              {analyticsRecords.map((record) => (
                                <SelectItem key={record.id} value={record.id}>
                                  {analyticsRecordLabel(record)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : (
            <DetailTabEmptyState />
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="products">
          {showDetail ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="text-base">Merch / products</CardTitle>
                  <CardDescription>
                    Related merch and product ideas
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setMerchProducts((prev) => [
                      ...prev,
                      emptyArtistMerchProduct(),
                    ])
                  }
                >
                  <Plus className="size-4" />
                  Add product
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {merchProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No merch or products added yet.
                  </p>
                ) : (
                  merchProducts.map((product) => (
                    <div
                      key={product.id}
                      className="space-y-3 rounded-md border p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-sm font-medium">Product</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={() =>
                            setMerchProducts((prev) =>
                              prev.filter((p) => p.id !== product.id),
                            )
                          }
                          aria-label="Remove product"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Product name</Label>
                          <Input
                            value={product.productName}
                            onChange={(e) =>
                              updateMerch(product.id, {
                                productName: e.target.value,
                              })
                            }
                            placeholder="Product name..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Product type</Label>
                          <Input
                            value={product.productType}
                            onChange={(e) =>
                              updateMerch(product.id, {
                                productType: e.target.value,
                              })
                            }
                            placeholder="T-shirt, hoodie, etc."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select
                            value={product.status}
                            onValueChange={(v) =>
                              updateMerch(product.id, { status: v })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <span className="truncate">{product.status}</span>
                            </SelectTrigger>
                            <SelectContent>
                              {ARTIST_PRODUCT_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Store link</Label>
                          <Input
                            value={product.storeLink}
                            onChange={(e) =>
                              updateMerch(product.id, {
                                storeLink: e.target.value,
                              })
                            }
                            placeholder="https://..."
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Notes</Label>
                          <Textarea
                            value={product.notes}
                            onChange={(e) =>
                              updateMerch(product.id, {
                                notes: e.target.value,
                              })
                            }
                            className="min-h-16"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : (
            <DetailTabEmptyState />
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="campaigns">
          {showDetail ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="text-base">Campaigns</CardTitle>
                  <CardDescription>
                    Marketing and promo campaigns for this artist
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCampaigns((prev) => [...prev, emptyArtistCampaign()])
                  }
                >
                  <Plus className="size-4" />
                  Add campaign
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {campaigns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No campaigns added yet.
                  </p>
                ) : (
                  campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="space-y-3 rounded-md border p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-sm font-medium">Campaign</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={() =>
                            setCampaigns((prev) =>
                              prev.filter((c) => c.id !== campaign.id),
                            )
                          }
                          aria-label="Remove campaign"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Campaign name</Label>
                          <Input
                            value={campaign.campaignName}
                            onChange={(e) =>
                              updateCampaign(campaign.id, {
                                campaignName: e.target.value,
                              })
                            }
                            placeholder="Campaign name..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Campaign type</Label>
                          <Input
                            value={campaign.campaignType}
                            onChange={(e) =>
                              updateCampaign(campaign.id, {
                                campaignType: e.target.value,
                              })
                            }
                            placeholder="Release, merch drop, etc."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select
                            value={campaign.status}
                            onValueChange={(v) =>
                              updateCampaign(campaign.id, { status: v })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <span className="truncate">{campaign.status}</span>
                            </SelectTrigger>
                            <SelectContent>
                              {ARTIST_CAMPAIGN_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Start date</Label>
                          <Input
                            value={campaign.startDate}
                            onChange={(e) =>
                              updateCampaign(campaign.id, {
                                startDate: e.target.value,
                              })
                            }
                            placeholder="YYYY-MM-DD"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End date</Label>
                          <Input
                            value={campaign.endDate}
                            onChange={(e) =>
                              updateCampaign(campaign.id, {
                                endDate: e.target.value,
                              })
                            }
                            placeholder="YYYY-MM-DD"
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Notes</Label>
                          <Textarea
                            value={campaign.notes}
                            onChange={(e) =>
                              updateCampaign(campaign.id, {
                                notes: e.target.value,
                              })
                            }
                            className="min-h-16"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : (
            <DetailTabEmptyState />
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="related">
          {showDetail ? (
            <>
              <Card>
                <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle className="text-base">
                      {form.artistName || "Untitled artist"}
                    </CardTitle>
                    <CardDescription>
                      {form.artistType}
                      {form.genre ? ` · ${form.genre}` : ""}
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!profileText.trim()}
                    onClick={() => handleCopy(profileText, "artist profile")}
                  >
                    <Copy className="size-4" />
                    Copy profile
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {form.brandDescription.trim() ? (
                    <DetailSection title="Brand notes">
                      {form.brandDescription}
                    </DetailSection>
                  ) : null}

                  {(form.youtubeChannel ||
                    form.spotifyLink ||
                    form.appleMusicLink ||
                    form.amazonMusicLink ||
                    form.websiteLink ||
                    form.merchStoreLink ||
                    form.socialLinks) && (
                    <DetailSection title="Platform links">
                      <div className="space-y-2">
                        {form.youtubeChannel ? (
                          <p>YouTube: {form.youtubeChannel}</p>
                        ) : null}
                        <LinkRow label="Spotify" href={form.spotifyLink} />
                        <LinkRow
                          label="Apple Music"
                          href={form.appleMusicLink}
                        />
                        <LinkRow
                          label="Amazon Music"
                          href={form.amazonMusicLink}
                        />
                        <LinkRow label="Website" href={form.websiteLink} />
                        <LinkRow
                          label="Merch store"
                          href={form.merchStoreLink}
                        />
                        {form.socialLinks ? (
                          <p className="whitespace-pre-wrap">
                            {form.socialLinks}
                          </p>
                        ) : null}
                      </div>
                    </DetailSection>
                  )}

                  {form.visualIdentity.trim() ? (
                    <DetailSection title="Visual identity">
                      {form.visualIdentity}
                    </DetailSection>
                  ) : null}

                  {form.targetAudience.trim() ? (
                    <DetailSection title="Target audience">
                      {form.targetAudience}
                    </DetailSection>
                  ) : null}

                  {form.contentStyle.trim() ? (
                    <DetailSection title="Content style">
                      {form.contentStyle}
                    </DetailSection>
                  ) : null}

                  {form.notes.trim() ? (
                    <DetailSection title="Notes">{form.notes}</DetailSection>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Related thumbnails</CardTitle>
                  <CardDescription>
                    Thumbnail records linked by artist name, song title, or
                    release assignment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {relatedThumbnails.length === 0 ? (
                    <EmptyState
                      className="py-4"
                      title="No related thumbnails yet"
                      description="Thumbnails linked by artist name, song title, or release assignment will appear here."
                      primaryActionLabel="Create YouTube Thumbnail"
                      primaryActionHref={buildArtistThumbnailHref(form, primaryRelease)}
                    />
                  ) : (
                    <div className="flex flex-col gap-2">
                      {relatedThumbnails.map((thumbnail) => {
                        const finalText = buildFinalThumbnailText(
                          {
                            trackTitle: thumbnail.trackTitle,
                            artistName: thumbnail.artistName,
                            videoTitle: thumbnail.videoTitle,
                            contentFormat: thumbnail.contentFormat,
                            videoType: thumbnail.videoType,
                          },
                          finalFieldsFromThumbnailRecord(thumbnail),
                        )
                        return (
                          <div
                            key={thumbnail.id}
                            className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-start sm:justify-between"
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">
                                  {thumbnail.videoTitle ||
                                    thumbnail.trackTitle ||
                                    "Untitled thumbnail"}
                                </p>
                                {thumbnail.contentFormat ? (
                                  <Badge variant="secondary">
                                    {thumbnail.contentFormat}
                                  </Badge>
                                ) : null}
                                {thumbnail.videoType ? (
                                  <Badge variant="outline">
                                    {thumbnail.videoType}
                                  </Badge>
                                ) : null}
                              </div>
                              {thumbnail.trackTitle ? (
                                <p className="text-sm text-muted-foreground">
                                  Track: {thumbnail.trackTitle}
                                  {thumbnail.artistName
                                    ? ` · ${thumbnail.artistName}`
                                    : ""}
                                </p>
                              ) : null}
                              {thumbnail.finalTextOverlay ? (
                                <p className="line-clamp-2 text-sm text-pretty">
                                  Text overlay: {thumbnail.finalTextOverlay}
                                </p>
                              ) : null}
                              <p className="text-xs text-muted-foreground">
                                {formatDate(thumbnail.createdAt)}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-1">
                              <Link
                                href={`/youtube-thumbnails?recordId=${encodeURIComponent(thumbnail.id)}`}
                                className={buttonVariants({
                                  variant: "ghost",
                                  size: "sm",
                                })}
                              >
                                Open
                              </Link>
                              {finalText.trim() ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleCopy(finalText, "final thumbnail")
                                  }
                                >
                                  <Copy className="size-4" />
                                  Copy final
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Related assets</CardTitle>
                  <CardDescription>
                    Asset Library entries matching this artist name
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {relatedAssets.length === 0 ? (
                    <EmptyState
                      className="py-4"
                      title="No related assets yet"
                      description="Assets linked by artist name or campaign will appear here."
                      primaryActionLabel="Open Asset Library"
                      primaryActionHref="/assets"
                    />
                  ) : (
                    <div className="flex flex-col gap-2">
                      {relatedAssets.slice(0, 6).map((asset) => (
                        <Link
                          key={asset.id}
                          href={`/assets?recordId=${encodeURIComponent(asset.id)}`}
                          className="flex flex-col gap-1 rounded-md border p-3 transition-colors hover:bg-muted/30"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">
                              {asset.assetName || "Untitled asset"}
                            </p>
                            {asset.assetType ? (
                              <Badge variant="secondary">{asset.assetType}</Badge>
                            ) : null}
                            {asset.status ? (
                              <Badge variant="outline">{asset.status}</Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {[asset.campaignName, asset.platform]
                              .filter(Boolean)
                              .join(" · ") || "No campaign set"}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <RelationshipPanel
                title="Connections"
                description="Campaigns, releases, assets, and analytics linked by artist name"
                className="border-border/80"
                input={{
                  currentType: "artist-crm",
                  currentId: editingId,
                  artistName: form.artistName,
                }}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick actions</CardTitle>
                  <CardDescription>
                    Create linked workflows or copy prefilled prompts
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <Link
                    href={buildArtistThumbnailHref(form, primaryRelease)}
                    className={buttonVariants({
                      variant: "outline",
                      className: "justify-start",
                    })}
                  >
                    <ImagePlus className="size-4" />
                    Create YouTube Thumbnail
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() =>
                      handleCopy(
                        buildYouTubeThumbnailPromptFromArtist(
                          prompts,
                          form,
                          releases,
                          primaryRelease,
                        ),
                        "YouTube thumbnail prompt",
                      )
                    }
                  >
                    <Copy className="size-4" />
                    Copy YouTube thumbnail prompt
                  </Button>
                  <Separator />
                  <Link
                    href={buildArtistYouTubePackagingHref(form, primaryRelease)}
                    className={buttonVariants({
                      variant: "outline",
                      className: "justify-start",
                    })}
                  >
                    <Video className="size-4" />
                    Create YouTube Packaging
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() =>
                      handleCopy(
                        buildYouTubePromptFromArtist(prompts, form, releases),
                        "YouTube packaging prompt",
                      )
                    }
                  >
                    <Copy className="size-4" />
                    Copy YouTube packaging prompt
                  </Button>
                  <Separator />
                  <Link
                    href={buildArtistReleasePlannerHref(form, primaryRelease)}
                    className={buttonVariants({
                      variant: "outline",
                      className: "justify-start",
                    })}
                  >
                    <CalendarDays className="size-4" />
                    Create Release Plan
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() =>
                      handleCopy(
                        buildReleasePlannerPromptFromArtist(
                          prompts,
                          form,
                          releases,
                        ),
                        "release planner prompt",
                      )
                    }
                  >
                    <Copy className="size-4" />
                    Copy release planner prompt
                  </Button>
                  <Separator />
                  <Link
                    href={buildArtistSocialCampaignHref(form, primaryRelease)}
                    className={buttonVariants({
                      variant: "outline",
                      className: "justify-start",
                    })}
                  >
                    <Share2 className="size-4" />
                    Create Social Campaign
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() =>
                      handleCopy(
                        buildSocialRepurposingPromptFromArtist(
                          prompts,
                          form,
                          releases,
                        ),
                        "social repurposing prompt",
                      )
                    }
                  >
                    <Copy className="size-4" />
                    Copy social campaign prompt
                  </Button>
                  <Separator />
                  <Link
                    href={buildArtistAnalyticsHref(form, primaryRelease)}
                    className={buttonVariants({
                      variant: "outline",
                      className: "justify-start",
                    })}
                  >
                    <BarChart3 className="size-4" />
                    Create Analytics Record
                  </Link>
                  <Separator />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() =>
                      handleCopy(
                        buildMerchIdeaPromptFromArtist(prompts, form),
                        "merch idea prompt",
                      )
                    }
                  >
                    <Shirt className="size-4" />
                    Copy merch idea prompt
                  </Button>
                  <Link
                    href="/merch-ideas"
                    className={buttonVariants({
                      variant: "outline",
                      className: "justify-start",
                    })}
                  >
                    <Shirt className="size-4" />
                    Open Merch Ideas
                  </Link>
                </CardContent>
              </Card>
            </>
          ) : (
            <DetailTabEmptyState />
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="saved">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base">Recent artists</CardTitle>
                <CardDescription>
                  {artistRecords.length} saved artist
                  {artistRecords.length === 1 ? "" : "s"}
                  {artistRecordsUseDatabase
                    ? " · stored in SQLite"
                    : " · using localStorage fallback"}
                </CardDescription>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={recordSearch}
                    onChange={(e) => setRecordSearch(e.target.value)}
                    placeholder="Search artists..."
                    className="pl-8"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleMigrateLocal}
                  disabled={migrating}
                >
                  <Database className="size-4" />
                  {migrating ? "Migrating…" : "Migrate local"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                >
                  <Download className="size-4" />
                  Export
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-4" />
                  Import
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleImport}
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredRecords.length === 0 ? (
                artistRecords.length === 0 ? (
                  <EmptyState
                    title="No artists saved yet"
                    description="Fill in the profile and save your first artist, or seed the PrettyWise demo to explore related campaigns and assets."
                    primaryActionLabel="Seed PrettyWise demo"
                    primaryActionHref="/backups"
                    secondaryActionLabel="Create campaign"
                    secondaryActionHref="/campaigns"
                  />
                ) : (
                  <EmptyState
                    title="No records match your search"
                    description="Try a different artist name, genre, or keyword."
                  />
                )
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredRecords.map((record) => {
                    const normalized = normalizeArtistRecord(record)
                    return (
                      <div
                        key={normalized.id}
                        className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <button
                          type="button"
                          onClick={() => openRecord(normalized)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">
                              {normalized.artistName || "Untitled artist"}
                            </p>
                            {normalized.artistType ? (
                              <Badge variant="secondary">
                                {normalized.artistType}
                              </Badge>
                            ) : null}
                            {normalized.genre ? (
                              <Badge variant="outline">{normalized.genre}</Badge>
                            ) : null}
                            {editingId === normalized.id ? (
                              <Badge variant="outline" className="text-xs">
                                Editing
                              </Badge>
                            ) : null}
                          </div>
                          {normalized.mood ? (
                            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                              {normalized.mood}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(normalized.updatedAt)}
                            {normalized.releases.length
                              ? ` · ${normalized.releases.length} release(s)`
                              : ""}
                          </p>
                        </button>
                        <div className="flex shrink-0 flex-wrap items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openRecord(normalized)}
                          >
                            Open
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => setPendingDelete(normalized)}
                            aria-label="Delete artist"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </ModuleTabPanel>
      </ModuleWorkflowTabs>

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete artist?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `"${pendingDelete.artistName || "Untitled"}" will be permanently removed.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
