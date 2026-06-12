"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2, Music2, Sparkles } from "lucide-react"

import { loadCampaignArtistUniverseSnapshot } from "@/lib/actions/artist-universe"
import { generateArtistContextSummary } from "@/lib/actions/artist-bible"
import { agentHref } from "@/lib/agents/routes"
import type { CampaignRecord } from "@/lib/types"
import { RECENT_RECORDS_CARD_CLASS } from "@/components/module/form-layout"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export function CampaignArtistUniverseCard({ campaign }: { campaign: CampaignRecord }) {
  const [loading, setLoading] = React.useState(true)
  const [snapshot, setSnapshot] = React.useState<Awaited<ReturnType<typeof loadCampaignArtistUniverseSnapshot>> | null>(null)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    void loadCampaignArtistUniverseSnapshot(campaign.id)
      .then((data) => { if (!cancelled) setSnapshot(data) })
      .catch(() => { if (!cancelled) setSnapshot(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [campaign.id])

  if (!campaign.artistName?.trim() && !loading) return null

  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Music2 className="size-4 text-primary" />
          Artist Universe
        </CardTitle>
        <CardDescription>
          Linked artist bible, lore, song concepts, story arcs, and visual identity for {campaign.artistName || "this campaign"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading artist universe…</div>
        ) : snapshot ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant={snapshot.bible ? "default" : "outline"}>{snapshot.bible ? "Bible linked" : "No bible"}</Badge>
              <Badge variant="outline">{snapshot.concepts.length} song concepts</Badge>
              <Badge variant="outline">{snapshot.lore.length} lore entries</Badge>
              <Badge variant="outline">{snapshot.arcs.length} story arcs</Badge>
              <Badge variant="outline">{snapshot.visual.length} visual profiles</Badge>
            </div>
            {snapshot.bible ? <p className="text-sm text-muted-foreground">{snapshot.bible.brandPromise || snapshot.bible.genre}</p> : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No artist universe records linked yet.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href="/artist-bible" className={buttonVariants({ size: "sm" })}>Open Artist Bible</Link>
          <Link href="/song-vault" className={buttonVariants({ size: "sm", variant: "outline" })}>Song Vault</Link>
          <Link href="/story-arcs" className={buttonVariants({ size: "sm", variant: "outline" })}>Story Arcs</Link>
          <Link href="/visual-identity" className={buttonVariants({ size: "sm", variant: "outline" })}>Visual Identity</Link>
          <Button size="sm" variant="outline" onClick={() => void generateArtistContextSummary(campaign.artistName).then((t) => toast.message("Artist context generated", { description: t.slice(0, 120) + "…" })).catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))}>
            <Sparkles className="mr-1 size-3" /> Generate Artist Context
          </Button>
          <Link href={agentHref("release-strategist", { campaignId: campaign.id, artistName: campaign.artistName })} className={buttonVariants({ size: "sm", variant: "outline" })}>Run Release Strategist</Link>
        </div>
      </CardContent>
    </Card>
  )
}
