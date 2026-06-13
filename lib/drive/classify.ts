/** Classify Google Drive files by filename and folder path for PrettyWise / artist universe assets. */

export type DriveFileClassification = {
  assetType: string
  artistName: string
  songTitle: string
  campaignName: string
  tags: string[]
}

const FOLDER_MIME = "application/vnd.google-apps.folder"

export function isDriveFolderMime(mimeType: string | undefined | null): boolean {
  return (mimeType ?? "").trim() === FOLDER_MIME
}

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ")
}

function slugTag(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-")
}

function extractSongTitle(name: string, path: string): string {
  const n = norm(name)
  if (n.includes("corridor") && !n.includes("lyrics") && !n.includes("song concept")) {
    return ""
  }
  const combined = `${path}/${name}`.toLowerCase()
  if (combined.includes("no exit") || combined.includes("no_exit")) {
    if (n.includes("corridor")) return ""
    return "No Exit"
  }
  if (combined.includes("cotton candy")) return "Cotton Candy Skies"
  if (combined.includes("sugar trap") || n.includes("sugar trap")) return "Sugar Trap"
  return ""
}

function isStructuredDriveAssetName(n: string): boolean {
  return (
    n.includes("artist bible") ||
    n.includes("visual identity") ||
    n.includes("lore index") ||
    n.includes("lyrics") ||
    n.includes("song concept") ||
    n.includes("youtube metadata") ||
    n.includes("merch") ||
    n.includes("thumbnail") ||
    n.includes("cover art")
  )
}

function extractArtistName(name: string, path: string): string {
  const combined = `${path}/${name}`.toLowerCase()
  if (combined.includes("prettywise") || combined.includes("pretty wise")) return "PrettyWise"
  return ""
}

export function classifyDriveFileByPath(name: string, drivePath: string): DriveFileClassification {
  const fileName = name.trim()
  const path = drivePath.trim()
  const combined = `${path}/${fileName}`.toLowerCase()
  const n = norm(fileName)
  const artistName = extractArtistName(fileName, path)
  const songTitle = extractSongTitle(fileName, path)
  const tags = new Set<string>(["google-drive"])
  if (artistName) tags.add("prettywise")
  if (songTitle) tags.add(slugTag(songTitle))

  let assetType = "Reference Asset"
  let campaignName = ""

  if (n.includes("artist bible") || combined.includes("brand bible")) {
    assetType = "Artist Bible"
    tags.add("artist-bible")
    tags.add("reference")
  } else if (n.includes("visual identity")) {
    assetType = "Visual Identity"
    tags.add("visual-identity")
    tags.add("reference")
  } else if (n.includes("lore index") || n.includes("lore manager")) {
    assetType = "Lore"
    tags.add("lore")
    tags.add("artist-universe")
  } else if (n.includes("lyrics")) {
    assetType = "Lyrics"
    tags.add("lyrics")
  } else if (n.includes("song concept")) {
    assetType = "Song Concept"
    tags.add("song-concept")
  } else if (n.includes("youtube metadata") || n.includes("youtube packaging")) {
    assetType = "YouTube Metadata"
    tags.add("youtube")
    tags.add("metadata")
    campaignName = songTitle || "No Exit"
  } else if (n.includes("merch ideas") || n.includes("merch idea")) {
    assetType = "Merch Ideas"
    tags.add("merch")
    tags.add("product")
    campaignName = songTitle || ""
  } else if (n.includes("thumbnail")) {
    assetType = "YouTube Thumbnail"
    tags.add("youtube")
  } else if (n.includes("cover art") || n.includes("cover")) {
    assetType = "Cover Art"
  } else if (combined.includes("lore") || combined.includes("story world")) {
    assetType = "Lore"
    tags.add("lore")
    tags.add("artist-universe")
  } else if (
    songTitle &&
    (combined.includes("song concept") ||
      combined.includes("song_concepts") ||
      combined.includes("song concepts"))
  ) {
    assetType = "Song Concept"
    tags.add("song-concept")
  } else if (fileName.endsWith(".md") || fileName.endsWith(".txt")) {
    assetType = "Document"
    tags.add("document")
  }

  // Lore entry filenames like The_Candy_Static.md or No_Exit_Corridor.md
  if (
    (assetType === "Document" || assetType === "Lore") &&
    !n.includes("lore index") &&
    !isStructuredDriveAssetName(n)
  ) {
    const loreMatch = fileName.replace(/\.(md|txt|docx?)$/i, "").replace(/_/g, " ")
    if (loreMatch && !n.includes("prettywise")) {
      assetType = "Lore"
      tags.add("lore")
      const slug = slugTag(loreMatch)
      if (slug) tags.add(slug)
      if (loreMatch.toLowerCase().includes("candy static")) tags.add("candy-static")
    }
  }

  return {
    assetType,
    artistName,
    songTitle,
    campaignName,
    tags: [...tags],
  }
}

export function getDrivePathFromRawJson(rawJson: string): string {
  if (!rawJson.trim()) return ""
  try {
    const parsed = JSON.parse(rawJson) as { drivePath?: string }
    return typeof parsed.drivePath === "string" ? parsed.drivePath : ""
  } catch {
    return ""
  }
}
