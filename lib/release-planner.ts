import type {
  Prompt,
  ReleasePlan,
  ReleasePlanFormValues,
} from "@/lib/types"
import {
  buildCompletedPrompt,
  mergePromptVariables,
} from "@/lib/prompt-variables"

export const RELEASE_PLANNER_PROMPT_ID = "p-release-planner"
export const RELEASE_PLANNER_PROMPT_NAME = "AI Music Release Planner"

export const FALLBACK_RELEASE_PLANNER_TEMPLATE = `You are a music release strategist for AI-generated music artists and independent labels.

Create a comprehensive release plan for the following track:

Artist: {{artistName}}
Song title: {{songTitle}}
Genre: {{genre}}
Mood: {{mood}}
Release date: {{releaseDate}}
YouTube channel: {{youtubeChannel}}
Target audience: {{targetAudience}}
Visual theme: {{visualTheme}}
Merch tie-in: {{merchTieIn}}
Streaming platforms: {{streamingPlatforms}}
Primary goal: {{primaryGoal}}

Additional notes: {{notes}}

Generate:
1. A strategy summary aligned to the primary goal
2. A target listener profile
3. A 14-day pre-release plan with daily or grouped tasks
4. A release day checklist
5. A 7-day post-release plan
6. YouTube packaging recommendations (title, description, tags, community post ideas)
7. Short-form content ideas for TikTok, Reels, and Shorts
8. Social captions for key platforms
9. An email announcement draft
10. Merch tie-in ideas if applicable
11. Priority tasks ranked by impact
12. A master final checklist

Be specific to the genre, mood, and audience. Include actionable tasks across YouTube, streaming, social, email, and merch.`

export interface ReleasePlanFinalFields {
  finalStrategySummary: string
  finalTargetListener: string
  finalPreReleasePlan: string
  finalReleaseDayChecklist: string
  finalPostReleasePlan: string
  finalYouTubePackage: string
  finalShortFormIdeas: string
  finalSocialCaptions: string
  finalEmailAnnouncement: string
  finalMerchTieIns: string
  finalPriorityTasks: string
  finalChecklist: string
}

export function emptyReleasePlanForm(): ReleasePlanFormValues {
  return {
    artistName: "",
    songTitle: "",
    genre: "",
    mood: "",
    releaseDate: "",
    youtubeChannel: "",
    targetAudience: "",
    visualTheme: "",
    merchTieIn: "",
    streamingPlatforms: "Spotify, Apple Music, YouTube Music, Amazon Music",
    primaryGoal: "Build Artist Awareness",
    notes: "",
  }
}

export function emptyFinalReleasePlanFields(): ReleasePlanFinalFields {
  return {
    finalStrategySummary: "",
    finalTargetListener: "",
    finalPreReleasePlan: "",
    finalReleaseDayChecklist: "",
    finalPostReleasePlan: "",
    finalYouTubePackage: "",
    finalShortFormIdeas: "",
    finalSocialCaptions: "",
    finalEmailAnnouncement: "",
    finalMerchTieIns: "",
    finalPriorityTasks: "",
    finalChecklist: "",
  }
}

export function normalizeReleasePlan(
  plan: Partial<ReleasePlan> & Pick<ReleasePlan, "id">,
): ReleasePlan {
  const form = emptyReleasePlanForm()
  const finals = emptyFinalReleasePlanFields()
  return {
    id: plan.id,
    artistName: plan.artistName ?? form.artistName,
    songTitle: plan.songTitle ?? form.songTitle,
    genre: plan.genre ?? form.genre,
    mood: plan.mood ?? form.mood,
    releaseDate: plan.releaseDate ?? form.releaseDate,
    youtubeChannel: plan.youtubeChannel ?? form.youtubeChannel,
    targetAudience: plan.targetAudience ?? form.targetAudience,
    visualTheme: plan.visualTheme ?? form.visualTheme,
    merchTieIn: plan.merchTieIn ?? form.merchTieIn,
    streamingPlatforms: plan.streamingPlatforms ?? form.streamingPlatforms,
    primaryGoal: plan.primaryGoal ?? form.primaryGoal,
    completedPrompt: plan.completedPrompt ?? "",
    aiResponse: plan.aiResponse ?? "",
    finalStrategySummary:
      plan.finalStrategySummary ?? finals.finalStrategySummary,
    finalTargetListener:
      plan.finalTargetListener ?? finals.finalTargetListener,
    finalPreReleasePlan:
      plan.finalPreReleasePlan ?? finals.finalPreReleasePlan,
    finalReleaseDayChecklist:
      plan.finalReleaseDayChecklist ?? finals.finalReleaseDayChecklist,
    finalPostReleasePlan:
      plan.finalPostReleasePlan ?? finals.finalPostReleasePlan,
    finalYouTubePackage:
      plan.finalYouTubePackage ?? finals.finalYouTubePackage,
    finalShortFormIdeas:
      plan.finalShortFormIdeas ?? finals.finalShortFormIdeas,
    finalSocialCaptions:
      plan.finalSocialCaptions ?? finals.finalSocialCaptions,
    finalEmailAnnouncement:
      plan.finalEmailAnnouncement ?? finals.finalEmailAnnouncement,
    finalMerchTieIns: plan.finalMerchTieIns ?? finals.finalMerchTieIns,
    finalPriorityTasks: plan.finalPriorityTasks ?? finals.finalPriorityTasks,
    finalChecklist: plan.finalChecklist ?? finals.finalChecklist,
    notes: plan.notes ?? form.notes,
    createdAt: plan.createdAt ?? Date.now(),
    updatedAt: plan.updatedAt ?? Date.now(),
  }
}

