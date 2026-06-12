import type { RevenueCsvImportResult, RevenueCsvPreviewRow } from "@/lib/commerce/types"

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
      continue
    }
    current += ch
  }
  result.push(current.trim())
  return result
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, "")
}

const COLUMN_ALIASES: Record<string, string[]> = {
  saleDate: ["saledate", "date", "orderdate", "purchasedate"],
  platform: ["platform", "source", "store", "channel"],
  productName: ["productname", "product", "item", "title", "name"],
  quantity: ["quantity", "qty", "units", "count"],
  grossRevenue: ["grossrevenue", "gross", "revenue", "amount", "total"],
  netRevenue: ["netrevenue", "net", "payout"],
  fees: ["fees", "fee", "platformfee"],
  orderId: ["orderid", "order", "id", "transactionid"],
  campaignName: ["campaignname", "campaign"],
  artistName: ["artistname", "artist", "project"],
}

function mapHeader(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {}
  headers.forEach((header, index) => {
    const norm = normalizeHeader(header)
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(norm)) map[field] = index
    }
  })
  return map
}

function parseNumber(value: string | undefined): number {
  if (!value?.trim()) return 0
  const cleaned = value.replace(/[$,]/g, "").trim()
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

function parseOptionalNumber(value: string | undefined): number | null {
  if (!value?.trim()) return null
  const n = parseNumber(value)
  return Number.isFinite(n) ? n : null
}

export function parseRevenueCsvText(text: string): RevenueCsvImportResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      preview: [],
      errors: ["CSV text is empty."],
      message: "No CSV content provided.",
    }
  }

  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      preview: [],
      errors: ["CSV must include a header row and at least one data row."],
      message: "Invalid CSV format.",
    }
  }

  const headers = parseCsvLine(lines[0] ?? "")
  const columnMap = mapHeader(headers)
  if (columnMap.productName == null) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      preview: [],
      errors: ["Missing required column: productName (or product/title)."],
      message: "Could not find product name column.",
    }
  }

  const preview: RevenueCsvPreviewRow[] = []
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i] ?? "")
    if (cells.every((cell) => !cell.trim())) continue

    const get = (field: string) => {
      const idx = columnMap[field]
      return idx == null ? "" : (cells[idx] ?? "")
    }

    const productName = get("productName").trim()
    if (!productName) {
      errors.push(`Row ${i + 1}: missing product name`)
      continue
    }

    const warnings: string[] = []
    const gross = parseNumber(get("grossRevenue"))
    if (!gross) warnings.push("Gross revenue missing or zero")

    preview.push({
      rowIndex: i + 1,
      saleDate: get("saleDate"),
      platform: get("platform") || "CSV Import",
      productName,
      quantity: Math.max(1, Math.round(parseNumber(get("quantity")) || 1)),
      grossRevenue: gross,
      netRevenue: parseOptionalNumber(get("netRevenue")),
      fees: parseOptionalNumber(get("fees")),
      orderId: get("orderId"),
      campaignName: get("campaignName"),
      artistName: get("artistName"),
      warnings,
    })
  }

  return {
    success: preview.length > 0,
    imported: 0,
    skipped: errors.length,
    preview,
    errors,
    message:
      preview.length > 0
        ? `Parsed ${preview.length} revenue row(s).`
        : "No valid revenue rows found.",
  }
}
