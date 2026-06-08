import type { AnalyticsRecord } from "@/lib/types"

export function emptyAnalyticsRecord(
  id = "",
): Omit<AnalyticsRecord, "createdAt" | "updatedAt"> & {
  createdAt?: number
  updatedAt?: number
} {
  return {
    id,
    itemName: "",
    itemType: "YouTube Video",
    relatedArtist: "",
    relatedSong: "",
    relatedCampaign: "",
    platform: "YouTube",
    publishDate: "",
    url: "",
    niche: "",
    genre: "",
    mood: "",
    titleUsed: "",
    thumbnailText: "",
    descriptionNotes: "",
    tagsUsed: "",
    callToAction: "",
    views: 0,
    impressions: 0,
    clicks: 0,
    clickThroughRate: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    subscribersGained: 0,
    watchTimeHours: 0,
    averageViewDuration: 0,
    retentionNotes: "",
    revenue: 0,
    sales: 0,
    conversionRate: 0,
    whatWorked: "",
    whatDidNotWork: "",
    improvementIdeas: "",
    nextActions: "",
    rating: 0,
    notes: "",
  }
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

export function normalizeAnalyticsRecord(
  record: Partial<AnalyticsRecord> & Pick<AnalyticsRecord, "id">,
): AnalyticsRecord {
  const empty = emptyAnalyticsRecord(record.id)
  return {
    id: record.id,
    itemName: record.itemName ?? empty.itemName,
    itemType: record.itemType ?? empty.itemType,
    relatedArtist: record.relatedArtist ?? empty.relatedArtist,
    relatedSong: record.relatedSong ?? empty.relatedSong,
    relatedCampaign: record.relatedCampaign ?? empty.relatedCampaign,
    platform: record.platform ?? empty.platform,
    publishDate: record.publishDate ?? empty.publishDate,
    url: record.url ?? empty.url,
    niche: record.niche ?? empty.niche,
    genre: record.genre ?? empty.genre,
    mood: record.mood ?? empty.mood,
    titleUsed: record.titleUsed ?? empty.titleUsed,
    thumbnailText: record.thumbnailText ?? empty.thumbnailText,
    descriptionNotes: record.descriptionNotes ?? empty.descriptionNotes,
    tagsUsed: record.tagsUsed ?? empty.tagsUsed,
    callToAction: record.callToAction ?? empty.callToAction,
    views: toNumber(record.views),
    impressions: toNumber(record.impressions),
    clicks: toNumber(record.clicks),
    clickThroughRate: toNumber(record.clickThroughRate),
    likes: toNumber(record.likes),
    comments: toNumber(record.comments),
    shares: toNumber(record.shares),
    saves: toNumber(record.saves),
    subscribersGained: toNumber(record.subscribersGained),
    watchTimeHours: toNumber(record.watchTimeHours),
    averageViewDuration: toNumber(record.averageViewDuration),
    retentionNotes: record.retentionNotes ?? empty.retentionNotes,
    revenue: toNumber(record.revenue),
    sales: toNumber(record.sales),
    conversionRate: toNumber(record.conversionRate),
    whatWorked: record.whatWorked ?? empty.whatWorked,
    whatDidNotWork: record.whatDidNotWork ?? empty.whatDidNotWork,
    improvementIdeas: record.improvementIdeas ?? empty.improvementIdeas,
    nextActions: record.nextActions ?? empty.nextActions,
    rating: toNumber(record.rating),
    notes: record.notes ?? empty.notes,
    createdAt: record.createdAt ?? Date.now(),
    updatedAt: record.updatedAt ?? Date.now(),
  }
}

export interface AnalyticsSummary {
  totalItems: number
  totalViews: number
  totalClicks: number
  totalSales: number
  totalRevenue: number
  averageRating: number
  bestPlatform: string
  bestItemType: string
}

export function computeAnalyticsSummary(
  records: AnalyticsRecord[],
): AnalyticsSummary {
  const totalItems = records.length
  let totalViews = 0
  let totalClicks = 0
  let totalSales = 0
  let totalRevenue = 0
  let ratingSum = 0
  let ratingCount = 0

  const platformViews = new Map<string, number>()
  const itemTypeViews = new Map<string, number>()

  for (const record of records) {
    totalViews += record.views
    totalClicks += record.clicks
    totalSales += record.sales
    totalRevenue += record.revenue

    if (record.rating > 0) {
      ratingSum += record.rating
      ratingCount += 1
    }

    if (record.platform) {
      platformViews.set(
        record.platform,
        (platformViews.get(record.platform) ?? 0) + record.views,
      )
    }
    if (record.itemType) {
      itemTypeViews.set(
        record.itemType,
        (itemTypeViews.get(record.itemType) ?? 0) + record.views,
      )
    }
  }

  const bestPlatform =
    [...platformViews.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"
  const bestItemType =
    [...itemTypeViews.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"

  return {
    totalItems,
    totalViews,
    totalClicks,
    totalSales,
    totalRevenue,
    averageRating: ratingCount ? ratingSum / ratingCount : 0,
    bestPlatform,
    bestItemType,
  }
}

function formatRecordForInsights(record: AnalyticsRecord, index: number): string {
  const lines = [
    `--- Record ${index + 1}: ${record.itemName || "Untitled"} ---`,
    `Type: ${record.itemType}`,
    `Platform: ${record.platform}`,
    record.relatedArtist ? `Artist: ${record.relatedArtist}` : null,
    record.relatedSong ? `Song: ${record.relatedSong}` : null,
    record.relatedCampaign ? `Campaign: ${record.relatedCampaign}` : null,
    record.publishDate ? `Published: ${record.publishDate}` : null,
    record.niche ? `Niche: ${record.niche}` : null,
    record.genre ? `Genre: ${record.genre}` : null,
    record.titleUsed ? `Title used: ${record.titleUsed}` : null,
    record.thumbnailText ? `Thumbnail text: ${record.thumbnailText}` : null,
    `Views: ${record.views}`,
    `Impressions: ${record.impressions}`,
    `Clicks: ${record.clicks}`,
    `CTR: ${record.clickThroughRate}%`,
    `Likes: ${record.likes}`,
    `Comments: ${record.comments}`,
    `Shares: ${record.shares}`,
    `Saves: ${record.saves}`,
    `Subscribers gained: ${record.subscribersGained}`,
    `Watch time (hours): ${record.watchTimeHours}`,
    `Revenue: $${record.revenue}`,
    `Sales: ${record.sales}`,
    record.rating ? `Rating: ${record.rating}/5` : null,
    record.whatWorked ? `What worked: ${record.whatWorked}` : null,
    record.whatDidNotWork ? `What did not work: ${record.whatDidNotWork}` : null,
    record.improvementIdeas ? `Improvement ideas: ${record.improvementIdeas}` : null,
  ].filter(Boolean)

  return lines.join("\n")
}

export function buildInsightsPrompt(records: AnalyticsRecord[]): string {
  if (records.length === 0) {
    return ""
  }

  const dataset = records.map(formatRecordForInsights).join("\n\n")

  return `You are a creator analytics strategist for AI music, merch, digital products, and multi-platform content.

Analyze the following manually tracked performance data and return actionable insights.

Tracked items (${records.length}):

${dataset}

Analyze and return:
1. Patterns across the best and worst performing items
2. Best performing content types and why they likely worked
3. Weak spots and underperforming areas
4. Title and thumbnail lessons based on the data
5. Platform-specific lessons (YouTube, streaming, social, merch, email)
6. Merch and product listing lessons if applicable
7. Recommended next actions ranked by likely impact

Be specific. Reference the actual metrics and item names from the data above.`
}

export type AnalyticsSortKey =
  | "views"
  | "clicks"
  | "sales"
  | "revenue"
  | "rating"
  | "updatedAt"

export function sortAnalyticsRecords(
  records: AnalyticsRecord[],
  key: AnalyticsSortKey,
  direction: "asc" | "desc",
): AnalyticsRecord[] {
  const sorted = [...records].sort((a, b) => {
    const aVal = key === "updatedAt" ? a.updatedAt : a[key]
    const bVal = key === "updatedAt" ? b.updatedAt : b[key]
    return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
  })
  return direction === "asc" ? sorted : sorted.reverse()
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

export function formatCurrency(value: number): string {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}
