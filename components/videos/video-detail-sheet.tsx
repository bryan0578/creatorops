"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { ExternalLink, RefreshCw } from "lucide-react"

import type { EnrichedVideoRecord } from "@/lib/data/videos"
import type { CampaignRecord } from "@/lib/types"
import {
  buildAnalyticsHref,
  buildExperimentUrlFromVideo,
  buildExternalLinkHref,
  buildLearningUrlFromVideo,
  buildQualityReviewUrlFromVideo,
} from "@/lib/video-prefill"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

function formatDate(ts: number | null) {
  if (!ts) return "—"
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function VideoDetailSheet({
  video,
  campaigns,
  open,
  onOpenChange,
  busyKey,
  onSyncStats,
  onLinkCampaign,
  onUnlinkCampaign,
  onCreateAnalytics,
  onCreateExternalLink,
}: {
  video: EnrichedVideoRecord | null
  campaigns: CampaignRecord[]
  open: boolean
  onOpenChange: (open: boolean) => void
  busyKey: string | null
  onSyncStats: (videoId: string) => void
  onLinkCampaign: (videoId: string, campaignId: string) => void
  onUnlinkCampaign: (videoId: string) => void
  onCreateAnalytics: (videoId: string) => void
  onCreateExternalLink: (videoId: string) => void
}) {
  const [linkCampaignId, setLinkCampaignId] = React.useState("")

  React.useEffect(() => {
    if (video?.suggestedCampaignId) {
      setLinkCampaignId(video.suggestedCampaignId)
    } else if (video?.campaignId) {
      setLinkCampaignId(video.campaignId)
    } else {
      setLinkCampaignId("")
    }
  }, [video])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-screen max-h-screen w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        {video ? (
          <>
            <SheetHeader className="shrink-0 border-b px-6 py-4">
              <SheetTitle className="text-pretty pr-8">{video.title}</SheetTitle>
              <SheetDescription>
                {video.channelTitle} · {video.durationLabel} · {video.privacyStatus}
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
              <div className="relative aspect-video overflow-hidden rounded-lg border border-border/60 bg-muted">
                {video.thumbnailUrl ? (
                  <Image
                    src={video.thumbnailUrl}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                    No thumbnail
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                <Badge variant={video.campaignId ? "default" : "outline"}>
                  {video.campaignId ? "Linked" : "Unlinked"}
                </Badge>
                <Badge variant="outline">{video.videoType}</Badge>
                {video.isStatsStale ? <Badge variant="outline">Stale stats</Badge> : null}
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Published</p>
                  <p>{formatDate(video.publishedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last synced</p>
                  <p>{formatDate(video.lastSyncedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Views</p>
                  <p>{(video.viewCount ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Engagement</p>
                  <p>
                    {(video.likeCount ?? 0).toLocaleString()} likes ·{" "}
                    {(video.commentCount ?? 0).toLocaleString()} comments
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Campaign</p>
                  <p>{video.campaignName || "Not linked"}</p>
                </div>
              </div>

              {video.description ? (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Description</p>
                  <p className="line-clamp-6 text-sm text-pretty">{video.description}</p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Link
                  href={video.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <ExternalLink className="size-4" />
                  Open YouTube
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busyKey === `sync-${video.id}`}
                  onClick={() => onSyncStats(video.id)}
                >
                  <RefreshCw className="size-4" />
                  Sync Stats
                </Button>
                <Link
                  href={buildAnalyticsHref(video)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {video.hasAnalytics ? "Open Analytics" : "Create Analytics"}
                </Link>
                <Link
                  href={buildExternalLinkHref(video)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  External Link
                </Link>
                <Link
                  href={buildQualityReviewUrlFromVideo(video)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Quality Review
                </Link>
                <Link
                  href={buildLearningUrlFromVideo(video)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Learning
                </Link>
                <Link
                  href={buildExperimentUrlFromVideo(video)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Experiment
                </Link>
              </div>

              {!video.campaignId ? (
                <div className="space-y-2 rounded-lg border border-border/60 p-3">
                  <p className="text-sm font-medium">Link to campaign</p>
                  <Select value={linkCampaignId} onValueChange={setLinkCampaignId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.campaignName || "Untitled campaign"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!linkCampaignId || busyKey === `link-${video.id}`}
                    onClick={() => onLinkCampaign(video.id, linkCampaignId)}
                  >
                    Link to Campaign
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busyKey === `unlink-${video.id}`}
                  onClick={() => onUnlinkCampaign(video.id)}
                >
                  Unlink from Campaign
                </Button>
              )}

              {!video.hasAnalytics ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={busyKey === `analytics-${video.id}`}
                  onClick={() => onCreateAnalytics(video.id)}
                >
                  Create Analytics Record
                </Button>
              ) : null}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busyKey === `ext-${video.id}`}
                onClick={() => onCreateExternalLink(video.id)}
              >
                {video.hasExternalLink ? "Update External Link" : "Add External Link"}
              </Button>

              <details className="rounded-md border border-border/60 p-3 text-xs">
                <summary className="cursor-pointer font-medium">Raw metadata</summary>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all text-muted-foreground">
                  {video.rawJson || "{}"}
                </pre>
              </details>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
