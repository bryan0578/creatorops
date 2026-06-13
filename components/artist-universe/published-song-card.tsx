"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, ExternalLink, Music, Pencil } from "lucide-react"

import type { PublishedSongSummary } from "@/lib/artist-universe/published-songs"
import type { AssetRecord } from "@/lib/types"
import { matchAssetsForSong } from "@/lib/artist-universe/published-songs"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function campaignHref(artist: string, conceptId: string, type: string): string {
  const params = new URLSearchParams({
    artist,
    fromSongConcept: conceptId,
    campaignType: type,
  })
  return `/campaigns?${params.toString()}`
}

export function PublishedSongCard({
  summary,
  assets,
  highlighted,
  onEdit,
  onSelect,
  onCreateReleaseArchiveTask,
}: {
  summary: PublishedSongSummary
  assets: AssetRecord[]
  highlighted?: boolean
  onEdit: () => void
  onSelect?: () => void
  onCreateReleaseArchiveTask?: () => void
}) {
  const { concept } = summary
  const matchedAssets = matchAssetsForSong(concept, assets)
  const displayStatus = concept.status || concept.releaseStatus || "Published"

  return (
    <Card
      className={cn(
        "border-border/80 transition-colors",
        highlighted ? "border-primary/50 ring-1 ring-primary/25 bg-primary/5" : undefined,
      )}
    >
      <CardHeader className="gap-1.5 p-3 pb-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            {onSelect ? (
              <button
                type="button"
                className="w-full rounded-md text-left transition-colors hover:text-primary"
                onClick={onSelect}
              >
                <CardTitle className="line-clamp-2 text-sm font-semibold leading-snug">
                  {summary.displayTitle}
                </CardTitle>
              </button>
            ) : (
              <CardTitle className="line-clamp-2 text-sm font-semibold leading-snug">
                {summary.displayTitle}
              </CardTitle>
            )}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span>{concept.artistName}</span>
              <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                {displayStatus}
              </Badge>
              {concept.publishedPlatform ? (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
                  {concept.publishedPlatform}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            {onSelect ? (
              <Button
                size="sm"
                variant={highlighted ? "secondary" : "outline"}
                className="h-7 px-2 text-xs"
                onClick={onSelect}
              >
                {highlighted ? "Selected" : "Select"}
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" className="h-7 shrink-0 px-2 text-xs" onClick={onEdit}>
              <Pencil className="mr-1 size-3" />
              Edit
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0">
        {summary.missingPublishedUrl ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
            Marked published but missing a published URL.
          </div>
        ) : null}

        {concept.publishedDate ? (
          <p className="text-xs text-muted-foreground">Published: {concept.publishedDate}</p>
        ) : null}

        {summary.publishedUrl ? (
          <a
            href={summary.publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ size: "sm", variant: "outline", className: "h-7 px-2 text-xs" })}
          >
            <ExternalLink className="mr-1 size-3" />
            Open {concept.publishedPlatform || "link"}
          </a>
        ) : null}

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{summary.loreCount} related lore</span>
          <span>·</span>
          <span>{summary.assetCount} linked assets</span>
        </div>

        {summary.performancePreview ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            Performance: {summary.performancePreview}
          </p>
        ) : null}

        {summary.futureMerchPreview ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            Merch tie-in: {summary.futureMerchPreview}
          </p>
        ) : null}

        {summary.futureCampaignPreview ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            Campaign ideas: {summary.futureCampaignPreview}
          </p>
        ) : null}

        {!summary.hasCampaign ? (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="space-y-2 p-2.5 text-xs text-muted-foreground">
              <p>
                This song is already published. A campaign is optional. Create a campaign later for
                merch, relaunch, Shorts, or a promotional push.
              </p>
              <div className="flex flex-wrap gap-1">
                <Link
                  href={campaignHref(concept.artistName, concept.id, "merch")}
                  className={buttonVariants({ size: "sm", variant: "outline", className: "h-7 px-2 text-xs" })}
                >
                  Create Merch Campaign
                </Link>
                <Link
                  href={campaignHref(concept.artistName, concept.id, "youtube-refresh")}
                  className={buttonVariants({ size: "sm", variant: "outline", className: "h-7 px-2 text-xs" })}
                >
                  YouTube Refresh
                </Link>
                <Link
                  href={campaignHref(concept.artistName, concept.id, "shorts")}
                  className={buttonVariants({ size: "sm", variant: "outline", className: "h-7 px-2 text-xs" })}
                >
                  Shorts Push
                </Link>
                {onCreateReleaseArchiveTask ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={onCreateReleaseArchiveTask}
                  >
                    Release Archive Task
                  </Button>
                ) : null}
                <Link
                  href={`/assets?artist=${encodeURIComponent(concept.artistName)}&songTitle=${encodeURIComponent(summary.displayTitle)}`}
                  className={buttonVariants({ size: "sm", variant: "outline", className: "h-7 px-2 text-xs" })}
                >
                  Open Assets
                </Link>
                <Link
                  href={`/song-vault?recordId=${encodeURIComponent(concept.id)}&artist=${encodeURIComponent(concept.artistName)}&tab=published`}
                  className={buttonVariants({ size: "sm", variant: "outline", className: "h-7 px-2 text-xs" })}
                >
                  AI Context
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {matchedAssets.length > 0 ? (
          <div className="space-y-1 border-t border-border/60 pt-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Related assets
            </p>
            <div className="flex flex-wrap gap-1">
              {matchedAssets.slice(0, 5).map((asset) => (
                <Link
                  key={asset.id}
                  href={`/assets?recordId=${encodeURIComponent(asset.id)}`}
                  className={buttonVariants({ size: "sm", variant: "ghost", className: "h-6 px-1.5 text-[10px]" })}
                >
                  {asset.assetName}
                </Link>
              ))}
              {matchedAssets.length > 5 ? (
                <Badge variant="outline" className="text-[10px]">
                  +{matchedAssets.length - 5}
                </Badge>
              ) : null}
            </div>
          </div>
        ) : null}

        {summary.linkedYouTubeVideo && !concept.relatedYouTubeVideoId ? (
          <CardDescription className="text-xs">
            Suggested YouTube match: {summary.linkedYouTubeVideo.title}
          </CardDescription>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function PublishedSongsEmptyState({ artistName, onNew }: { artistName: string; onNew?: () => void }) {
  return (
    <Card className="border-dashed border-border/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Music className="size-4" />
          No published songs yet
        </CardTitle>
        <CardDescription>
          {artistName
            ? `Mark a song concept as Published or Released, or add a published URL for ${artistName}.`
            : "Mark song concepts as Published or Released, or add a published URL."}
        </CardDescription>
      </CardHeader>
      {onNew ? (
        <CardContent>
          <Button size="sm" onClick={onNew}>
            New Song Concept
          </Button>
        </CardContent>
      ) : null}
    </Card>
  )
}
