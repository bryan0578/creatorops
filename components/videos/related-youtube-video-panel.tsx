"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2, Video } from "lucide-react"

import { getVideoByAnalyticsRecordId } from "@/lib/actions/videos"
import type { YouTubeVideoRecord } from "@/lib/types"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RECENT_RECORDS_CARD_CLASS } from "@/components/module/form-layout"

export function RelatedYouTubeVideoPanel({
  analyticsRecordId,
}: {
  analyticsRecordId?: string
}) {
  const [video, setVideo] = React.useState<YouTubeVideoRecord | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    const id = analyticsRecordId?.trim()
    if (!id) {
      setVideo(null)
      return
    }
    let cancelled = false
    setLoading(true)
    void getVideoByAnalyticsRecordId(id)
      .then((result) => {
        if (!cancelled) setVideo(result)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [analyticsRecordId])

  if (!analyticsRecordId?.trim()) return null

  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Video className="size-4 text-primary" />
          Related YouTube Video
        </CardTitle>
        <CardDescription>Imported YouTube API video linked to this analytics record</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading related video…
          </div>
        ) : video ? (
          <div className="space-y-3">
            <p className="font-medium">{video.title}</p>
            <p className="text-sm text-muted-foreground">
              {(video.viewCount ?? 0).toLocaleString()} views ·{" "}
              {video.channelTitle || "YouTube"}
            </p>
            <Link
              href={`/videos?recordId=${encodeURIComponent(video.id)}`}
              className={buttonVariants({ size: "sm" })}
            >
              Open in Video Intelligence
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No imported YouTube video is linked to this analytics record.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
