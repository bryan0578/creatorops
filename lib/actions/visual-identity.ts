"use server"

import { revalidatePath } from "next/cache"

import { upsertMockupPromptRecord } from "@/lib/actions/mockup-prompts"
import {
  normalizeVisualIdentity,
  prismaVisualIdentityToRecord,
  visualIdentityToPrismaCreate,
  visualIdentityToPrismaUpdate,
} from "@/lib/data/visual-identity"
import { normalizeMockupPromptRecord } from "@/lib/mockup-prompts"
import { prisma } from "@/lib/prisma"
import { createId } from "@/lib/storage"
import type { VisualIdentityProfileRecord } from "@/lib/artist-universe/types"

const PATHS = [
  "/",
  "/visual-identity",
  "/youtube-thumbnails",
  "/mockup-prompts",
  "/product-factory",
  "/search",
  "/backups",
]

function revalidate() {
  for (const path of PATHS) revalidatePath(path)
}

function wrapDbError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("no such table") || message.includes("does not exist")) {
    return new Error(`${context} VisualIdentityProfile table is missing. Run npm run db:migrate.`)
  }
  return new Error(`${context} ${message}`)
}

export async function getVisualIdentityProfiles(): Promise<VisualIdentityProfileRecord[]> {
  try {
    const rows = await prisma.visualIdentityProfile.findMany({ orderBy: { updatedAt: "desc" } })
    return rows.map(prismaVisualIdentityToRecord)
  } catch (error) {
    throw wrapDbError(error, "Failed to load visual identity profiles.")
  }
}

export async function getVisualIdentityById(
  id: string,
): Promise<VisualIdentityProfileRecord | null> {
  try {
    const row = await prisma.visualIdentityProfile.findUnique({ where: { id: id.trim() } })
    return row ? prismaVisualIdentityToRecord(row) : null
  } catch {
    return null
  }
}

export async function getVisualIdentityForArtist(
  artistName: string,
): Promise<VisualIdentityProfileRecord[]> {
  const name = artistName.trim()
  if (!name) return []
  try {
    const rows = await prisma.visualIdentityProfile.findMany({
      where: { artistName: name },
      orderBy: { updatedAt: "desc" },
    })
    return rows.map(prismaVisualIdentityToRecord)
  } catch {
    return []
  }
}

export async function createVisualIdentity(
  data: Omit<VisualIdentityProfileRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<VisualIdentityProfileRecord> {
  const record = normalizeVisualIdentity({
    ...data,
    id: data.id?.trim() || createId("visual-identity"),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  try {
    const row = await prisma.visualIdentityProfile.create({
      data: visualIdentityToPrismaCreate(record) as Parameters<
        typeof prisma.visualIdentityProfile.create
      >[0]["data"],
    })
    revalidate()
    return prismaVisualIdentityToRecord(row)
  } catch (error) {
    throw wrapDbError(error, "Could not create visual identity profile.")
  }
}

export async function updateVisualIdentity(
  id: string,
  data: Partial<Omit<VisualIdentityProfileRecord, "id" | "createdAt">>,
): Promise<VisualIdentityProfileRecord> {
  const existing = await getVisualIdentityById(id)
  if (!existing) throw new Error("Visual identity profile not found.")
  const record = normalizeVisualIdentity({ ...existing, ...data, id, updatedAt: Date.now() })
  try {
    const row = await prisma.visualIdentityProfile.update({
      where: { id },
      data: visualIdentityToPrismaUpdate(record),
    })
    revalidate()
    return prismaVisualIdentityToRecord(row)
  } catch (error) {
    throw wrapDbError(error, "Could not update visual identity profile.")
  }
}

export async function deleteVisualIdentity(id: string): Promise<void> {
  try {
    await prisma.visualIdentityProfile.delete({ where: { id: id.trim() } })
    revalidate()
  } catch (error) {
    throw wrapDbError(error, "Could not delete visual identity profile.")
  }
}

export async function createThumbnailPromptFromVisualIdentity(
  id: string,
): Promise<{ href: string }> {
  const profile = await getVisualIdentityById(id)
  if (!profile) throw new Error("Visual identity profile not found.")
  const promptText = [
    `Artist: ${profile.artistName}`,
    `Visual style: ${profile.visualStyle}`,
    `Colors: ${profile.colorPalette.join(", ")}`,
    `Character rules: ${profile.characterRules}`,
    `Thumbnail rules: ${profile.thumbnailRules}`,
    `Forbidden: ${profile.forbiddenElements.join(", ")}`,
  ].join("\n")
  return {
    href: `/youtube-thumbnails?artistName=${encodeURIComponent(profile.artistName)}&visualTheme=${encodeURIComponent(profile.visualStyle)}&notes=${encodeURIComponent(promptText)}`,
  }
}

export async function createMockupPromptFromVisualIdentity(
  id: string,
): Promise<{ mockupId: string }> {
  const profile = await getVisualIdentityById(id)
  if (!profile) throw new Error("Visual identity profile not found.")
  const mockupId = createId("mockup-prompt")
  const now = Date.now()
  await upsertMockupPromptRecord(
    normalizeMockupPromptRecord({
      id: mockupId,
      projectName: `${profile.artistName} — ${profile.profileName}`,
      mockupType: "Product Mockup",
      productType: "Merch",
      niche: profile.artistName,
      audience: "",
      designConcept: profile.merchDesignRules,
      visualStyle: profile.visualStyle,
      colors: profile.colorPalette.join(", "),
      setting: profile.environmentRules,
      modelDescription: profile.characterRules,
      cameraAngle: "",
      lighting: "",
      mood: "",
      platformUse: "Fourthwall",
      aspectRatio: "1:1 Square",
      textToInclude: "",
      textToAvoid: profile.forbiddenElements.join(", "),
      brandNotes: profile.typographyRules,
      completedPrompt: profile.imagePromptRules,
      aiResponse: "",
      finalImagePrompt: profile.imagePromptRules,
      finalNegativePrompt: profile.forbiddenElements.join(", "),
      finalLayoutNotes: profile.characterRules,
      finalTextPlacement: profile.typographyRules,
      finalUsageNotes: profile.merchDesignRules,
      notes: `From visual identity: ${profile.id}`,
      createdAt: now,
      updatedAt: now,
    }),
  )
  return { mockupId }
}
