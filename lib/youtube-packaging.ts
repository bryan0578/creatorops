import type { Prompt, YouTubePackage, YouTubePackageFormValues } from "@/lib/types"
import {
  buildCompletedPrompt,
  mergePromptVariables,
} from "@/lib/prompt-variables"

export const YOUTUBE_METADATA_PROMPT_ID = "p-yt-metadata"
export const YOUTUBE_METADATA_PROMPT_NAME = "YouTube Metadata Generator"

export const FALLBACK_YOUTUBE_METADATA_TEMPLATE = `You are a YouTube metadata strategist for an AI music channel.

Track: {{trackTitle}}
Artist: {{artistName}}
Channel: {{channelName}}
Genre: {{genre}}
Mood: {{mood}}
Target listener: {{targetListener}}
Visual theme: {{visualTheme}}
Primary goal: {{primaryGoal}}
Merch tie-in: {{merchTieIn}}
Streaming link: {{streamingLink}}
Release date: {{releaseDate}}
Video type: {{videoType}}
Keywords: {{keywords}}

Additional notes: {{notes}}

Generate:
1. Three title options under 60 characters
2. A keyword-rich description (2 short paragraphs)
3. 15 relevant tags
4. One pinned comment draft
5. Three community post ideas to promote the release
6. Thumbnail text suggestions (3 options)`

export interface YouTubePackageFinalFields {
  finalTitle: string
  finalDescription: string
  finalTags: string
  finalHashtags: string
  finalPinnedComment: string
  finalThumbnailText: string
  finalShortsCaption: string
  finalCommunityPost: string
}

export function emptyYouTubePackageForm(): YouTubePackageFormValues {
  return {
    trackTitle: "",
    artistName: "",
    channelName: "",
    genre: "",
    mood: "",
    targetListener: "",
    visualTheme: "",
    primaryGoal: "Views",
    merchTieIn: "",
    streamingLink: "",
    releaseDate: "",
    videoType: "Visualizer",
    keywords: "",
    notes: "",
  }
}

export function emptyFinalPackageFields(): YouTubePackageFinalFields {
  return {
    finalTitle: "",
    finalDescription: "",
    finalTags: "",
    finalHashtags: "",
    finalPinnedComment: "",
    finalThumbnailText: "",
    finalShortsCaption: "",
    finalCommunityPost: "",
  }
}

export function normalizeYouTubePackage(
  pkg: Partial<YouTubePackage> & Pick<YouTubePackage, "id">,
): YouTubePackage {
  const form = emptyYouTubePackageForm()
  const finals = emptyFinalPackageFields()
  return {
    id: pkg.id,
    trackTitle: pkg.trackTitle ?? form.trackTitle,
    artistName: pkg.artistName ?? form.artistName,
    channelName: pkg.channelName ?? form.channelName,
    genre: pkg.genre ?? form.genre,
    mood: pkg.mood ?? form.mood,
    targetListener: pkg.targetListener ?? form.targetListener,
    visualTheme: pkg.visualTheme ?? form.visualTheme,
    primaryGoal: pkg.primaryGoal ?? form.primaryGoal,
    merchTieIn: pkg.merchTieIn ?? form.merchTieIn,
    streamingLink: pkg.streamingLink ?? form.streamingLink,
    releaseDate: pkg.releaseDate ?? form.releaseDate,
    videoType: pkg.videoType ?? form.videoType,
    keywords: pkg.keywords ?? form.keywords,
    notes: pkg.notes ?? form.notes,
    completedPrompt: pkg.completedPrompt ?? "",
    aiResponse: pkg.aiResponse ?? "",
    finalTitle: pkg.finalTitle ?? finals.finalTitle,
    finalDescription: pkg.finalDescription ?? finals.finalDescription,
    finalTags: pkg.finalTags ?? finals.finalTags,
    finalHashtags: pkg.finalHashtags ?? finals.finalHashtags,
    finalPinnedComment: pkg.finalPinnedComment ?? finals.finalPinnedComment,
    finalThumbnailText: pkg.finalThumbnailText ?? finals.finalThumbnailText,
    finalShortsCaption: pkg.finalShortsCaption ?? finals.finalShortsCaption,
    finalCommunityPost: pkg.finalCommunityPost ?? finals.finalCommunityPost,
    createdAt: pkg.createdAt ?? Date.now(),
    updatedAt: pkg.updatedAt ?? Date.now(),
  }
}

export function getYouTubeMetadataTemplate(prompts: Prompt[]): string {
  const saved = prompts.find(
    (p) =>
      p.id === YOUTUBE_METADATA_PROMPT_ID ||
      p.name === YOUTUBE_METADATA_PROMPT_NAME,
  )
  if (saved?.promptText) return saved.promptText

  return FALLBACK_YOUTUBE_METADATA_TEMPLATE
}

export function formValuesToRecord(
  form: YouTubePackageFormValues,
): Record<string, string> {
  return { ...form }
}

export function buildYouTubeCompletedPrompt(
  template: string,
  form: YouTubePackageFormValues,
): string {
  const values = formValuesToRecord(form)
  const variables = mergePromptVariables(Object.keys(values), template)
  return buildCompletedPrompt(template, values, variables)
}

export function buildFinalPackageText(
  pkg: YouTubePackageFinalFields,
): string {
  const sections: { label: string; value: string }[] = [
    { label: "Title", value: pkg.finalTitle },
    { label: "Description", value: pkg.finalDescription },
    { label: "Tags", value: pkg.finalTags },
    { label: "Hashtags", value: pkg.finalHashtags },
    { label: "Pinned Comment", value: pkg.finalPinnedComment },
    { label: "Thumbnail Text", value: pkg.finalThumbnailText },
    { label: "Shorts Caption", value: pkg.finalShortsCaption },
    { label: "Community Post", value: pkg.finalCommunityPost },
  ]

  return sections
    .filter((section) => section.value.trim())
    .map((section) => `${section.label}:\n${section.value.trim()}`)
    .join("\n\n")
}

export function finalFieldsFromPackage(
  pkg: Pick<
    YouTubePackage,
    keyof YouTubePackageFinalFields
  >,
): YouTubePackageFinalFields {
  return {
    finalTitle: pkg.finalTitle ?? "",
    finalDescription: pkg.finalDescription ?? "",
    finalTags: pkg.finalTags ?? "",
    finalHashtags: pkg.finalHashtags ?? "",
    finalPinnedComment: pkg.finalPinnedComment ?? "",
    finalThumbnailText: pkg.finalThumbnailText ?? "",
    finalShortsCaption: pkg.finalShortsCaption ?? "",
    finalCommunityPost: pkg.finalCommunityPost ?? "",
  }
}
