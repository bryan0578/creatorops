"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ExternalLink,
  Loader2,
  RefreshCw,
  Unplug,
  Video,
} from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import {
  createOrUpdateAnalyticsFromYouTubeVideo,
  createOrUpdateExternalLinkFromYouTubeVideo,
  fetchRecentYouTubeVideosAction,
  fetchYouTubeChannel,
  getYouTubeConnectionStatus,
  getYouTubeVideos,
  importYouTubeVideo,
  linkYouTubeVideoToCampaign,
  saveManualYouTubeChannelId,
  syncCampaignYouTubeVideos,
  syncYouTubeVideoStats,
} from "@/lib/actions/youtube-integration"
import type { CampaignRecord, YouTubeConnectionStatusSummary, YouTubeVideoRecord } from "@/lib/types"
import type { YouTubeApiVideoSummary } from "@/lib/youtube/types"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const ERROR_MESSAGES: Record<string, string> = {
  missing_credentials:
    "YouTube credentials are missing. Add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET to .env.local.",
  missing_youtube_env:
    "YouTube credentials are missing. Add YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and YOUTUBE_REDIRECT_URI to .env.local, then restart the dev server.",
  missing_encryption_key:
    "Token encryption key is missing. Add CREATOROPS_TOKEN_ENCRYPTION_KEY to .env.local and restart the dev server.",
  missing_code: "OAuth callback did not include an authorization code. Please try connecting again.",
  consent_denied: "YouTube connection was cancelled.",
  oauth_state_mismatch:
    "OAuth session expired or mismatched. Please click Connect YouTube again.",
  invalid_state:
    "OAuth session expired or mismatched. Please click Connect YouTube again.",
  token_exchange_failed:
    "Google returned an error while exchanging the OAuth code. Check that your redirect URI exactly matches Google Cloud and your client secret is correct.",
  token_encrypt_failed:
    "Could not encrypt OAuth tokens for local storage. Verify CREATOROPS_TOKEN_ENCRYPTION_KEY is set and restart the dev server.",
  channel_fetch_failed:
    "Connected to Google, but CreatorOps could not fetch your YouTube channel. Confirm the YouTube Data API v3 is enabled and the youtube.readonly scope is configured.",
  connection_save_failed:
    "YouTube connected, but CreatorOps could not save the connection locally. Check Prisma/database logs.",
  oauth_failed: "YouTube OAuth failed. Check the terminal for step-by-step diagnostics.",
  disconnect_failed: "Could not disconnect YouTube.",
}

const WARNING_MESSAGES: Record<string, string> = {
  channel_select_required:
    "Google OAuth succeeded, but YouTube did not return a channel. Enter your channel ID below or reconnect and select the correct Brand Account.",
}

function connectionStatusBadgeVariant(
  status: string | undefined,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "Connected") return "default"
  if (status === "ConnectedNeedsChannel" || status === "ChannelIdSaved") return "secondary"
  if (status === "ConnectedNeedsReconnect") return "outline"
  if (status === "Error" || status === "Expired") return "destructive"
  return "outline"
}

