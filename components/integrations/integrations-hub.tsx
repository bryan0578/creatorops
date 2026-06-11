"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Plus } from "lucide-react"

import { getExternalLinks } from "@/lib/actions/external-links"
import { useStore } from "@/lib/store"
import type { ExternalLinkRecord } from "@/lib/types"
import { ModulePageHeader } from "@/components/app-shell"
import { ExternalLinkForm } from "@/components/integrations/external-link-form"
import { ExternalLinkList } from "@/components/integrations/external-link-list"
import { YouTubeCsvImporter } from "@/components/integrations/youtube-csv-importer"
import { YouTubeApiPanel } from "@/components/integrations/youtube-api-panel"
import { GoogleDriveApiPanel } from "@/components/integrations/google-drive-api-panel"
import { filterExternalLinksForCampaign } from "@/lib/data/external-links"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

const TAB_VALUES = ["details", "youtube-csv", "youtube-api", "google-drive", "campaign-links", "saved", "settings"] as const

function buildPrefillFromParams(searchParams: URLSearchParams) {
  const prefill: Partial<ExternalLinkRecord> = {}
  const campaignId = searchParams.get("campaignId") ?? ""
  const campaignName = searchParams.get("campaignName") ?? ""
  if (campaignId) prefill.campaignId = campaignId
  if (campaignName) prefill.campaignName = campaignName
  const platform = searchParams.get("platform")
  if (platform) prefill.platform = platform
  const linkType = searchParams.get("linkType")
  if (linkType) prefill.linkType = linkType
  const sourceRecordType = searchParams.get("sourceRecordType") ?? ""
  const sourceRecordId = searchParams.get("sourceRecordId") ?? ""
  if (sourceRecordType) prefill.sourceRecordType = sourceRecordType
  if (sourceRecordId) prefill.sourceRecordId = sourceRecordId
  const assetId = searchParams.get("assetId")
  if (assetId) prefill.assetId = assetId
  return prefill
}

