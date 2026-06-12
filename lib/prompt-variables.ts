const LONG_VARIABLE_NAMES = new Set([
  "sourcecontent",
  "description",
  "targetaudience",
  "targetlistener",
  "visualtheme",
  "productbenefits",
  "notes",
  "secondarykeywords",
  "primarygoal",
  "mood",
])

export function extractVariablesFromText(text: string): string[] {
  const found: string[] = []
  const seen = new Set<string>()

  const doubleBrace = /\{\{(\w+)\}\}/g
  let match: RegExpExecArray | null
  while ((match = doubleBrace.exec(text)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1])
      found.push(match[1])
    }
  }

  const singleBrace = /(?<!\{)\{(\w+)\}(?!\})/g
  while ((match = singleBrace.exec(text)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1])
      found.push(match[1])
    }
  }

  return found
}

export function mergePromptVariables(
  declared: string[],
  promptText: string,
): string[] {
  const result: string[] = []
  const seen = new Set<string>()

  for (const variable of declared) {
    const name = variable.trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    result.push(name)
  }

  for (const variable of extractVariablesFromText(promptText)) {
    if (!seen.has(variable)) {
      seen.add(variable)
      result.push(variable)
    }
  }

  return result
}

import { formatFieldLabel } from "@/lib/ui/labels"

export function variableToLabel(name: string): string {
  return formatFieldLabel(name)
}

export function variablePlaceholder(name: string): string {
  return `Enter ${variableToLabel(name).toLowerCase()}...`
}

export function isLongVariable(name: string): boolean {
  const lower = name.toLowerCase()
  if (LONG_VARIABLE_NAMES.has(lower)) return true
  return ["content", "description", "audience", "theme", "benefits", "notes", "keywords", "listener", "goal"].some(
    (part) => lower.includes(part),
  )
}

function replaceVariable(
  text: string,
  variable: string,
  value: string,
): string {
  const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const patterns = [
    new RegExp(`\\{\\{${escaped}\\}\\}`, "g"),
    new RegExp(`(?<!\\{)\\{${escaped}\\}(?!\\})`, "g"),
  ]
  let result = text
  for (const pattern of patterns) {
    result = result.replace(pattern, value)
  }
  return result
}

export function buildCompletedPrompt(
  promptText: string,
  values: Record<string, string>,
  variables: string[],
): string {
  let result = promptText
  for (const variable of variables) {
    const value = values[variable]?.trim() ?? ""
    if (value) {
      result = replaceVariable(result, variable, value)
    }
  }
  return result
}

export function getMissingVariables(
  variables: string[],
  values: Record<string, string>,
): string[] {
  return variables.filter((variable) => !values[variable]?.trim())
}
