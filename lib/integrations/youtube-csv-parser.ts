import type { AnalyticsRecord, ExternalLinkRecord } from "@/lib/types"

export interface YouTubeCsvPreviewRow {
  rowIndex: number
  itemName: string
  publishDate: string
  url: string
  views: number
  impressions: number
  clickThroughRate: number
  averageViewDuration: number
  watchTimeHours: number
  subscribersGained: number
  likes: number
  comments: number
  shares: number
  raw: Record<string, string>
}

export interface YouTubeCsvParseResult {
  success: boolean
  rows: YouTubeCsvPreviewRow[]
  unmatchedColumns: string[]
  warnings: string[]
  error?: string
}

const COLUMN_ALIASES: Record<string, string[]> = {
  itemName: [
    "video title",
    "title",
    "content",
    "video",
    "video name",
    "name",
  ],
  publishDate: ["published time", "publish time", "publish date", "date", "published"],
  url: ["video url", "url", "link", "youtube url"],
  views: ["views", "view count"],
  impressions: ["impressions", "impression"],
  clickThroughRate: [
    "impressions click-through rate",
    "impressions click through rate",
    "ctr",
    "click-through rate",
    "click through rate",
  ],
  averageViewDuration: [
    "average view duration",
    "avg view duration",
    "average duration",
  ],
  watchTimeHours: ["watch time hours", "watch time (hours)", "watch time", "watch hours"],
  subscribersGained: [
    "subscribers gained",
    "subscribers",
    "subs gained",
    "subscriber change",
  ],
  likes: ["likes", "like count"],
  comments: ["comments", "comment count"],
  shares: ["shares", "share count"],
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[%()]/g, "")
    .replace(/\s+/g, " ")
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim())
      current = ""
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = parseCsvLine(lines[0] ?? "")
  const rows = lines.slice(1).map(parseCsvLine)
  return { headers, rows }
}

function mapHeaders(headers: string[]): {
  mapping: Partial<Record<keyof YouTubeCsvPreviewRow, number>>
  unmatched: string[]
} {
  const normalized = headers.map(normalizeHeader)
  const mapping: Partial<Record<keyof YouTubeCsvPreviewRow, number>> = {}
  const matchedHeaderIndexes = new Set<number>()

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as Array<
    [keyof typeof COLUMN_ALIASES, string[]]
  >) {
    for (let i = 0; i < normalized.length; i += 1) {
      const header = normalized[i] ?? ""
      if (aliases.some((alias) => header === alias || header.includes(alias))) {
        mapping[field as keyof YouTubeCsvPreviewRow] = i
        matchedHeaderIndexes.add(i)
        break
      }
    }
  }

  const unmatched = headers.filter((_, index) => !matchedHeaderIndexes.has(index))
  return { mapping, unmatched }
}

