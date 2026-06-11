"use client"

import * as React from "react"
import Link from "next/link"
import { ExternalLink, Link2, Loader2, Plus, Upload } from "lucide-react"

import { getExternalLinksForCampaign } from "@/lib/actions/external-links"
import {
  getYouTubeVideosForCampaign,
  syncCampaignYouTubeVideos,
} from "@/lib/actions/youtube-integration"
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

function formatDate(ts: number) {
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

  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="size-4 text-primary" />
              External Links
            </CardTitle>
            <CardDescription>
              YouTube, Google Drive, Fourthwall, Suno, and other platform URLs
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
            No links for this campaign yet. Add published video, import from YouTube API, import CSV,
            or add asset folders and product links.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {primaryYoutubeVideo ? (
              <li className="rounded-md border border-border/60 p-2">
                <p className="font-medium">{primaryYoutubeVideo.title}</p>
                <p className="text-xs text-muted-foreground">
                  YouTube API · {(primaryYoutubeVideo.viewCount ?? 0).toLocaleString()} views ·{" "}
                  {(primaryYoutubeVideo.likeCount ?? 0).toLocaleString()} likes ·{" "}
                  {(primaryYoutubeVideo.commentCount ?? 0).toLocaleString()} comments
                </p>
                <p className="text-xs text-muted-foreground">
                  Published {formatDate(primaryYoutubeVideo.publishedAt)} · Last synced{" "}
                  {formatDate(primaryYoutubeVideo.lastSyncedAt)}
                </p>
              </li>
            ) : null}
            {youtubeVideo ? (
              <li>
                <span className="text-muted-foreground">YouTube: </span>
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
          <Link
            href={integrationsHref(campaignId, { tab: "details" })}
            className={buttonVariants({ size: "sm" })}
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
            href={integrationsHref(campaignId, { tab: "youtube-api" })}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Import from YouTube
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
              Sync YouTube Stats
            </Button>
          ) : null}
          {primaryYoutubeVideo?.analyticsRecordId ? (
            <Link
              href={`/analytics?recordId=${encodeURIComponent(primaryYoutubeVideo.analyticsRecordId)}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View Analytics
            </Link>
          ) : null}
          {(primaryYoutubeVideo?.videoUrl || youtubeVideo?.url) ? (
            <Link
              href={primaryYoutubeVideo?.videoUrl || youtubeVideo!.url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ExternalLink className="size-4" />
              Open YouTube
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
