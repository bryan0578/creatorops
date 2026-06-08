import type {
  Prompt,
  SocialRepurposingFormValues,
  SocialRepurposingRecord,
} from "@/lib/types"
import {
  buildCompletedPrompt,
  mergePromptVariables,
} from "@/lib/prompt-variables"

export const SOCIAL_REPURPOSING_PROMPT_ID = "p-social-repurposing"
export const SOCIAL_REPURPOSING_PROMPT_NAME = "Social Repurposing Engine"

export const FALLBACK_SOCIAL_REPURPOSING_TEMPLATE = `You are a social media content strategist who repurposes one source idea into platform-specific content.

Turn the following source into tailored content for TikTok, Instagram, X, YouTube Shorts, YouTube Community, and email.

Campaign name: {{campaignName}}
Source content: {{sourceContent}}
Business area: {{businessArea}}
Content type: {{contentType}}
Goal: {{goal}}
Audience: {{audience}}
Tone: {{tone}}
Platforms: {{platforms}}
Call to action: {{callToAction}}
Product or release link: {{productOrReleaseLink}}

Additional notes: {{notes}}

Generate:
1. A core message that anchors all platform versions
2. A TikTok caption optimized for short-form video
3. An Instagram caption with line breaks and engagement hooks
4. An X post under 280 characters (or a thread opener if needed)
5. A YouTube Shorts concept or hook idea
6. A YouTube Community post draft
7. A short email snippet for a newsletter or announcement
8. Relevant hashtags grouped by platform where appropriate
9. A final CTA line tailored to the goal

Match tone and format to each platform. Keep the core message consistent across channels.`

export interface SocialRepurposingFinalFields {
  finalCoreMessage: string
  finalTikTokCaption: string
  finalInstagramCaption: string
  finalXPost: string
  finalYouTubeShortsIdea: string
  finalYouTubeCommunityPost: string
  finalEmailSnippet: string
  finalHashtags: string
  finalCTA: string
}

export function emptySocialRepurposingForm(): SocialRepurposingFormValues {
  return {
    sourceContent: "",
    businessArea: "AI Music",
    goal: "",
    audience: "",
    tone: "",
    platforms: "TikTok, Instagram, X, YouTube Shorts, YouTube Community, Email",
    callToAction: "",
    productOrReleaseLink: "",
    contentType: "Song Release",
    campaignName: "",
    notes: "",
  }
}

export function emptyFinalContentFields(): SocialRepurposingFinalFields {
  return {
    finalCoreMessage: "",
    finalTikTokCaption: "",
    finalInstagramCaption: "",
    finalXPost: "",
    finalYouTubeShortsIdea: "",
    finalYouTubeCommunityPost: "",
    finalEmailSnippet: "",
    finalHashtags: "",
    finalCTA: "",
  }
}

export function normalizeSocialRepurposingRecord(
  record: Partial<SocialRepurposingRecord> & Pick<SocialRepurposingRecord, "id">,
): SocialRepurposingRecord {
  const form = emptySocialRepurposingForm()
  const finals = emptyFinalContentFields()
  return {
    id: record.id,
    campaignName: record.campaignName ?? form.campaignName,
    sourceContent: record.sourceContent ?? form.sourceContent,
    businessArea: record.businessArea ?? form.businessArea,
    goal: record.goal ?? form.goal,
    audience: record.audience ?? form.audience,
    tone: record.tone ?? form.tone,
    platforms: record.platforms ?? form.platforms,
    callToAction: record.callToAction ?? form.callToAction,
    productOrReleaseLink:
      record.productOrReleaseLink ?? form.productOrReleaseLink,
    contentType: record.contentType ?? form.contentType,
    completedPrompt: record.completedPrompt ?? "",
    aiResponse: record.aiResponse ?? "",
    finalCoreMessage: record.finalCoreMessage ?? finals.finalCoreMessage,
    finalTikTokCaption: record.finalTikTokCaption ?? finals.finalTikTokCaption,
    finalInstagramCaption:
      record.finalInstagramCaption ?? finals.finalInstagramCaption,
    finalXPost: record.finalXPost ?? finals.finalXPost,
    finalYouTubeShortsIdea:
      record.finalYouTubeShortsIdea ?? finals.finalYouTubeShortsIdea,
    finalYouTubeCommunityPost:
      record.finalYouTubeCommunityPost ?? finals.finalYouTubeCommunityPost,
    finalEmailSnippet: record.finalEmailSnippet ?? finals.finalEmailSnippet,
    finalHashtags: record.finalHashtags ?? finals.finalHashtags,
    finalCTA: record.finalCTA ?? finals.finalCTA,
    notes: record.notes ?? form.notes,
    createdAt: record.createdAt ?? Date.now(),
    updatedAt: record.updatedAt ?? Date.now(),
  }
}

export function getSocialRepurposingTemplate(prompts: Prompt[]): string {
  const saved = prompts.find(
    (p) =>
      p.id === SOCIAL_REPURPOSING_PROMPT_ID ||
      p.name === SOCIAL_REPURPOSING_PROMPT_NAME,
  )
  if (saved?.promptText) return saved.promptText
  return FALLBACK_SOCIAL_REPURPOSING_TEMPLATE
}

export function formValuesToRecord(
  form: SocialRepurposingFormValues,
): Record<string, string> {
  return { ...form }
}

export function buildSocialRepurposingCompletedPrompt(
  template: string,
  form: SocialRepurposingFormValues,
): string {
  const values = formValuesToRecord(form)
  const variables = mergePromptVariables(Object.keys(values), template)
  return buildCompletedPrompt(template, values, variables)
}

export function buildFinalContentText(
  campaignName: string,
  content: SocialRepurposingFinalFields,
): string {
  const sections: { label: string; value: string }[] = [
    { label: "Campaign", value: campaignName },
    { label: "Core Message", value: content.finalCoreMessage },
    { label: "TikTok Caption", value: content.finalTikTokCaption },
    { label: "Instagram Caption", value: content.finalInstagramCaption },
    { label: "X Post", value: content.finalXPost },
    { label: "YouTube Shorts Idea", value: content.finalYouTubeShortsIdea },
    {
      label: "YouTube Community Post",
      value: content.finalYouTubeCommunityPost,
    },
    { label: "Email Snippet", value: content.finalEmailSnippet },
    { label: "Hashtags", value: content.finalHashtags },
    { label: "CTA", value: content.finalCTA },
  ]

  return sections
    .filter((section) => section.value.trim())
    .map((section) => `${section.label}:\n${section.value.trim()}`)
    .join("\n\n")
}

export function finalFieldsFromSocialRecord(
  record: Pick<SocialRepurposingRecord, keyof SocialRepurposingFinalFields>,
): SocialRepurposingFinalFields {
  return {
    finalCoreMessage: record.finalCoreMessage ?? "",
    finalTikTokCaption: record.finalTikTokCaption ?? "",
    finalInstagramCaption: record.finalInstagramCaption ?? "",
    finalXPost: record.finalXPost ?? "",
    finalYouTubeShortsIdea: record.finalYouTubeShortsIdea ?? "",
    finalYouTubeCommunityPost: record.finalYouTubeCommunityPost ?? "",
    finalEmailSnippet: record.finalEmailSnippet ?? "",
    finalHashtags: record.finalHashtags ?? "",
    finalCTA: record.finalCTA ?? "",
  }
}
