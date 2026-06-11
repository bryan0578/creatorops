"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2, Upload } from "lucide-react"
import { toast } from "sonner"

import {
  importYouTubeAnalyticsCsv,
  previewYouTubeAnalyticsCsv,
} from "@/lib/actions/external-links"
import type { CampaignRecord } from "@/lib/types"
import type { YouTubeCsvPreviewRow } from "@/lib/integrations/youtube-csv-parser"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function YouTubeCsvImporter({
  campaigns,
  defaultCampaignId,
  onImported,
}: {
  campaigns: CampaignRecord[]
  defaultCampaignId?: string
  onImported: () => void
}) {
  const [campaignId, setCampaignId] = React.useState(defaultCampaignId ?? "")
  const [fallbackTitle, setFallbackTitle] = React.useState("")
  const [csvText, setCsvText] = React.useState("")
  const [previewRows, setPreviewRows] = React.useState<YouTubeCsvPreviewRow[]>([])
  const [warnings, setWarnings] = React.useState<string[]>([])
  const [previewError, setPreviewError] = React.useState<string | null>(null)
  const [previewing, setPreviewing] = React.useState(false)
  const [importing, setImporting] = React.useState(false)
  const [lastImportIds, setLastImportIds] = React.useState<string[]>([])

  React.useEffect(() => {
    if (defaultCampaignId) setCampaignId(defaultCampaignId)
  }, [defaultCampaignId])

  const campaign = campaigns.find((item) => item.id === campaignId) ?? null

  async function handlePreview() {
    setPreviewing(true)
    setPreviewError(null)
    try {
      const result = await previewYouTubeAnalyticsCsv(csvText, fallbackTitle)
      setPreviewRows(result.rows)
      setWarnings(result.warnings)
      if (!result.success) {
        setPreviewError(result.error ?? "Preview failed.")
      } else {
        toast.success(`Preview ready — ${result.rows.length} row(s)`)
      }
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Preview failed.")
    } finally {
      setPreviewing(false)
    }
  }

  async function handleImport() {
    if (previewRows.length === 0) {
      toast.error("Preview import before importing.")
      return
    }
    setImporting(true)
    try {
      const result = await importYouTubeAnalyticsCsv({
        csvText,
        campaignId: campaign?.id,
        campaignName: campaign?.campaignName,
        artistName: campaign?.artistName,
        songTitle: campaign?.songTitle,
        fallbackTitle,
        rows: previewRows,
        createExternalLinks: true,
        skipDuplicates: true,
      })
      if (!result.success) {
        toast.error(result.error ?? "Import failed.")
        return
      }
      setLastImportIds(result.analyticsRecordIds)
      toast.success(
        `Imported ${result.importedAnalytics} analytics record(s), ${result.createdLinks} link(s). Skipped ${result.skippedDuplicates} duplicate(s).`,
      )
      onImported()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed.")
    } finally {
      setImporting(false)
    }
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCsvText(String(reader.result ?? ""))
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base">YouTube Analytics CSV Import</CardTitle>
          <CardDescription>
            Export analytics from YouTube Studio and paste or upload CSV here. No OAuth or
            external upload required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="csv-campaign">Campaign</Label>
              <Select value={campaignId || "none"} onValueChange={(v) => setCampaignId(v === "none" ? "" : v)}>
                <SelectTrigger id="csv-campaign">
                  <SelectValue placeholder="Optional campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No campaign</SelectItem>
                  {campaigns.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.campaignName || "Untitled"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="csv-fallback-title">Fallback video title</Label>
              <Input
                id="csv-fallback-title"
                value={fallbackTitle}
                onChange={(e) => setFallbackTitle(e.target.value)}
                placeholder="Used when CSV has no title column"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-text">CSV content</Label>
            <Textarea
              id="csv-text"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Paste YouTube Studio analytics CSV…"
              className="min-h-40 font-mono text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <label className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Upload className="size-4" />
              Upload CSV file
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
            </label>
            <Button type="button" variant="outline" disabled={previewing || !csvText.trim()} onClick={() => void handlePreview()}>
              {previewing ? <Loader2 className="size-4 animate-spin" /> : null}
              Preview Import
            </Button>
            <Button type="button" disabled={importing || previewRows.length === 0} onClick={() => void handleImport()}>
              {importing ? <Loader2 className="size-4 animate-spin" /> : null}
              Import Analytics Records
            </Button>
          </div>

          {previewError ? (
            <p className="text-sm text-destructive" role="alert">
              {previewError}
            </p>
          ) : null}
          {warnings.length > 0 ? (
            <ul className="text-sm text-amber-700 dark:text-amber-300">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      {previewRows.length > 0 ? (
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base">Import preview</CardTitle>
            <CardDescription>{previewRows.length} row(s) ready to import</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Impressions</TableHead>
                  <TableHead>CTR</TableHead>
                  <TableHead>Likes</TableHead>
                  <TableHead>Comments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row) => (
                  <TableRow key={row.rowIndex}>
                    <TableCell>{row.itemName}</TableCell>
                    <TableCell>{row.views}</TableCell>
                    <TableCell>{row.impressions}</TableCell>
                    <TableCell>{row.clickThroughRate}</TableCell>
                    <TableCell>{row.likes}</TableCell>
                    <TableCell>{row.comments}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {lastImportIds.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Link href="/analytics" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Open Analytics Tracker
          </Link>
          <Link
            href="/learnings"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Create Learning from Imported Analytics
          </Link>
        </div>
      ) : null}
    </div>
  )
}
