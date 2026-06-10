import { getCampaignContext } from "@/lib/actions/campaign-context"
import { getLearnings } from "@/lib/actions/learnings"
import { getQualityReviews } from "@/lib/actions/quality-reviews"
import { getWorkspaceSettings } from "@/lib/actions/workspace-settings"
import { buildCampaignContextBlock } from "@/lib/prompt-context-builder"
import type { ModulePromptContextType } from "@/lib/prompt-context-builder"
import { MODULE_TASK_SEPARATOR } from "@/lib/prompt-context-builder"
import { filterLearningsForCampaign, filterReusableLearnings } from "@/lib/learnings"
import { filterQualityReviewsForCampaign } from "@/lib/quality-reviews"
import type { GenerateAITextInput } from "@/lib/ai/types"
import type { WorkspaceSettingsRecord } from "@/lib/types"

const CREATOROPS_SYSTEM_BASE = `You are CreatorOps AI assistant for creator campaign production.
Produce practical, on-brand copy for music, YouTube, social, email, and merch workflows.
Follow the task instructions precisely. Use structured markdown when helpful.`

const MODULE_CONTEXT_TYPE: Record<string, ModulePromptContextType | undefined> = {
  "YouTube Packaging": "youtube-packaging",
  "YouTube Thumbnail": "youtube-thumbnails",
  "Release Plan": "release-planner",
  "Social Repurposing": "social-repurposing",
  "Email Campaign": "email-campaigns",
  "Merch Idea": "merch-ideas",
  "Product Listing": "product-listings",
  "Mockup Prompt": "mockup-prompts",
  Analytics: "analytics",
  Other: "youtube-packaging",
}

const MODULE_OUTPUT_HINTS: Record<string, string> = {
  "YouTube Packaging":
    "Return title, description, tags, hashtags, pinned comment, community post, and Shorts caption in clear markdown sections.",
  "YouTube Thumbnail":
    "Return thumbnail concept, text overlay options, composition notes, and image prompt in markdown sections.",
  "Release Plan":
    "Return pre-release, release-day, and post-release plans with tasks and timeline in markdown.",
  "Social Repurposing":
    "Return platform-specific captions, hooks, hashtags, and CTA in markdown sections.",
  "Email Campaign":
    "Return subject line, preview text, body, CTA, follow-up, and resend copy in markdown sections.",
  "Merch Idea":
    "Return product concepts, slogans, design directions, and social captions in markdown.",
  "Product Listing":
    "Return title, short description, long description, bullet points, tags, and CTA in markdown.",
  "Mockup Prompt":
    "Return scene description, layout, lighting, text placement, and negative prompt in markdown.",
  Analytics:
    "Return metrics to track, success criteria, and review notes in markdown.",
}

function formatLearningsBlock(
  learnings: ReturnType<typeof filterReusableLearnings>,
): string {
  if (learnings.length === 0) return ""
  const lines = ["LEARNINGS TO APPLY", ""]
  for (const learning of learnings) {
    lines.push(
      `- ${learning.title} (${learning.learningType}, ${learning.confidence} confidence, ${learning.impact} impact)`,
      `  Insight: ${learning.insight.trim()}`,
    )
    if (learning.recommendation?.trim()) {
      lines.push(`  Recommendation: ${learning.recommendation.trim()}`)
    }
    if (learning.repeatWhen?.trim()) {
      lines.push(`  Repeat when: ${learning.repeatWhen.trim()}`)
    }
    if (learning.avoidWhen?.trim()) {
      lines.push(`  Avoid when: ${learning.avoidWhen.trim()}`)
    }
    lines.push("")
  }
  return lines.join("\n").trim()
}

function formatQualityNotesBlock(
  reviews: Awaited<ReturnType<typeof getQualityReviews>>,
  campaignId?: string,
  campaignName?: string,
): string {
  const scoped = filterQualityReviewsForCampaign(reviews, campaignId ?? "", campaignName)
  if (scoped.length === 0) return ""
  const lines = ["QUALITY REVIEW NOTES", ""]
  for (const review of scoped.slice(0, 5)) {
    lines.push(
      `### ${review.reviewName || review.reviewType} (${review.overallScore}/100)`,
      review.strengths?.trim() ? `Strengths: ${review.strengths.trim()}` : "",
      review.weaknesses?.trim() ? `Weaknesses: ${review.weaknesses.trim()}` : "",
      review.recommendedActions?.trim()
        ? `Recommended actions: ${review.recommendedActions.trim()}`
        : "",
      "",
    )
  }
  return lines.filter(Boolean).join("\n").trim()
}