function parseNumber(value: string | undefined): number {
  if (!value?.trim()) return 0
  const cleaned = value.replace(/[%$,]/g, "").trim()
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function cellValue(row: string[], index: number | undefined): string {
  if (index === undefined) return ""
  return row[index]?.trim() ?? ""
}

export function parseYouTubeAnalyticsCsv(
  csvText: string,
  fallbackTitle?: string,
): YouTubeCsvParseResult {
  try {
    const trimmed = csvText.trim()
    if (!trimmed) {
      return {
        success: false,
        rows: [],
        unmatchedColumns: [],
        warnings: [],
        error: "Paste CSV content before previewing.",
      }
    }

    const { headers, rows } = parseCsvText(trimmed)
    if (headers.length === 0) {
      return {
        success: false,
        rows: [],
        unmatchedColumns: [],
        warnings: [],
        error: "Could not find CSV headers.",
      }
    }

    const { mapping, unmatched } = mapHeaders(headers)
    const warnings: string[] = []
    if (!mapping.itemName && !fallbackTitle?.trim()) {
      warnings.push("No video title column detected — provide a fallback title or map manually.")
    }
    if (unmatched.length > 0) {
      warnings.push(`Ignored columns: ${unmatched.join(", ")}`)
    }

    const parsedRows: YouTubeCsvPreviewRow[] = rows
      .filter((row) => row.some((cell) => cell.trim()))
      .map((row, index) => {
        const raw: Record<string, string> = {}
        headers.forEach((header, headerIndex) => {
          raw[header] = row[headerIndex] ?? ""
        })

        const itemName =
          cellValue(row, mapping.itemName) ||
          fallbackTitle?.trim() ||
          `YouTube Video ${index + 1}`

        return {
          rowIndex: index + 1,
          itemName,
          publishDate: cellValue(row, mapping.publishDate),
          url: cellValue(row, mapping.url),
          views: parseNumber(cellValue(row, mapping.views)),
          impressions: parseNumber(cellValue(row, mapping.impressions)),
          clickThroughRate: parseNumber(cellValue(row, mapping.clickThroughRate)),
          averageViewDuration: parseNumber(cellValue(row, mapping.averageViewDuration)),
          watchTimeHours: parseNumber(cellValue(row, mapping.watchTimeHours)),
          subscribersGained: parseNumber(cellValue(row, mapping.subscribersGained)),
          likes: parseNumber(cellValue(row, mapping.likes)),
          comments: parseNumber(cellValue(row, mapping.comments)),
          shares: parseNumber(cellValue(row, mapping.shares)),
          raw,
        }
      })

    return {
      success: parsedRows.length > 0,
      rows: parsedRows,
      unmatchedColumns: unmatched,
      warnings,
      error: parsedRows.length === 0 ? "No data rows found in CSV." : undefined,
    }
  } catch (error) {
    return {
      success: false,
      rows: [],
      unmatchedColumns: [],
      warnings: [],
      error: error instanceof Error ? error.message : "Could not parse CSV.",
    }
  }
}

export function youtubeCsvRowToAnalyticsRecord(
  row: YouTubeCsvPreviewRow,
  input: {
    id: string
    relatedCampaign?: string
    relatedArtist?: string
    relatedSong?: string
    now?: number
  },
): AnalyticsRecord {
  const now = input.now ?? Date.now()
  return {
    id: input.id,
    itemName: row.itemName,
    itemType: "YouTube Video",
    relatedArtist: input.relatedArtist ?? "",
    relatedSong: input.relatedSong ?? "",
    relatedCampaign: input.relatedCampaign ?? "",
    platform: "YouTube",
    publishDate: row.publishDate,
    url: row.url,
    niche: "",
    genre: "",
    mood: "",
    titleUsed: row.itemName,
    thumbnailText: "",
    descriptionNotes: "",
    tagsUsed: "",
    callToAction: "",
    views: row.views,
    impressions: row.impressions,
    clicks: 0,
    clickThroughRate: row.clickThroughRate,
    likes: row.likes,
    comments: row.comments,
    shares: row.shares,
    saves: 0,
    subscribersGained: row.subscribersGained,
    watchTimeHours: row.watchTimeHours,
    averageViewDuration: row.averageViewDuration,
    retentionNotes: "",
    revenue: 0,
    sales: 0,
    conversionRate: 0,
    whatWorked: "",
    whatDidNotWork: "",
    improvementIdeas: "",
    nextActions: "",
    rating: 0,
    notes: "Imported from YouTube Analytics CSV",
    experimentId: "",
    experimentName: "",
    createdAt: now,
    updatedAt: now,
  }
}

export function youtubeCsvRowToExternalLink(
  row: YouTubeCsvPreviewRow,
  input: {
    id: string
    campaignId?: string
    campaignName?: string
    artistName?: string
    songTitle?: string
    now?: number
  },
): ExternalLinkRecord | null {
  if (!row.url.trim()) return null
  const now = input.now ?? Date.now()
  return {
    id: input.id,
    name: row.itemName,
    platform: "YouTube",
    linkType: "Published Video",
    url: row.url.trim(),
    status: "Active",
    campaignId: input.campaignId ?? "",
    campaignName: input.campaignName ?? "",
    artistName: input.artistName ?? "",
    songTitle: input.songTitle ?? "",
    productName: "",
    sourceRecordType: "",
    sourceRecordId: "",
    assetId: "",
    analyticsRecordId: "",
    notes: "Created from YouTube Analytics CSV import",
    tags: ["youtube-csv-import"],
    createdAt: now,
    updatedAt: now,
  }
}

export function isDuplicateAnalyticsImport(
  existing: AnalyticsRecord[],
  candidate: Pick<AnalyticsRecord, "itemName" | "publishDate" | "platform" | "relatedCampaign">,
): boolean {
  const name = candidate.itemName.trim().toLowerCase()
  const date = candidate.publishDate.trim()
  const campaign = candidate.relatedCampaign.trim().toLowerCase()
  return existing.some((record) => {
    if (record.platform !== candidate.platform) return false
    if (record.itemName.trim().toLowerCase() !== name) return false
    if (date && record.publishDate.trim() && record.publishDate.trim() !== date) return false
    if (campaign && record.relatedCampaign.trim().toLowerCase() !== campaign) return false
    return true
  })
}
