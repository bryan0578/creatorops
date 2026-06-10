"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Loader2, Search } from "lucide-react"

import { searchGlobal } from "@/lib/actions/global-search"
import type {
  GlobalSearchFilter,
  GlobalSearchGroup,
  GlobalSearchResult,
} from "@/lib/data/global-search"
import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const FILTER_OPTIONS: { value: GlobalSearchFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "core", label: "Core" },
  { value: "youtube", label: "YouTube" },
  { value: "commerce", label: "Commerce" },
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operations" },
]

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!text || !query.trim()) return <>{text}</>

  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "gi"))
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={`${part}-${index}`}
            className="rounded-sm bg-primary/20 px-0.5 text-foreground"
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  )
}

function SearchResultCard({
  result,
  query,
}: {
  result: GlobalSearchResult
  query: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{result.typeLabel}</Badge>
          {result.matchedFields && result.matchedFields.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              Matched: {result.matchedFields.slice(0, 3).join(", ")}
              {result.matchedFields.length > 3 ? "…" : ""}
            </span>
          ) : null}
        </div>
        <div>
          <p className="font-medium text-balance">
            <HighlightText text={result.title} query={query} />
          </p>
          {result.subtitle ? (
            <p className="mt-0.5 text-sm text-muted-foreground">
              <HighlightText text={result.subtitle} query={query} />
            </p>
          ) : null}
        </div>
        {result.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground text-pretty">
            <HighlightText text={result.description} query={query} />
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Updated {formatDate(result.updatedAt)}
        </p>
        {!result.directOpen && result.openNote ? (
          <p className="text-xs text-muted-foreground text-pretty">{result.openNote}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={result.href}
          className={buttonVariants({ variant: result.directOpen ? "default" : "outline", size: "sm" })}
        >
          {result.directOpen ? "Open" : "Go to module"}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  )
}

function SearchGroupSection({
  group,
  query,
}: {
  group: GlobalSearchGroup
  query: string
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">{group.typeLabel}</h2>
        <Badge variant="outline">{group.total} result{group.total === 1 ? "" : "s"}</Badge>
      </div>
      <div className="flex flex-col gap-2">
        {group.results.map((result) => (
          <SearchResultCard key={`${result.type}-${result.id}`} result={result} query={query} />
        ))}
      </div>
    </section>
  )
}

export function GlobalSearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") ?? ""
  const initialFilter = (searchParams.get("filter") as GlobalSearchFilter) ?? "all"

  const [query, setQuery] = React.useState(initialQuery)
  const [filter, setFilter] = React.useState<GlobalSearchFilter>(
    FILTER_OPTIONS.some((option) => option.value === initialFilter)
      ? initialFilter
      : "all",
  )
  const [groups, setGroups] = React.useState<GlobalSearchGroup[]>([])
  const [totalResults, setTotalResults] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [searched, setSearched] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const runSearch = React.useCallback(async (nextQuery: string, nextFilter: GlobalSearchFilter) => {
    const trimmed = nextQuery.trim()
    if (!trimmed) {
      setGroups([])
      setTotalResults(0)
      setSearched(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await searchGlobal(trimmed, nextFilter)
      setGroups(response.groups)
      setTotalResults(response.totalResults)
      setSearched(true)
    } catch (err) {
      console.error("[CreatorOps] Global search failed", err)
      const message =
        err instanceof Error ? err.message : "Search failed. Try again."
      setError(message)
      setGroups([])
      setTotalResults(0)
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    const params = new URLSearchParams()
    if (query.trim()) params.set("q", query.trim())
    if (filter !== "all") params.set("filter", filter)
    const next = params.toString()
    router.replace(next ? `/search?${next}` : "/search", { scroll: false })
  }, [query, filter, router])

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      void runSearch(query, filter)
    }, 300)
    return () => window.clearTimeout(handle)
  }, [query, filter, runSearch])

  return (
    <div className="flex flex-col gap-8">
      <ModulePageHeader
        title="Global Search"
        description="Find prompts, workflows, campaigns, releases, products, analytics, and more across CreatorOps."
      />

      <Card className="border-border/80">
        <CardContent className="space-y-4 pt-6">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across your CreatorOps workspace…"
              className="h-12 pl-10 text-base"
              autoFocus
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={filter === option.value ? "default" : "outline"}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Searching…
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!query.trim() && !searched ? (
        <EmptyState
          icon={Search}
          title="Search your CreatorOps workspace"
          description="Search across campaigns, artists, prompts, workflows, YouTube assets, products, analytics, presets, and playbooks."
        />
      ) : null}

      {error && !loading ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">{error}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => void runSearch(query, filter)}>
              Retry search
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {searched && !loading && !error && totalResults === 0 ? (
        <EmptyState
          title="No matching records found"
          description="Try a different keyword or broaden your filter."
        />
      ) : null}

      {totalResults > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {totalResults} result{totalResults === 1 ? "" : "s"} for{" "}
            <span className="font-medium text-foreground">&ldquo;{query.trim()}&rdquo;</span>
          </p>
          <div className="flex flex-col gap-8">
            {groups.map((group) => (
              <SearchGroupSection key={group.type} group={group} query={query.trim()} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
