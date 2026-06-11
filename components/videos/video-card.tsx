"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  ExternalLink,
  FlaskConical,
  Link2,
  RefreshCw,
  Unlink,
} from "lucide-react"

import type { EnrichedVideoRecord } from "@/lib/data/videos"
import type { CampaignRecord } from "@/lib/types"
import {
  buildAnalyticsHref,
  buildExperimentUrlFromVideo,
  buildLearningUrlFromVideo,
  buildQualityReviewUrlFromVideo,
} from "@/lib/video-prefill"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RECENT_RECORDS_CARD_CLASS } from "@/components/module/form-layout"

function formatDate(ts: number | null) {
  if (!ts) return "—"
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function formatNumber(value: number | undefined) {
  return (value ?? 0).toLocaleString()
}

export function VideoCard({
  video,
  campaigns,
  busyKey,
  onOpenDetails,
  onSyncStats,
  onLinkCampaign,
  onUnlinkCampaign,
  onCreateExternalLink,
  showSuggestedCampaign = false,
}: {
  video: EnrichedVideoRecord
  campaigns: CampaignRecord[]
  busyKey: string | null
  onOpenDetails: (video: EnrichedVideoRecord) => void
  onSyncStats: (videoId: string) => void
  onLinkCampaign: (videoId: string, campaignId: string) => void
  onUnlinkCampaign: (videoId: string) => void
  onCreateExternalLink: (videoId: string) => void
  showSuggestedCampaign?: boolean
}) {
  const [linkCampaignId, setLinkCampaignId] = React.useState(
    video.suggestedCampaignId ?? "",
  )

  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader className="pb-3">
        <div className="flex gap-3">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted">
            {video.thumbnailUrl ? (
              <Image
                src={video.thumbnailUrl}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                No thumb
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="line-clamp-2 text-base">{video.title}</CardTitle>
            <CardDescription className="line-clamp-1">
              {video.channelTitle || "Unknown channel"} · Published{" "}
              {formatDate(video.publishedAt)}
            </CardDescription>
            <div className="flex flex-wrap gap-1 pt-1">
              <Badge variant={video.campaignId ? "default" : "outline"}>
                {video.campaignId ? "Linked" : "Unlinked"}
              </Badge>
              <Badge variant={video.hasAnalytics ? "secondary" : "outline"}>
                {video.hasAnalytics ? "Analytics" : "No Analytics"}
              </Badge>
              <Badge variant={video.hasQualityReview ? "secondary" : "outline"}>
                {video.hasQualityReview ? "Quality Review" : "Missing Review"}
              </Badge>
              <Badge variant={video.hasLearning ? "secondary" : "outline"}>
                {video.hasLearning ? "Learning" : "Missing Learning"}
              </Badge>
              <Badge variant="outline">
                {video.videoType === "short"
                  ? "Short"
                  : video.videoType === "long-form"
                    ? "Long-form"
                    : "Unknown type"}
              </Badge>
              {video.isStatsStale ? (
                <Badge variant="outline">Needs sync</Badge>
              ) : null}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Duration</p>
            <p>{video.durationLabel}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Privacy</p>
            <p>{video.privacyStatus || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Campaign</p>
            <p className="truncate">{video.campaignName || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last synced</p>
            <p>{formatDate(video.lastSyncedAt)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <span>{formatNumber(video.viewCount)} views</span>
          <span>{formatNumber(video.likeCount)} likes</span>
          <span>{formatNumber(video.commentCount)} comments</span>
          {video.engagementRate != null ? (
            <span>{video.engagementRate.toFixed(2)}% engagement</span>
          ) : null}
        </div>

        {showSuggestedCampaign && video.suggestedCampaignName ? (
          <p className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Suggested campaign: <strong>{video.suggestedCampaignName}</strong>
          </p>
        ) : null}

        {!video.campaignId ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={linkCampaignId} onValueChange={setLinkCampaignId}>
              <SelectTrigger className="sm:max-w-xs">
                <SelectValue placeholder="Select campaign to link" />
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
              <Link2 className="size-4" />
              Link to Campaign
            </Button>
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenDetails(video)}
          >
            Open Details
          </Button>
          {video.campaignId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busyKey === `unlink-${video.id}`}
              onClick={() => onUnlinkCampaign(video.id)}
            >
              <Unlink className="size-4" />
              Unlink
            </Button>
          ) : null}
          <Link
            href={buildAnalyticsHref(video)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <BarChart3 className="size-4" />
            {video.hasAnalytics ? "Open Analytics" : "Create Analytics"}
          </Link>
          <Link
            href={buildQualityReviewUrlFromVideo(video)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ClipboardCheck className="size-4" />
            {video.hasQualityReview ? "Open Review" : "Create Review"}
          </Link>
          <Link
            href={buildLearningUrlFromVideo(video)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <BookOpen className="size-4" />
            {video.hasLearning ? "Open Learning" : "Create Learning"}
          </Link>
          <Link
            href={buildExperimentUrlFromVideo(video)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <FlaskConical className="size-4" />
            Create Experiment
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busyKey === `ext-${video.id}`}
            onClick={() => onCreateExternalLink(video.id)}
          >
            <Link2 className="size-4" />
            {video.hasExternalLink ? "Update External Link" : "Create External Link"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
