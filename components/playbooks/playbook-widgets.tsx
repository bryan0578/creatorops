"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  BookOpen,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react"

import { getPlaybookById, getPlaybooks } from "@/lib/actions/playbooks"
import {
  extractPlaybookIdFromNotes,
  playbookSummaryCounts,
} from "@/lib/playbooks"
import type { CampaignRecord, PlaybookRecord } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function usePlaybookRecords() {
  const [playbooks, setPlaybooks] = React.useState<PlaybookRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  const runLoad = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const rows = await getPlaybooks()
      setPlaybooks(rows)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    void runLoad()
  }, [runLoad])

  return { playbooks, loading, refreshing, runLoad }
}

export function PlaybookDashboardCard() {
  const { playbooks, loading, refreshing, runLoad } = usePlaybookRecords()
  const activeCount = playbooks.filter((item) => item.status === "Active").length
  const recent = [...playbooks].sort((a, b) => b.updatedAt - a.updatedAt)[0]

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="size-4 text-muted-foreground" />
              Playbooks
            </CardTitle>
            <CardDescription>Reusable launch SOPs and campaign templates</CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={loading || refreshing}
            onClick={() => void runLoad(true)}
            aria-label="Refresh playbooks"
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading playbooks…
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{playbooks.length} total</Badge>
              <Badge variant="outline">{activeCount} active</Badge>
            </div>
            {recent ? (
              <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-2">
                <p className="text-xs text-muted-foreground">Latest playbook</p>
                <p className="text-sm font-medium text-pretty">
                  {recent.name || "Untitled playbook"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[recent.playbookType, recent.status].filter(Boolean).join(" · ")}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No playbooks yet. Build a launch SOP or seed starter playbooks.
              </p>
            )}
            <Link href="/playbooks" className={buttonVariants({ size: "sm" })}>
              Open Playbooks
              <ArrowRight className="size-4" />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function CampaignPlaybookCard({ campaign }: { campaign: CampaignRecord }) {
  const router = useRouter()
  const playbookId = React.useMemo(
    () => extractPlaybookIdFromNotes(campaign.notes),
    [campaign.notes],
  )
  const [playbook, setPlaybook] = React.useState<PlaybookRecord | null>(null)
  const [loading, setLoading] = React.useState(Boolean(playbookId))

  React.useEffect(() => {
    if (!playbookId) {
      setPlaybook(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    void getPlaybookById(playbookId)
      .then((record) => {
        if (!cancelled) setPlaybook(record)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [playbookId])

  if (!playbookId) {
    return (
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-muted-foreground" />
            Source Playbook
          </CardTitle>
          <CardDescription>
            This campaign was not created from a saved playbook.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Link href="/playbooks" className={buttonVariants({ size: "sm", variant: "outline" })}>
            Browse Playbooks
            <ArrowRight className="size-4" />
          </Link>
        </CardContent>
      </Card>
    )
  }

  const counts = playbook ? playbookSummaryCounts(playbook) : null

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="size-4 text-muted-foreground" />
          Source Playbook
        </CardTitle>
        <CardDescription>
          Launch template referenced in campaign notes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading playbook…
          </div>
        ) : playbook ? (
          <>
            <div>
              <p className="font-medium text-pretty">{playbook.name}</p>
              <p className="text-sm text-muted-foreground">
                {[playbook.playbookType, playbook.status].filter(Boolean).join(" · ")}
              </p>
            </div>
            {counts ? (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{counts.tasks} tasks</Badge>
                <Badge variant="outline">{counts.checklist} checklist</Badge>
                <Badge variant="outline">{counts.assets} assets</Badge>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/playbooks?recordId=${encodeURIComponent(playbook.id)}`}
                className={buttonVariants({ size: "sm" })}
              >
                Open Playbook
                <ArrowRight className="size-4" />
              </Link>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  router.push(
                    `/playbooks?recordId=${encodeURIComponent(playbook.id)}&createCampaign=1`,
                  )
                }
              >
                Create Another Campaign
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Referenced playbook ({playbookId}) was not found locally.
            </p>
            <Link href="/playbooks" className={buttonVariants({ size: "sm", variant: "outline" })}>
              Open Playbooks
              <ArrowRight className="size-4" />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}
