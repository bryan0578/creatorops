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
import {
  CAMPAIGN_PACK_TEMPLATES,
  DEFAULT_CAMPAIGN_PACK_TEMPLATE_ID,
  getCampaignPackTemplate,
  type CampaignPackTemplateId,
} from "@/lib/data/campaign-pack-templates"
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
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RECENT_RECORDS_CARD_CLASS } from "@/components/module/form-layout"

export function CampaignExportPackSection({
  campaignId,
  campaignName,
}: {
  campaignId: string
  campaignName: string
}) {
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [templateId, setTemplateId] = React.useState<CampaignPackTemplateId>(
    DEFAULT_CAMPAIGN_PACK_TEMPLATE_ID,
  )
  const [pack, setPack] = React.useState<CampaignExportPackResult | null>(null)
  const [loadedTemplateId, setLoadedTemplateId] =
    React.useState<CampaignPackTemplateId | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const selectedTemplate = getCampaignPackTemplate(templateId)

  const loadPack = React.useCallback(
    async (nextTemplateId: CampaignPackTemplateId = templateId) => {
      setLoading(true)
      setError(null)
      try {
        const result = await getCampaignExportPack(campaignId, nextTemplateId)
        setPack(result)
        setLoadedTemplateId(nextTemplateId)
        return result
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not generate export pack."
        setError(message)
        toast.error(message)
        return null
      } finally {
        setLoading(false)
      }
    },
    [campaignId, templateId],
  )

  React.useEffect(() => {
    if (pack && loadedTemplateId && loadedTemplateId !== templateId) {
      setPack(null)
      setLoadedTemplateId(null)
    }
  }, [templateId, pack, loadedTemplateId])

  async function handlePreview() {
    setPreviewOpen(true)
    if (!pack || loadedTemplateId !== templateId) {
      await loadPack(templateId)
    }
  }

  async function ensurePack(): Promise<CampaignExportPackResult | null> {
    if (pack && loadedTemplateId === templateId) return pack
    return loadPack(templateId)
  }

  async function handleCopy() {
    const result = await ensurePack()
    if (!result?.markdown) return

    try {
      await copyToClipboard(result.markdown)
      toast.success(`${result.templateName} copied.`)
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
      result.templateId,
      new Date(result.generatedAt),
    )
    downloadText(filename, result.markdown, "text/markdown")
  }

  async function handleDownloadText() {
    const result = await ensurePack()
    if (!result?.markdown) return

    const base = campaignExportPackFilename(
      campaignName || result.campaign.campaignName,
      result.templateId,
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
            Generate focused Markdown packs from this campaign&apos;s linked records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="export-pack-template" className="text-xs text-muted-foreground">
              Pack template
            </Label>
            <Select
              value={templateId}
              onValueChange={(value) => setTemplateId(value as CampaignPackTemplateId)}
            >
              <SelectTrigger id="export-pack-template" size="sm" className="w-full max-w-md">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_PACK_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={handlePreview}
              disabled={loading}
            >
              {loading && previewOpen ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Eye className="size-4" />
              )}
              Preview Pack
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCopy}
              disabled={loading}
            >
              Copy Markdown
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
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {pack?.templateName ?? selectedTemplate.name}
            </DialogTitle>
            <DialogDescription>
              {pack
                ? `${campaignName || pack.campaign.campaignName} — ${selectedTemplate.description}`
                : selectedTemplate.description}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="min-h-0 flex-1 overflow-hidden px-0 py-0">
            {loading && (!pack || loadedTemplateId !== templateId) ? (
              <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Generating pack…
              </div>
            ) : error && !pack ? (
              <div className="space-y-3 px-6 py-8">
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => loadPack(templateId)}
                >
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
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setPreviewOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
