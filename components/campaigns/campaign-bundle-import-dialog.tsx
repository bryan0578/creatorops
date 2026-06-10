"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  importCampaignBundle,
  previewCampaignBundleImportAction,
} from "@/lib/actions/campaign-bundle"
import type {
  CampaignBundleImportMode,
  CampaignBundleImportPreview,
} from "@/lib/data/campaign-bundle"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export function CampaignBundleImportDialog({
  open,
  onOpenChange,
  bundleJson,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bundleJson: unknown | null
  onImported?: (result: { campaignId: string; campaignName: string }) => void
}) {
  const [mode, setMode] = React.useState<CampaignBundleImportMode>("create-copy")
  const [preview, setPreview] = React.useState<CampaignBundleImportPreview | null>(
    null,
  )
  const [loading, setLoading] = React.useState(false)
  const [importing, setImporting] = React.useState(false)
  const [importedCampaignId, setImportedCampaignId] = React.useState<string | null>(
    null,
  )
  const [importedCampaignName, setImportedCampaignName] = React.useState<string | null>(
    null,
  )

  React.useEffect(() => {
    if (!open || !bundleJson) {
      setPreview(null)
      setImportedCampaignId(null)
      setImportedCampaignName(null)
      return
    }

    let cancelled = false
    setLoading(true)
    void previewCampaignBundleImportAction(bundleJson, mode).then((result) => {
      if (!cancelled) {
        setPreview(result)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [open, bundleJson, mode])

  async function handleImport() {
    if (!bundleJson) return
    setImporting(true)
    try {
      const result = await importCampaignBundle({ bundleJson, mode })
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      if (result.campaignId) {
        setImportedCampaignId(result.campaignId)
        setImportedCampaignName(result.campaignName ?? null)
        onImported?.({
          campaignId: result.campaignId,
          campaignName: result.campaignName ?? "Imported campaign",
        })
      } else {
        onOpenChange(false)
      }
    } catch {
      toast.error("Campaign bundle import failed.")
    } finally {
      setImporting(false)
    }
  }

  const summary = preview?.summary

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import campaign bundle</DialogTitle>
          <DialogDescription>
            Recommended: export a full backup before importing campaign bundles.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {importedCampaignId ? (
            <div className="space-y-3 rounded-lg border border-border/80 bg-muted/30 p-4 text-sm">
              <p className="font-medium">Campaign bundle imported.</p>
              {importedCampaignName ? (
                <p className="text-muted-foreground">{importedCampaignName}</p>
              ) : null}
              <Link
                href={`/campaigns?campaignId=${encodeURIComponent(importedCampaignId)}`}
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Open Imported Campaign
              </Link>
            </div>
          ) : loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Validating bundle…
            </div>
          ) : preview && !preview.valid ? (
            <p className="text-sm text-destructive">
              {preview.error ??
                "This does not look like a valid CreatorOps campaign bundle."}
            </p>
          ) : preview ? (
            <>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{preview.campaignName}</p>
                {preview.exportedAt ? (
                  <p className="text-xs text-muted-foreground">
                    Exported {new Date(preview.exportedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                {summary
                  ? Object.entries(summary)
                      .filter(([key, count]) => key !== "campaign" && count > 0)
                      .map(([key, count]) => (
                        <div
                          key={key}
                          className="rounded-md border border-border/80 px-2 py-1.5"
                        >
                          <p className="text-muted-foreground">{key}</p>
                          <p className="font-medium tabular-nums">{count}</p>
                        </div>
                      ))
                  : null}
              </div>

              {preview.conflicts.length > 0 ? (
                <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                  <p className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="size-4" />
                    {preview.conflicts.length} potential conflict
                    {preview.conflicts.length === 1 ? "" : "s"}
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {preview.conflicts.slice(0, 5).map((conflict) => (
                      <li key={`${conflict.recordType}:${conflict.bundleRecordId}`}>
                        {conflict.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {preview.warnings.length > 0 ? (
                <div className="space-y-1 text-xs text-muted-foreground">
                  {preview.warnings.slice(0, 3).map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label>Import mode</Label>
                <Select
                  value={mode}
                  onValueChange={(value) =>
                    setMode(value as CampaignBundleImportMode)
                  }
                >
                  <SelectTrigger>
                    <span>
                      {mode === "create-copy"
                        ? "Create copy (recommended)"
                        : mode === "skip-existing"
                          ? "Skip existing matches"
                          : "Update existing (advanced)"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="create-copy">
                      Create copy (recommended)
                    </SelectItem>
                    <SelectItem value="skip-existing">Skip existing matches</SelectItem>
                    <SelectItem value="update-existing" disabled>
                      Update existing (coming soon)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}
        </DialogBody>

        <DialogFooter>
          {importedCampaignId ? (
            <Button type="button" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={importing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={!preview?.valid || importing || loading}
              >
                {importing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Import Bundle
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
