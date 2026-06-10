"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, FolderOpen, ImageIcon, Loader2, RefreshCw } from "lucide-react"

import { getAssets } from "@/lib/actions/assets"
import { assetHasLocation, filterAssetsForCampaign } from "@/lib/assets"
import type { AssetRecord } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function useAssetRecords(campaignId?: string) {
  const [assets, setAssets] = React.useState<AssetRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  const runLoad = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const rows = await getAssets()
      setAssets(rows)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    void runLoad()
  }, [runLoad])

  const scoped = React.useMemo(() => {
    if (!campaignId) return assets
    const match = assets.find((asset) => asset.campaignId === campaignId)
    return filterAssetsForCampaign(assets, campaignId, match?.campaignName)
  }, [assets, campaignId])

  return { assets: scoped, allAssets: assets, loading, refreshing, runLoad }
}

export function AssetDashboardCard() {
  const { assets, loading, refreshing, runLoad } = useAssetRecords()
  const readyCount = assets.filter(
    (asset) => asset.status === "Ready" || asset.status === "Used" || asset.status === "Published",
  ).length
  const withLocation = assets.filter((asset) => assetHasLocation(asset)).length
  const recent = [...assets].sort((a, b) => b.updatedAt - a.updatedAt)[0]

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="size-4 text-muted-foreground" />
              Asset Library
            </CardTitle>
            <CardDescription>Creative files, URLs, and production assets</CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={loading || refreshing}
            onClick={() => void runLoad(true)}
            aria-label="Refresh assets"
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading assets…
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{assets.length} total</Badge>
              <Badge variant="outline">{readyCount} ready/used</Badge>
              <Badge variant="outline">{withLocation} with links</Badge>
            </div>
            {recent ? (
              <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-2">
                <p className="text-xs text-muted-foreground">Latest asset</p>
                <p className="text-sm font-medium text-pretty">
                  {recent.assetName || "Untitled asset"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[recent.assetType, recent.status].filter(Boolean).join(" · ")}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No assets tracked yet. Save creative files and references from any module.
              </p>
            )}
            <Link href="/assets" className={buttonVariants({ size: "sm" })}>
              Open Asset Library
              <ArrowRight className="size-4" />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function CampaignAssetLibraryCard({ campaignId }: { campaignId: string }) {
  const { assets, loading, refreshing, runLoad } = useAssetRecords(campaignId)
  const topThree = [...assets]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3)

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="size-4 text-muted-foreground" />
              Campaign Assets
            </CardTitle>
            <CardDescription>Files and references linked to this campaign</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || refreshing}
              onClick={() => void runLoad(true)}
            >
              {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Refresh
            </Button>
            <Link
              href={`/assets?campaignId=${encodeURIComponent(campaignId)}`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Open Library
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading assets…
          </div>
        ) : topThree.length ? (
          topThree.map((asset) => (
            <Link
              key={asset.id}
              href={`/assets?recordId=${encodeURIComponent(asset.id)}`}
              className="block rounded-md border border-border/80 px-3 py-2 transition-colors hover:bg-muted/30"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-pretty">
                  {asset.assetName || "Untitled asset"}
                </p>
                {asset.assetType ? (
                  <Badge variant="secondary" className="text-xs">
                    {asset.assetType}
                  </Badge>
                ) : null}
                {asset.status ? (
                  <Badge variant="outline" className="text-xs">
                    {asset.status}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {[asset.platform, asset.versionLabel].filter(Boolean).join(" · ") ||
                  "No platform set"}
              </p>
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No assets linked yet. Add files, URLs, or references from the Asset Library.
          </p>
        )}
        <Link
          href={`/assets?campaignId=${encodeURIComponent(campaignId)}`}
          className={buttonVariants({ size: "sm", variant: "outline" })}
        >
          Add Asset
          <ArrowRight className="size-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
