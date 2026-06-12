import type { ProductResearchItemRecord } from "@/lib/commerce/types"

export function scoreResearchOpportunity(item: ProductResearchItemRecord): number {
  let score = item.opportunityScore ?? 0
  if (item.demandSignal?.trim()) score += 15
  if (item.priceRange?.trim()) score += 10
  if (item.audience?.trim()) score += 10
  if (item.inspirationUrl?.trim() || item.competitorName?.trim()) score += 10
  if (item.difficulty?.toLowerCase() === "low") score += 10
  if (item.difficulty?.toLowerCase() === "high") score -= 10
  return Math.max(0, Math.min(100, score))
}

export function researchNeedsConversion(item: ProductResearchItemRecord, ageDays: number): boolean {
  if (item.status === "Converted" || item.status === "Archived") return false
  return ageDays >= 14 && item.status !== "Validated"
}
