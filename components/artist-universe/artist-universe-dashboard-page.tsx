"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowRight,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Circle,
  ExternalLink,
  FolderOpen,
  Loader2,
  Music2,
  Palette,
  ScrollText,
  Sparkles,
  ListChecks,
} from "lucide-react"
import { toast } from "sonner"

import {
  getArtistUniverseArtistNames,
  getArtistUniverseDashboard,
} from "@/lib/actions/artist-universe-dashboard"
import type {
  ArtistUniverseDashboardData,
  ArtistUniverseDashboardRecord,
  ArtistUniverseRecommendation,
} from "@/lib/artist-universe/dashboard"
import type { PublishedSongSummary } from "@/lib/artist-universe/published-songs"
import { generateArtistContextSummary } from "@/lib/actions/artist-bible"
import { createArtistSetupTasks } from "@/lib/actions/global-tasks"
import { pickArtistBibleCompletenessLabel } from "@/lib/artist-universe/dashboard"
import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { FieldRow, TagList } from "@/components/artist-universe/shared"
import { RECENT_RECORDS_CARD_CLASS } from "@/components/module/form-layout"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const RELATIONSHIP_SECTIONS = [
  "Artist Bible",
  "Visual Identity",
  "Lore Entries",
  "Song Concepts",
  "Story Arcs",
  "Assets",
  "YouTube",
  "Campaigns",
  "Products / Merch",
] as const

const EMPTY_COPY: Record<string, string> = {
  "Story Arcs": "No story arcs yet. Create one to define an era or release narrative.",
  YouTube: "No linked YouTube videos yet.",
  Campaigns:
    "No campaigns yet. Create one when you are ready to launch, relaunch, or promote.",
  "Products / Merch": "No product tie-ins yet.",
}

