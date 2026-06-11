"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  BarChart3,
  ExternalLink,
  Loader2,
  RefreshCw,
  ScanSearch,
  Search,
  Upload,
  Video,
} from "lucide-react"
import { toast } from "sonner"

import {
  createExternalLinkForVideo,
  createOrUpdateAnalyticsForVideo,
  getVideoIntelligencePageData,
  linkVideoToCampaign,
  syncAllImportedVideos,
  syncVideoStats,
  unlinkVideoFromCampaign,
  type VideoIntelligencePageData,
} from "@/lib/actions/videos"
import { fetchRecentYouTubeVideosAction } from "@/lib/actions/youtube-integration"
import {
  VIDEO_INTELLIGENCE_TABS,
  buildVideosNeedingAttention,
  emptyVideoFilters,
  filterEnrichedVideos,
  getShortVideosFromList,
  getUnlinkedVideosFromList,
  groupVideosByCampaign,
  resolveVideoIntelligenceTab,
  type EnrichedVideoRecord,
  type VideoIntelligenceFilterState,
  type VideoIntelligenceTab,
} from "@/lib/data/videos"
import { buildLearningUrlFromVideo } from "@/lib/video-prefill"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CampaignPrefillBanner } from "@/components/campaigns/campaign-prefill-banner"
import { EmptyState } from "@/components/empty-state"
import { ModuleShell, ModulePageHeader, RECENT_RECORDS_CARD_CLASS } from "@/components/module/form-layout"
import { ModuleTabPanel, ModuleWorkflowTabs } from "@/components/module/workflow-tabs"
import { VideoCard } from "@/components/videos/video-card"
import { VideoDetailSheet } from "@/components/videos/video-detail-sheet"

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string
  value: React.ReactNode
  hint?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground text-pretty">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function formatNumber(value: number) {
  return value.toLocaleString()
}

