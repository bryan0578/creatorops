"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, Search } from "lucide-react"

import { getRecentActivity } from "@/lib/actions/recent-activity"
import {
  filterActivities,
  RECENT_ACTIVITY_LIMIT,
  type ActivityType,
  type RecentActivityItem,
} from "@/lib/data/recent-activity"
import type { GlobalSearchCategory } from "@/lib/data/global-search"
import { ModulePageHeader } from "@/components/app-shell"
import { ActivityRow } from "@/components/activity/recent-activity-timeline"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"

const CATEGORY_OPTIONS: { value: GlobalSearchCategory | "all"; label: string }[] =
  [
    { value: "all", label: "All categories" },
    { value: "core", label: "Core" },
    { value: "youtube", label: "YouTube" },
    { value: "commerce", label: "Commerce" },
    { value: "marketing", label: "Marketing" },
    { value: "operations", label: "Operations" },
  ]

const TYPE_OPTIONS: { value: ActivityType | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "prompt", label: "Prompts" },
  { value: "workflow", label: "Workflows" },
  { value: "prompt-run", label: "Prompt Runs" },
  { value: "workflow-run", label: "Workflow Runs" },
  { value: "campaign", label: "Campaigns" },
  { value: "youtube-package", label: "YouTube Packages" },
  { value: "youtube-thumbnail", label: "YouTube Thumbnails" },
  { value: "release-plan", label: "Release Plans" },
  { value: "artist", label: "Artists" },
  { value: "merch-idea", label: "Merch Ideas" },
  { value: "product-listing", label: "Product Listings" },
  { value: "social-repurposing", label: "Social Repurposing" },
  { value: "analytics", label: "Analytics" },
  { value: "mockup-prompt", label: "Mockup Prompts" },
  { value: "email-campaign", label: "Email Campaigns" },
  { value: "experiment", label: "Experiments" },
  { value: "preset", label: "Presets" },
  { value: "playbook", label: "Playbooks" },
  { value: "asset", label: "Assets" },
  { value: "quality-review", label: "Quality Reviews" },
  { value: "learning", label: "Learnings" },
  { value: "external-link", label: "External Links" },
]

export function ActivityPage() {
  const searchParams = useSearchParams()
  const [allItems, setAllItems] = React.useState<RecentActivityItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [query, setQuery] = React.useState(searchParams.get("q") ?? "")
  const [category, setCategory] = React.useState<GlobalSearchCategory | "all">(
    (searchParams.get("category") as GlobalSearchCategory) ?? "all",
  )
  const [type, setType] = React.useState<ActivityType | "all">(
    (searchParams.get("type") as ActivityType) ?? "all",
  )

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const items = await getRecentActivity(50)
        if (!cancelled) setAllItems(items)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = React.useMemo(
    () => filterActivities(allItems, { query, category, type }),
    [allItems, query, category, type],
  )

  return (
    <div className="flex flex-col gap-8">
      <ModulePageHeader
        title="Recent Activity"
        description="A unified timeline of recently created and updated records across CreatorOps."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="relative sm:col-span-3 lg:col-span-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search activity…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as GlobalSearchCategory | "all")}
        >
          <SelectTrigger className="w-full">
            <span>
              {CATEGORY_OPTIONS.find((o) => o.value === category)?.label ??
                "Category"}
            </span>
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={type}
          onValueChange={(v) => setType(v as ActivityType | "all")}
        >
          <SelectTrigger className="w-full">
            <span>
              {TYPE_OPTIONS.find((o) => o.value === type)?.label ?? "Type"}
            </span>
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/80">
        <CardContent className="space-y-2 pt-6">
          {loading ? (
            <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading activity…
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground text-pretty">
              No activity yet. Create or update records to see activity here.
            </p>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="outline">{filtered.length} activities</Badge>
              </div>
              {filtered.map((item) => (
                <ActivityRow
                  key={`${item.type}-${item.id}-${item.timestamp}`}
                  item={item}
                />
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
