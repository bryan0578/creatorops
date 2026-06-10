/**
 * Safe date parsing and formatting for calendar / timeline views.
 */

export function safeParseDate(value: string | undefined | null): Date | null {
  if (!value?.trim()) return null
  const trimmed = value.trim()
  const ts = Date.parse(trimmed)
  if (Number.isNaN(ts)) return null
  return new Date(ts)
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function endOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b)
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

export function formatDisplayDate(
  value: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  const parsed = value instanceof Date ? value : safeParseDate(typeof value === "string" ? value : "")
  if (!parsed) return "—"
  return parsed.toLocaleDateString(
    undefined,
    options ?? { weekday: "short", month: "short", day: "numeric", year: "numeric" },
  )
}

export function formatShortDate(value: Date | string | null | undefined): string {
  const parsed = value instanceof Date ? value : safeParseDate(typeof value === "string" ? value : "")
  if (!parsed) return "—"
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function daysBetween(from: Date, to: Date): number {
  const a = startOfDay(from).getTime()
  const b = startOfDay(to).getTime()
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

export function isDateInRange(
  date: Date,
  from: Date | null,
  to: Date | null,
): boolean {
  const ts = startOfDay(date).getTime()
  if (from && ts < startOfDay(from).getTime()) return false
  if (to && ts > startOfDay(to).getTime()) return false
  return true
}
