"use client"

import * as React from "react"
import Link from "next/link"
import { Copy, ExternalLink, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  deleteExternalLink,
  duplicateExternalLink,
} from "@/lib/actions/external-links"
import type { CampaignRecord, ExternalLinkRecord } from "@/lib/types"
import {
  EXTERNAL_LINK_PLATFORMS,
  EXTERNAL_LINK_STATUSES,
  EXTERNAL_LINK_TYPES,
} from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { copyToClipboard } from "@/lib/copy-to-clipboard"

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function ExternalLinkList({
  links,
  campaigns,
  onSelect,
  onChanged,
  campaignFilter,
}: {
  links: ExternalLinkRecord[]
  campaigns: CampaignRecord[]
  onSelect: (link: ExternalLinkRecord) => void
  onChanged: () => void
  campaignFilter?: string
}) {
  const [search, setSearch] = React.useState("")
  const [platform, setPlatform] = React.useState<string>("all")
  const [linkType, setLinkType] = React.useState<string>("all")
  const [status, setStatus] = React.useState<string>("all")
  const [campaignId, setCampaignId] = React.useState(campaignFilter ?? "all")
  const [sourceType, setSourceType] = React.useState<string>("all")

  React.useEffect(() => {
    if (campaignFilter) setCampaignId(campaignFilter)
  }, [campaignFilter])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return links.filter((link) => {
      if (platform !== "all" && link.platform !== platform) return false
      if (linkType !== "all" && link.linkType !== linkType) return false
      if (status !== "all" && link.status !== status) return false
      if (campaignId !== "all" && link.campaignId !== campaignId) return false
      if (sourceType !== "all" && link.sourceRecordType !== sourceType) return false
      if (!q) return true
      return (
        link.name.toLowerCase().includes(q) ||
        link.url.toLowerCase().includes(q) ||
        link.campaignName.toLowerCase().includes(q) ||
        link.artistName.toLowerCase().includes(q) ||
        link.notes.toLowerCase().includes(q) ||
        link.tags.some((tag) => tag.toLowerCase().includes(q))
      )
    })
  }, [links, search, platform, linkType, status, campaignId, sourceType])

  async function handleDuplicate(link: ExternalLinkRecord) {
    try {
      await duplicateExternalLink(link.id)
      toast.success("Link duplicated")
      onChanged()
    } catch {
      toast.error("Could not duplicate link")
    }
  }

  async function handleDelete(link: ExternalLinkRecord) {
    try {
      await deleteExternalLink(link.id)
      toast.success("Link deleted")
      onChanged()
    } catch {
      toast.error("Could not delete link")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search links…"
            className="pl-9"
          />
        </div>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {EXTERNAL_LINK_PLATFORMS.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={linkType} onValueChange={setLinkType}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Link type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {EXTERNAL_LINK_TYPES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {EXTERNAL_LINK_STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={campaignId} onValueChange={setCampaignId}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Campaign" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All campaigns</SelectItem>
            {campaigns.map((campaign) => (
              <SelectItem key={campaign.id} value={campaign.id}>
                {campaign.campaignName || "Untitled"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} of {links.length} links
      </p>

      {filtered.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No external links yet</CardTitle>
            <CardDescription>
              Track YouTube videos, Google Drive folders, Fourthwall products, Suno projects,
              and other campaign links.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((link) => (
            <Card key={link.id} className="border-border/80">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="text-left text-sm font-medium hover:underline"
                      onClick={() => onSelect(link)}
                    >
                      {link.name || "Untitled link"}
                    </button>
                    <Badge variant="secondary">{link.platform}</Badge>
                    <Badge variant="outline">{link.linkType}</Badge>
                    <Badge variant="outline">{link.status}</Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{link.url}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {link.campaignName ? <span>Campaign: {link.campaignName}</span> : null}
                    {link.sourceRecordType ? (
                      <span>Source: {link.sourceRecordType}</span>
                    ) : null}
                    <span>Updated {formatDate(link.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {link.url ? (
                    <Link
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <ExternalLink className="size-4" />
                      Open URL
                    </Link>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onSelect(link)}
                  >
                    Open in CreatorOps
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void copyToClipboard(link.url).then(() => toast.success("Copied URL"))
                    }
                  >
                    <Copy className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleDuplicate(link)}
                  >
                    Duplicate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleDelete(link)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
