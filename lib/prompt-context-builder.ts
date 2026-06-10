import type { CampaignContextBundle } from "@/lib/data/campaign-context"

export type ModulePromptContextType =
  | "youtube-packaging"
  | "youtube-thumbnails"
  | "release-planner"
  | "social-repurposing"
  | "email-campaigns"
  | "merch-ideas"
  | "product-listings"
  | "mockup-prompts"
  | "analytics"

export const MODULE_TASK_SEPARATOR = "--- MODULE TASK ---"
export const CAMPAIGN_CONTEXT_MARKER = "CAMPAIGN CONTEXT"

const MODULE_FOCUS: Record<ModulePromptContextType, string> = {
  "youtube-packaging":
    "Focus on title, description, tags, hashtags, pinned comment, community post, Shorts caption, and metadata optimized for the campaign.",
  "youtube-thumbnails":
    "Focus on click psychology, composition, text overlay, color direction, image prompt, and Shorts cover.",
  "release-planner":
    "Focus on pre-release, release-day, post-release, tasks, timeline, merch tie-ins, and analytics.",
  "social-repurposing":
    "Focus on platform-specific captions, Shorts ideas, community posts, CTA, and hooks.",
  "email-campaigns":
    "Focus on subject line, preview text, body, CTA, follow-up, and resend.",
  "merch-ideas":
    "Focus on product concepts, slogans, design directions, mockups, and social captions.",
  "product-listings":
    "Focus on title, short/long description, bullet points, tags, collection, and CTA.",
  "mockup-prompts":
    "Focus on product mockup scene, layout, lighting, text placement, and negative prompt.",
  analytics:
    "Focus on what to track, success criteria, experiment notes, and next actions.",
}

function line(label: string, value: string | undefined | null): string {
  const text = (value ?? "").trim()
  return `${label}: ${text || "Not provided"}`
}

function block(label: string, value: string | undefined | null): string[] {
  const text = (value ?? "").trim()
  if (!text) return [line(label, null)]
  return [label + ":", text]
}

function availability(label: string, available: boolean): string {
  return `${label}: ${available ? "available" : "missing"}`
}

