import type { PatternConfidence } from "@/lib/patterns/types"

export function normalizePatternText(value: string | undefined | null): string {
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

export function confidenceFromEvidence(input: {
  recordCount: number
  metricGap?: number
  strongSignal?: boolean
}): PatternConfidence {
  const { recordCount, metricGap = 0, strongSignal = false } = input
  if (recordCount >= 3 || metricGap >= 25 || (strongSignal && recordCount >= 2)) {
    return "high"
  }
  if (recordCount >= 2 || metricGap >= 12 || strongSignal) {
    return "medium"
  }
  return "low"
}

export function scoreFromEvidence(input: {
  recordCount: number
  metricGap?: number
  base?: number
}): number {
  const base = input.base ?? 30
  const countBonus = Math.min(40, input.recordCount * 12)
  const gapBonus = Math.min(30, (input.metricGap ?? 0) * 0.8)
  return Math.min(100, Math.round(base + countBonus + gapBonus))
}

export function isEarlySignal(recordCount: number, confidence: PatternConfidence): boolean {
  return recordCount < 3 && confidence !== "high"
}

export function meetsMinConfidence(
  confidence: PatternConfidence,
  min?: PatternConfidence,
): boolean {
  if (!min) return true
  const order: Record<PatternConfidence, number> = { low: 0, medium: 1, high: 2 }
  return order[confidence] >= order[min]
}

export function buildPatternId(parts: string[]): string {
  return parts.filter(Boolean).join(":")
}
