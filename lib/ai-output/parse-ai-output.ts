import { getModuleFieldDefinitions, MODULE_FIELD_DEFINITIONS } from "@/lib/ai-output/field-mapping"
import { safeJsonParse } from "@/lib/safe-json"
import type {
  AIOutputModuleType,
  FieldConflict,
  ModuleFieldDefinition,
  ParseAIOutputInput,
  ParseAIOutputResult,
  ParseConfidence,
} from "@/lib/ai-output/types"

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
}

function normalizeFieldValue(value: string): string {
  let trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim()
  }
  trimmed = trimmed.replace(/^\*\*(.+)\*\*$/s, "$1").replace(/^__(.+?)__$/s, "$1")
  trimmed = trimmed.replace(/^_(.+?)_$/s, "$1")
  return trimmed.trim()
}

function coerceFieldValue(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return normalizeFieldValue(value)
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      .filter(Boolean)
      .join("\n")
      .trim()
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return ""
    }
  }
  return String(value).trim()
}

function buildAliasLookup(fields: ModuleFieldDefinition[]): Map<string, string> {
  const lookup = new Map<string, string>()
  for (const field of fields) {
    lookup.set(normalizeKey(field.key), field.key)
    lookup.set(normalizeKey(field.label), field.key)
    for (const alias of field.aliases ?? []) {
      lookup.set(normalizeKey(alias), field.key)
    }
  }
  return lookup
}

function extractJsonCandidates(text: string): string[] {
  const candidates: string[] = []
  const fencePattern = /```(?:json)?\s*([\s\S]*?)```/gi
  let match: RegExpExecArray | null
  while ((match = fencePattern.exec(text)) !== null) {
    const block = match[1]?.trim()
    if (block) candidates.push(block)
  }

  const objectPattern = /\{[\s\S]*\}/g
  while ((match = objectPattern.exec(text)) !== null) {
    const block = match[0]?.trim()
    if (block && block.length > 2) candidates.push(block)
  }

  const trimmed = text.trim()
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    candidates.unshift(trimmed)
  }

  return [...new Set(candidates)]
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const parsed = safeJsonParse<unknown>(text, null)
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>
  }
  return null
}

function mapJsonObject(
  object: Record<string, unknown>,
  aliasLookup: Map<string, string>,
): Record<string, string> {
  const mapped: Record<string, string> = {}

  for (const [rawKey, rawValue] of Object.entries(object)) {
    const fieldKey = aliasLookup.get(normalizeKey(rawKey))
    if (!fieldKey) continue
    const value = coerceFieldValue(rawValue)
    if (value) mapped[fieldKey] = value
  }

  return mapped
}

function parseInlineLabelValues(
  text: string,
  aliasLookup: Map<string, string>,
): Record<string, string> {
  const mapped: Record<string, string> = {}
  const lines = text.split(/\r?\n/)

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? ""
    if (!line) continue

    const inlineMatch = line.match(/^(.{2,80}?):\s+(.+)$/)
    if (!inlineMatch) continue

    const fieldKey = aliasLookup.get(normalizeKey(inlineMatch[1] ?? ""))
    if (!fieldKey) continue

    const value = normalizeFieldValue(inlineMatch[2]?.trim() ?? "")
    if (value) mapped[fieldKey] = value
  }

  return mapped
}

function isSectionHeaderLine(line: string): boolean {
  return (
    /^#{1,4}\s+/.test(line) ||
    /^\*\*.+\*\*:?\s*$/.test(line) ||
    /^__.+__\s*:?\s*$/.test(line)
  )
}

