"use client"

import * as React from "react"
import { Download, Loader2, Package, Upload } from "lucide-react"
import { toast } from "sonner"

import {
  campaignBundleFilename,
  exportCampaignBundle,
} from "@/lib/actions/campaign-bundle"
import { parseImportJsonText } from "@/lib/safe-json"
import { downloadJson } from "@/lib/storage"
import { useStore } from "@/lib/store"
import { CampaignBundleImportDialog } from "@/components/campaigns/campaign-bundle-import-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

export function CampaignBundlesSection({
  onDataChanged,
}: {
  onDataChanged?: () => Promise<void>
}) {
  const { campaigns } = useStore()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [selectedCampaignId, setSelectedCampaignId] = React.useState("")
  const [exporting, setExporting] = React.useState(false)
  const [importOpen, setImportOpen] = React.useState(false)
  const [pendingImport, setPendingImport] = React.useState<unknown | null>(null)

  React.useEffect(() => {
    if (!selectedCampaignId && campaigns.length > 0) {
      setSelectedCampaignId(campaigns[0].id)
    }
  }, [campaigns, selectedCampaignId])

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId)

  async function handleExport() {
    if (!selectedCampaignId) {
      toast.error("Select a campaign to export.")
      return
    }
    setExporting(true)
    try {
      const bundle = await exportCampaignBundle(selectedCampaignId)
      const filename = campaignBundleFilename(
        selectedCampaign?.campaignName ?? bundle.campaign.campaignName,
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

  return (
    <>
      <Card className="border-border/80" id="campaign-bundles">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="size-4" />
            Campaign Bundles
          </CardTitle>
          <CardDescription>
            Export or import individual campaigns with their linked records. Recommended:
            export a full backup before importing campaign bundles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bundle-campaign-select">Campaign</Label>
            <Select
              value={selectedCampaignId}
              onValueChange={setSelectedCampaignId}
              disabled={campaigns.length === 0}
            >
              <SelectTrigger id="bundle-campaign-select" className="w-full max-w-md">
                <span>
                  {selectedCampaign?.campaignName ??
                    (campaigns.length === 0
                      ? "No campaigns available"
                      : "Select campaign")}
                </span>
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

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleExport}
              disabled={exporting || !selectedCampaignId}
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Export selected campaign bundle
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              Import campaign bundle
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
        onImported={async () => {
          await onDataChanged?.()
        }}
      />
    </>
  )
}