function formatDate(ts: number): string {
  if (!ts) return "—"
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function RecordCard({ record }: { record: ArtistUniverseDashboardRecord }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/60 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{record.type}</Badge>
          {record.status ? <Badge variant="outline">{record.status}</Badge> : null}
        </div>
        <p className="font-medium text-pretty">{record.title}</p>
        {record.summary ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{record.summary}</p>
        ) : null}
        {record.tags.length ? (
          <div className="flex flex-wrap gap-1">
            {record.tags.slice(0, 6).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
      <Button type="button" size="sm" variant="outline" className="shrink-0" asChild>
        <Link href={record.href}>
          Open
          <ExternalLink className="ml-1.5 size-3.5" />
        </Link>
      </Button>
    </div>
  )
}

function PublishedSongRow({ song }: { song: PublishedSongSummary }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/60 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Published Song</Badge>
          <Badge variant="outline">{song.concept.status || song.concept.releaseStatus || "Published"}</Badge>
          {song.concept.publishedPlatform ? (
            <Badge variant="outline">{song.concept.publishedPlatform}</Badge>
          ) : null}
        </div>
        <p className="font-medium text-pretty">{song.displayTitle}</p>
        {song.concept.publishedDate ? (
          <p className="text-sm text-muted-foreground">Published: {song.concept.publishedDate}</p>
        ) : null}
        {song.missingPublishedUrl ? (
          <p className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-300">
            <AlertTriangle className="size-3.5 shrink-0" />
            Marked published but missing URL
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {song.loreCount} related lore · {song.assetCount} linked assets
        </p>
        {!song.hasCampaign ? (
          <p className="text-xs text-muted-foreground">
            Campaign optional — create one later for merch, relaunch, or Shorts.
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {song.publishedUrl ? (
          <Button type="button" size="sm" variant="outline" asChild>
            <a href={song.publishedUrl} target="_blank" rel="noopener noreferrer">
              Open
              <ExternalLink className="ml-1.5 size-3.5" />
            </a>
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" asChild>
          <Link
            href={`/song-vault?recordId=${encodeURIComponent(song.concept.id)}&artist=${encodeURIComponent(song.concept.artistName)}&tab=published`}
          >
            Edit archive
          </Link>
        </Button>
      </div>
    </div>
  )
}

function RecommendationRow({ item }: { item: ArtistUniverseRecommendation }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 p-4",
        item.tone === "info" && "border-primary/20 bg-primary/5",
      )}
    >
      <p className="font-medium">{item.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
      {item.href ? (
        <Link href={item.href} className={buttonVariants({ size: "sm", variant: "outline", className: "mt-3" })}>
          Open
          <ArrowRight className="ml-1.5 size-3.5" />
        </Link>
      ) : null}
    </div>
  )
}

export function ArtistUniverseDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const artistQuery = searchParams.get("artist")?.trim() ?? ""

  const [artists, setArtists] = React.useState<string[]>([])
  const [selectedArtist, setSelectedArtist] = React.useState(artistQuery)
  const [dashboard, setDashboard] = React.useState<ArtistUniverseDashboardData | null>(null)
  const [loadingArtists, setLoadingArtists] = React.useState(true)
  const [loadingDashboard, setLoadingDashboard] = React.useState(false)
  const [contextLoading, setContextLoading] = React.useState(false)
  const [tasksLoading, setTasksLoading] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    setLoadingArtists(true)
    void getArtistUniverseArtistNames()
      .then((names) => {
        if (cancelled) return
        setArtists(names)
        const initial =
          artistQuery ||
          (names.length === 1 ? names[0] : "") ||
          names.find((name) => name.toLowerCase() === "prettywise") ||
          names[0] ||
          ""
        setSelectedArtist(initial)
      })
      .finally(() => {
        if (!cancelled) setLoadingArtists(false)
      })
    return () => {
      cancelled = true
    }
  }, [artistQuery])

  React.useEffect(() => {
    if (!selectedArtist.trim()) {
      setDashboard(null)
      return
    }
    let cancelled = false
    setLoadingDashboard(true)
    void getArtistUniverseDashboard(selectedArtist)
      .then((data) => {
        if (!cancelled) setDashboard(data)
      })
      .catch((error) => {
        if (!cancelled) {
          setDashboard(null)
          toast.error(error instanceof Error ? error.message : "Could not load artist universe.")
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDashboard(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedArtist])

  function handleArtistChange(value: string) {
    setSelectedArtist(value)
    const params = new URLSearchParams(searchParams.toString())
    params.set("artist", value)
    router.replace(`/artist-universe?${params.toString()}`, { scroll: false })
  }

  async function handleBuildContextPack() {
    if (!selectedArtist) return
    setContextLoading(true)
    try {
      const text = await generateArtistContextSummary(selectedArtist)
      toast.success("AI context pack generated", {
        description: text.slice(0, 160) + (text.length > 160 ? "…" : ""),
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not build context pack.")
    } finally {
      setContextLoading(false)
    }
  }

  async function handleCreateSetupTasks() {
    if (!selectedArtist) return
    setTasksLoading(true)
    try {
      const result = await createArtistSetupTasks(selectedArtist)
      toast.success(result.message)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create setup tasks.")
    } finally {
      setTasksLoading(false)
    }
  }

  if (loadingArtists) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading artists…
      </div>
    )
  }

  if (!artists.length) {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        <ModulePageHeader
          title="Artist Universe"
          description="Central command center for artist bibles, lore, songs, assets, and connected records."
        />
        <EmptyState
          icon={Music2}
          title="Create an Artist Bible to start building an artist universe"
          description="The dashboard pulls from Artist Bible records to organize your creative IP."
          primaryActionLabel="Open Artist Bible"
          primaryActionHref="/artist-bible"
        />
      </div>
    )
  }

  const bible = dashboard?.bible

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ModulePageHeader
        title="Artist Universe"
        description="See how an artist's bible, lore, songs, assets, integrations, and future campaigns connect."
        action={
          <div className="flex min-w-[220px] flex-col gap-1.5">
            <Label htmlFor="artist-selector" className="text-xs">
              Artist
            </Label>
            <Select value={selectedArtist} onValueChange={(value) => handleArtistChange(value ?? "")}>
              <SelectTrigger id="artist-selector" className="w-full">
                <span className="truncate">{selectedArtist || "Select artist…"}</span>
              </SelectTrigger>
              <SelectContent>
                {artists.map((artist) => (
                  <SelectItem key={artist} value={artist}>
                    {artist}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {loadingDashboard ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading {selectedArtist} universe…
        </div>
      ) : dashboard ? (
        <>
          {dashboard.showPrettyWiseBanner ? (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">PrettyWise foundation is active</CardTitle>
                <CardDescription>
                  You have enough structure to continue building songs, lore, story arcs, assets,
                  and future merch without starting a campaign yet.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 md:grid-cols-2">
                {dashboard.prettyWiseNextActions.map((item) => (
                  <RecommendationRow key={item.id} item={item} />
                ))}
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
            <Card className={RECENT_RECORDS_CARD_CLASS}>
              <CardHeader>
                <CardTitle className="text-base">{dashboard.artistName}</CardTitle>
                <CardDescription>
                  {bible
                    ? `${bible.projectName || "Artist project"} · ${pickArtistBibleCompletenessLabel(bible)}`
                    : "No Artist Bible found for this name yet."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {bible ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FieldRow label="Label" value={bible.labelName} />
                      <FieldRow label="Status" value={bible.status} />
                      <FieldRow label="Genre" value={bible.genre} />
                      <FieldRow label="Mood" value={bible.mood} />
                    </div>
                    <FieldRow label="Short bio" value={bible.shortBio} />
                    <FieldRow label="Brand promise" value={bible.brandPromise} />
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Tags
                      </p>
                      <TagList tags={bible.tags} />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Create an Artist Bible to unlock the full overview for {dashboard.artistName}.
                  </p>
                )}

                <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
                  <Link
                    href={
                      bible
                        ? `/artist-bible?recordId=${encodeURIComponent(bible.id)}`
                        : `/artist-bible?artist=${encodeURIComponent(dashboard.artistName)}`
                    }
                    className={buttonVariants({ size: "sm" })}
                  >
                    <BookOpen className="size-4" />
                    Open Artist Bible
                  </Link>
                  <Link
                    href={`/visual-identity?artist=${encodeURIComponent(dashboard.artistName)}`}
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                  >
                    <Palette className="size-4" />
                    Open Visual Identity
                  </Link>
                  <Link
                    href={`/lore?artist=${encodeURIComponent(dashboard.artistName)}`}
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                  >
                    <ScrollText className="size-4" />
                    Open Lore Manager
                  </Link>
                  <Link
                    href={`/song-vault?artist=${encodeURIComponent(dashboard.artistName)}`}
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                  >
                    <Music2 className="size-4" />
                    Open Song Vault
                  </Link>
                  <Link
                    href={`/assets?artist=${encodeURIComponent(dashboard.artistName)}`}
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                  >
                    <FolderOpen className="size-4" />
                    Open Assets
                  </Link>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={contextLoading}
                    onClick={() => void handleBuildContextPack()}
                  >
                    {contextLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    Build AI Context Pack
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={tasksLoading}
                    onClick={() => void handleCreateSetupTasks()}
                  >
                    {tasksLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ListChecks className="size-4" />
                    )}
                    Create Setup Tasks
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className={RECENT_RECORDS_CARD_CLASS}>
                <CardHeader>
                  <CardTitle className="text-base">Setup readiness</CardTitle>
                  <CardDescription>
                    {dashboard.artistName} setup readiness: {dashboard.readiness.percent}%
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end gap-2">
                    <p className="text-4xl font-semibold tabular-nums">
                      {dashboard.readiness.percent}%
                    </p>
                    <p className="pb-1 text-sm text-muted-foreground">
                      {dashboard.readiness.earnedPoints}/{dashboard.readiness.maxPoints} pts
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${dashboard.readiness.percent}%` }}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Complete
                    </p>
                    {dashboard.readiness.complete.length ? (
                      <ul className="space-y-1">
                        {dashboard.readiness.complete.map((item) => (
                          <li key={item} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nothing complete yet.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Missing
                    </p>
                    {dashboard.readiness.missing.length ? (
                      <ul className="space-y-1">
                        {dashboard.readiness.missing.map((item) => (
                          <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Circle className="size-4 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">All tracked items complete.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className={RECENT_RECORDS_CARD_CLASS}>
                <CardHeader>
                  <CardTitle className="text-base">Next recommended actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dashboard.recommendations.map((item) => (
                    <RecommendationRow key={item.id} item={item} />
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Published Songs</CardTitle>
              <CardDescription>
                Already-released tracks tracked without requiring a campaign.
                {dashboard.publishedSongs.length
                  ? ` ${dashboard.publishedSongs.length} published.`
                  : " None yet."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.publishedSongs.length ? (
                dashboard.publishedSongs.map((song) => (
                  <PublishedSongRow key={song.concept.id} song={song} />
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-border/80 px-4 py-3 text-sm text-muted-foreground">
                  No published songs yet. Mark a song concept as Published and add a URL in Song Vault.
                </p>
              )}
              <Link
                href={`/song-vault?artist=${encodeURIComponent(dashboard.artistName)}&tab=published`}
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                Open Published Songs tab
                <ArrowRight className="ml-1.5 size-3.5" />
              </Link>
            </CardContent>
          </Card>

          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Related record links</CardTitle>
              <CardDescription>
                Linked {dashboard.relatedLinkSummary.linked} · Inferred{" "}
                {dashboard.relatedLinkSummary.inferred} · Suggested{" "}
                {dashboard.relatedLinkSummary.suggested}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {dashboard.relatedLinkSummary.items.length ? (
                dashboard.relatedLinkSummary.items.map((item) => (
                  <div
                    key={item.href}
                    className="flex flex-col gap-1 rounded-lg border border-border/70 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.sourceTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        Linked {item.linked} · Inferred {item.inferred} · Suggested {item.suggested}
                      </p>
                    </div>
                    <Link href={item.href} className={buttonVariants({ size: "sm", variant: "outline" })}>
                      Open Related
                    </Link>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No song concepts to summarize yet. Link assets and lore from Related tabs.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Artist Relationship Map</CardTitle>
              <CardDescription>
                Connected records for {dashboard.artistName}, grouped by type.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {RELATIONSHIP_SECTIONS.map((section) => {
                const records = dashboard.relationshipMap[section] ?? []
                return (
                  <section key={section} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{section}</h3>
                      <Badge variant="outline">{records.length}</Badge>
                    </div>
                    {records.length ? (
                      <div className="grid gap-2 lg:grid-cols-2">
                        {records.map((record) => (
                          <RecordCard key={`${section}-${record.id}`} record={record} />
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-lg border border-dashed border-border/80 px-4 py-3 text-sm text-muted-foreground">
                        {EMPTY_COPY[section] ?? "No records yet."}
                      </p>
                    )}
                  </section>
                )
              })}
            </CardContent>
          </Card>

          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Recent activity</CardTitle>
              <CardDescription>Latest updates across lore, songs, assets, Drive, and campaigns.</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard.activity.length ? (
                <div className="space-y-2">
                  {dashboard.activity.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-1 rounded-lg border border-border/70 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.detail}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatDate(item.timestamp)}</span>
                        {item.href ? (
                          <Link href={item.href} className="inline-flex items-center gap-1 hover:text-foreground">
                            Open
                            <ExternalLink className="size-3" />
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity yet.</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <EmptyState
          title="Could not load artist universe"
          description="Try selecting another artist or create an Artist Bible first."
          primaryActionLabel="Open Artist Bible"
          primaryActionHref="/artist-bible"
        />
      )}
    </div>
  )
}