export function buildCampaignContextBlock(context: CampaignContextBundle): string {
  const { campaign, workspaceSettings, artistProfile } = context
  const lines: string[] = [CAMPAIGN_CONTEXT_MARKER, ""]

  lines.push(
    line("Campaign", campaign.campaignName),
    line("Type", campaign.campaignType),
    line("Status", campaign.status),
    line("Priority", campaign.priority),
    line("Artist", campaign.artistName),
    line("Song", campaign.songTitle),
    line("Product", campaign.productName),
    line("Niche", campaign.niche),
    line("Launch Date", campaign.launchDate),
    line("Goal", campaign.primaryGoal),
    line("Audience", campaign.targetAudience),
    line("Description", campaign.description),
    "",
  )

  if (artistProfile) {
    lines.push(
      "ARTIST CONTEXT",
      line("Artist", artistProfile.artistName),
      line("Artist Type", artistProfile.artistType),
      line("Genre", artistProfile.genre),
      line("Sub-genres", artistProfile.subGenres),
      line("Mood", artistProfile.mood),
      ...block("Brand Description", artistProfile.brandDescription),
      ...block("Visual Identity", artistProfile.visualIdentity),
      line("Target Audience", artistProfile.targetAudience),
      line("Content Style", artistProfile.contentStyle),
      line("YouTube Channel", artistProfile.youtubeChannel),
      "",
    )
  } else {
    lines.push("ARTIST CONTEXT", "No linked artist profile found.", "")
  }

  if (workspaceSettings) {
    lines.push(
      "WORKSPACE DEFAULTS",
      line("Workspace", workspaceSettings.workspaceName),
      line("Label", workspaceSettings.labelName),
      line("YouTube Channel", workspaceSettings.defaultYouTubeChannel),
      line("Store", workspaceSettings.defaultStoreName),
      line("Default CTA", workspaceSettings.defaultCTA),
      line("Default Hashtags", workspaceSettings.defaultHashtagSet),
      line("Brand Tone", workspaceSettings.defaultBrandTone),
      line("Visual Style", workspaceSettings.defaultVisualStyle),
      line("Default Audience", workspaceSettings.defaultAudience),
      line("Email Sender", workspaceSettings.defaultEmailSender),
      line("Primary Goal", workspaceSettings.defaultPrimaryGoal),
      "",
    )
  } else {
    lines.push("WORKSPACE DEFAULTS", "No workspace settings found.", "")
  }

  const visualTheme =
    context.releasePlan?.visualTheme ||
    context.youtubePackage?.visualTheme ||
    context.youtubeThumbnail?.visualTheme ||
    campaign.description

  if (visualTheme?.trim()) {
    lines.push(line("Visual Theme", visualTheme), "")
  }

  lines.push(
    "RELATED RECORDS",
    availability("Release Plan", Boolean(context.releasePlan)),
    availability("YouTube Package", Boolean(context.youtubePackage)),
    availability("Thumbnail", Boolean(context.youtubeThumbnail)),
    availability("Social", Boolean(context.socialRepurposing)),
    availability("Email", Boolean(context.emailCampaign)),
    availability("Merch Idea", Boolean(context.merchIdea)),
    availability("Product Listing", Boolean(context.productListing)),
    availability("Mockup Prompt", Boolean(context.mockupPrompt)),
    availability("Analytics", Boolean(context.analyticsRecord)),
    "",
  )

  if (context.releasePlan) {
    const plan = context.releasePlan
    lines.push(
      "RELEASE PLAN SNAPSHOT",
      ...block("Strategy", plan.finalStrategySummary),
      ...block("Pre-Release", plan.finalPreReleasePlan),
      ...block("Release Day", plan.finalReleaseDayChecklist),
      ...block("Post-Release", plan.finalPostReleasePlan),
      "",
    )
  }

  if (context.youtubePackage) {
    const pkg = context.youtubePackage
    lines.push(
      "YOUTUBE PACKAGE SNAPSHOT",
      line("Title", pkg.finalTitle || pkg.trackTitle),
      ...block("Description", pkg.finalDescription),
      line("Tags", pkg.finalTags),
      "",
    )
  }

  if (context.youtubeThumbnail) {
    const thumb = context.youtubeThumbnail
    lines.push(
      "THUMBNAIL SNAPSHOT",
      ...block("Concept", thumb.finalConcept),
      line("Text Overlay", thumb.finalTextOverlay),
      ...block("Image Prompt", thumb.finalImagePrompt),
      "",
    )
  }

  if (context.socialRepurposing) {
    const social = context.socialRepurposing
    lines.push(
      "SOCIAL SNAPSHOT",
      ...block("Core Message", social.finalCoreMessage),
      line("Hashtags", social.finalHashtags),
      "",
    )
  }

  if (context.emailCampaign) {
    const email = context.emailCampaign
    lines.push(
      "EMAIL SNAPSHOT",
      line("Subject", email.finalSubjectLine),
      ...block("Preview", email.finalPreviewText),
      "",
    )
  }

  const missing =
    context.missingAssets.length > 0
      ? context.missingAssets.map((asset) => `- ${asset.label}`).join("\n")
      : "None"

  lines.push("MISSING ASSETS", missing)

  return lines.join("\n").trim()
}

export function buildModulePromptContext(
  context: CampaignContextBundle,
  moduleType: ModulePromptContextType,
): string {
  const focus = MODULE_FOCUS[moduleType]
  return [
    buildCampaignContextBlock(context),
    "",
    "MODULE FOCUS",
    focus,
  ]
    .join("\n")
    .trim()
}

export function mergePromptWithCampaignContext(
  contextBlock: string,
  basePrompt: string,
): string {
  const context = contextBlock.trim()
  const base = basePrompt.trim()

  if (!context) return base
  if (!base) return context

  return `${context}\n\n${MODULE_TASK_SEPARATOR}\n\n${base}`
}

export function promptContainsCampaignContext(prompt: string): boolean {
  return prompt.includes(CAMPAIGN_CONTEXT_MARKER)
}