export function getReleasePlannerTemplate(prompts: Prompt[]): string {
  const saved = prompts.find(
    (p) =>
      p.id === RELEASE_PLANNER_PROMPT_ID ||
      p.name === RELEASE_PLANNER_PROMPT_NAME,
  )
  if (saved?.promptText) return saved.promptText
  return FALLBACK_RELEASE_PLANNER_TEMPLATE
}

export function formValuesToRecord(
  form: ReleasePlanFormValues,
): Record<string, string> {
  return { ...form }
}

export function buildReleasePlannerCompletedPrompt(
  template: string,
  form: ReleasePlanFormValues,
): string {
  const values = formValuesToRecord(form)
  const variables = mergePromptVariables(Object.keys(values), template)
  return buildCompletedPrompt(template, values, variables)
}

export function buildFinalReleasePlanText(
  meta: Pick<ReleasePlan, "artistName" | "songTitle" | "releaseDate">,
  plan: ReleasePlanFinalFields,
): string {
  const sections: { label: string; value: string }[] = [
    { label: "Artist", value: meta.artistName },
    { label: "Song", value: meta.songTitle },
    { label: "Release Date", value: meta.releaseDate },
    { label: "Strategy Summary", value: plan.finalStrategySummary },
    { label: "Target Listener", value: plan.finalTargetListener },
    { label: "14-Day Pre-Release Plan", value: plan.finalPreReleasePlan },
    { label: "Release Day Checklist", value: plan.finalReleaseDayChecklist },
    { label: "7-Day Post-Release Plan", value: plan.finalPostReleasePlan },
    { label: "YouTube Package", value: plan.finalYouTubePackage },
    { label: "Short-Form Content Ideas", value: plan.finalShortFormIdeas },
    { label: "Social Captions", value: plan.finalSocialCaptions },
    { label: "Email Announcement", value: plan.finalEmailAnnouncement },
    { label: "Merch Tie-Ins", value: plan.finalMerchTieIns },
    { label: "Priority Tasks", value: plan.finalPriorityTasks },
    { label: "Final Checklist", value: plan.finalChecklist },
  ]

  return sections
    .filter((section) => section.value.trim())
    .map((section) => `${section.label}:\n${section.value.trim()}`)
    .join("\n\n")
}

export function finalFieldsFromReleasePlan(
  plan: Pick<ReleasePlan, keyof ReleasePlanFinalFields>,
): ReleasePlanFinalFields {
  return {
    finalStrategySummary: plan.finalStrategySummary ?? "",
    finalTargetListener: plan.finalTargetListener ?? "",
    finalPreReleasePlan: plan.finalPreReleasePlan ?? "",
    finalReleaseDayChecklist: plan.finalReleaseDayChecklist ?? "",
    finalPostReleasePlan: plan.finalPostReleasePlan ?? "",
    finalYouTubePackage: plan.finalYouTubePackage ?? "",
    finalShortFormIdeas: plan.finalShortFormIdeas ?? "",
    finalSocialCaptions: plan.finalSocialCaptions ?? "",
    finalEmailAnnouncement: plan.finalEmailAnnouncement ?? "",
    finalMerchTieIns: plan.finalMerchTieIns ?? "",
    finalPriorityTasks: plan.finalPriorityTasks ?? "",
    finalChecklist: plan.finalChecklist ?? "",
  }
}
