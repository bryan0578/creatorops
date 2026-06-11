"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, ExternalLink, Link2, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  applyAssetToCampaign,
  applyAssetToYouTubeVideo,
  applyDriveFileToAsset,
  applyDriveFileToCampaign,
  applyDriveFileToYouTubeVideo,
  applyFolderToCampaign,
  applyYouTubeVideoToCampaign,
  createAssetFromDriveFileSuggestion,
  getAssetLinkSuggestions,
} from "@/lib/actions/asset-linking"
import type { AssetLinkSuggestion } from "@/lib/asset-linking/types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function confidenceVariant(confidence: AssetLinkSuggestion["confidence"]) {
  if (confidence === "high") return "default" as const
  if (confidence === "medium") return "secondary" as const
  return "outline" as const
}

function sourceHref(suggestion: AssetLinkSuggestion): string {
  switch (suggestion.sourceType) {
    case "drive-file":
      return `/integrations?tab=google-drive&fileId=${encodeURIComponent(suggestion.sourceId)}`
    case "drive-folder":
      return `/integrations?tab=google-drive&folderId=${encodeURIComponent(suggestion.sourceId)}`
    case "asset":
      return `/assets?recordId=${encodeURIComponent(suggestion.sourceId)}`
    case "youtube-video":
      return `/videos?recordId=${encodeURIComponent(suggestion.sourceId)}`
    default:
      return suggestion.href ?? "/assets"
  }
}

function targetHref(suggestion: AssetLinkSuggestion): string {
  switch (suggestion.targetType) {
    case "campaign":
      return `/campaigns?campaignId=${encodeURIComponent(suggestion.targetId)}`
    case "asset":
      return `/assets?recordId=${encodeURIComponent(suggestion.targetId)}`
    case "youtube-video":
      return `/videos?recordId=${encodeURIComponent(suggestion.targetId)}`
    case "product-listing":
      return `/product-listings?recordId=${encodeURIComponent(suggestion.targetId)}`
    case "merch-idea":
      return `/merch-ideas?recordId=${encodeURIComponent(suggestion.targetId)}`
    case "mockup-prompt":
      return `/mockup-prompts?recordId=${encodeURIComponent(suggestion.targetId)}`
    default:
      return suggestion.href ?? "/assets"
  }
}

async function applySuggestion(suggestion: AssetLinkSuggestion): Promise<{ success: boolean; message: string }> {
  switch (suggestion.suggestionType) {
    case "drive-file-to-campaign":
      return applyDriveFileToCampaign(suggestion.sourceId, suggestion.targetId)
    case "drive-file-to-asset":
      return applyDriveFileToAsset(suggestion.sourceId, suggestion.targetId)
    case "create-asset-from-drive-file":
      return createAssetFromDriveFileSuggestion(
        suggestion.sourceId,
        suggestion.targetId || undefined,
      )
    case "drive-file-to-youtube-video":
      return applyDriveFileToYouTubeVideo(suggestion.sourceId, suggestion.targetId)
    case "folder-to-campaign":
      return applyFolderToCampaign(suggestion.sourceId, suggestion.targetId)
    case "asset-to-campaign":
      return applyAssetToCampaign(suggestion.sourceId, suggestion.targetId)
    case "asset-to-youtube-video":
      return applyAssetToYouTubeVideo(suggestion.sourceId, suggestion.targetId)
    case "youtube-video-to-campaign":
      return applyYouTubeVideoToCampaign(suggestion.sourceId, suggestion.targetId)
    default:
      return {
        success: false,
        message: "This suggestion type requires manual linking for now.",
      }
  }
}

export function AssetLinkSuggestionsPanel({
  campaignId,
  assetId,
  driveFileId,
  youtubeVideoId,
  productId,
  compact = false,
  limit = 8,
  title = "Suggested Links",
  description = "Deterministic matches from local file names, campaigns, and asset metadata. Apply only when you approve.",
  onApplied,
}: {
  campaignId?: string
  assetId?: string
  driveFileId?: string
  youtubeVideoId?: string
  productId?: string
  compact?: boolean
  limit?: number
  title?: string
  description?: string
  onApplied?: () => void
}) {
  const [loading, setLoading] = React.useState(true)
  const [failed, setFailed] = React.useState(false)
  const [suggestions, setSuggestions] = React.useState<AssetLinkSuggestion[]>([])
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const result = await getAssetLinkSuggestions({
        campaignId,
        assetId,
        driveFileId,
        youtubeVideoId,
        productId,
        limit,
      })
      setSuggestions(result.suggestions)
    } catch {
      setFailed(true)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [campaignId, assetId, driveFileId, youtubeVideoId, productId, limit])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  async function handleApply(suggestion: AssetLinkSuggestion) {
    setBusyId(suggestion.id)
    try {
      const result = await applySuggestion(suggestion)
      if (result.success) {
        toast.success(result.message)
        await refresh()
        onApplied?.()
      } else {
        toast.error(result.message)
      }
    } finally {
      setBusyId(null)
    }
  }

  const body = loading ? (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      Loading suggestions…
    </div>
  ) : failed ? (
    <p className="text-sm text-muted-foreground">Could not load asset link suggestions.</p>
  ) : suggestions.length === 0 ? (
    <p className="text-sm text-muted-foreground">No asset link suggestions right now.</p>
  ) : (
    <ul className={compact ? "space-y-2" : "space-y-3"}>
      {suggestions.map((suggestion) => (
        <li
          key={suggestion.id}
          className="rounded-md border border-border/60 p-3 space-y-2"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={confidenceVariant(suggestion.confidence)}>
              {suggestion.confidence} · {suggestion.score}
            </Badge>
            <span className="text-xs text-muted-foreground">{suggestion.suggestionType}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <span className="truncate">{suggestion.sourceName}</span>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{suggestion.targetName}</span>
          </div>
          <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busyId === suggestion.id}
              onClick={() => void handleApply(suggestion)}
            >
              {busyId === suggestion.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Link2 className="size-4" />
              )}
              {suggestion.suggestedAction}
            </Button>
            <Link
              href={sourceHref(suggestion)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Open source
            </Link>
            <Link
              href={targetHref(suggestion)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ExternalLink className="size-4" />
              Open target
            </Link>
          </div>
        </li>
      ))}
    </ul>
  )

  if (compact) {
    return (
      <div className="space-y-3">
        <div>
          <p className="font-medium text-sm">{title}</p>
          {!loading && suggestions.length === 0 ? null : (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {body}
      </div>
    )
  }

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="size-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  )
}
