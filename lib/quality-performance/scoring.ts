import type { QualityPerformanceConfidence } from "@/lib/quality-performance/types"

export function normalizeMatchText(value: string | undefined | null): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function safeEngagementRate(likes: number, comments: number, views: number): number {
  if (!Number.isFinite(views) || views <= 0) return 0
  return ((likes + comments) / views) * 100
}

export function qualityBucket(score: number): string {
  if (score >= 90) return "Excellent"
  if (score >= 75) return "Strong"
  if (score >= 60) return "Needs Work"
  return "Weak"
}

export function isHighQuality(score: number): boolean {
  return score >= 75
}

export function isLowQuality(score: number): boolean {
  return score > 0 && score < 60
}

export function confidenceFromSample(input: {
  sampleSize: number
  metricGap?: number
  repeatedCount?: number
}): QualityPerformanceConfidence {
  const { sampleSize, metricGap = 0, repeatedCount = 0 } = input
  if (sampleSize >= 5 && metricGap >= 15) return "high"
  if (repeatedCount >= 4) return "high"
  if (sampleSize >= 3 || metricGap >= 10 || repeatedCount >= 2) return "medium"
  return "low"
}

export function scoreFromInsight(input: {
  sampleSize: number
  metricGap?: number
  base?: number
}): number {
  const base = input.base ?? 25
  const countBonus = Math.min(45, input.sampleSize * 10)
  const gapBonus = Math.min(30, (input.metricGap ?? 0) * 0.6)
  return Math.min(100, Math.round(base + countBonus + gapBonus))
}

export function isEarlySignal(sampleSize: number, confidence: QualityPerformanceConfidence): boolean {
  return sampleSize < 3 && confidence !== "high"
}

export function meetsMinConfidence(
  confidence: QualityPerformanceConfidence,
  min?: QualityPerformanceConfidence,
): boolean {
  if (!min) return true
  const order: Record<QualityPerformanceConfidence, number> = { low: 0, medium: 1, high: 2 }
  return order[confidence] >= order[min]
}

export function buildInsightId(parts: string[]): string {
  return parts.filter(Boolean).join(":")
}

export function titleSimilarity(a: string, b: string): number {
  const na = normalizeMatchText(a)
  const nb = normalizeMatchText(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.85
  const aTokens = new Set(na.split(" ").filter((t) => t.length > 2))
  const bTokens = new Set(nb.split(" ").filter((t) => t.length > 2))
  if (aTokens.size === 0 || bTokens.size === 0) return 0
  let overlap = 0
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1
  }
  return overlap / Math.max(aTokens.size, bTokens.size)
}

export function parseNumeric(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ""))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}
