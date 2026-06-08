import type {
  Prompt,
  YouTubeThumbnailFormValues,
  YouTubeThumbnailRecord,
} from "@/lib/types"
import {
  buildCompletedPrompt,
  mergePromptVariables,
} from "@/lib/prompt-variables"

export const YOUTUBE_THUMBNAIL_PROMPT_ID = "p-youtube-thumbnail"
export const YOUTUBE_THUMBNAIL_PROMPT_NAME = "YouTube Thumbnail Generator"

export const FALLBACK_YOUTUBE_THUMBNAIL_TEMPLATE = `You are an expert YouTube thumbnail strategist for music channels, AI artists, and creator brands.

Create a complete thumbnail strategy and concepts based on the following:

Track title: {{trackTitle}}
Artist: {{artistName}}
Video title: {{videoTitle}}
Content format: {{contentFormat}}
Video type: {{videoType}}
Genre: {{genre}}
Mood: {{mood}}
Target audience: {{targetAudience}}
Visual theme: {{visualTheme}}
Hook angle: {{hookAngle}}
Main subject: {{mainSubject}}
Text overlay: {{textOverlay}}
Color direction: {{colorDirection}}
Branding notes: {{brandingNotes}}
Reference style: {{referenceStyle}}
CTA goal: {{ctaGoal}}

Additional notes: {{notes}}

Generate:
1. A thumbnail strategy summary aligned to the CTA goal and content format
2. 10 distinct thumbnail concepts with brief descriptions
3. 10 text hook options for overlay text (keep under 4 words when possible)
4. Best angle recommendation (camera angle, subject placement, focal point)
5. Emotional trigger recommendation for the target audience
6. Composition guidance (rule of thirds, negative space, contrast zones)
7. Color guidance (palette, contrast, accent colors for readability)
8. Three A/B test variations to compare click performance
9. One final, detailed image generation prompt ready for Midjourney, DALL-E, or similar
10. One Shorts cover variation if content format is YouTube Shorts Cover or if a vertical crop is useful
11. Do and don't recommendations for this niche and format

Optimize for mobile readability at small sizes. Ensure text overlay suggestions remain legible on YouTube's thumbnail grid.`

export interface YouTubeThumbnailFinalFields {
  finalConcept: string
  finalTextOverlay: string
  finalComposition: string
  finalColorDirection: string
  finalImagePrompt: string
  finalAltVariation: string
  finalShortsVersion: string
}

export function emptyYouTubeThumbnailForm(): YouTubeThumbnailFormValues {
  return {
    trackTitle: "",
    artistName: "",
    videoTitle: "",
    contentFormat: "YouTube Video Thumbnail",
    videoType: "Music Visualizer",
    genre: "",
    mood: "",
    targetAudience: "",
    visualTheme: "",
    hookAngle: "",
    mainSubject: "",
    textOverlay: "",
    colorDirection: "",
    brandingNotes: "",
    referenceStyle: "",
    ctaGoal: "Increase Click-Through Rate",
    notes: "",
  }
}

export function emptyFinalThumbnailFields(): YouTubeThumbnailFinalFields {
  return {
    finalConcept: "",
    finalTextOverlay: "",
    finalComposition: "",
    finalColorDirection: "",
    finalImagePrompt: "",
    finalAltVariation: "",
    finalShortsVersion: "",
  }
}

