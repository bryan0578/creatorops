import type { AIOutputModuleType, ModuleFieldDefinition } from "@/lib/ai-output/types"

export const MODULE_FIELD_DEFINITIONS: Record<
  AIOutputModuleType,
  ModuleFieldDefinition[]
> = {
  "YouTube Packaging": [
    { key: "finalTitle", label: "Final Title", aliases: ["Title", "YouTube Title", "Video Title", "Chosen Title", "Youtube Title"] },
    { key: "finalDescription", label: "Final Description", aliases: ["Description", "YouTube Description", "Video Description", "Youtube Description"] },
    { key: "finalTags", label: "Final Tags", aliases: ["Tags", "YouTube Tags", "Video Tags", "SEO Tags", "Seo Tags"] },
    { key: "finalHashtags", label: "Final Hashtags", aliases: ["Hashtags", "Hash Tags"] },
    { key: "finalPinnedComment", label: "Final Pinned Comment", aliases: ["Pinned Comment", "Pin Comment", "Final Pinned Comment"] },
    { key: "finalThumbnailText", label: "Final Thumbnail Text", aliases: ["Thumbnail Text", "Thumbnail Overlay", "Text Overlay"] },
    { key: "finalShortsCaption", label: "Final Shorts Caption", aliases: ["Shorts Caption", "YouTube Shorts Caption", "Short Caption"] },
    { key: "finalCommunityPost", label: "Final Community Post", aliases: ["Community Post", "YouTube Community Post"] },
  ],
  "YouTube Thumbnail": [
    { key: "finalConcept", label: "Final Concept", aliases: ["Concept", "Thumbnail Concept", "Strategy Summary"] },
    { key: "finalTextOverlay", label: "Final Text Overlay", aliases: ["Text Overlay", "Overlay Text", "Hook Text"] },
    { key: "finalComposition", label: "Final Composition", aliases: ["Composition", "Layout", "Composition Guidance"] },
    { key: "finalColorDirection", label: "Final Color Direction", aliases: ["Color Direction", "Color Guidance", "Palette"] },
    { key: "finalImagePrompt", label: "Final Image Prompt", aliases: ["Image Prompt", "Image Generation Prompt", "Midjourney Prompt", "DALL-E Prompt"] },
    { key: "finalAltVariation", label: "Final Alt Variation", aliases: ["Alt Variation", "A/B Variation", "Variation B"] },
    { key: "finalShortsVersion", label: "Final Shorts Version", aliases: ["Shorts Version", "Shorts Cover", "Vertical Version"] },
  ],
  "Release Plan": [
    { key: "finalStrategySummary", label: "Strategy Summary", aliases: ["Strategy", "Release Strategy"] },
    { key: "finalTargetListener", label: "Target Listener", aliases: ["Target Audience", "Listener Profile", "Audience Profile"] },
    { key: "finalPreReleasePlan", label: "Pre-Release Plan", aliases: ["Pre Release Plan", "14-Day Pre-Release Plan"] },
    { key: "finalReleaseDayChecklist", label: "Release Day Checklist", aliases: ["Release Day", "Launch Day Checklist"] },
    { key: "finalPostReleasePlan", label: "Post-Release Plan", aliases: ["Post Release Plan", "7-Day Post-Release Plan"] },
    { key: "finalYouTubePackage", label: "YouTube Package", aliases: ["YouTube Metadata", "YouTube Packaging Recommendations"] },
    { key: "finalShortFormIdeas", label: "Short-Form Ideas", aliases: ["Short Form Ideas", "Shorts Ideas", "TikTok Ideas"] },
    { key: "finalSocialCaptions", label: "Social Captions", aliases: ["Social Caption", "Platform Captions"] },
    { key: "finalEmailAnnouncement", label: "Email Announcement", aliases: ["Email Draft", "Announcement Email"] },
    { key: "finalMerchTieIns", label: "Merch Tie-Ins", aliases: ["Merch Tie In", "Merch Ideas"] },
    { key: "finalPriorityTasks", label: "Priority Tasks", aliases: ["Priority Task List", "Top Tasks"] },
    { key: "finalChecklist", label: "Final Checklist", aliases: ["Master Checklist", "Release Checklist"] },
  ],
  "Social Repurposing": [
    { key: "finalCoreMessage", label: "Core Message", aliases: ["Core Message Anchor", "Anchor Message"] },
    { key: "finalTikTokCaption", label: "TikTok Caption", aliases: ["TikTok", "TikTok Post"] },
    { key: "finalInstagramCaption", label: "Instagram Caption", aliases: ["Instagram", "IG Caption"] },
    { key: "finalXPost", label: "X Post", aliases: ["Twitter Post", "Tweet", "X/Twitter"] },
    { key: "finalYouTubeShortsIdea", label: "YouTube Shorts Idea", aliases: ["Shorts Idea", "YouTube Shorts Concept"] },
    { key: "finalYouTubeCommunityPost", label: "YouTube Community Post", aliases: ["Community Post"] },
    { key: "finalEmailSnippet", label: "Email Snippet", aliases: ["Email", "Newsletter Snippet"] },
    { key: "finalHashtags", label: "Hashtags", aliases: ["Hash Tags", "Tags"] },
    { key: "finalCTA", label: "CTA", aliases: ["Call to Action", "Final CTA"] },
  ],
  "Email Campaign": [
    { key: "finalSubjectLine", label: "Subject Line", aliases: ["Subject", "Email Subject", "Chosen Subject"] },
    { key: "finalPreviewText", label: "Preview Text", aliases: ["Preheader", "Preview Line"] },
    { key: "finalEmailBody", label: "Email Body", aliases: ["Body", "Email Copy", "Main Email"] },
    { key: "finalCTA", label: "CTA", aliases: ["Call to Action", "Button Text"] },
    { key: "finalFollowUpEmail", label: "Follow-Up Email", aliases: ["Follow Up Email", "Follow-up"] },
    { key: "finalResendSubject", label: "Resend Subject", aliases: ["Resend Subject Line", "Non-Opener Subject"] },
    { key: "finalResendBody", label: "Resend Body", aliases: ["Resend Email Body", "Resend Copy"] },
  ],
  "Merch Idea": [
    { key: "selectedConceptName", label: "Concept Name", aliases: ["Selected Concept", "Concept", "Product Concept Name"] },
    { key: "selectedSlogan", label: "Slogan", aliases: ["Tagline", "Catchphrase"] },
    { key: "selectedDesignDirection", label: "Design Direction", aliases: ["Design Notes", "Visual Direction"] },
    { key: "selectedProductTitle", label: "Product Title", aliases: ["Title", "Listing Title"] },
    { key: "selectedProductDescription", label: "Product Description", aliases: ["Description", "Listing Description"] },
    { key: "selectedTags", label: "Tags", aliases: ["Product Tags", "Search Tags"] },
    { key: "selectedMockupIdea", label: "Mockup Idea", aliases: ["Mockup", "Product Mockup"] },
    { key: "selectedSocialCaption", label: "Social Caption", aliases: ["Caption", "Promo Caption"] },
  ],
  "Product Listing": [
    { key: "finalTitle", label: "Final Title", aliases: ["Title", "Product Title", "Listing Title"] },
    { key: "finalShortDescription", label: "Short Description", aliases: ["Short Desc", "Preview Description"] },
    { key: "finalLongDescription", label: "Long Description", aliases: ["Long Desc", "Full Description", "Description"] },
    { key: "finalBulletPoints", label: "Bullet Points", aliases: ["Bullets", "Features", "Key Features"] },
    { key: "finalTags", label: "Tags", aliases: ["Product Tags", "Search Tags"] },
    { key: "finalCollection", label: "Collection", aliases: ["Category", "Collection Name"] },
    { key: "finalCTA", label: "CTA", aliases: ["Call to Action"] },
    { key: "finalSocialCaption", label: "Social Caption", aliases: ["Caption", "Promo Caption"] },
    { key: "finalEmailSubject", label: "Email Subject", aliases: ["Launch Email Subject", "Subject Line"] },
  ],
  "Mockup Prompt": [
    { key: "finalImagePrompt", label: "Image Prompt", aliases: ["Final Image Prompt", "Generation Prompt", "Midjourney Prompt"] },
    { key: "finalNegativePrompt", label: "Negative Prompt", aliases: ["Negative", "Avoid List"] },
    { key: "finalLayoutNotes", label: "Layout Notes", aliases: ["Layout", "Composition Notes"] },
    { key: "finalTextPlacement", label: "Text Placement", aliases: ["Text Placement Notes", "Typography Placement"] },
    { key: "finalUsageNotes", label: "Usage Notes", aliases: ["Usage Recommendations", "Mockup Usage"] },
  ],
}

export function getModuleFieldDefinitions(
  moduleType: AIOutputModuleType,
): ModuleFieldDefinition[] {
  return MODULE_FIELD_DEFINITIONS[moduleType] ?? []
}

export function getModuleFieldKeys(moduleType: AIOutputModuleType): string[] {
  return getModuleFieldDefinitions(moduleType).map((field) => field.key)
}
