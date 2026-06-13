/** Text normalization for deterministic link suggestions. */

export function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase()
}

export function normalizeLinkText(value: string): string {
  return value
    .replace(/\.(md|txt|docx?|pdf|json|csv)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

export function slug(value: string): string {
  return normalizeLinkText(value).replace(/\s+/g, "-")
}

export function titleFromFileName(name: string): string {
  return normalizeLinkText(name)
    .split(" ")
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : ""))
    .join(" ")
    .trim()
}

export function fuzzyTitleMatch(a: string, b: string): boolean {
  const na = normalizeLinkText(a)
  const nb = normalizeLinkText(b)
  if (!na || !nb) return false
  return na === nb || na.includes(nb) || nb.includes(na)
}

export function tokenSet(value: string): Set<string> {
  return new Set(normalizeLinkText(value).split(" ").filter(Boolean))
}

export function tokenOverlap(a: string, b: string): number {
  const ta = tokenSet(a)
  const tb = tokenSet(b)
  if (!ta.size || !tb.size) return 0
  let overlap = 0
  for (const token of ta) {
    if (tb.has(token)) overlap += 1
  }
  return overlap
}
