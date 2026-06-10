"use client"

import * as React from "react"
import { Download, Loader2, Package, Upload } from "lucide-react"
import { toast } from "sonner"

import {
  campaignBundleFilename,
  exportCampaignBundle,
  getCampaignBundleReadiness,
} from "@/lib/actions/campaign-bundle"
import type { CampaignBundleReadiness } from "@/lib/data/campaign-bundle"
import { parseImportJsonText } from "@/lib/safe-json"
import { downloadJson } from "@/lib/storage"
import { useStore } from "@/lib/store"
import { CampaignBundleImportDialog } from "@/components/campaigns/campaign-bundle-import-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RECENT_RECORDS_CARD_CLASS } from "@/components/module/form-layout"

export function CampaignBundleSection({
  campaignId,
  campaignName,
}: {
  campaignId: string
  campaignName: string
}) {
  const store = useStore()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = React.useState(false)
  const [readiness, setReadiness] = React.useState<CampaignBundleReadiness | null>(
    null,
  )
  const [loadingReadiness, setLoadingReadiness] = React.useState(true)
  const [importOpen, setImportOpen] = React.useState(false)
  const [pendingImport, setPendingImport] = React.useState<unknown | null>(null)

  React.useEffect(() => {
    let cancelled = false
    setLoadingReadiness(true)
    void getCampaignBundleReadiness(campaignId)
      .then((result) => {
        if (!cancelled) setReadiness(result)
      })
      .catch(() => {
        if (!cancelled) setReadiness(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingReadiness(false)
      })
    return () => {
      cancelled = true
    }
  }, [campaignId])

  async function handleExport() {
    setExporting(true)
    try {
      const bundle = await exportCampaignBundle(campaignId)
      const filename = campaignBundleFilename(
        campaignName || bundle.campaign.campaignName,
        new Date(bundle.exportedAt),
      )
      downloadJson(filename, bundle)
      toast.success("Campaign bundle exported.")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not export campaign bundle."
      toast.error(message)
    } finally {
      setExporting(false)
    }
  }

  function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = parseImportJsonText(String(reader.result))
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      setPendingImport(result.value)
      setImportOpen(true)
    }
    reader.readAsText(file)
  }

  async function handleImported() {
    await Promise.all([
      store.reloadCampaigns(),
      store.reloadExperiments(),
      store.reloadRuns(),
      store.reloadAnalyticsRecords(),
      store.reloadArtistRecords(),
      store.reloadReleasePlans(),
      store.reloadYouTubePackages(),
      store.reloadYouTubeThumbnailRecords(),
      store.reloadSocialRepurposingRecords(),
      store.reloadEmailCampaignRecords(),
      store.reloadMerchIdeas(),
      store.reloadProductListings(),
      store.reloadMockupPromptRecords(),
    ])
  }

  const readinessBadge =
    readiness?.status === "ready"
      ? "Ready"
      : readiness?.status === "missing"
        ? "Has missing linked records"
        : readiness?.status === "warnings"
          ? "Has warnings"
          : "—"

  return (
    <>
      <Card className={RECENT_RECORDS_CARD_CLASS}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="size-4" />
            Campaign Bundle
          </CardTitle>
          <CardDescription>
            Export or import this campaign and its linked records as a portable JSON
            bundle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Linked records</p>
              <p className="text-lg font-semibold tabular-nums">
                {loadingReadiness ? "…" : (readiness?.linkedRecordsCount ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Bundle readiness</p>
              <Badge
                variant={
                  readiness?.status === "ready"
                    ? "secondary"
                    : readiness?.status === "missing"
                      ? "destructive"
                      : "outline"
                }
              >
                {loadingReadiness ? "Checking…" : readinessBadge}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Export Bundle
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              Import Bundle
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </CardContent>
      </Card>

      <CampaignBundleImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        bundleJson={pendingImport}
        onImported={() => {
          void handleImported()
        }}
      />
    </>
  )
}