function formatDate(value: number | string | null | undefined) {
  if (!value) return "—"
  const ts = typeof value === "number" ? value : Date.parse(String(value))
  if (Number.isNaN(ts)) return "—"
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function YouTubeApiPanel({
  campaigns,
  defaultCampaignId = "",
}: {
  campaigns: CampaignRecord[]
  defaultCampaignId?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { reloadAnalyticsRecords } = useStore()
  const [status, setStatus] = React.useState<YouTubeConnectionStatusSummary | null>(null)
  const [localVideos, setLocalVideos] = React.useState<YouTubeVideoRecord[]>([])
  const [recentVideos, setRecentVideos] = React.useState<YouTubeApiVideoSummary[]>([])
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [selectedCampaignId, setSelectedCampaignId] = React.useState(defaultCampaignId)
  const [selectedVideoId, setSelectedVideoId] = React.useState("")
  const [manualChannelId, setManualChannelId] = React.useState("")

  const refresh = React.useCallback(async () => {
    setLoading(true)
    try {
      const [nextStatus, videos] = await Promise.all([
        getYouTubeConnectionStatus(),
        getYouTubeVideos(),
      ])
      setStatus(nextStatus)
      setLocalVideos(videos)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    if (defaultCampaignId) setSelectedCampaignId(defaultCampaignId)
  }, [defaultCampaignId])

  React.useEffect(() => {
    const error = searchParams.get("error")
    if (error) {
      toast.error(ERROR_MESSAGES[error] ?? "YouTube connection failed.")
      router.replace("/integrations?tab=youtube-api")
    }
    if (searchParams.get("connected") === "1") {
      toast.success("YouTube connected successfully.")
      router.replace("/integrations?tab=youtube-api")
      void refresh()
    }
    const warning = searchParams.get("warning")
    if (warning) {
      toast.warning(WARNING_MESSAGES[warning] ?? "YouTube connected with a warning.")
      router.replace("/integrations?tab=youtube-api")
      void refresh()
    }
    if (searchParams.get("disconnected") === "1") {
      toast.success("YouTube disconnected.")
      router.replace("/integrations?tab=youtube-api")
      void refresh()
    }
  }, [searchParams, router, refresh])

  async function refreshAnalyticsStore() {
    try {
      await reloadAnalyticsRecords()
    } catch {
      // Store logs database fallback; sync still succeeded server-side.
    }
    router.refresh()
  }

  function notifyYouTubeSyncResult(result: {
    success: boolean
    message: string
    analyticsUpdated?: boolean
  }) {
    if (!result.success) {
      toast.error(result.message)
      return
    }
    if (result.analyticsUpdated === false) {
      toast.warning(result.message)
      return
    }
    toast.success(result.message)
  }

  async function runAction<T>(
    key: string,
    action: () => Promise<T>,
    onSuccess?: (result: T) => void | Promise<void>,
  ) {
    setBusy(key)
    try {
      const result = await action()
      await onSuccess?.(result)
      await refresh()
      return result
    } finally {
      setBusy(null)
    }
  }

  const connected = status?.connected ?? false
  const oauthConnected = status?.oauthConnected ?? false
  const needsChannelSelection = status?.needsChannelSelection ?? false
  const needsManualChannelSetup =
    needsChannelSelection || status?.connection?.status === "ChannelIdSaved"
  const connectionStatus = status?.connection?.status ?? "Disconnected"
  const apiKeyConfigured = status?.apiKeyConfigured ?? false
  const savedChannelId = status?.connection?.channelId?.trim() ?? ""
  const canManageChannelVideos = connected || Boolean(savedChannelId)

  React.useEffect(() => {
    const savedId = status?.connection?.channelId?.trim()
    const needsSetup =
      needsChannelSelection || status?.connection?.status === "ChannelIdSaved"
    if (savedId && needsSetup && !manualChannelId) {
      setManualChannelId(savedId)
    }
  }, [
    status?.connection?.channelId,
    status?.connection?.status,
    needsChannelSelection,
    manualChannelId,
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <Link href="/videos" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Open Video Intelligence
        </Link>
      </div>
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Video className="size-4 text-red-600" />
            Connection Status
          </CardTitle>
          <CardDescription>
            Connect your YouTube channel to import video metadata and sync stats via the YouTube
            Data API. CSV import remains available as a fallback.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading connection status…
            </div>
          ) : !status?.configured ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">Connect YouTube</p>
              <p className="text-sm text-muted-foreground">
                Connect your YouTube channel to import video metadata and sync stats.
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>Add YOUTUBE_CLIENT_ID to .env.local</li>
                <li>Add YOUTUBE_CLIENT_SECRET to .env.local</li>
                <li>Add YOUTUBE_REDIRECT_URI (default: http://localhost:3000/api/youtube/oauth/callback)</li>
                <li>Add CREATOROPS_TOKEN_ENCRYPTION_KEY for secure local token storage</li>
                <li>Restart the dev server</li>
              </ul>
              <Badge variant="outline">
                Client ID: {status?.clientIdConfigured ? "configured" : "missing"}
              </Badge>{" "}
              <Badge variant="outline">
                Client secret: {status?.clientSecretConfigured ? "configured" : "missing"}
              </Badge>{" "}
              <Badge variant="outline">
                Encryption key: {status?.encryptionConfigured ? "configured" : "missing"}
              </Badge>
            </div>
          ) : !oauthConnected ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{status.message}</p>
              <Link href="/api/youtube/oauth/start" className={buttonVariants()}>
                Connect YouTube
              </Link>
            </div>
          ) : needsManualChannelSetup ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  {connectionStatus === "ChannelIdSaved"
                    ? "Channel ID saved — validation needed"
                    : "YouTube connected, but no channel was selected"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {connectionStatus === "ChannelIdSaved"
                    ? "Your channel ID was saved locally but could not be validated. Add YOUTUBE_API_KEY to .env.local or reconnect YouTube, then save again."
                    : "Google OAuth succeeded, but YouTube did not return a channel for this account. This can happen with Brand Accounts. Select the correct YouTube Brand Account during Google sign-in, or manually enter the channel ID."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/api/youtube/oauth/start" className={buttonVariants({ size: "sm" })}>
                    Reconnect YouTube
                  </Link>
                  <Link
                    href="https://studio.youtube.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Open YouTube Studio
                  </Link>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-border/80 p-4">
                <div className="space-y-1">
                  <Label htmlFor="manual-channel-id">Manual Channel ID</Label>
                  <Input
                    id="manual-channel-id"
                    placeholder="UCxxxxxxxxxxxxxxxxxxxxxx"
                    value={manualChannelId}
                    onChange={(event) => setManualChannelId(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste the Channel ID from YouTube Studio → Settings → Channel → Advanced
                    settings. Also accepts{" "}
                    <code className="text-xs">youtube.com/channel/UC...</code> URLs. @handles and
                    /c/ URLs are not supported yet.
                  </p>
                </div>
                {!apiKeyConfigured ? (
                  <p className="text-xs text-muted-foreground">
                    To validate public channels without OAuth, add{" "}
                    <code className="text-xs">YOUTUBE_API_KEY</code> to .env.local.
                  </p>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  disabled={!manualChannelId.trim() || busy === "save-channel-id"}
                  onClick={() =>
                    void runAction(
                      "save-channel-id",
                      () => saveManualYouTubeChannelId(manualChannelId),
                      (result) => {
                        if (result.partial) {
                          toast.warning(result.message)
                        } else if (result.code === "channel_validated" || result.success) {
                          toast.success(result.message)
                        } else {
                          toast.error(result.message)
                        }
                        if (result.success) setManualChannelId("")
                      },
                    )
                  }
                >
                  {busy === "save-channel-id" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Save Channel ID
                </Button>
              </div>

              <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">How to find channel ID</p>
                <ol className="mt-2 list-inside list-decimal space-y-1">
                  <li>Open YouTube Studio</li>
                  <li>Go to Settings → Channel → Advanced settings</li>
                  <li>Copy Channel ID (starts with UC)</li>
                </ol>
              </div>

              <Badge variant={connectionStatusBadgeVariant(connectionStatus)}>
                {connectionStatus}
              </Badge>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {status.connection?.thumbnailUrl ? (
                <Image
                  src={status.connection.thumbnailUrl}
                  alt=""
                  width={64}
                  height={64}
                  className="size-16 rounded-full object-cover"
                  unoptimized
                />
              ) : null}
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{status.connection?.channelTitle}</p>
                  <Badge variant={connectionStatusBadgeVariant(connectionStatus)}>
                    {connectionStatus}
                  </Badge>
                </div>
                {status.connection?.channelHandle ? (
                  <p className="text-sm text-muted-foreground">@{status.connection.channelHandle}</p>
                ) : null}
                {status.connection?.channelId ? (
                  <p className="text-xs text-muted-foreground">
                    Channel ID: {status.connection.channelId}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Last synced: {formatDate(status.connection?.lastSyncedAt)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy === "refresh-channel"}
                    onClick={() =>
                      void runAction("refresh-channel", fetchYouTubeChannel, (result) => {
                        toast[result.success ? "success" : "error"](result.message)
                      })
                    }
                  >
                    {busy === "refresh-channel" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    Refresh Channel
                  </Button>
                  <Link
                    href="/api/youtube/oauth/disconnect"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <Unplug className="size-4" />
                    Disconnect YouTube
                  </Link>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {canManageChannelVideos ? (
        <>
          <Card className="border-border/80">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Recent Videos</CardTitle>
                  <CardDescription>
                    Fetch uploads from your saved channel, then import selected videos locally.
                    {connectionStatus === "ChannelIdSaved" && !apiKeyConfigured
                      ? " Add YOUTUBE_API_KEY to fetch public videos for this saved channel."
                      : null}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy === "fetch-recent"}
                  onClick={() =>
                    void runAction("fetch-recent", () => fetchRecentYouTubeVideosAction(25), (result) => {
                      if (result.success) {
                        setRecentVideos(result.videos)
                        toast.success(result.message)
                      } else {
                        toast.error(result.message)
                      }
                    })
                  }
                >
                  {busy === "fetch-recent" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Video className="size-4" />
                  )}
                  Fetch Recent Videos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentVideos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Click Fetch Recent Videos to load uploads from YouTube.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Video</TableHead>
                        <TableHead>Published</TableHead>
                        <TableHead>Privacy</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentVideos.map((video) => {
                        const imported = localVideos.find(
                          (item) => item.youtubeVideoId === video.youtubeVideoId,
                        )
                        return (
                          <TableRow key={video.youtubeVideoId}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {video.thumbnailUrl ? (
                                  <Image
                                    src={video.thumbnailUrl}
                                    alt=""
                                    width={80}
                                    height={45}
                                    className="h-11 w-20 rounded object-cover"
                                    unoptimized
                                  />
                                ) : null}
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{video.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {video.viewCount.toLocaleString()} views
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDate(video.publishedAt)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{video.privacyStatus || "—"}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={busy === `import-${video.youtubeVideoId}`}
                                  onClick={() =>
                                    void runAction(
                                      `import-${video.youtubeVideoId}`,
                                      async () => {
                                        const result = await importYouTubeVideo(
                                          video.youtubeVideoId,
                                          selectedCampaignId || undefined,
                                        )
                                        if (result.success) {
                                          await refresh()
                                          toast.success(result.message, {
                                            action: result.video
                                              ? {
                                                  label: "Open in Video Intelligence",
                                                  onClick: () =>
                                                    router.push(
                                                      `/videos?recordId=${encodeURIComponent(result.video!.id)}`,
                                                    ),
                                                }
                                              : undefined,
                                          })
                                        } else {
                                          toast.error(result.message)
                                        }
                                        return result
                                      },
                                    )
                                  }
                                >
                                  {imported ? "Update" : "Import"}
                                </Button>
                                {imported ? (
                                  <Link
                                    href={`/videos?recordId=${encodeURIComponent(imported.id)}`}
                                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                                  >
                                    Video Intelligence
                                  </Link>
                                ) : null}
                                <Link
                                  href={video.videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                                >
                                  <ExternalLink className="size-4" />
                                </Link>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-base">Link Video to Campaign</CardTitle>
              <CardDescription>
                Select a campaign and an imported video, then link them for analytics and launch
                dashboard visibility.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-[200px] flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Campaign</p>
                <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
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
              </div>
              <div className="min-w-[200px] flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Imported video</p>
                <Select value={selectedVideoId} onValueChange={setSelectedVideoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select imported video" />
                  </SelectTrigger>
                  <SelectContent>
                    {localVideos.map((video) => (
                      <SelectItem key={video.id} value={video.id}>
                        {video.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                disabled={!selectedCampaignId || !selectedVideoId || busy === "link"}
                onClick={() =>
                  void runAction(
                    "link",
                    () => linkYouTubeVideoToCampaign(selectedVideoId, selectedCampaignId),
                    (result) => toast[result.success ? "success" : "error"](result.message),
                  )
                }
              >
                Link to Campaign
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Imported Videos & Sync</CardTitle>
                  <CardDescription>
                    Sync stats into Analytics Tracker and keep External Links up to date. Manage
                    imported videos in Video Intelligence.
                  </CardDescription>
                </div>
                <Link href="/videos" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Open Video Intelligence
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!selectedCampaignId || busy === "sync-campaign"}
                  onClick={() =>
                    void runAction(
                      "sync-campaign",
                      () => syncCampaignYouTubeVideos(selectedCampaignId),
                      async (result) => {
                        toast[result.success ? "success" : "error"](result.message)
                        if (result.success) await refreshAnalyticsStore()
                      },
                    )
                  }
                >
                  Sync Campaign Videos
                </Button>
              </div>

              {localVideos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No imported videos yet.</p>
              ) : (
                <div className="space-y-3">
                  {localVideos.map((video) => (
                    <div
                      key={video.id}
                      className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{video.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {video.campaignName || "No campaign"} · Last synced{" "}
                          {formatDate(video.lastSyncedAt)} ·{" "}
                          {(video.viewCount ?? 0).toLocaleString()} views
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy === `sync-${video.id}`}
                          onClick={() =>
                            void runAction(
                              `sync-${video.id}`,
                              () => syncYouTubeVideoStats(video.id),
                              async (result) => {
                                notifyYouTubeSyncResult(result)
                                if (result.success && result.analyticsUpdated) {
                                  await refreshAnalyticsStore()
                                }
                              },
                            )
                          }
                        >
                          Sync Stats
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            void runAction(
                              `ext-${video.id}`,
                              () => createOrUpdateExternalLinkFromYouTubeVideo(video.id),
                              (result) => toast[result.success ? "success" : "error"](result.message),
                            )
                          }
                        >
                          External Link
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            void runAction(
                              `analytics-${video.id}`,
                              () => createOrUpdateAnalyticsFromYouTubeVideo(video.id),
                              async (result) => {
                                toast[result.success ? "success" : "error"](result.message)
                                if (result.success) await refreshAnalyticsStore()
                              },
                            )
                          }
                        >
                          Analytics
                        </Button>
                        {video.analyticsRecordId ? (
                          <Link
                            href={`/learnings?analyticsRecordId=${encodeURIComponent(video.analyticsRecordId)}&learningType=${encodeURIComponent("Analytics Review")}`}
                            className={buttonVariants({ variant: "ghost", size: "sm" })}
                          >
                            Create Learning
                          </Link>
                        ) : null}
                        <Link
                          href={`/videos?recordId=${encodeURIComponent(video.id)}`}
                          className={buttonVariants({ variant: "ghost", size: "sm" })}
                        >
                          Video Intelligence
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
