import { parseStringList } from "@/lib/artist-universe/utils"
import type { ArtistBibleRecord } from "@/lib/artist-universe/types"
import type { ArtistBible as PrismaArtistBible } from "@/lib/generated/prisma/client"

export function normalizeArtistBible(
  record: Partial<ArtistBibleRecord> & { artistName: string },
): ArtistBibleRecord {
  const now = Date.now()
  return {
    id: record.id?.trim() || "",
    artistName: record.artistName.trim() || "Untitled Artist",
    projectName: record.projectName?.trim() ?? "",
    labelName: record.labelName?.trim() ?? "",
    status: record.status?.trim() || "Active",
    genre: record.genre?.trim() ?? "",
    subgenre: record.subgenre?.trim() ?? "",
    mood: record.mood?.trim() ?? "",
    aesthetic: record.aesthetic?.trim() ?? "",
    targetAudience: record.targetAudience?.trim() ?? "",
    brandPromise: record.brandPromise?.trim() ?? "",
    shortBio: record.shortBio?.trim() ?? "",
    longBio: record.longBio?.trim() ?? "",
    voiceRules: record.voiceRules?.trim() ?? "",
    lyricalThemes: record.lyricalThemes?.trim() ?? "",
    visualRules: record.visualRules?.trim() ?? "",
    sonicRules: record.sonicRules?.trim() ?? "",
    doList: parseStringList(record.doList),
    dontList: parseStringList(record.dontList),
    referenceArtists: parseStringList(record.referenceArtists),
    referenceMedia: parseStringList(record.referenceMedia),
    colorPalette: parseStringList(record.colorPalette),
    keywords: parseStringList(record.keywords),
    tags: parseStringList(record.tags),
    notes: record.notes?.trim() ?? "",
    sourceArtistId: record.sourceArtistId?.trim() ?? "",
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? now,
  }
}

export function prismaArtistBibleToRecord(row: PrismaArtistBible): ArtistBibleRecord {
  return normalizeArtistBible({
    id: row.id,
    artistName: row.artistName,
    projectName: row.projectName,
    labelName: row.labelName,
    status: row.status,
    genre: row.genre,
    subgenre: row.subgenre,
    mood: row.mood,
    aesthetic: row.aesthetic,
    targetAudience: row.targetAudience,
    brandPromise: row.brandPromise,
    shortBio: row.shortBio,
    longBio: row.longBio,
    voiceRules: row.voiceRules,
    lyricalThemes: row.lyricalThemes,
    visualRules: row.visualRules,
    sonicRules: row.sonicRules,
    doList: parseStringList(row.doList),
    dontList: parseStringList(row.dontList),
    referenceArtists: parseStringList(row.referenceArtists),
    referenceMedia: parseStringList(row.referenceMedia),
    colorPalette: parseStringList(row.colorPalette),
    keywords: parseStringList(row.keywords),
    tags: parseStringList(row.tags),
    notes: row.notes,
    sourceArtistId: row.sourceArtistId,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}

export function artistBibleToPrismaCreate(record: ArtistBibleRecord) {
  const n = normalizeArtistBible(record)
  return {
    id: n.id || undefined,
    artistName: n.artistName,
    projectName: n.projectName,
    labelName: n.labelName,
    status: n.status,
    genre: n.genre,
    subgenre: n.subgenre,
    mood: n.mood,
    aesthetic: n.aesthetic,
    targetAudience: n.targetAudience,
    brandPromise: n.brandPromise,
    shortBio: n.shortBio,
    longBio: n.longBio,
    voiceRules: n.voiceRules,
    lyricalThemes: n.lyricalThemes,
    visualRules: n.visualRules,
    sonicRules: n.sonicRules,
    doList: JSON.stringify(n.doList),
    dontList: JSON.stringify(n.dontList),
    referenceArtists: JSON.stringify(n.referenceArtists),
    referenceMedia: JSON.stringify(n.referenceMedia),
    colorPalette: JSON.stringify(n.colorPalette),
    keywords: JSON.stringify(n.keywords),
    tags: JSON.stringify(n.tags),
    notes: n.notes,
    sourceArtistId: n.sourceArtistId,
    createdAt: new Date(n.createdAt),
    updatedAt: new Date(n.updatedAt),
  }
}

export function artistBibleToPrismaUpdate(record: ArtistBibleRecord) {
  const n = normalizeArtistBible(record)
  return {
    artistName: n.artistName,
    projectName: n.projectName,
    labelName: n.labelName,
    status: n.status,
    genre: n.genre,
    subgenre: n.subgenre,
    mood: n.mood,
    aesthetic: n.aesthetic,
    targetAudience: n.targetAudience,
    brandPromise: n.brandPromise,
    shortBio: n.shortBio,
    longBio: n.longBio,
    voiceRules: n.voiceRules,
    lyricalThemes: n.lyricalThemes,
    visualRules: n.visualRules,
    sonicRules: n.sonicRules,
    doList: JSON.stringify(n.doList),
    dontList: JSON.stringify(n.dontList),
    referenceArtists: JSON.stringify(n.referenceArtists),
    referenceMedia: JSON.stringify(n.referenceMedia),
    colorPalette: JSON.stringify(n.colorPalette),
    keywords: JSON.stringify(n.keywords),
    tags: JSON.stringify(n.tags),
    notes: n.notes,
    sourceArtistId: n.sourceArtistId,
    updatedAt: new Date(n.updatedAt),
  }
}
