"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ExternalLink,
  FolderOpen,
  HardDrive,
  Loader2,
  RefreshCw,
  Unplug,
} from "lucide-react"
import { toast } from "sonner"

import {
  createAssetFromDriveFile,
  getDriveConnectionStatus,
  getDriveFiles,
  getDriveFolders,
  getDriveSummary,
  linkDriveFolderToCampaign,
  syncDriveFolder,
  validateDriveFolderUrl,
} from "@/lib/actions/drive-integration"
import { countDriveFilesForFolder } from "@/lib/drive/mappers"
import { AssetLinkSuggestionsPanel } from "@/components/asset-linking/asset-link-suggestions-panel"
import type {
  CampaignRecord,
  DriveConnectionStatusSummary,
  DriveFileRecord,
  DriveFolderRecord,
} from "@/lib/types"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ERROR_MESSAGES: Record<string, string> = {
  missing_credentials:
    "Google Drive credentials are missing. Add GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET to .env.local (or reuse YouTube OAuth credentials).",
  missing_encryption_key:
    "Token encryption key is missing. Add CREATOROPS_TOKEN_ENCRYPTION_KEY to .env.local.",
  consent_denied: "Google Drive connection was cancelled.",
  oauth_state_mismatch: "OAuth session expired. Please connect Google Drive again.",
  oauth_failed: "Google Drive OAuth failed. Check credentials and redirect URI.",
  disconnect_failed: "Could not disconnect Google Drive.",
}

