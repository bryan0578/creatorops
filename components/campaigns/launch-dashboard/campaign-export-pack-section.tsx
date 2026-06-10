"use client"

import * as React from "react"
import { Download, Eye, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { getCampaignExportPack } from "@/lib/actions/campaign-export-pack"
import {
  campaignExportPackFilename,
  markdownToPlainText,
  type CampaignExportPackResult,
} from "@/lib/data/campaign-export-pack"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import { downloadText } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RECENT_RECORDS_CARD_CLASS } from "@/components/module/form-layout"

export function CampaignExportPackSection({
  campaignId,
  campaignName,
}: {
  campaignId: string
  campaignName: string
}) {
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [pack, setPack] = React.useState<CampaignExportPackResult | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadPack = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getCampaignExportPack(campaignId)
      setPack(result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not generate export pack."
      setError(message)
      toast.error(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  async function handlePreview() {
    setPreviewOpen(true)
    if (!pack) {
      await loadPack()
    }
  }

  async function ensurePack(): Promise<CampaignExportPackResult | null> {
    if (pack) return pack
    return loadPack()
  }

  async function handleCopy() {
    const result = await ensurePack()
    if (!result?.markdown) return

    try {
      await copyToClipboard(result.markdown)
      toast.success("Campaign export pack copied.")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Clipboard copy failed"
      toast.error(message)
    }
  }

  async function handleDownloadMarkdown() {
    const result = await ensurePack()
    if (!result?.markdown) return

    const filename = campaignExportPackFilename(
      campaignName || result.campaign.campaignName,
      new Date(result.generatedAt),
    )
    downloadText(filename, result.markdown, "text/markdown")
  }

  async function handleDownloadText() {
    const result = await ensurePack()
    if (!result?.markdown) return

    const base = campaignExportPackFilename(
      campaignName || result.campaign.campaignName,
      new Date(result.generatedAt),
    )
    const filename = base.replace(/\.md$/, ".txt")
    downloadText(filename, markdownToPlainText(result.markdown))
  }

  return (
    <>
      <Card className={RECENT_RECORDS_CARD_CLASS}>
        <CardHeader>
          <CardTitle className="text-base">Campaign Export Pack</CardTitle>
          <CardDescription>
            Generate a publish-ready package from this campaign&apos;s linked records.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="default" onClick={handlePreview} disabled={loading}>
            {loading && previewOpen ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Eye className="size-4" />
            )}
            Preview Export Pack
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleDownloadMarkdown}
            disabled={loading}
          >
            {loading && !previewOpen ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Download Markdown
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleCopy} disabled={loading}>
            Copy Markdown
          </Button>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Campaign Export Pack</DialogTitle>
            <DialogDescription>
              {campaignName || "Preview publish-ready markdown from linked campaign records."}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="min-h-0 flex-1 overflow-hidden px-0 py-0">
            {loading && !pack ? (
              <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Generating export pack…
              </div>
            ) : error && !pack ? (
              <div className="space-y-3 px-6 py-8">
                <p className="text-sm text-destructive">{error}</p>
                <Button type="button" size="sm" variant="outline" onClick={loadPack}>
                  Retry
                </Button>
              </div>
            ) : pack ? (
              <ScrollArea className="h-[min(60vh,520px)] px-6">
                <pre className="whitespace-pre-wrap wrap-break-word font-mono text-xs leading-relaxed text-foreground">
                  {pack.markdown}
                </pre>
              </ScrollArea>
            ) : null}
          </DialogBody>

          <DialogFooter className="flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCopy}
              disabled={!pack || loading}
            >
              Copy Markdown
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDownloadMarkdown}
              disabled={!pack || loading}
            >
              <Download className="size-4" />
              Download .md
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleDownloadText}
              disabled={!pack || loading}
            >
              <FileText className="size-4" />
              Download Text
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
