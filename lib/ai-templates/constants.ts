import type { PromptRunModuleType } from "@/lib/types"

export const AI_GENERATION_TEMPLATE_CATEGORY = "AI Generation Template" as const

export const AI_TEMPLATE_TAG = "ai-generation-template"

/** Tag prefix: module:youtube-packaging */
export function moduleTag(slug: string): string {
  return `module:${slug}`
}

/** Tag prefix: mode:seo */
export function modeTag(mode: string): string {
  return `mode:${mode}`
}

export const AI_TEMPLATE_MODULE_SLUGS = [
  "youtube-packaging",
  "youtube-thumbnails",
  "release-planner",
  "social-repurposing",
  "email-campaigns",
  "merch-ideas",
  "product-listings",
  "mockup-prompts",
  "quality",
  "learnings",
] as const

export type AITemplateModuleSlug = (typeof AI_TEMPLATE_MODULE_SLUGS)[number]

export const MODULE_TYPE_TO_TEMPLATE_SLUG: Partial<
  Record<PromptRunModuleType, AITemplateModuleSlug>
> = {
  "YouTube Packaging": "youtube-packaging",
  "YouTube Thumbnail": "youtube-thumbnails",
  "Release Plan": "release-planner",
  "Social Repurposing": "social-repurposing",
  "Email Campaign": "email-campaigns",
  "Merch Idea": "merch-ideas",
  "Product Listing": "product-listings",
  "Mockup Prompt": "mockup-prompts",
  Other: "quality",
}

export const DEFAULT_TEMPLATE_NAME_BY_SLUG: Partial<
  Record<AITemplateModuleSlug, string>
> = {
  "youtube-packaging": "SEO Metadata Package",
  "youtube-thumbnails": "High CTR Thumbnail Concept",
  "release-planner": "Standard Music Release Plan",
  "social-repurposing": "TikTok/Shorts Hook Pack",
  "email-campaigns": "Release Announcement Email",
  "merch-ideas": "Artist Merch Concept Pack",
  "product-listings": "SEO Product Listing",
  "mockup-prompts": "Clean Ecommerce Mockup",
}

export const TEMPLATE_SLUG_TO_MODULE_TYPE: Partial<
  Record<AITemplateModuleSlug, PromptRunModuleType>
> = {
  "youtube-packaging": "YouTube Packaging",
  "youtube-thumbnails": "YouTube Thumbnail",
  "release-planner": "Release Plan",
  "social-repurposing": "Social Repurposing",
  "email-campaigns": "Email Campaign",
  "merch-ideas": "Merch Idea",
  "product-listings": "Product Listing",
  "mockup-prompts": "Mockup Prompt",
}
