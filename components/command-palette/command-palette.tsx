"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2, Search } from "lucide-react"

import { searchGlobal } from "@/lib/actions/global-search"
import { getRecentActivity } from "@/lib/actions/recent-activity"
import {
  COMMAND_PALETTE_GROUP_LABELS,
  COMMAND_PALETTE_MODULES,
  COMMAND_PALETTE_QUICK_ACTIONS,
  commandPaletteShortcutLabel,
  filterStaticCommandItems,
  type CommandPaletteGroupId,
  type CommandPaletteStaticItem,
} from "@/lib/data/command-palette"
import type { GlobalSearchResult, GlobalSearchResultType } from "@/lib/data/global-search"
import { buildResultHref } from "@/lib/data/global-search"
import type { RecentActivityItem } from "@/lib/data/recent-activity"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type CommandPaletteItem =
  | (CommandPaletteStaticItem & { kind: "static" })
  | {
      kind: "search" | "activity"
      id: string
      group: CommandPaletteGroupId
      title: string
      subtitle?: string
      href: string
      badge?: string
    }

function resolveSearchHref(result: GlobalSearchResult): string {
  const link = buildResultHref(result.type, result.id)
  return link.directOpen ? link.href : result.href
}

function searchResultGroup(type: GlobalSearchResultType): CommandPaletteGroupId {
  if (type === "campaign") return "campaigns"
  if (type === "preset") return "presets"
  return "records"
}

function mapSearchResult(result: GlobalSearchResult): CommandPaletteItem {
  return {
    kind: "search",
    id: `${result.type}-${result.id}`,
    group: searchResultGroup(result.type),
    title: result.title,
    subtitle: result.subtitle || result.typeLabel,
    href: resolveSearchHref(result),
    badge: result.typeLabel,
  }
}

function mapActivityItem(item: RecentActivityItem): CommandPaletteItem {
  return {
    kind: "activity",
    id: `activity-${item.type}-${item.id}`,
    group: "recent",
    title: item.title,
    subtitle: item.subtitle,
    href: item.href,
    badge: item.badgeLabel,
  }
}

function groupItems(items: CommandPaletteItem[]): {
  group: CommandPaletteGroupId
  items: CommandPaletteItem[]
}[] {
  const order: CommandPaletteGroupId[] = [
    "quick-actions",
    "modules",
    "campaigns",
    "presets",
    "records",
    "recent",
  ]
  const map = new Map<CommandPaletteGroupId, CommandPaletteItem[]>()
  for (const item of items) {
    const list = map.get(item.group) ?? []
    list.push(item)
    map.set(item.group, list)
  }
  return order
    .filter((group) => (map.get(group)?.length ?? 0) > 0)
    .map((group) => ({ group, items: map.get(group)! }))
}