function formatDate(ts: number | null) {
  if (!ts) return "—"
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function GoogleDriveApiPanel({
  campaigns,
  defaultCampaignId = "",
}: {
  campaigns: CampaignRecord[]
  defaultCampaignId?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = React.useState<DriveConnectionStatusSummary | null>(null)
  const [folders, setFolders] = React.useState<DriveFolderRecord[]>([])
  const [files, setFiles] = React.useState<DriveFileRecord[]>([])
  const [summary, setSummary] = React.useState<Awaited<ReturnType<typeof getDriveSummary>> | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [folderInput, setFolderInput] = React.useState("")
  const [selectedCampaignId, setSelectedCampaignId] = React.useState(defaultCampaignId)
  const [previewMessage, setPreviewMessage] = React.useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = React.useState<string>("all")
  const highlightFileId = searchParams.get("fileId") ?? ""
  const highlightAssetId = searchParams.get("assetId") ?? ""

  const refresh = React.useCallback(async () => {
    setLoading(true)
    try {
      const [nextStatus, nextFolders, nextFiles, nextSummary] = await Promise.all([
        getDriveConnectionStatus(),
        getDriveFolders(),
        getDriveFiles(),
        getDriveSummary(),
      ])
      setStatus(nextStatus)
      setFolders(nextFolders)
      setFiles(nextFiles)
      setSummary(nextSummary)
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
    const connected = searchParams.get("connected")
    const error = searchParams.get("error")
    const disconnected = searchParams.get("disconnected")
    if (connected) toast.success("Google Drive connected.")
    if (disconnected) toast.success("Google Drive disconnected.")
    if (error) toast.error(ERROR_MESSAGES[error] ?? "Google Drive connection failed.")
  }, [searchParams])

  async function runAction<T>(key: string, action: () => Promise<T>, onSuccess?: (result: T) => void) {
    setBusy(key)
    try {
      const result = await action()
      onSuccess?.(result)
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  const connected = status?.connected ?? false
  const filteredFiles =
    selectedFolderId === "all"
      ? files
      : files.filter((file) => file.folderId === selectedFolderId || file.driveFolderId === selectedFolderId)

  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="size-4 text-blue-600" />
            Connection Status
          </CardTitle>
          <CardDescription>
            Connect Google Drive to sync folder metadata and create Asset records. Read-only — no uploads or deletions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading connection status…
            </div>
          ) : !status?.configured ? (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Connect Google Drive</p>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                <li>Add GOOGLE_DRIVE_CLIENT_ID to .env.local</li>
                <li>Add GOOGLE_DRIVE_CLIENT_SECRET to .env.local</li>
                <li>Add GOOGLE_DRIVE_REDIRECT_URI (default: http://localhost:3000/api/drive/oauth/callback)</li>
                <li>Add CREATOROPS_TOKEN_ENCRYPTION_KEY for secure local token storage</li>
                <li>Or reuse YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET if Drive vars are unset</li>
              </ul>
            </div>
          ) : !connected ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{status.message}</p>
              <Link href="/api/drive/oauth/start" className={buttonVariants()}>
                Connect Google Drive
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Connected</Badge>
                {status.usingYoutubeFallback ? (
                  <Badge variant="secondary">Using YouTube OAuth credentials</Badge>
                ) : null}
              </div>
              <p className="text-sm">
                {status.connection?.displayName || status.connection?.accountEmail || "Google account"}
              </p>
              <p className="text-xs text-muted-foreground">
                Last synced: {formatDate(status.connection?.lastSyncedAt ?? null)}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/api/drive/oauth/start" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Reconnect
                </Link>
                <Link
                  href="/api/drive/oauth/disconnect"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Unplug className="size-4" />
                  Disconnect
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Folders</p><p className="text-2xl font-semibold">{summary.folderCount}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Files</p><p className="text-2xl font-semibold">{summary.fileCount}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Linked assets</p><p className="text-2xl font-semibold">{summary.linkedAssets}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Unlinked files</p><p className="text-2xl font-semibold">{summary.unlinkedFiles}</p></CardContent></Card>
        </div>
      ) : null}

      <AssetLinkSuggestionsPanel
        campaignId={selectedCampaignId || defaultCampaignId || undefined}
        driveFileId={highlightFileId || undefined}
        assetId={highlightAssetId || undefined}
        limit={12}
        onApplied={() => void refresh()}
        description="Unlinked Drive files and related records with deterministic name/campaign matches. Nothing is linked until you click Apply."
      />

      {connected ? (
        <>
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-base">Sync Folder</CardTitle>
              <CardDescription>
                Paste a Google Drive folder URL or ID, optionally link to a campaign, then sync file metadata.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="drive-folder-input">Drive folder URL or ID</Label>
                <Input
                  id="drive-folder-input"
                  value={folderInput}
                  onChange={(event) => setFolderInput(event.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Campaign (optional)</Label>
                  <Select value={selectedCampaignId || "none"} onValueChange={(value) => setSelectedCampaignId(value === "none" ? "" : value)}>
                    <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No campaign</SelectItem>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.campaignName || "Untitled campaign"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {previewMessage ? (
                <p className="text-sm text-muted-foreground">{previewMessage}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!folderInput.trim() || busy === "preview"}
                  onClick={() =>
                    void runAction("preview", () => validateDriveFolderUrl(folderInput), (result) => {
                      setPreviewMessage(result.message)
                      toast[result.success ? "success" : "error"](result.message)
                    })
                  }
                >
                  Preview Folder
                </Button>
                <Button
                  type="button"
                  disabled={!folderInput.trim() || busy === "sync"}
                  onClick={() =>
                    void runAction(
                      "sync",
                      () =>
                        syncDriveFolder({
                          folderUrlOrId: folderInput,
                          campaignId: selectedCampaignId || undefined,
                        }),
                      (result) => toast[result.success ? "success" : "error"](result.message),
                    )
                  }
                >
                  {busy === "sync" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  Sync Folder
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-base">Synced Folders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {folders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No synced folders yet.</p>
              ) : (
                folders.map((folder) => (
                  <div key={folder.id} className="rounded-lg border border-border/60 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{folder.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {folder.campaignName || "Unlinked"} · {countDriveFilesForFolder(files, folder)} files · Last synced {formatDate(folder.lastSyncedAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy === `sync-folder-${folder.id}`}
                          onClick={() =>
                            void runAction(
                              `sync-folder-${folder.id}`,
                              () => syncDriveFolder({ folderUrlOrId: folder.driveFolderId, campaignId: folder.campaignId || undefined }),
                              (result) => toast[result.success ? "success" : "error"](result.message),
                            )
                          }
                        >
                          Sync Again
                        </Button>
                        <Link href={folder.url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                          <ExternalLink className="size-4" />
                          Open Drive
                        </Link>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedFolderId(folder.id)}>
                          View Files
                        </Button>
                      </div>
                    </div>
                    {!folder.campaignId && selectedCampaignId ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        disabled={busy === `link-folder-${folder.id}`}
                        onClick={() =>
                          void runAction(
                            `link-folder-${folder.id}`,
                            () => linkDriveFolderToCampaign(folder.id, selectedCampaignId),
                            (result) => toast[result.success ? "success" : "error"](result.message),
                          )
                        }
                      >
                        Link to Campaign
                      </Button>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">Synced Files</CardTitle>
                <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter folder" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All folders</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No synced files yet.</p>
              ) : (
                filteredFiles.map((file) => (
                  <div key={file.id} className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      {file.thumbnailLink ? (
                        <Image src={file.thumbnailLink} alt="" width={40} height={40} className="size-10 rounded object-cover" unoptimized />
                      ) : (
                        <FolderOpen className="size-10 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.detectedAssetType} · {file.campaignName || "Unlinked"} · {formatDate(file.modifiedTime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy === `asset-${file.id}`}
                        onClick={() =>
                          void runAction(
                            `asset-${file.id}`,
                            () => createAssetFromDriveFile(file.id),
                            (result) => toast[result.success ? "success" : "error"](result.message),
                          )
                        }
                      >
                        {file.assetId ? "Open Asset" : "Create Asset"}
                      </Button>
                      {file.assetId ? (
                        <Link href={`/assets?recordId=${encodeURIComponent(file.assetId)}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                          Asset
                        </Link>
                      ) : null}
                      <Link href={file.webViewLink || file.url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                        Open Drive
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
