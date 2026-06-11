"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { ExternalLink, Link2, Loader2, Plus, Upload, Video } from "lucide-react"

import { getExternalLinksForCampaign } from "@/lib/actions/external-links"
import {
  getYouTubeVideosForCampaign,
  syncCampaignYouTubeVideos,
} from "@/lib/actions/youtube-integration"
import { syncVideoStats } from "@/lib/actions/videos"
import { groupExternalLinksByPlatform } from "@/lib/data/external-links"
import type { ExternalLinkRecord, YouTubeVideoRecord } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RECENT_RECORDS_CARD_CLASS } from "@/components/module/form-layout"

function formatDate(ts: number | null) {
  if (!ts) return "—"
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function integrationsHref(campaignId: string, params?: Record<string, string>) {
  const search = new URLSearchParams({ campaignId, ...params })
  return `/integrations?${search.toString()}`
}

export function CampaignExternalLinksCard({ campaignId }: { campaignId: string }) {
  const [links, setLinks] = React.useState<ExternalLinkRecord[]>([])
  const [youtubeVideos, setYoutubeVideos] = React.useState<YouTubeVideoRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [syncing, setSyncing] = React.useState(false)
  const [syncingVideoId, setSyncingVideoId] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    try {
      const [nextLinks, nextVideos] = await Promise.all([
        getExternalLinksForCampaign(campaignId),
        getYouTubeVideosForCampaign(campaignId),
      ])
      setLinks(nextLinks)
      setYoutubeVideos(nextVideos)
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const grouped = groupExternalLinksByPlatform(links)
  const lastUpdated = links[0]?.updatedAt ?? null
  const youtubeVideo = links.find(
    (link) => link.platform === "YouTube" && link.linkType === "Published Video",
  )
  const driveFolder = links.find(
    (link) =>
      link.platform === "Google Drive" && link.linkType === "Google Drive Folder",
  )
  const fourthwall = links.find((link) => link.platform === "Fourthwall")
  const suno = links.find(
    (link) => link.platform === "Suno" && (link.linkType === "Suno Project" || link.linkType === "Suno Song"),
  )
  const primaryYoutubeVideo = youtubeVideos[0]

  async function handleSyncYouTube() {
    setSyncing(true)
    try {
      const result = await syncCampaignYouTubeVideos(campaignId)
      if (result.success) {
        await refresh()
      }
    } finally {
      setSyncing(false)
    }
  }

  async function handleSyncVideo(videoId: string) {
    setSyncingVideoId(videoId)
    try {
      const result = await syncVideoStats(videoId)
      if (result.success) {
        await refresh()
      }
    } finally {
      setSyncingVideoId(null)
    }
  }

  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="size-4 text-primary" />
              External Links & YouTube Video
            </CardTitle>
            <CardDescription>
              YouTube API videos, published links, Drive, Fourthwall, Suno, and other platform URLs
            </CardDescription>
          </div>
          <Badge variant="secondary">{links.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading external links…
          </div>
        ) : links.length === 0 && youtubeVideos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No links for this campaign yet. Link a YouTube video in Video Intelligence, import from
            YouTube API, import CSV, or add asset folders and product links.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {primaryYoutubeVideo ? (
              <li className="rounded-md border border-border/60 p-3">
                <div className="flex gap-3">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted">
                    {primaryYoutubeVideo.thumbnailUrl ? (
                      <Image
                        src={primaryYoutubeVideo.thumbnailUrl}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
                        No thumb
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium">{primaryYoutubeVideo.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {(primaryYoutubeVideo.viewCount ?? 0).toLocaleString()} views ·{" "}
                      {(primaryYoutubeVideo.likeCount ?? 0).toLocaleString()} likes ·{" "}
                      {(primaryYoutubeVideo.commentCount ?? 0).toLocaleString()} comments
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Published {formatDate(primaryYoutubeVideo.publishedAt)} · Last synced{" "}
                      {formatDate(primaryYoutubeVideo.lastSyncedAt)}
                    </p>
                  </div>
                </div>
              </li>
            ) : null}
            {youtubeVideo ? (
              <li>
                <span className="text-muted-foreground">YouTube link: </span>
                <Link href={youtubeVideo.url} target="_blank" rel="noopener noreferrer" className="underline">
                  {youtubeVideo.name}
                </Link>
              </li>
            ) : null}
            {driveFolder ? (
              <li>
                <span className="text-muted-foreground">Google Drive: </span>
                <Link href={driveFolder.url} target="_blank" rel="noopener noreferrer" className="underline">
                  {driveFolder.name}
                </Link>
              </li>
            ) : null}
            {fourthwall ? (
              <li>
                <span className="text-muted-foreground">Fourthwall: </span>
                <Link href={fourthwall.url} target="_blank" rel="noopener noreferrer" className="underline">
                  {fourthwall.name}
                </Link>
              </li>
            ) : null}
            {suno ? (
              <li>
                <span className="text-muted-foreground">Suno: </span>
                <Link href={suno.url} target="_blank" rel="noopener noreferrer" className="underline">
                  {suno.name}
                </Link>
              </li>
            ) : null}
            {[...grouped.entries()].slice(0, 4).map(([platform, platformLinks]) => (
              <li key={platform} className="text-muted-foreground">
                {platform}: {platformLinks.length} link(s)
              </li>
            ))}
            {lastUpdated ? (
              <li className="text-xs text-muted-foreground">
                Last updated {formatDate(lastUpdated)}
              </li>
            ) : null}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          {primaryYoutubeVideo ? (
            <>
              <Link
                href={`/videos?recordId=${encodeURIComponent(primaryYoutubeVideo.id)}&campaignId=${encodeURIComponent(campaignId)}`}
                className={buttonVariants({ size: "sm" })}
              >
                <Video className="size-4" />
                Open in Video Intelligence
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={syncingVideoId === primaryYoutubeVideo.id}
                onClick={() => void handleSyncVideo(primaryYoutubeVideo.id)}
              >
                {syncingVideoId === primaryYoutubeVideo.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Sync Stats
              </Button>
              <Link
                href={primaryYoutubeVideo.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <ExternalLink className="size-4" />
                Open YouTube
              </Link>
              {primaryYoutubeVideo.analyticsRecordId ? (
                <Link
                  href={`/analytics?recordId=${encodeURIComponent(primaryYoutubeVideo.analyticsRecordId)}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Open Analytics
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <Link
                href={`/videos?campaignId=${encodeURIComponent(campaignId)}&filter=unlinked`}
                className={buttonVariants({ size: "sm" })}
              >
                Link YouTube Video
              </Link>
              <Link
                href={`/videos?campaignId=${encodeURIComponent(campaignId)}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Open Video Intelligence
              </Link>
              <Link
                href={integrationsHref(campaignId, { tab: "youtube-api" })}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Open YouTube Integration
              </Link>
            </>
          )}
          <Link
            href={integrationsHref(campaignId, { tab: "details" })}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Plus className="size-4" />
            Add External Link
          </Link>
          <Link
            href={integrationsHref(campaignId)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Open Integrations
          </Link>
          <Link
            href={integrationsHref(campaignId, { tab: "youtube-csv" })}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Upload className="size-4" />
            Import YouTube CSV
          </Link>
          {youtubeVideos.length > 0 ? (
            <Button type="button" variant="outline" size="sm" disabled={syncing} onClick={() => void handleSyncYouTube()}>
              {syncing ? <Loader2 className="size-4 animate-spin" /> : null}
              Sync Campaign Videos
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
