import type { AssetLinkConfidence, AssetLinkMatchSignal, AssetLinkScoreResult } from "@/lib/asset-linking/types"

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "to",
  "of",
  "in",
  "on",
  "with",
  "from",
  "by",
  "at",
  "is",
  "it",
  "this",
  "that",
  "file",
  "asset",
  "drive",
  "google",
  "png",
  "jpg",
  "jpeg",
  "mp4",
  "mov",
  "pdf",
  "demo",
  "final",
  "v1",
  "v2",
  "copy",
])

export function normalizeText(value: string | undefined | null): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function tokenize(value: string | undefined | null): string[] {
  const normalized = normalizeText(value)
  if (!normalized) return []
  return normalized
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
}

export function tokensOverlap(a: string | undefined | null, b: string | undefined | null): string[] {
  const left = new Set(tokenize(a))
  const right = new Set(tokenize(b))
  return [...left].filter((token) => right.has(token))
}

export function scoreTokenOverlap(
  a: string | undefined | null,
  b: string | undefined | null,
): number {
  const left = tokenize(a)
  const right = tokenize(b)
  if (left.length === 0 || right.length === 0) return 0

  const overlap = tokensOverlap(a, b)
  if (overlap.length === 0) return 0

  const union = new Set([...left, ...right]).size
  const ratio = overlap.length / union
  const coverage = overlap.length / Math.min(left.length, right.length)
  return Math.round(Math.min(100, 20 + ratio * 55 + coverage * 25))
}

export function containsPhrase(haystack: string | undefined | null, needle: string | undefined | null): boolean {
  const h = normalizeText(haystack)
  const n = normalizeText(needle)
  if (!h || !n) return false
  if (h.includes(n)) return true
  const needleTokens = tokenize(needle)
  if (needleTokens.length === 0) return false
  return needleTokens.every((token) => h.includes(token))
}

export function scoreContainsPhrase(
  haystack: string | undefined | null,
  needle: string | undefined | null,
  weight: number,
  label: string,
): AssetLinkMatchSignal | null {
  if (!needle?.trim()) return null
  if (!containsPhrase(haystack, needle)) return null
  return { label, score: weight }
}

export function scoreExactNormalizedMatch(
  a: string | undefined | null,
  b: string | undefined | null,
  weight: number,
  label: string,
): AssetLinkMatchSignal | null {
  const left = normalizeText(a)
  const right = normalizeText(b)
  if (!left || !right || left !== right) return null
  return { label, score: weight }
}

export function scoreUrlMatch(
  a: string | undefined | null,
  b: string | undefined | null,
): AssetLinkMatchSignal | null {
  const left = (a ?? "").trim().toLowerCase()
  const right = (b ?? "").trim().toLowerCase()
  if (!left || !right || left !== right) return null
  return { label: "URLs match exactly.", score: 95 }
}

export function scoreIdMatch(
  existingId: string | undefined | null,
  targetId: string | undefined | null,
  weight: number,
  label: string,
): AssetLinkMatchSignal | null {
  if (!existingId?.trim() || !targetId?.trim()) return null
  if (existingId.trim() !== targetId.trim()) return null
  return { label, score: weight }
}

export function scoreTagOverlap(
  tags: string[] | undefined,
  text: string | undefined | null,
): AssetLinkMatchSignal | null {
  const values = (tags ?? []).map((tag) => normalizeText(tag)).filter(Boolean)
  if (values.length === 0) return null
  const haystack = normalizeText(text)
  if (!haystack) return null
  const hits = values.filter((tag) => haystack.includes(tag))
  if (hits.length === 0) return null
  return {
    label: `Shared tag overlap (${hits.slice(0, 3).join(", ")}).`,
    score: Math.min(55, 25 + hits.length * 10),
  }
}

export function scoreAssetTypeMatch(
  detectedType: string | undefined | null,
  expectedType: string | undefined | null,
): AssetLinkMatchSignal | null {
  const left = normalizeText(detectedType)
  const right = normalizeText(expectedType)
  if (!left || !right) return null
  if (left !== right && !left.includes(right) && !right.includes(left)) return null
  return { label: `Detected asset type matches ${expectedType}.`, score: 45 }
}

export function combineSignals(signals: Array<AssetLinkMatchSignal | null>): AssetLinkScoreResult {
  const active = signals.filter((signal): signal is AssetLinkMatchSignal => signal != null)
  if (active.length === 0) {
    return { score: 0, confidence: "low", reason: "", signals: [] }
  }

  const sorted = [...active].sort((a, b) => b.score - a.score)
  const top = sorted[0]?.score ?? 0
  const bonus = Math.min(15, Math.max(0, sorted.length - 1) * 4)
  const score = Math.min(100, top + bonus)
  return {
    score,
    confidence: confidenceFromScore(score),
    reason: sorted[0]?.label ?? "",
    signals: sorted,
  }
}

export function confidenceFromScore(score: number): AssetLinkConfidence {
  if (score >= 80) return "high"
  if (score >= 50) return "medium"
  return "low"
}

export function meetsSuggestionThreshold(score: number): boolean {
  return score >= 25
}

export function buildSuggestionId(parts: string[]): string {
  return parts.filter(Boolean).join(":")
}

export function mergeReasons(result: AssetLinkScoreResult, extra?: string): string {
  const parts = [result.reason, extra].filter(Boolean)
  if (parts.length <= 1) return parts[0] ?? ""
  return parts.join(" ")
}
