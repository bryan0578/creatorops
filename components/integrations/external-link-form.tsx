"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"

import {
  createExternalLink,
  updateExternalLink,
} from "@/lib/actions/external-links"
import type { CampaignRecord, ExternalLinkRecord } from "@/lib/types"
import {
  EXTERNAL_LINK_PLATFORMS,
  EXTERNAL_LINK_STATUSES,
  EXTERNAL_LINK_TYPES,
} from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { FormGrid, FormSection } from "@/components/module/form-layout"

export type ExternalLinkFormProps = {
  initial?: ExternalLinkRecord | null
  campaigns: CampaignRecord[]
  onSaved: (record: ExternalLinkRecord) => void
  prefill?: Partial<ExternalLinkRecord>
}

function emptyForm(prefill?: Partial<ExternalLinkRecord>): ExternalLinkRecord {
  const now = Date.now()
  return {
    id: prefill?.id ?? "",
    name: prefill?.name ?? "",
    platform: prefill?.platform ?? "YouTube",
    linkType: prefill?.linkType ?? "Reference",
    url: prefill?.url ?? "",
    status: prefill?.status ?? "Active",
    campaignId: prefill?.campaignId ?? "",
    campaignName: prefill?.campaignName ?? "",
    artistName: prefill?.artistName ?? "",
    songTitle: prefill?.songTitle ?? "",
    productName: prefill?.productName ?? "",
    sourceRecordType: prefill?.sourceRecordType ?? "",
    sourceRecordId: prefill?.sourceRecordId ?? "",
    assetId: prefill?.assetId ?? "",
    analyticsRecordId: prefill?.analyticsRecordId ?? "",
    notes: prefill?.notes ?? "",
    tags: prefill?.tags ?? [],
    createdAt: prefill?.createdAt ?? now,
    updatedAt: prefill?.updatedAt ?? now,
  }
}

export function ExternalLinkForm({
  initial,
  campaigns,
  onSaved,
  prefill,
}: ExternalLinkFormProps) {
  const [form, setForm] = React.useState<ExternalLinkRecord>(() =>
    initial ? { ...initial } : emptyForm(prefill),
  )
  const [saving, setSaving] = React.useState(false)
  const isEdit = Boolean(initial?.id)

  React.useEffect(() => {
    if (initial) setForm({ ...initial })
    else if (prefill) setForm(emptyForm(prefill))
  }, [initial, prefill])

  function setField<K extends keyof ExternalLinkRecord>(key: K, value: ExternalLinkRecord[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleCampaignChange(campaignId: string) {
    const campaign = campaigns.find((item) => item.id === campaignId)
    setForm((prev) => ({
      ...prev,
      campaignId: campaignId === "none" ? "" : campaignId,
      campaignName: campaign?.campaignName ?? "",
      artistName: campaign?.artistName ?? prev.artistName,
      songTitle: campaign?.songTitle ?? prev.songTitle,
      productName: campaign?.productName ?? prev.productName,
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const saved = isEdit
        ? await updateExternalLink(form)
        : await createExternalLink(form)
      onSaved(saved)
      toast.success(isEdit ? "External link updated" : "External link created")
      if (!isEdit) setForm(emptyForm(prefill))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save link")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {form.campaignId && form.campaignName ? (
        <Badge variant="secondary">Linked to campaign: {form.campaignName}</Badge>
      ) : null}

      <FormSection title="Link details" description="Track external platform URLs">
        <FormGrid>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ext-name">Name</Label>
            <Input
              id="ext-name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="PrettyWise Cotton Candy Skies Video"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ext-platform">Platform</Label>
            <Select value={form.platform} onValueChange={(v) => setField("platform", v)}>
              <SelectTrigger id="ext-platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXTERNAL_LINK_PLATFORMS.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {platform}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ext-link-type">Link type</Label>
            <Select value={form.linkType} onValueChange={(v) => setField("linkType", v)}>
              <SelectTrigger id="ext-link-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXTERNAL_LINK_TYPES.map((linkType) => (
                  <SelectItem key={linkType} value={linkType}>
                    {linkType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ext-url">URL</Label>
            <Input
              id="ext-url"
              value={form.url}
              onChange={(e) => setField("url", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ext-status">Status</Label>
            <Select value={form.status} onValueChange={(v) => setField("status", v)}>
              <SelectTrigger id="ext-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXTERNAL_LINK_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ext-campaign">Campaign</Label>
            <Select
              value={form.campaignId || "none"}
              onValueChange={handleCampaignChange}
            >
              <SelectTrigger id="ext-campaign">
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
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
          <div className="space-y-2">
            <Label htmlFor="ext-artist">Artist name</Label>
            <Input
              id="ext-artist"
              value={form.artistName}
              onChange={(e) => setField("artistName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ext-song">Song title</Label>
            <Input
              id="ext-song"
              value={form.songTitle}
              onChange={(e) => setField("songTitle", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ext-product">Product name</Label>
            <Input
              id="ext-product"
              value={form.productName}
              onChange={(e) => setField("productName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ext-source-type">Source record type</Label>
            <Input
              id="ext-source-type"
              value={form.sourceRecordType}
              onChange={(e) => setField("sourceRecordType", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ext-source-id">Source record ID</Label>
            <Input
              id="ext-source-id"
              value={form.sourceRecordId}
              onChange={(e) => setField("sourceRecordId", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ext-asset">Asset ID</Label>
            <Input
              id="ext-asset"
              value={form.assetId}
              onChange={(e) => setField("assetId", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ext-analytics">Analytics record ID</Label>
            <Input
              id="ext-analytics"
              value={form.analyticsRecordId}
              onChange={(e) => setField("analyticsRecordId", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ext-tags">Tags (comma-separated)</Label>
            <Input
              id="ext-tags"
              value={form.tags.join(", ")}
              onChange={(e) =>
                setField(
                  "tags",
                  e.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                )
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ext-notes">Notes</Label>
            <Textarea
              id="ext-notes"
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              className="min-h-20"
            />
          </div>
        </FormGrid>
      </FormSection>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={saving} onClick={() => void handleSave()}>
          {saving ? "Saving…" : isEdit ? "Save Link" : "Create Link"}
        </Button>
        {form.url.trim() ? (
          <Link href={form.url} target="_blank" rel="noopener noreferrer">
            <Button type="button" variant="outline">
              Open URL
            </Button>
          </Link>
        ) : null}
      </div>
    </div>
  )
}
