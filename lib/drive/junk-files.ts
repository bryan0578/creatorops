const JUNK_FILE_NAMES = new Set([".ds_store", "thumbs.db", "desktop.ini"])

/** macOS / Windows metadata files that should not sync or become assets. */
export function isDriveJunkFile(name: string | undefined | null): boolean {
  const fileName = (name ?? "").trim()
  if (!fileName) return true

  const lower = fileName.toLowerCase()
  if (JUNK_FILE_NAMES.has(lower)) return true
  if (fileName.startsWith("._")) return true
  if (fileName.startsWith(".") && lower !== ".gitkeep") return true

  return false
}

export function filterVisibleDriveFiles<T extends { name: string }>(files: T[]): T[] {
  return files.filter((file) => !isDriveJunkFile(file.name))
}
