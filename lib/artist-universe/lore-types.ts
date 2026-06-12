/** Parse loreType or canonStatus strings with combined delimiters. */
export function parseDelimitedTokens(value: string | null | undefined): string[] {
  if (!value?.trim()) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const part of value.split(/[/|,]+/)) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

export function parseLoreTypes(loreType: string | null | undefined): string[] {
  return parseDelimitedTokens(loreType)
}

export function joinLoreTypes(types: string[]): string {
  const seen = new Set<string>()
  const result: string[] = []
  for (const type of types) {
    const trimmed = type.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result.join(" / ")
}

function norm(value: string): string {
  return value.trim().toLowerCase()
}

/** True if any parsed lore-type token matches a search token (case-insensitive). */
export function loreTypeContainsAny(loreType: string | null | undefined, tokens: string[]): boolean {
  const parts = parseLoreTypes(loreType).map(norm)
  if (!parts.length) return false
  return tokens.some((token) => {
    const t = norm(token)
    return parts.some((part) => part === t || part.includes(t))
  })
}

/** True if canon status equals or contains a token (case-insensitive). */
export function canonStatusContains(
  canonStatus: string | null | undefined,
  token: string,
): boolean {
  const value = norm(canonStatus ?? "")
  const t = norm(token)
  if (!value || !t) return false
  if (value === t) return true
  return parseDelimitedTokens(canonStatus).some((part) => norm(part) === t)
}

export function isStandardLoreType(value: string, standard: readonly string[]): boolean {
  const v = norm(value)
  return standard.some((option) => norm(option) === v)
}

/** Split stored loreType into standard + custom tokens for chip UI. */
export function loreTypesForForm(
  loreType: string,
  standard: readonly string[],
): { selected: string[]; custom: string[] } {
  const parsed = parseLoreTypes(loreType)
  const selected: string[] = []
  const custom: string[] = []
  for (const part of parsed) {
    if (isStandardLoreType(part, standard)) {
      if (!selected.some((s) => norm(s) === norm(part))) selected.push(part)
    } else {
      custom.push(part)
    }
  }
  return { selected, custom }
}

export function mergeLoreTypeSelection(
  standardSelected: string[],
  custom: string[],
): string {
  return joinLoreTypes([...standardSelected, ...custom])
}