export function normalizeYouTubeThumbnailRecord(
  record: Partial<YouTubeThumbnailRecord> &
    Pick<YouTubeThumbnailRecord, "id">,
): YouTubeThumbnailRecord {
  const form = emptyYouTubeThumbnailForm()
  const finals = emptyFinalThumbnailFields()
  return {
    id: record.id,
    trackTitle: record.trackTitle ?? form.trackTitle,
    artistName: record.artistName ?? form.artistName,
    videoTitle: record.videoTitle ?? form.videoTitle,
    contentFormat: record.contentFormat ?? form.contentFormat,
    videoType: record.videoType ?? form.videoType,
    genre: record.genre ?? form.genre,
    mood: record.mood ?? form.mood,
    targetAudience: record.targetAudience ?? form.targetAudience,
    visualTheme: record.visualTheme ?? form.visualTheme,
    hookAngle: record.hookAngle ?? form.hookAngle,
    mainSubject: record.mainSubject ?? form.mainSubject,
    textOverlay: record.textOverlay ?? form.textOverlay,
    colorDirection: record.colorDirection ?? form.colorDirection,
    brandingNotes: record.brandingNotes ?? form.brandingNotes,
    referenceStyle: record.referenceStyle ?? form.referenceStyle,
    ctaGoal: record.ctaGoal ?? form.ctaGoal,
    completedPrompt: record.completedPrompt ?? "",
    aiResponse: record.aiResponse ?? "",
    finalConcept: record.finalConcept ?? finals.finalConcept,
    finalTextOverlay: record.finalTextOverlay ?? finals.finalTextOverlay,
    finalComposition: record.finalComposition ?? finals.finalComposition,
    finalColorDirection:
      record.finalColorDirection ?? finals.finalColorDirection,
    finalImagePrompt: record.finalImagePrompt ?? finals.finalImagePrompt,
    finalAltVariation: record.finalAltVariation ?? finals.finalAltVariation,
    finalShortsVersion: record.finalShortsVersion ?? finals.finalShortsVersion,
    notes: record.notes ?? form.notes,
    createdAt: record.createdAt ?? Date.now(),
    updatedAt: record.updatedAt ?? Date.now(),
  }
}

export function getYouTubeThumbnailTemplate(prompts: Prompt[]): string {
  const saved = prompts.find(
    (p) =>
      p.id === YOUTUBE_THUMBNAIL_PROMPT_ID ||
      p.name === YOUTUBE_THUMBNAIL_PROMPT_NAME,
  )
  if (saved?.promptText) return saved.promptText
  return FALLBACK_YOUTUBE_THUMBNAIL_TEMPLATE
}

export function formValuesToRecord(
  form: YouTubeThumbnailFormValues,
): Record<string, string> {
  return { ...form }
}

export function buildYouTubeThumbnailCompletedPrompt(
  template: string,
  form: YouTubeThumbnailFormValues,
): string {
  const values = formValuesToRecord(form)
  const variables = mergePromptVariables(Object.keys(values), template)
  return buildCompletedPrompt(template, values, variables)
}

export function buildFinalThumbnailText(
  meta: Pick<
    YouTubeThumbnailRecord,
    "trackTitle" | "artistName" | "videoTitle" | "contentFormat" | "videoType"
  >,
  fields: YouTubeThumbnailFinalFields,
): string {
  const sections: { label: string; value: string }[] = [
    { label: "Track Title", value: meta.trackTitle },
    { label: "Artist", value: meta.artistName },
    { label: "Video Title", value: meta.videoTitle },
    { label: "Content Format", value: meta.contentFormat },
    { label: "Video Type", value: meta.videoType },
    { label: "Final Concept", value: fields.finalConcept },
    { label: "Text Overlay", value: fields.finalTextOverlay },
    { label: "Composition", value: fields.finalComposition },
    { label: "Color Direction", value: fields.finalColorDirection },
    { label: "Image Prompt", value: fields.finalImagePrompt },
    { label: "Alternate Variation", value: fields.finalAltVariation },
    { label: "Shorts Version", value: fields.finalShortsVersion },
  ]

  return sections
    .filter((section) => section.value.trim())
    .map((section) => `${section.label}:\n${section.value.trim()}`)
    .join("\n\n")
}

export function finalFieldsFromThumbnailRecord(
  record: Pick<YouTubeThumbnailRecord, keyof YouTubeThumbnailFinalFields>,
): YouTubeThumbnailFinalFields {
  return {
    finalConcept: record.finalConcept ?? "",
    finalTextOverlay: record.finalTextOverlay ?? "",
    finalComposition: record.finalComposition ?? "",
    finalColorDirection: record.finalColorDirection ?? "",
    finalImagePrompt: record.finalImagePrompt ?? "",
    finalAltVariation: record.finalAltVariation ?? "",
    finalShortsVersion: record.finalShortsVersion ?? "",
  }
}
