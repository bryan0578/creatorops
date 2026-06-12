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
