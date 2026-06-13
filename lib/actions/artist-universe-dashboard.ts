"use server"

import { revalidatePath } from "next/cache"

import { getArtistBibles } from "@/lib/actions/artist-bible"
import { getAssets } from "@/lib/actions/assets"
import { getCampaigns } from "@/lib/actions/campaigns"
import { getDriveFiles, getDriveFolders } from "@/lib/actions/drive-integration"
import { getGlobalTasks } from "@/lib/actions/global-tasks"
import { getLoreEntries } from "@/lib/actions/lore"
import { getMerchIdeas } from "@/lib/actions/merch-ideas"
import { getPlaybooks } from "@/lib/actions/playbooks"
import { getPresets } from "@/lib/actions/presets"
import { getSongConcepts } from "@/lib/actions/song-concepts"
import { getStoryArcs } from "@/lib/actions/story-arcs"
import { getVisualIdentityProfiles } from "@/lib/actions/visual-identity"
import { getYouTubeVideos } from "@/lib/actions/youtube-integration"
import {
  assembleArtistUniverseDashboard,
  type ArtistUniverseDashboardData,
} from "@/lib/artist-universe/dashboard"
import { filterAssetsForArtist } from "@/lib/assets"

const PATHS = [
  "/",
  "/artist-universe",
  "/artist-bible",
  "/lore",
  "/song-vault",
  "/story-arcs",
  "/visual-identity",
  "/assets",
  "/campaigns",
  "/integrations",
  "/videos",
  "/merch-ideas",
]

function revalidate() {
  for (const path of PATHS) revalidatePath(path)
}

async function safeLoad<T>(loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader()
  } catch {
    return fallback
  }
}

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase()
}

function matchesArtist(value: string | undefined | null, artistName: string): boolean {
  return norm(value) === norm(artistName)
}

export async function getArtistUniverseArtistNames(): Promise<string[]> {
  const bibles = await safeLoad(() => getArtistBibles(), [])
  const names = bibles.map((bible) => bible.artistName.trim()).filter(Boolean)
  return [...new Set(names)].sort((a, b) => a.localeCompare(b))
}

export async function getArtistUniverseDashboard(
  artistName: string,
): Promise<ArtistUniverseDashboardData | null> {
  const name = artistName.trim()
  if (!name) return null

  const [
    bibles,
    visualProfiles,
    loreEntries,
    songConcepts,
    storyArcs,
    assets,
    campaigns,
    youtubeVideos,
    merchIdeas,
    driveFiles,
    driveFolders,
    globalTasks,
    presets,
    playbooks,
  ] = await Promise.all([
    safeLoad(() => getArtistBibles(), []),
    safeLoad(() => getVisualIdentityProfiles(), []),
    safeLoad(() => getLoreEntries(), []),
    safeLoad(() => getSongConcepts(), []),
    safeLoad(() => getStoryArcs(), []),
    safeLoad(() => getAssets(), []),
    safeLoad(() => getCampaigns(), []),
    safeLoad(() => getYouTubeVideos(), []),
    safeLoad(() => getMerchIdeas(), []),
    safeLoad(() => getDriveFiles(), []),
    safeLoad(() => getDriveFolders(), []),
    safeLoad(() => getGlobalTasks(), []),
    safeLoad(() => getPresets(), []),
    safeLoad(() => getPlaybooks(), []),
  ])

  const bible =
    bibles.find((row) => matchesArtist(row.artistName, name)) ??
    bibles.find((row) => norm(row.artistName).includes(norm(name))) ??
    null

  const filteredVisual = visualProfiles.filter((row) => matchesArtist(row.artistName, name))
  const filteredLore = loreEntries.filter((row) => matchesArtist(row.artistName, name))
  const filteredConcepts = songConcepts.filter((row) => matchesArtist(row.artistName, name))
  const filteredArcs = storyArcs.filter((row) => matchesArtist(row.artistName, name))
  const filteredAssets = filterAssetsForArtist(assets, name)
  const filteredCampaigns = campaigns.filter((row) => matchesArtist(row.artistName, name))
  const filteredVideos = youtubeVideos.filter(
    (row) =>
      matchesArtist(row.artistName, name) ||
      norm(row.title).includes(norm(name)) ||
      filteredConcepts.some((concept) =>
        norm(row.title).includes(norm(concept.songTitle || concept.title)),
      ),
  )
  const filteredMerch = merchIdeas.filter(
    (row) =>
      norm(row.niche).includes(norm(name)) ||
      norm(row.selectedConceptName).includes(norm(name)) ||
      filteredConcepts.some((concept) =>
        norm(row.selectedConceptName).includes(norm(concept.songTitle || concept.title)),
      ),
  )
  const filteredDriveFiles = driveFiles.filter(
    (row) =>
      matchesArtist(row.artistName, name) ||
      norm(row.name).includes(norm(name)) ||
      row.tags.some((tag) => norm(tag).includes(norm(name))),
  )
  const filteredDriveFolders = driveFolders.filter(
    (row) =>
      matchesArtist(row.artistName, name) ||
      norm(row.name).includes(norm(name)) ||
      row.tags.some((tag) => norm(tag).includes(norm(name))),
  )

  const artistSetupTaskCount = globalTasks.filter(
    (task) =>
      matchesArtist(task.artistName, name) &&
      (task.taskType === "Artist Setup" || task.module === "Artist Ops"),
  ).length

  const artistPreset =
    presets.find(
      (preset) =>
        norm(preset.name).includes(norm(name)) ||
        preset.tags.some((tag) => norm(tag).includes(norm(name))),
    ) ?? null

  const publishedSongPlaybook =
    playbooks.find(
      (playbook) =>
        norm(playbook.name).includes("published song archive") ||
        norm(playbook.name).includes("song archive"),
    ) ?? null

  return assembleArtistUniverseDashboard({
    artistName: name,
    bible,
    visualProfiles: filteredVisual,
    loreEntries: filteredLore,
    songConcepts: filteredConcepts,
    storyArcs: filteredArcs,
    assets: filteredAssets,
    campaigns: filteredCampaigns,
    youtubeVideos: filteredVideos,
    merchIdeas: filteredMerch,
    driveFiles: filteredDriveFiles,
    driveFolders: filteredDriveFolders,
    artistSetupTaskCount,
    artistPreset,
    publishedSongPlaybook,
  })
}

export async function refreshArtistUniverseDashboard(artistName: string) {
  revalidate()
  return getArtistUniverseDashboard(artistName)
}