function CommandPaletteRow({
  item,
  selected,
  onSelect,
  onHover,
}: {
  item: CommandPaletteItem
  selected: boolean
  onSelect: () => void
  onHover: () => void
}) {
  const Icon = item.kind === "static" ? item.icon : undefined

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        selected ? "bg-accent text-accent-foreground" : "hover:bg-muted/60",
      )}
    >
      {Icon ? (
        <Icon className="size-4 shrink-0 text-muted-foreground" />
      ) : (
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">{item.title}</span>
          {"badge" in item && item.badge ? (
            <Badge variant="secondary" className="text-[10px]">
              {item.badge}
            </Badge>
          ) : null}
        </div>
        {item.subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
        ) : null}
      </div>
    </button>
  )
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  const [query, setQuery] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [searchItems, setSearchItems] = React.useState<CommandPaletteItem[]>([])
  const [recentItems, setRecentItems] = React.useState<CommandPaletteItem[]>([])
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  const staticItems = React.useMemo(() => {
    const quick = filterStaticCommandItems(COMMAND_PALETTE_QUICK_ACTIONS, query).map(
      (item) => ({ ...item, kind: "static" as const }),
    )
    const modules = filterStaticCommandItems(COMMAND_PALETTE_MODULES, query).map(
      (item) => ({ ...item, kind: "static" as const }),
    )
    return [...quick, ...modules]
  }, [query])

  const visibleItems = React.useMemo(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      return [...staticItems, ...recentItems]
    }
    return [...staticItems, ...searchItems]
  }, [query, staticItems, searchItems, recentItems])

  const grouped = React.useMemo(() => groupItems(visibleItems), [visibleItems])

  const flatItems = React.useMemo(
    () => grouped.flatMap((section) => section.items),
    [grouped],
  )

  React.useEffect(() => {
    if (!open) {
      setQuery("")
      setSearchItems([])
      setSelectedIndex(0)
      return
    }
    const id = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(id)
  }, [open])

  React.useEffect(() => {
    if (!open) return
    let cancelled = false

    async function loadRecent() {
      try {
        const items = await getRecentActivity(6)
        if (cancelled) return
        setRecentItems(items.map(mapActivityItem))
      } catch {
        if (!cancelled) setRecentItems([])
      }
    }

    void loadRecent()
    return () => {
      cancelled = true
    }
  }, [open])

  React.useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setSearchItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    let cancelled = false

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await searchGlobal(trimmed, "all")
          if (cancelled) return
          const mapped = response.groups.flatMap((group) =>
            group.results.map(mapSearchResult),
          )
          setSearchItems(mapped)
        } catch {
          if (!cancelled) setSearchItems([])
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    }, 200)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query])

  React.useEffect(() => {
    setSelectedIndex(0)
  }, [query, visibleItems.length])

  React.useEffect(() => {
    if (!listRef.current) return
    const selected = listRef.current.querySelector('[aria-selected="true"]')
    selected?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex])

  function navigate(item: CommandPaletteItem) {
    onOpenChange(false)
    router.push(item.href)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => (flatItems.length ? (i + 1) % flatItems.length : 0))
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) =>
        flatItems.length ? (i - 1 + flatItems.length) % flatItems.length : 0,
      )
      return
    }
    if (e.key === "Enter") {
      e.preventDefault()
      const item = flatItems[selectedIndex]
      if (item) navigate(item)
      return
    }
    if (e.key === "Escape") {
      e.preventDefault()
      onOpenChange(false)
    }
  }

  let runningIndex = 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden p-0 sm:max-w-2xl"
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search modules, campaigns, records, and actions
        </DialogDescription>

        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules, campaigns, records, and actions…"
            className="h-10 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
          />
          {loading ? <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" /> : null}
        </div>

        <div
          ref={listRef}
          role="listbox"
          aria-label="Command palette results"
          className="max-h-[min(60vh,28rem)] overflow-y-auto px-2 py-2"
        >
          {flatItems.length === 0 && !loading ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {query.trim()
                ? "No matching results. Try another keyword."
                : "Type to search or pick a quick action below."}
            </p>
          ) : (
            grouped.map(({ group, items }) => (
              <section key={group} className="mb-2 last:mb-0">
                <p className="px-3 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {COMMAND_PALETTE_GROUP_LABELS[group]}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const index = runningIndex
                    runningIndex += 1
                    return (
                      <CommandPaletteRow
                        key={item.id}
                        item={item}
                        selected={index === selectedIndex}
                        onSelect={() => navigate(item)}
                        onHover={() => setSelectedIndex(index)}
                      />
                    )
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/20 px-4 py-2.5 text-[11px] text-muted-foreground">
          <span className="text-pretty">
            Search modules, campaigns, records, and actions…
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
              ↑↓
            </kbd>
            <span>navigate</span>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
              ↵
            </kbd>
            <span>open</span>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
              esc
            </kbd>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function useCommandPaletteShortcut(onOpen: () => void) {
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        onOpen()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onOpen])
}

export { commandPaletteShortcutLabel }
