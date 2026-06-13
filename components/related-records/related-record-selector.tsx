"use client"

import * as React from "react"
import { Search } from "lucide-react"

import { searchRelatedRecordOptions } from "@/lib/related-records/actions"
import type { CreatorOpsRecordType, RelatedRecordOption } from "@/lib/related-records/types"
import { RECORD_TYPE_LABELS } from "@/lib/related-records/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const SELECT_NONE = "__none__"

const LINKABLE_TYPES: CreatorOpsRecordType[] = [
  "ArtistBible",
  "VisualIdentityProfile",
  "LoreEntry",
  "SongConcept",
  "ReleaseStoryArc",
  "Asset",
  "Campaign",
  "Product",
  "YouTubeVideo",
  "DriveFile",
]

type RelatedRecordSelectorProps = {
  artistName?: string
  songTitle?: string
  selectedIds?: Set<string>
  multiSelect?: boolean
  onLink: (option: RelatedRecordOption) => void
  className?: string
}

export function RelatedRecordSelector({
  artistName = "",
  songTitle = "",
  selectedIds,
  multiSelect = false,
  onLink,
  className,
}: RelatedRecordSelectorProps) {
  const [recordType, setRecordType] = React.useState<CreatorOpsRecordType>("SongConcept")
  const [query, setQuery] = React.useState("")
  const [filterArtist, setFilterArtist] = React.useState(artistName)
  const [filterSong, setFilterSong] = React.useState(songTitle)
  const [results, setResults] = React.useState<RelatedRecordOption[]>([])
  const [loading, setLoading] = React.useState(false)
  const [picked, setPicked] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    setFilterArtist(artistName)
  }, [artistName])

  React.useEffect(() => {
    setFilterSong(songTitle)
  }, [songTitle])

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    void searchRelatedRecordOptions({
      type: recordType,
      query,
      artistName: filterArtist,
      songTitle: filterSong,
      limit: 30,
    })
      .then((items) => {
        if (!cancelled) setResults(items)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [recordType, query, filterArtist, filterSong])

  function resultKey(option: RelatedRecordOption): string {
    return `${option.type}:${option.id}`
  }

  function handleLink(option: RelatedRecordOption) {
    onLink(option)
    if (multiSelect) {
      setPicked((prev) => new Set(prev).add(resultKey(option)))
    }
  }

  return (
    <div className={cn("space-y-3 rounded-xl border border-border/80 p-4", className)}>
      <div>
        <p className="text-sm font-medium">Add Related Record</p>
        <p className="text-xs text-muted-foreground">
          Search by title or name — no database IDs required.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Record type</Label>
          <Select
            value={recordType}
            onValueChange={(value) => setRecordType(value as CreatorOpsRecordType)}
          >
            <SelectTrigger className="w-full">
              <span>{RECORD_TYPE_LABELS[recordType]}</span>
            </SelectTrigger>
            <SelectContent>
              {LINKABLE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {RECORD_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title…"
              className="pl-8"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Filter artist</Label>
          <Input value={filterArtist} onChange={(e) => setFilterArtist(e.target.value)} placeholder="Optional" />
        </div>
        <div className="space-y-1.5">
          <Label>Filter song</Label>
          <Input value={filterSong} onChange={(e) => setFilterSong(e.target.value)} placeholder="Optional" />
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Searching…</p>
        ) : results.length ? (
          results.map((option) => {
            const key = resultKey(option)
            const alreadyLinked = selectedIds?.has(key) || picked.has(key)
            return (
              <div
                key={key}
                className="flex flex-col gap-2 rounded-lg border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{RECORD_TYPE_LABELS[option.type]}</Badge>
                    {option.status ? <Badge variant="outline">{option.status}</Badge> : null}
                  </div>
                  <p className="font-medium text-pretty">{option.title}</p>
                  {option.subtitle ? (
                    <p className="text-xs text-muted-foreground">{option.subtitle}</p>
                  ) : null}
                  {option.artistName ? (
                    <p className="text-xs text-muted-foreground">{option.artistName}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={alreadyLinked ? "ghost" : "secondary"}
                  disabled={alreadyLinked}
                  onClick={() => handleLink(option)}
                >
                  {alreadyLinked ? "Linked" : "Link"}
                </Button>
              </div>
            )
          })
        ) : (
          <p className="text-sm text-muted-foreground">No matching records.</p>
        )}
      </div>

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Advanced debug</summary>
        <p className="mt-2">Record IDs are stored internally when you link. You do not need to copy them.</p>
      </details>
    </div>
  )
}

export { SELECT_NONE }
