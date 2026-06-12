"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { orNotSet } from "@/lib/artist-universe/utils"

export function useModuleTab(defaultTab: string, aliases: Record<string, string> = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const raw = searchParams.get("tab") ?? defaultTab
  const tab = aliases[raw] ?? raw

  const setTab = React.useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("tab", value)
      router.replace(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  return { tab, setTab, recordId: searchParams.get("recordId") }
}

/** Resolve ?recordId= deep links after a list load; optional fetch-by-id for direct opens. */
export function useRecordDeepLink<T extends { id: string }>(options: {
  recordId: string | null
  items: T[]
  loading: boolean
  fetchById?: (id: string) => Promise<T | null>
}): {
  resolved: T | null
  missingRecordId: string | null
  resolving: boolean
} {
  const { recordId, items, loading, fetchById } = options
  const [extra, setExtra] = React.useState<T | null>(null)
  const [missingRecordId, setMissingRecordId] = React.useState<string | null>(null)
  const [resolving, setResolving] = React.useState(false)

  React.useEffect(() => {
    if (!recordId?.trim()) {
      setExtra(null)
      setMissingRecordId(null)
      setResolving(false)
      return
    }
    if (loading) return

    const id = recordId.trim()
    const inList = items.find((item) => item.id === id)
    if (inList) {
      setExtra(null)
      setMissingRecordId(null)
      setResolving(false)
      return
    }

    if (!fetchById) {
      setMissingRecordId(id)
      setResolving(false)
      return
    }

    let cancelled = false
    setResolving(true)
    void fetchById(id)
      .then((row) => {
        if (cancelled) return
        if (row) {
          setExtra(row)
          setMissingRecordId(null)
        } else {
          setExtra(null)
          setMissingRecordId(id)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setExtra(null)
          setMissingRecordId(id)
        }
      })
      .finally(() => {
        if (!cancelled) setResolving(false)
      })

    return () => {
      cancelled = true
    }
  }, [recordId, items, loading, fetchById])

  const resolved =
    (recordId ? items.find((item) => item.id === recordId) : null) ?? extra

  return { resolved: resolved ?? null, missingRecordId, resolving }
}

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

export function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{orNotSet(value)}</p>
    </div>
  )
}

export function TagList({ tags }: { tags: string[] }) {
  if (!tags.length) return <span className="text-sm text-muted-foreground">Not set</span>
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary">
          {tag}
        </Badge>
      ))}
    </div>
  )
}

export function RecordMeta({
  artistName,
  status,
  extra,
}: {
  artistName?: string
  status?: string
  extra?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      {artistName ? <span>{artistName}</span> : null}
      {status ? <Badge variant="outline">{status}</Badge> : null}
      {extra}
    </div>
  )
}
