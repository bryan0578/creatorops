"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Clock, Loader2 } from "lucide-react"

import { getRecentActivity } from "@/lib/actions/recent-activity"
import type { RecentActivityItem } from "@/lib/data/recent-activity"
import { ActivityRow } from "@/components/activity/recent-activity-timeline"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function ControlCenterContinueWorking() {
  const [items, setItems] = React.useState<RecentActivityItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    void getRecentActivity(5)
      .then((next) => {
        if (cancelled) return
        setItems(next)
        setFailed(false)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Continue Working</h2>
          <p className="max-w-2xl text-sm text-muted-foreground text-pretty">
            Pick up where you left off with your most recent records.
          </p>
        </div>
        <Link href="/activity" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          View all activity
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <Card className="border-border/80">
        <CardHeader className="sr-only">
          <CardTitle>Continue Working</CardTitle>
          <CardDescription>Recent records across CreatorOps</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5 pt-6">
          {loading ? (
            <div className="flex items-center gap-2 px-1 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading recent records…
            </div>
          ) : failed || items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/80 px-4 py-10 text-center">
              <Clock className="size-5 text-muted-foreground" />
              <p className="max-w-sm text-sm text-muted-foreground text-pretty">
                Recent records will appear here as you work.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <ActivityRow
                key={`${item.type}-${item.id}-${item.timestamp}`}
                item={item}
                compact
              />
            ))
          )}
        </CardContent>
      </Card>
    </section>
  )
}