export function VideoIntelligencePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [data, setData] = React.useState<VideoIntelligencePageData | null>(null)
  const [activeTab, setActiveTab] = React.useState<VideoIntelligenceTab>("overview")
  const [selectedVideo, setSelectedVideo] = React.useState<EnrichedVideoRecord | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [filters, setFilters] = React.useState<VideoIntelligenceFilterState>(emptyVideoFilters())
  const [fetchMessage, setFetchMessage] = React.useState<string | null>(null)

  const campaignIdParam = searchParams.get("campaignId") ?? ""
  const recordIdParam = searchParams.get("recordId") ?? ""
  const filterParam = searchParams.get("filter")
  const tabParam = searchParams.get("tab")

  const refresh = React.useCallback(async () => {
    setLoading(true)
    try {
      const next = await getVideoIntelligencePageData()
      setData(next)
      return next
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load Video Intelligence.",
      )
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    if (!data) return
    const tab = resolveVideoIntelligenceTab(tabParam, filterParam, data.videos.length > 0)
    setActiveTab(tab)
  }, [data, tabParam, filterParam])

  React.useEffect(() => {
    if (!data || !recordIdParam) return
    const match = data.videos.find((video) => video.id === recordIdParam)
    if (match) {
      setSelectedVideo(match)
      setDetailOpen(true)
    }
  }, [data, recordIdParam])

  React.useEffect(() => {
    if (!campaignIdParam) return
    setFilters((prev) => ({ ...prev, campaignId: campaignIdParam }))
    if (campaignIdParam) setActiveTab("campaign")
  }, [campaignIdParam])

  const videos = data?.videos ?? []
  const campaigns = data?.campaigns ?? []
  const summary = data?.summary
  const connectionStatus = data?.connectionStatus
  const campaignName =
    campaigns.find((campaign) => campaign.id === campaignIdParam)?.campaignName ?? ""

  const filteredVideos = React.useMemo(
    () => filterEnrichedVideos(videos, filters),
    [videos, filters],
  )

  const unlinkedVideos = React.useMemo(() => getUnlinkedVideosFromList(videos), [videos])
  const shortVideos = React.useMemo(() => getShortVideosFromList(videos), [videos])
  const attentionItems = React.useMemo(
    () => data?.attentionItems ?? buildVideosNeedingAttention(videos),
    [data?.attentionItems, videos],
  )
  const campaignGroups = React.useMemo(
    () => groupVideosByCampaign(videos, campaigns),
    [videos, campaigns],
  )

  const topByViews = React.useMemo(
    () => [...videos].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0)).slice(0, 5),
    [videos],
  )
  const recentImports = React.useMemo(
    () => [...videos].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
    [videos],
  )

  const performanceSorted = React.useMemo(
    () => [...videos].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0)),
    [videos],
  )

  const bestVideo = performanceSorted[0]
  const mostRecentUpload = [...videos].sort(
    (a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0),
  )[0]
  const topCampaign = campaignGroups[0]
  const avgViews =
    videos.length > 0
      ? Math.round(
          videos.reduce((sum, video) => sum + (video.viewCount ?? 0), 0) / videos.length,
        )
      : 0

  async function runAction<T>(
    key: string,
    action: () => Promise<T>,
    onSuccess?: (result: T) => void,
  ) {
    setBusy(key)
    try {
      const result = await action()
      onSuccess?.(result)
      const next = await refresh()
      if (selectedVideo && next) {
        const updated = next.videos.find((video) => video.id === selectedVideo.id)
        if (updated) setSelectedVideo(updated)
      }
    } finally {
      setBusy(null)
    }
  }

  function openVideo(video: EnrichedVideoRecord) {
    setSelectedVideo(video)
    setDetailOpen(true)
    const params = new URLSearchParams(searchParams.toString())
    params.set("recordId", video.id)
    router.replace(`/videos?${params.toString()}`)
  }

  function closeDetail(open: boolean) {
    setDetailOpen(open)
    if (!open) {
      setSelectedVideo(null)
      const params = new URLSearchParams(searchParams.toString())
      params.delete("recordId")
      const qs = params.toString()
      router.replace(qs ? `/videos?${qs}` : "/videos")
    }
  }

  function setTab(tab: VideoIntelligenceTab) {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    params.delete("filter")
    router.replace(`/videos?${params.toString()}`)
  }

  const headerActions = (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy === "fetch-recent"}
        onClick={() =>
          void runAction("fetch-recent", () => fetchRecentYouTubeVideosAction(25), (result) => {
            setFetchMessage(result.message)
            toast[result.success ? "success" : "error"](result.message)
          })
        }
      >
        {busy === "fetch-recent" ? <Loader2 className="size-4 animate-spin" /> : null}
        Fetch Recent Videos
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy === "sync-all" || videos.length === 0}
        onClick={() =>
          void runAction("sync-all", () => syncAllImportedVideos(), (result) => {
            toast[result.success ? "success" : "error"](result.message)
          })
        }
      >
        {busy === "sync-all" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        Sync All Stats
      </Button>
      <Link
        href="/patterns"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <ScanSearch className="size-4" />
        Open Pattern Detection
      </Link>
      <Link
        href="/integrations?tab=youtube-api"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <Video className="size-4" />
        Open YouTube Integration
      </Link>
      <Link
        href="/integrations?tab=youtube-csv"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <Upload className="size-4" />
        Import YouTube CSV
      </Link>
    </div>
  )

  if (loading && !data) {
    return (
      <ModuleShell>
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading Video Intelligence…
        </div>
      </ModuleShell>
    )
  }

  return (
    <ModuleShell>
      <ModulePageHeader
        title="Video Intelligence"
        description="Manage imported YouTube videos, campaign links, stats, analytics, reviews, experiments, and learnings."
        action={headerActions}
      />

      {campaignIdParam && campaignName ? (
        <CampaignPrefillBanner campaignId={campaignIdParam} campaignName={campaignName} />
      ) : null}

      {connectionStatus && !connectionStatus.connected && videos.length > 0 ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <p>
                {connectionStatus.message ||
                  "YouTube connection is not fully configured. You can still manage imported videos, but sync may fail until you connect YouTube or add an API key."}
              </p>
            </div>
            <Link href="/integrations?tab=youtube-api" className={buttonVariants({ size: "sm" })}>
              Open YouTube Integration
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {fetchMessage ? (
        <p className="text-sm text-muted-foreground">{fetchMessage}</p>
      ) : null}

      {videos.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No imported videos yet"
          description="Connect YouTube and import videos to start tracking performance and campaign relationships."
          primaryActionLabel="Open YouTube API Integration"
          primaryActionHref="/integrations?tab=youtube-api"
          secondaryActionLabel="Import YouTube CSV"
          secondaryActionHref="/integrations?tab=youtube-csv"
        />
      ) : (
        <ModuleWorkflowTabs
          value={activeTab}
          onValueChange={(value) => setTab(value as VideoIntelligenceTab)}
          tabs={[...VIDEO_INTELLIGENCE_TABS]}
        >
          <ModuleTabPanel value="overview">
            {summary ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                <SummaryCard label="Total imported videos" value={summary.totalVideos} />
                <SummaryCard label="Linked to campaigns" value={summary.linkedCount} />
                <SummaryCard label="Unlinked videos" value={summary.unlinkedCount} />
                <SummaryCard label="Total views" value={formatNumber(summary.totalViews)} />
                <SummaryCard label="Total likes" value={formatNumber(summary.totalLikes)} />
                <SummaryCard label="Total comments" value={formatNumber(summary.totalComments)} />
                <SummaryCard label="Videos needing sync" value={summary.needsSyncCount} />
                <SummaryCard label="Missing analytics" value={summary.missingAnalyticsCount} />
                <SummaryCard label="Missing quality review" value={summary.missingQualityReviewCount} />
                <SummaryCard label="Missing learning" value={summary.missingLearningCount} />
              </div>
            ) : null}

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card className={RECENT_RECORDS_CARD_CLASS}>
                <CardHeader>
                  <CardTitle className="text-base">Recently imported</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentImports.map((video) => (
                    <button
                      key={video.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-left text-sm hover:bg-muted/40"
                      onClick={() => openVideo(video)}
                    >
                      <span className="truncate">{video.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {(video.viewCount ?? 0).toLocaleString()} views
                      </span>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className={RECENT_RECORDS_CARD_CLASS}>
                <CardHeader>
                  <CardTitle className="text-base">Top videos by views</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {topByViews.map((video) => (
                    <button
                      key={video.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-left text-sm hover:bg-muted/40"
                      onClick={() => openVideo(video)}
                    >
                      <span className="truncate">{video.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {(video.viewCount ?? 0).toLocaleString()} views
                      </span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card className={`mt-6 ${RECENT_RECORDS_CARD_CLASS}`}>
              <CardHeader>
                <CardTitle className="text-base">Needs attention</CardTitle>
                <CardDescription>Top issues across imported videos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {attentionItems.slice(0, 8).map((item) => (
                  <div
                    key={`${item.videoId}-${item.issue}`}
                    className="rounded-md border border-border/60 p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.video.title}</p>
                      <Badge variant="outline">{item.issue}</Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">{item.whyItMatters}</p>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto px-0"
                      onClick={() => openVideo(item.video)}
                    >
                      {item.actionLabel}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </ModuleTabPanel>

          <ModuleTabPanel value="all">
            <VideoFilters
              filters={filters}
              campaigns={campaigns}
              onChange={setFilters}
            />
            <div className="mt-4 space-y-4">
              {filteredVideos.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No videos match your search or filters.
                </p>
              ) : (
                filteredVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    campaigns={campaigns}
                    busyKey={busy}
                    onOpenDetails={openVideo}
                    onSyncStats={(id) =>
                      void runAction(`sync-${id}`, () => syncVideoStats(id), (result) => {
                        toast[result.success ? "success" : "error"](result.message)
                      })
                    }
                    onLinkCampaign={(videoId, campaignId) =>
                      void runAction(`link-${videoId}`, () => linkVideoToCampaign(videoId, campaignId), (result) => {
                        toast[result.success ? "success" : "error"](result.message)
                      })
                    }
                    onUnlinkCampaign={(id) =>
                      void runAction(`unlink-${id}`, () => unlinkVideoFromCampaign(id), (result) => {
                        toast[result.success ? "success" : "error"](result.message)
                      })
                    }
                    onCreateExternalLink={(id) =>
                      void runAction(`ext-${id}`, () => createExternalLinkForVideo(id), (result) => {
                        toast[result.success ? "success" : "error"](result.message)
                      })
                    }
                  />
                ))
              )}
            </div>
          </ModuleTabPanel>

          <ModuleTabPanel value="unlinked">
            <p className="mb-4 text-sm text-muted-foreground">
              Cleanup queue for imported videos with no campaign link. Suggested matches are hints only — confirm before linking.
            </p>
            <div className="space-y-4">
              {unlinkedVideos.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  All imported videos are linked to campaigns.
                </p>
              ) : (
                unlinkedVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    campaigns={campaigns}
                    busyKey={busy}
                    showSuggestedCampaign
                    onOpenDetails={openVideo}
                    onSyncStats={(id) =>
                      void runAction(`sync-${id}`, () => syncVideoStats(id), (result) => {
                        toast[result.success ? "success" : "error"](result.message)
                      })
                    }
                    onLinkCampaign={(videoId, campaignId) =>
                      void runAction(`link-${videoId}`, () => linkVideoToCampaign(videoId, campaignId), (result) => {
                        toast[result.success ? "success" : "error"](result.message)
                      })
                    }
                    onUnlinkCampaign={(id) =>
                      void runAction(`unlink-${id}`, () => unlinkVideoFromCampaign(id), (result) => {
                        toast[result.success ? "success" : "error"](result.message)
                      })
                    }
                    onCreateExternalLink={(id) =>
                      void runAction(`ext-${id}`, () => createExternalLinkForVideo(id), (result) => {
                        toast[result.success ? "success" : "error"](result.message)
                      })
                    }
                  />
                ))
              )}
            </div>
          </ModuleTabPanel>

          <ModuleTabPanel value="campaign">
            <div className="space-y-6">
              {campaignGroups.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No campaign-linked videos yet.
                </p>
              ) : (
                campaignGroups.map((group) => (
                  <Card key={group.campaignId} className={RECENT_RECORDS_CARD_CLASS}>
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">{group.campaignName}</CardTitle>
                          <CardDescription>
                            {group.videos.length} video(s) · {formatNumber(group.totalViews)} total views
                            {group.latestSync
                              ? ` · Last sync ${new Date(group.latestSync).toLocaleDateString()}`
                              : ""}
                          </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/campaigns?campaignId=${encodeURIComponent(group.campaignId)}`}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            Open Campaign Launch Dashboard
                          </Link>
                          <Link
                            href={`/videos?campaignId=${encodeURIComponent(group.campaignId)}`}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            Filter Videos
                          </Link>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {group.videos.map((video) => (
                        <VideoCard
                          key={video.id}
                          video={video}
                          campaigns={campaigns}
                          busyKey={busy}
                          onOpenDetails={openVideo}
                          onSyncStats={(id) =>
                            void runAction(`sync-${id}`, () => syncVideoStats(id), (result) => {
                              toast[result.success ? "success" : "error"](result.message)
                            })
                          }
                          onLinkCampaign={(videoId, campaignId) =>
                            void runAction(
                              `link-${videoId}`,
                              () => linkVideoToCampaign(videoId, campaignId),
                              (result) => {
                                toast[result.success ? "success" : "error"](result.message)
                              },
                            )
                          }
                          onUnlinkCampaign={(id) =>
                            void runAction(`unlink-${id}`, () => unlinkVideoFromCampaign(id), (result) => {
                              toast[result.success ? "success" : "error"](result.message)
                            })
                          }
                          onCreateExternalLink={(id) =>
                            void runAction(`ext-${id}`, () => createExternalLinkForVideo(id), (result) => {
                              toast[result.success ? "success" : "error"](result.message)
                            })
                          }
                        />
                      ))}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ModuleTabPanel>

          <ModuleTabPanel value="shorts">
            <div className="space-y-4">
              {shortVideos.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No likely Shorts detected. Shorts are inferred from duration ≤ 60s or title/URL hints.
                </p>
              ) : (
                shortVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    campaigns={campaigns}
                    busyKey={busy}
                    onOpenDetails={openVideo}
                    onSyncStats={(id) =>
                      void runAction(`sync-${id}`, () => syncVideoStats(id), (result) => {
                        toast[result.success ? "success" : "error"](result.message)
                      })
                    }
                    onLinkCampaign={(videoId, campaignId) =>
                      void runAction(`link-${videoId}`, () => linkVideoToCampaign(videoId, campaignId), (result) => {
                        toast[result.success ? "success" : "error"](result.message)
                      })
                    }
                    onUnlinkCampaign={(id) =>
                      void runAction(`unlink-${id}`, () => unlinkVideoFromCampaign(id), (result) => {
                        toast[result.success ? "success" : "error"](result.message)
                      })
                    }
                    onCreateExternalLink={(id) =>
                      void runAction(`ext-${id}`, () => createExternalLinkForVideo(id), (result) => {
                        toast[result.success ? "success" : "error"](result.message)
                      })
                    }
                  />
                ))
              )}
            </div>
          </ModuleTabPanel>

          <ModuleTabPanel value="needs-attention">
            <div className="space-y-3">
              {attentionItems.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No attention items — imported videos look healthy.
                </p>
              ) : (
                attentionItems.map((item) => (
                  <Card key={`${item.videoId}-${item.issue}`} className={RECENT_RECORDS_CARD_CLASS}>
                    <CardContent className="space-y-2 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{item.video.title}</p>
                        <Badge variant="outline">{item.issue}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.whyItMatters}</p>
                      <p className="text-sm">{item.suggestedAction}</p>
                      <Button type="button" size="sm" onClick={() => openVideo(item.video)}>
                        {item.actionLabel}
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ModuleTabPanel>

          <ModuleTabPanel value="performance">
            {summary ? (
              <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <SummaryCard
                  label="Total engagement"
                  value={formatNumber(summary.totalLikes + summary.totalComments)}
                />
                <SummaryCard
                  label="Best performing video"
                  value={bestVideo?.title ?? "—"}
                  hint={
                    bestVideo
                      ? `${(bestVideo.viewCount ?? 0).toLocaleString()} views`
                      : undefined
                  }
                />
                <SummaryCard
                  label="Most recent upload"
                  value={mostRecentUpload?.title ?? "—"}
                />
                <SummaryCard
                  label="Top campaign by video views"
                  value={topCampaign?.campaignName ?? "—"}
                />
                <SummaryCard label="Average views per video" value={formatNumber(avgViews)} />
              </div>
            ) : null}

            <Card className={RECENT_RECORDS_CARD_CLASS}>
              <CardHeader>
                <CardTitle className="text-base">Videos by performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {performanceSorted.map((video) => (
                  <button
                    key={video.id}
                    type="button"
                    className="flex w-full flex-col gap-1 rounded-md border border-border/60 px-3 py-2 text-left text-sm hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                    onClick={() => openVideo(video)}
                  >
                    <span className="font-medium">{video.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {(video.viewCount ?? 0).toLocaleString()} views ·{" "}
                      {(video.likeCount ?? 0).toLocaleString()} likes ·{" "}
                      {video.engagementRate != null
                        ? `${video.engagementRate.toFixed(2)}% engagement`
                        : "—"}{" "}
                      · {video.campaignName || "Unlinked"}
                      {video.qualityScore != null ? ` · Score ${video.qualityScore}` : ""}
                      {video.learningCount > 0 ? ` · ${video.learningCount} learning(s)` : ""}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </ModuleTabPanel>

          <ModuleTabPanel value="learnings">
            <LearningSections
              videos={videos}
              onOpenVideo={openVideo}
            />
          </ModuleTabPanel>
        </ModuleWorkflowTabs>
      )}

      <VideoDetailSheet
        video={selectedVideo}
        campaigns={campaigns}
        open={detailOpen}
        onOpenChange={closeDetail}
        busyKey={busy}
        onSyncStats={(id) =>
          void runAction(`sync-${id}`, () => syncVideoStats(id), (result) => {
            toast[result.success ? "success" : "error"](result.message)
          })
        }
        onLinkCampaign={(videoId, campaignId) =>
          void runAction(`link-${videoId}`, () => linkVideoToCampaign(videoId, campaignId), (result) => {
            toast[result.success ? "success" : "error"](result.message)
          })
        }
        onUnlinkCampaign={(id) =>
          void runAction(`unlink-${id}`, () => unlinkVideoFromCampaign(id), (result) => {
            toast[result.success ? "success" : "error"](result.message)
          })
        }
        onCreateAnalytics={(id) =>
          void runAction(`analytics-${id}`, () => createOrUpdateAnalyticsForVideo(id), (result) => {
            toast[result.success ? "success" : "error"](result.message)
          })
        }
        onCreateExternalLink={(id) =>
          void runAction(`ext-${id}`, () => createExternalLinkForVideo(id), (result) => {
            toast[result.success ? "success" : "error"](result.message)
          })
        }
      />
    </ModuleShell>
  )
}

function VideoFilters({
  filters,
  campaigns,
  onChange,
}: {
  filters: VideoIntelligenceFilterState
  campaigns: VideoIntelligencePageData["campaigns"]
  onChange: (next: VideoIntelligenceFilterState) => void
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Search videos…"
          className="pl-9"
        />
      </div>
      <Select
        value={filters.campaignId || "all"}
        onValueChange={(value) =>
          onChange({ ...filters, campaignId: value === "all" ? "" : value })
        }
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Campaign" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All campaigns</SelectItem>
          {campaigns.map((campaign) => (
            <SelectItem key={campaign.id} value={campaign.id}>
              {campaign.campaignName || "Untitled"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.videoType}
        onValueChange={(value) =>
          onChange({
            ...filters,
            videoType: value as VideoIntelligenceFilterState["videoType"],
          })
        }
      >
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="short">Short</SelectItem>
          <SelectItem value="long-form">Long-form</SelectItem>
          <SelectItem value="unknown">Unknown</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={filters.syncStatus}
        onValueChange={(value) =>
          onChange({
            ...filters,
            syncStatus: value as VideoIntelligenceFilterState["syncStatus"],
          })
        }
      >
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="Sync" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any sync</SelectItem>
          <SelectItem value="fresh">Fresh</SelectItem>
          <SelectItem value="stale">Stale</SelectItem>
          <SelectItem value="never">Never synced</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={filters.hasAnalytics}
        onValueChange={(value) =>
          onChange({
            ...filters,
            hasAnalytics: value as VideoIntelligenceFilterState["hasAnalytics"],
          })
        }
      >
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Analytics" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any analytics</SelectItem>
          <SelectItem value="yes">Has analytics</SelectItem>
          <SelectItem value="no">No analytics</SelectItem>
        </SelectContent>
      </Select>
      <Input
        type="date"
        value={filters.dateFrom}
        onChange={(event) => onChange({ ...filters, dateFrom: event.target.value })}
        className="w-full sm:w-[150px]"
        aria-label="Published from"
      />
      <Input
        type="date"
        value={filters.dateTo}
        onChange={(event) => onChange({ ...filters, dateTo: event.target.value })}
        className="w-full sm:w-[150px]"
        aria-label="Published to"
      />
    </div>
  )
}

function LearningSections({
  videos,
  onOpenVideo,
}: {
  videos: EnrichedVideoRecord[]
  onOpenVideo: (video: EnrichedVideoRecord) => void
}) {
  const top = [...videos]
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    .slice(0, 5)
  const low = videos
    .filter((video) => video.hasAnalytics && (video.viewCount ?? 0) < 500)
    .slice(0, 5)
  const shorts = videos.filter((video) => video.videoType === "short").slice(0, 5)
  const campaign = videos.filter((video) => video.campaignId).slice(0, 5)

  const sections = [
    { title: "Learnings from top videos", items: top },
    { title: "Learnings from low-performing videos", items: low },
    { title: "Shorts learnings", items: shorts },
    { title: "Campaign strategy learnings", items: campaign },
  ]

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <Card key={section.title} className={RECENT_RECORDS_CARD_CLASS}>
          <CardHeader>
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {section.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No videos in this section yet.</p>
            ) : (
              section.items.map((video) => (
                <div
                  key={video.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
                >
                  <button
                    type="button"
                    className="text-left text-sm font-medium hover:underline"
                    onClick={() => onOpenVideo(video)}
                  >
                    {video.title}
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={buildLearningUrlFromVideo(video)}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Create Learning
                    </Link>
                    {video.hasLearning && video.latestLearningId ? (
                      <Link
                        href={`/learnings?recordId=${encodeURIComponent(video.latestLearningId)}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Open Learning
                      </Link>
                    ) : null}
                    {video.analyticsRecordId ? (
                      <Link
                        href={`/analytics?recordId=${encodeURIComponent(video.analyticsRecordId)}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        <BarChart3 className="size-4" />
                        Analytics
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