function cleanSectionHeader(line: string): string {
  return line
    .replace(/^#{1,4}\s+/, "")
    .replace(/^\*\*(.+)\*\*:?\s*$/, "$1")
    .replace(/^__(.+)__\s*:?\s*$/, "$1")
    .replace(/:\s*$/, "")
    .trim()
}

function parseMarkdownSections(
  text: string,
  aliasLookup: Map<string, string>,
): { mapped: Record<string, string>; unmatched: string[] } {
  const mapped: Record<string, string> = {}
  const unmatched: string[] = []
  const lines = text.split(/\r?\n/)

  let currentKey: string | null = null
  let buffer: string[] = []

  function flushSection() {
    if (!currentKey) return
    const value = buffer.join("\n").trim()
    if (value) mapped[currentKey] = value
    currentKey = null
    buffer = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const trimmed = line.trim()

    if (!trimmed) {
      if (currentKey) buffer.push("")
      continue
    }

    if (isSectionHeaderLine(trimmed)) {
      flushSection()
      const header = cleanSectionHeader(trimmed)
      const fieldKey = aliasLookup.get(normalizeKey(header))
      if (fieldKey) {
        currentKey = fieldKey
      } else if (header) {
        unmatched.push(header)
      }
      continue
    }

    const labelOnlyMatch = trimmed.match(/^(.{2,80}):\s*$/)
    if (labelOnlyMatch) {
      flushSection()
      const fieldKey = aliasLookup.get(normalizeKey(labelOnlyMatch[1] ?? ""))
      if (fieldKey) {
        currentKey = fieldKey
      } else {
        unmatched.push(labelOnlyMatch[1]?.trim() ?? trimmed)
      }
      continue
    }

    const inlineMatch = trimmed.match(/^(.{2,80}?):\s+(.+)$/)
    if (inlineMatch) {
      const fieldKey = aliasLookup.get(normalizeKey(inlineMatch[1] ?? ""))
      if (fieldKey) {
        flushSection()
        mapped[fieldKey] = inlineMatch[2]?.trim() ?? ""
        continue
      }
    }

    if (currentKey) {
      buffer.push(normalizeFieldValue(trimmed))
    }
  }

  flushSection()
  return { mapped, unmatched }
}

function mergeParsedFields(
  target: Record<string, string>,
  source: Record<string, string>,
): void {
  for (const [key, value] of Object.entries(source)) {
    if (!value.trim()) continue
    if (!target[key]?.trim() || value.trim().length >= target[key].trim().length) {
      target[key] = value
    }
  }
}

function computeConfidence(
  parsedCount: number,
  totalFields: number,
  usedJson: boolean,
): ParseConfidence {
  if (parsedCount === 0) return "low"
  const ratio = totalFields > 0 ? parsedCount / totalFields : 0
  if (usedJson && parsedCount >= 2) return "high"
  if (ratio >= 0.7 || parsedCount >= Math.max(4, totalFields - 1)) return "high"
  if (ratio >= 0.35 || parsedCount >= 3) return "medium"
  return "low"
}

function buildWarnings(
  parsedFields: Record<string, string>,
  existingValues: Record<string, string> | undefined,
  fields: ModuleFieldDefinition[],
): string[] {
  if (!existingValues) return []
  const warnings: string[] = []
  for (const [key, parsedValue] of Object.entries(parsedFields)) {
    const existing = existingValues[key]?.trim() ?? ""
    if (existing && existing !== parsedValue.trim()) {
      const label = fields.find((field) => field.key === key)?.label ?? key
      warnings.push(`"${label}" already has content and would be overwritten.`)
    }
  }
  return warnings
}

/** Parse AI response text into module final-field values without calling AI. */
export function parseAIOutput(input: ParseAIOutputInput): ParseAIOutputResult {
  try {
    const text = input.aiResponse?.trim() ?? ""
    if (!text) {
      return {
        success: false,
        parsedFields: {},
        confidence: "low",
        warnings: [],
        unmatchedSections: [],
        error: "Add AI response text before parsing.",
      }
    }

    const fields = getModuleFieldDefinitions(input.moduleType)
    if (fields.length === 0) {
      return {
        success: false,
        parsedFields: {},
        confidence: "low",
        warnings: [],
        unmatchedSections: [],
        error: "This module does not support AI output parsing yet.",
      }
    }

    const aliasLookup = buildAliasLookup(fields)
    const parsedFields: Record<string, string> = {}
    let usedJson = false
    const unmatchedSections: string[] = []

    for (const candidate of extractJsonCandidates(text)) {
      const object = parseJsonObject(candidate)
      if (!object) continue
      usedJson = true
      mergeParsedFields(parsedFields, mapJsonObject(object, aliasLookup))
    }

    mergeParsedFields(parsedFields, parseInlineLabelValues(text, aliasLookup))

    const markdown = parseMarkdownSections(text, aliasLookup)
    mergeParsedFields(parsedFields, markdown.mapped)
    unmatchedSections.push(...markdown.unmatched)

    const parsedCount = Object.keys(parsedFields).length
    if (parsedCount === 0) {
      return {
        success: false,
        parsedFields: {},
        confidence: "low",
        warnings: [],
        unmatchedSections: [...new Set(unmatchedSections)].slice(0, 12),
        error:
          "Could not map AI response to final fields. Try JSON with field keys or labeled sections.",
      }
    }

    const confidence = computeConfidence(parsedCount, fields.length, usedJson)
    const warnings = buildWarnings(parsedFields, input.existingValues, fields)

    return {
      success: true,
      parsedFields,
      confidence,
      warnings,
      unmatchedSections: [...new Set(unmatchedSections)].slice(0, 12),
    }
  } catch {
    return {
      success: false,
      parsedFields: {},
      confidence: "low",
      warnings: [],
      unmatchedSections: [],
      error: "Parsing failed safely. Your AI response was left unchanged.",
    }
  }
}

export function findFieldConflicts(
  parsedFields: Record<string, string>,
  existingValues: Record<string, string>,
  moduleType: AIOutputModuleType,
): FieldConflict[] {
  const fields = getModuleFieldDefinitions(moduleType)
  const conflicts: FieldConflict[] = []

  for (const [key, parsedValue] of Object.entries(parsedFields)) {
    const existingValue = existingValues[key]?.trim() ?? ""
    if (!existingValue || existingValue === parsedValue.trim()) continue
    conflicts.push({
      key,
      label: fields.find((field) => field.key === key)?.label ?? key,
      existingValue,
      parsedValue,
    })
  }

  return conflicts
}

export function computeApplyPlan(
  parsedFields: Record<string, string>,
  existingValues: Record<string, string>,
  options: { onlyFillEmpty: boolean; allowOverwrite: boolean },
): { readyKeys: string[]; skippedKeys: string[] } {
  const readyKeys: string[] = []
  const skippedKeys: string[] = []

  for (const [key, parsedValue] of Object.entries(parsedFields)) {
    if (!parsedValue.trim()) continue
    const existing = existingValues[key]?.trim() ?? ""
    const isConflict = Boolean(existing && existing !== parsedValue.trim())

    if (isConflict && (options.onlyFillEmpty || !options.allowOverwrite)) {
      skippedKeys.push(key)
      continue
    }

    readyKeys.push(key)
  }

  return { readyKeys, skippedKeys }
}

export function isSupportedAIOutputModule(
  moduleType: string,
): moduleType is AIOutputModuleType {
  return moduleType in MODULE_FIELD_DEFINITIONS
}