export function IntegrationsHub() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { campaigns, hydrated } = useStore()
  const [links, setLinks] = React.useState<ExternalLinkRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editing, setEditing] = React.useState<ExternalLinkRecord | null>(null)

  const tabParam = searchParams.get("tab") ?? "details"
  const activeTab = TAB_VALUES.includes(tabParam as (typeof TAB_VALUES)[number])
    ? tabParam
    : "details"
  const campaignId = searchParams.get("campaignId") ?? ""
  const recordId = searchParams.get("recordId") ?? ""

  const prefill = React.useMemo(() => {
    const fromParams = buildPrefillFromParams(searchParams)
    const campaign = campaigns.find((item) => item.id === campaignId)
    if (campaign) {
      fromParams.campaignId = campaign.id
      fromParams.campaignName = campaign.campaignName
      fromParams.artistName = campaign.artistName
      fromParams.songTitle = campaign.songTitle
      fromParams.productName = campaign.productName
    }
    return fromParams
  }, [searchParams, campaigns, campaignId])

  const refresh = React.useCallback(async () => {
    setLoading(true)
    try {
      const next = await getExternalLinks()
      setLinks(next)
      if (recordId) {
        const match = next.find((item) => item.id === recordId)
        if (match) {
          setEditing(match)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [recordId])

  React.useEffect(() => {
    if (!hydrated) return
    void refresh()
  }, [hydrated, refresh])

  const campaignLinks = campaignId
    ? filterExternalLinksForCampaign(
        links,
        campaignId,
        campaigns.find((c) => c.id === campaignId)?.campaignName,
      )
    : []

  function setTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    router.replace(`/integrations?${params.toString()}`)
  }

  function quickAdd(linkType: string, platform: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", "details")
    params.set("linkType", linkType)
    params.set("platform", platform)
    router.replace(`/integrations?${params.toString()}`)
    setEditing(null)
  }

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="External Integrations"
        description="Track external platform links, import analytics files, and connect campaigns to YouTube, Google Drive, Fourthwall, Suno, and other tools."
        action={
          <Button type="button" onClick={() => { setEditing(null); setTab("details") }}>
            <Plus className="size-4" />
            New External Link
          </Button>
        }
      />

      {campaignId && campaigns.find((c) => c.id === campaignId) ? (
        <Badge variant="secondary">
          Campaign: {campaigns.find((c) => c.id === campaignId)?.campaignName}
        </Badge>
      ) : null}

      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="details">External Link Details</TabsTrigger>
          <TabsTrigger value="youtube-csv">YouTube CSV Import</TabsTrigger>
          <TabsTrigger value="youtube-api">YouTube API</TabsTrigger>
          <TabsTrigger value="google-drive">Google Drive</TabsTrigger>
          <TabsTrigger value="campaign-links">Campaign Links</TabsTrigger>
          <TabsTrigger value="saved">Saved Links</TabsTrigger>
          <TabsTrigger value="settings">Integration Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <ExternalLinkForm
            initial={editing}
            campaigns={campaigns}
            prefill={prefill}
            onSaved={() => {
              void refresh()
              setEditing(null)
            }}
          />
          {editing ? (
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Clear selection
              </Button>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="youtube-csv" className="mt-4">
          <YouTubeCsvImporter
            campaigns={campaigns}
            defaultCampaignId={campaignId}
            onImported={() => void refresh()}
          />
        </TabsContent>

        <TabsContent value="youtube-api" className="mt-4">
          <YouTubeApiPanel campaigns={campaigns} defaultCampaignId={campaignId} />
        </TabsContent>

        <TabsContent value="google-drive" className="mt-4">
          <GoogleDriveApiPanel campaigns={campaigns} defaultCampaignId={campaignId} />
        </TabsContent>

        <TabsContent value="campaign-links" className="mt-4 space-y-4">
          {!campaignId ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select a campaign</CardTitle>
                <CardDescription>
                  Open Integrations from a campaign Launch Dashboard or add{" "}
                  <code>?campaignId=...</code> to the URL.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => quickAdd("Published Video", "YouTube")}>
                  Add YouTube Video Link
                </Button>
                <Link
                  href={`/integrations?${new URLSearchParams({ tab: "youtube-api", ...(campaignId ? { campaignId } : {}) }).toString()}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Import from YouTube
                </Link>
                <Button type="button" variant="outline" size="sm" onClick={() => quickAdd("Google Drive Folder", "Google Drive")}>
                  Add Google Drive Folder
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => quickAdd("Fourthwall Product", "Fourthwall")}>
                  Add Fourthwall Product
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => quickAdd("Suno Project", "Suno")}>
                  Add Suno Project
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => quickAdd("Streaming Link", "Spotify")}>
                  Add Streaming Link
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => quickAdd("Social Post", "Instagram")}>
                  Add Social Post
                </Button>
              </div>
              {campaignLinks.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">No links for this campaign yet</CardTitle>
                    <CardDescription>
                      Add published video, asset folders, product links, or source project links.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <ExternalLinkList
                  links={campaignLinks}
                  campaigns={campaigns}
                  campaignFilter={campaignId}
                  onSelect={(link) => {
                    setEditing(link)
                    setTab("details")
                  }}
                  onChanged={() => void refresh()}
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading links…</p>
          ) : (
            <ExternalLinkList
              links={links}
              campaigns={campaigns}
              campaignFilter={campaignId || undefined}
              onSelect={(link) => {
                setEditing(link)
                setTab("details")
              }}
              onChanged={() => void refresh()}
            />
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-4">
          {[
            {
              title: "YouTube",
              enabled: "CSV import and YouTube Data API read/sync enabled",
              later: "Upload/publish automation: Coming later",
              help: "Connect via YouTube API tab or export analytics CSV from YouTube Studio.",
            },
            {
              title: "Google Drive",
              enabled: "Link tracking and read-only API folder sync enabled",
              later: "Upload/delete automation: Coming later",
              help: "Connect via Google Drive tab to sync folder metadata, or paste manual links.",
            },
            {
              title: "Fourthwall",
              enabled: "Link tracking enabled",
              later: "API sync: Coming later",
              help: "Track store, collection, and product URLs.",
            },
            {
              title: "Suno",
              enabled: "Link tracking enabled",
              later: "API sync: Coming later",
              help: "Track song/project links for AI music source material.",
            },
          ].map((section) => (
            <Card key={section.title} className="border-border/80">
              <CardHeader>
                <CardTitle className="text-base">{section.title}</CardTitle>
                <CardDescription>{section.help}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>{section.enabled}</p>
                <p className="text-muted-foreground">{section.later}</p>
              </CardContent>
            </Card>
          ))}
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-base">API Secrets</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                External API keys should stay in <code>.env.local</code>. YouTube and Google Drive OAuth tokens are
                encrypted locally and are never included in backup exports.
              </p>
              <p>
                YouTube API: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REDIRECT_URI,
                CREATOROPS_TOKEN_ENCRYPTION_KEY
              </p>
              <p>
                Google Drive API: GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET,
                GOOGLE_DRIVE_REDIRECT_URI (or reuse YouTube OAuth credentials)
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Link href="/campaigns" className={buttonVariants({ variant: "outline", size: "sm" })}>
        Back to Campaigns
      </Link>
    </div>
  )
}