function buildSystemPrompt(
  settings: WorkspaceSettingsRecord,
  override?: string,
): string {
  const style = settings.aiSystemStylePreference?.trim()
  const parts = [override?.trim() || CREATOROPS_SYSTEM_BASE]
  if (style) {
    parts.push("", "STYLE PREFERENCE", style)
  }
  if (settings.defaultBrandTone?.trim()) {
    parts.push("", "Brand tone:", settings.defaultBrandTone.trim())
  }
  return parts.join("\n").trim()
}

export interface AssembledAIPrompt {
  systemPrompt: string
  userPrompt: string
  contextBlocks: string[]
}

export async function assembleAIPrompt(
  input: GenerateAITextInput,
): Promise<AssembledAIPrompt> {
  const settings = await getWorkspaceSettings()
  const includeCampaign =
    input.includeCampaignContext ?? settings.aiIncludeCampaignContextByDefault
  const includeLearnings =
    input.includeLearnings ?? settings.aiIncludeLearningsByDefault
  const includeQuality =
    input.includeQualityNotes ?? settings.aiIncludeQualityNotesByDefault

  const contextBlocks: string[] = [...(input.contextBlocks ?? [])]
  let campaignName: string | undefined

  if (includeCampaign && input.campaignId?.trim()) {
    try {
      const bundle = await getCampaignContext(input.campaignId.trim())
      campaignName = bundle.campaign.campaignName
      contextBlocks.push(buildCampaignContextBlock(bundle))
    } catch {
      contextBlocks.push("CAMPAIGN CONTEXT", "Campaign not found or could not be loaded.")
    }
  }

  if (includeLearnings) {
    const allLearnings = await getLearnings()
    const scoped = input.campaignId
      ? filterLearningsForCampaign(allLearnings, input.campaignId, campaignName)
      : allLearnings
    const top = filterReusableLearnings(scoped, {
      campaignId: input.campaignId,
      campaignName,
      limit: 5,
    }).filter(
      (l) =>
        (l.confidence === "High" || l.impact === "High") &&
        l.status !== "Archived",
    )
    const block = formatLearningsBlock(top)
    if (block) contextBlocks.push(block)
  }

  if (includeQuality) {
    const reviews = await getQualityReviews()
    const block = formatQualityNotesBlock(reviews, input.campaignId, campaignName)
    if (block) contextBlocks.push(block)
  }

  const moduleFocus = MODULE_CONTEXT_TYPE[input.moduleType]
  const outputHint = MODULE_OUTPUT_HINTS[input.moduleType] ?? "Return clear structured markdown."

  const userParts: string[] = []
  if (contextBlocks.length > 0) {
    userParts.push("CONTEXT", contextBlocks.join("\n\n"), "")
  }
  userParts.push(
    "TASK",
    input.promptText.trim() || "Complete the module task based on the context above.",
    "",
    "OUTPUT FORMAT",
    outputHint,
  )
  if (moduleFocus) {
    userParts.push("", "MODULE FOCUS", MODULE_FOCUS_SNIPPET[moduleFocus] ?? "")
  }

  const systemPrompt = buildSystemPrompt(settings, input.systemPrompt)
  const userPrompt = userParts.join("\n").trim()

  return {
    systemPrompt,
    userPrompt: userPrompt.includes(MODULE_TASK_SEPARATOR)
      ? userPrompt
      : `${userPrompt}`,
    contextBlocks,
  }
}

const MODULE_FOCUS_SNIPPET: Partial<Record<ModulePromptContextType, string>> = {
  "youtube-packaging":
    "Focus on YouTube metadata: title, description, tags, pinned comment, community post, Shorts caption.",
  "youtube-thumbnails":
    "Focus on click psychology, composition, text overlay, color direction, and image prompt.",
  "release-planner": "Focus on release timeline, tasks, and promo milestones.",
  "social-repurposing": "Focus on platform captions, hooks, hashtags, and CTA.",
  "email-campaigns": "Focus on subject, preview, body, CTA, and follow-up.",
  "merch-ideas": "Focus on merch concepts, slogans, and design directions.",
  "product-listings": "Focus on listing title, descriptions, bullets, and tags.",
  "mockup-prompts": "Focus on mockup scene, lighting, layout, and negative prompt.",
  analytics: "Focus on metrics, success criteria, and review notes.",
}

export function mergePromptForPreview(assembled: AssembledAIPrompt): string {
  return [
    "SYSTEM",
    assembled.systemPrompt,
    "",
    "USER",
    assembled.userPrompt,
  ].join("\n")
}
