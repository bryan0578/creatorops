import { buildParserFriendlyOutputHint } from "@/lib/ai-output/output-format-hints"
import type { AIOutputModuleType } from "@/lib/ai-output/types"
import type { Prompt } from "@/lib/types"
import {
  AI_GENERATION_TEMPLATE_CATEGORY,
  AI_TEMPLATE_TAG,
  moduleTag,
  modeTag,
  TEMPLATE_SLUG_TO_MODULE_TYPE,
  type AITemplateModuleSlug,
} from "@/lib/ai-templates/constants"

export interface StarterAITemplateDef {
  id: string
  name: string
  moduleSlug: AITemplateModuleSlug
  mode: string
  description: string
  promptText: string
  variables?: string[]
  outputFormatOverride?: string
}

const QUALITY_OUTPUT_FORMAT = [
  "Return the response using these exact labels:",
  "",
  "Recommendation Notes:",
  "Revision Suggestions:",
  "Campaign Readiness Feedback:",
  "",
  "Do not wrap the response in code fences.",
].join("\n")

const LEARNINGS_OUTPUT_FORMAT = [
  "Return the response using these exact labels:",
  "",
  "Learning Title:",
  "Insight:",
  "Recommendation:",
  "Apply To Campaign:",
  "Repeat When:",
  "Avoid When:",
  "",
  "Do not wrap the response in code fences.",
].join("\n")

function outputForModuleSlug(slug: AITemplateModuleSlug): string {
  if (slug === "quality") return QUALITY_OUTPUT_FORMAT
  if (slug === "learnings") return LEARNINGS_OUTPUT_FORMAT
  const moduleType = TEMPLATE_SLUG_TO_MODULE_TYPE[slug]
  if (!moduleType) return ""
  return buildParserFriendlyOutputHint(moduleType as AIOutputModuleType)
}

function tpl(
  id: string,
  name: string,
  moduleSlug: AITemplateModuleSlug,
  mode: string,
  description: string,
  promptText: string,
  outputFormatOverride?: string,
): StarterAITemplateDef {
  return {
    id,
    name,
    moduleSlug,
    mode,
    description,
    promptText,
    outputFormatOverride,
  }
}

export const STARTER_AI_TEMPLATES: StarterAITemplateDef[] = [
  // YouTube Packaging
  tpl(
    "ai-tpl-yt-pack-seo",
    "SEO Metadata Package",
    "youtube-packaging",
    "seo",
    "Search-optimized YouTube metadata focused on discoverability and keyword coverage.",
    "Generate SEO-focused YouTube packaging. Prioritize searchable title phrasing, keyword-rich description (first 150 characters matter most), relevant tags, and hashtags that match search intent. Keep tone on-brand but discovery-first.",
  ),
  tpl(
    "ai-tpl-yt-pack-cinematic",
    "Cinematic Release Package",
    "youtube-packaging",
    "cinematic",
    "Premium music video launch copy with cinematic tone and emotional hooks.",
    "Generate YouTube packaging for a cinematic music video launch. Emphasize visual storytelling, emotional hooks, premium tone, and release-day urgency. Title and description should feel like a film premiere, not a generic upload.",
  ),
  tpl(
    "ai-tpl-yt-pack-dark-pop",
    "Dark Pop / Villain Playlist Package",
    "youtube-packaging",
    "dark-pop",
    "Moody dark-pop packaging aligned with villain playlist and alt aesthetic.",
    "Generate YouTube packaging for a dark pop / villain playlist aesthetic. Lean into moody, confident, slightly edgy tone. Use imagery cues, playlist-friendly keywords, and community copy that invites fans into a curated dark-pop world.",
  ),
  tpl(
    "ai-tpl-yt-pack-shorts",
    "Shorts-First Release Package",
    "youtube-packaging",
    "shorts-first",
    "Shorts-first release strategy with vertical-native captions and hooks.",
    "Generate YouTube packaging optimized for a Shorts-first release. Lead with scroll-stopping Shorts caption hooks, vertical-friendly pinned comment ideas, and metadata that supports both Shorts discovery and long-form watch intent.",
  ),

  // YouTube Thumbnails
  tpl(
    "ai-tpl-yt-thumb-ctr",
    "High CTR Thumbnail Concept",
    "youtube-thumbnails",
    "high-ctr",
    "Click-optimized thumbnail concept with strong contrast and curiosity gap.",
    "Generate a high-CTR YouTube thumbnail concept. Focus on curiosity gap, facial expression or focal subject, bold contrast, readable text overlay at small size, and composition that wins against competing thumbnails in the feed.",
  ),
  tpl(
    "ai-tpl-yt-thumb-minimal",
    "Minimal Text Thumbnail",
    "youtube-thumbnails",
    "minimal-text",
    "Clean thumbnail with minimal text and strong visual hierarchy.",
    "Generate a minimal-text thumbnail concept. Limit overlay to 1–3 words max. Prioritize a single strong visual subject, negative space, and color blocking. Provide image prompt tuned for simplicity and clarity at mobile size.",
  ),
  tpl(
    "ai-tpl-yt-thumb-horror-anime",
    "Horror Anime Thumbnail",
    "youtube-thumbnails",
    "horror-anime",
    "Horror anime aesthetic with dramatic lighting and stylized composition.",
    "Generate a horror anime–inspired thumbnail concept. Use dramatic lighting, stylized character framing, horror-pop color accents, and text overlay that feels like anime key art. Include image prompt with anime/horror visual references.",
  ),
  tpl(
    "ai-tpl-yt-thumb-ab",
    "A/B Test Thumbnail Variants",
    "youtube-thumbnails",
    "ab-test",
    "Two distinct thumbnail variants for A/B testing CTR.",
    "Generate two distinct thumbnail variants for A/B testing. Variant A: emotion-led face/subject focus. Variant B: text-led curiosity hook. Include concept, text overlay, composition, color direction, and image prompt for each variant.",
  ),

  // Release Planner
  tpl(
    "ai-tpl-release-standard",
    "Standard Music Release Plan",
    "release-planner",
    "standard",
    "Balanced pre-release, launch-day, and post-release plan for a single release.",
    "Generate a standard music release plan covering pre-release teasers, release-day execution, and 7-day post-release follow-through. Include priority tasks, YouTube packaging notes, short-form ideas, and email announcement draft.",
  ),
  tpl(
    "ai-tpl-release-30day",
    "30-Day Release Campaign",
    "release-planner",
    "30-day",
    "Full 30-day rollout with weekly milestones and channel mix.",
    "Generate a 30-day release campaign plan with weekly milestones. Balance YouTube, social, email, and merch touchpoints. Include checklist items, content cadence, and escalation moments (teaser, pre-save, launch, post-launch push).",
  ),
  tpl(
    "ai-tpl-release-youtube-first",
    "YouTube-First Release Plan",
    "release-planner",
    "youtube-first",
    "YouTube-centric release with premiere, community, and Shorts ladder.",
    "Generate a YouTube-first release plan. Prioritize premiere strategy, community posts, Shorts ladder, pinned comment rollout, and metadata timing. De-emphasize channels that don't support YouTube discovery.",
  ),
  tpl(
    "ai-tpl-release-merch",
    "Merch-Supported Release Plan",
    "release-planner",
    "merch-supported",
    "Release plan with merch drops timed to song launch moments.",
    "Generate a release plan that ties merch drops to launch moments. Include merch tie-in ideas, social captions for product reveals, email mentions, and timeline alignment between stream push and store conversion.",
  ),

  // Social Repurposing
  tpl(
    "ai-tpl-social-tiktok",
    "TikTok/Shorts Hook Pack",
    "social-repurposing",
    "tiktok-shorts",
    "Vertical-native hooks and captions for TikTok and YouTube Shorts.",
    "Generate a TikTok/Shorts hook pack from the source content. Lead with 3 scroll-stopping opening lines, vertical-native captions, and CTA to full release. Keep copy punchy and platform-native.",
  ),
  tpl(
    "ai-tpl-social-instagram",
    "Instagram Caption Pack",
    "social-repurposing",
    "instagram",
    "Instagram feed and carousel captions with hashtag sets.",
    "Generate Instagram caption options: one short feed caption, one longer storytelling caption, and carousel slide copy suggestions. Include hashtag set and CTA aligned to release or merch.",
  ),
  tpl(
    "ai-tpl-social-youtube-community",
    "YouTube Community Pack",
    "social-repurposing",
    "youtube-community",
    "YouTube Community posts for release hype and fan engagement.",
    "Generate YouTube Community post options: teaser, release-day announcement, and post-release engagement post. Match YouTube community tone—conversational, fan-facing, and link-friendly.",
  ),
  tpl(
    "ai-tpl-social-dark-pop",
    "Dark Pop Fan Engagement Pack",
    "social-repurposing",
    "dark-pop-engagement",
    "Fan engagement copy for dark pop / alt aesthetic audiences.",
    "Generate dark pop fan engagement copy across platforms. Use moody, insider-fan tone. Include community prompts, lyric tease captions, and CTAs that feel like joining a villain playlist cult—not generic promo.",
  ),

  // Email Campaigns
  tpl(
    "ai-tpl-email-release",
    "Release Announcement Email",
    "email-campaigns",
    "release-announcement",
    "Primary release announcement with subject, preview, body, and CTA.",
    "Generate a release announcement email. Strong subject line options, preview text, body that tells the release story in 3 short paragraphs, clear CTA to stream/watch, plus follow-up and resend variants for non-openers.",
  ),
  tpl(
    "ai-tpl-email-merch",
    "Merch Tie-In Email",
    "email-campaigns",
    "merch-tie-in",
    "Email connecting new release to merch drop or collection.",
    "Generate a merch tie-in email that connects the release to a product or collection. Balance music emotion with product benefits. Include subject, preview, body, CTA to shop, and a lighter follow-up.",
  ),
  tpl(
    "ai-tpl-email-story",
    "Story-Driven Email",
    "email-campaigns",
    "story-driven",
    "Narrative email that leads with artist story before the ask.",
    "Generate a story-driven email. Open with a personal or narrative hook about the song/artist, build emotional connection, then transition to stream/shop CTA. Avoid sounding like a press release.",
  ),
  tpl(
    "ai-tpl-email-followup",
    "Follow-Up Email Sequence",
    "email-campaigns",
    "follow-up",
    "Follow-up and last-call reminder sequence for non-engagers.",
    "Generate a follow-up email sequence: first reminder (new angle), last-call reminder (urgency), resend subject/body for non-openers. Keep each email shorter than the announcement.",
  ),

  // Merch Ideas
  tpl(
    "ai-tpl-merch-artist",
    "Artist Merch Concept Pack",
    "merch-ideas",
    "artist-concept",
    "Core artist-branded merch concepts with slogans and design direction.",
    "Generate artist merch concept ideas: 3 product concepts with names, slogans, design direction, mockup ideas, and social captions. Align with artist brand and current release.",
  ),
  tpl(
    "ai-tpl-merch-lyric",
    "Lyric-Based Merch Ideas",
    "merch-ideas",
    "lyric-based",
    "Merch concepts inspired by standout lyrics and song themes.",
    "Generate lyric-based merch ideas. Pull from provided lyrics/themes. Each concept should cite the lyric inspiration, suggested product type, slogan, and design notes.",
  ),
  tpl(
    "ai-tpl-merch-horror-pop",
    "Horror Pop Merch Ideas",
    "merch-ideas",
    "horror-pop",
    "Horror pop aesthetic merch with edgy visual direction.",
    "Generate horror pop merch ideas with edgy, stylized visual direction. Think dark palette, anime/horror motifs, wearable statement pieces. Include product titles, descriptions, and tags.",
  ),
  tpl(
    "ai-tpl-merch-fourthwall",
    "Fourthwall Product Ideas",
    "merch-ideas",
    "fourthwall",
    "Print-on-demand friendly products suited for Fourthwall storefronts.",
    "Generate Fourthwall-friendly merch ideas: POD-suitable products (tees, hoodies, posters, accessories), listing-ready titles/descriptions, and tags optimized for creator storefront conversion.",
  ),

  // Product Listings
  tpl(
    "ai-tpl-product-seo",
    "SEO Product Listing",
    "product-listings",
    "seo",
    "Search-optimized product listing with keyword-rich copy.",
    "Generate an SEO-focused product listing. Keyword-rich title, scannable bullets, tags/collection suggestions, and meta-friendly short description. Balance discoverability with brand voice.",
  ),
  tpl(
    "ai-tpl-product-emotional",
    "Emotional Buyer Listing",
    "product-listings",
    "emotional",
    "Emotion-led listing copy focused on fan identity and desire.",
    "Generate an emotional buyer-focused product listing. Lead with identity and feeling—why a fan wants this—not specs. Include story-driven long description, bullets, CTA, and social caption.",
  ),
  tpl(
    "ai-tpl-product-fourthwall",
    "Fourthwall Merch Listing",
    "product-listings",
    "fourthwall",
    "Fourthwall storefront listing with creator-commerce best practices.",
    "Generate a Fourthwall merch listing optimized for creator storefronts. Clear title, benefit-led bullets, collection suggestion, CTA, and launch email subject line.",
  ),
  tpl(
    "ai-tpl-product-digital",
    "Digital Product Listing",
    "product-listings",
    "digital",
    "Listing for digital goods: presets, wallpapers, stems, or downloads.",
    "Generate a digital product listing. Clarify what the buyer receives instantly, usage rights in plain language, bullet benefits, tags, and email subject for launch.",
  ),

  // Mockup Prompts
  tpl(
    "ai-tpl-mockup-clean",
    "Clean Ecommerce Mockup",
    "mockup-prompts",
    "clean-ecommerce",
    "Clean studio-style ecommerce mockup for product listings.",
    "Generate a clean ecommerce mockup prompt: neutral studio background, soft even lighting, product-centered layout, minimal props, and negative prompt to avoid clutter.",
  ),
  tpl(
    "ai-tpl-mockup-lifestyle",
    "Lifestyle Mockup",
    "mockup-prompts",
    "lifestyle",
    "Lifestyle scene mockup showing product in authentic use context.",
    "Generate a lifestyle mockup prompt with authentic setting, natural lighting, human context or environmental storytelling, text placement notes, and negative prompt.",
  ),
  tpl(
    "ai-tpl-mockup-cinematic",
    "Dark Cinematic Mockup",
    "mockup-prompts",
    "cinematic",
    "Moody cinematic mockup with dramatic lighting and color grade.",
    "Generate a dark cinematic mockup prompt: dramatic lighting, moody color grade, film-grain optional, strong shadows, layout notes, and negative prompt avoiding flat or stock-photo look.",
  ),
  tpl(
    "ai-tpl-mockup-social-ad",
    "Social Ad Mockup",
    "mockup-prompts",
    "social-ad",
    "Social ad creative mockup with bold composition for paid placement.",
    "Generate a social ad mockup prompt optimized for 1:1 or 4:5 placements. Bold composition, readable text zones, high contrast, usage notes for paid social, and negative prompt.",
  ),

  // Quality Review
  tpl(
    "ai-tpl-quality-recommendations",
    "AI Assisted Recommendation Notes",
    "quality",
    "recommendations",
    "Structured recommendation notes for campaign quality review.",
    "Review the provided campaign/module output and generate AI-assisted recommendation notes. Be specific, actionable, and tied to the stated goals. Note strengths before improvements.",
    QUALITY_OUTPUT_FORMAT,
  ),
  tpl(
    "ai-tpl-quality-revisions",
    "Revision Suggestions",
    "quality",
    "revisions",
    "Prioritized revision suggestions with rationale.",
    "Review the provided output and generate prioritized revision suggestions. Rank by impact on CTR, conversion, or brand fit. Keep suggestions concrete—not vague 'make it better' advice.",
    QUALITY_OUTPUT_FORMAT,
  ),
  tpl(
    "ai-tpl-quality-readiness",
    "Campaign Readiness Feedback",
    "quality",
    "readiness",
    "Launch readiness assessment with gaps and blockers.",
    "Assess campaign readiness from the provided context. Flag missing assets, weak copy areas, timeline risks, and blockers. Summarize go/no-go considerations.",
    QUALITY_OUTPUT_FORMAT,
  ),

  // Learnings
  tpl(
    "ai-tpl-learning-analytics",
    "Turn Analytics Into Learning",
    "learnings",
    "analytics",
    "Convert analytics results into a reusable learning record.",
    "From the analytics/metrics context provided, extract a reusable learning. State what happened, why it likely happened, and what to repeat or avoid on future campaigns.",
    LEARNINGS_OUTPUT_FORMAT,
  ),
  tpl(
    "ai-tpl-learning-experiment",
    "Turn Experiment Result Into Learning",
    "learnings",
    "experiment",
    "Document experiment outcomes as an actionable learning.",
    "From the experiment context provided, document the outcome as a learning. Include hypothesis, result, insight, and recommendation for future tests.",
    LEARNINGS_OUTPUT_FORMAT,
  ),
  tpl(
    "ai-tpl-learning-apply",
    "Apply Past Learnings To Campaign",
    "learnings",
    "apply",
    "Suggest how past learnings should shape the current campaign.",
    "Given past learnings and current campaign context, suggest how to apply relevant insights to this campaign. Be selective—only high-confidence learnings that match this release type.",
    LEARNINGS_OUTPUT_FORMAT,
  ),
]

export function starterDefToPrompt(def: StarterAITemplateDef): Prompt {
  const now = Date.now()
  const outputFormat = def.outputFormatOverride ?? outputForModuleSlug(def.moduleSlug)

  return {
    id: def.id,
    name: def.name,
    category: AI_GENERATION_TEMPLATE_CATEGORY,
    description: def.description,
    promptText: def.promptText,
    variables: def.variables ?? [],
    outputFormat,
    tags: [AI_TEMPLATE_TAG, moduleTag(def.moduleSlug), modeTag(def.mode)],
    rating: 0,
    notes: "Starter AI generation template. Edit in Prompt Library or use as a generation mode in modules.",
    createdAt: now,
    updatedAt: now,
  }
}

export function getStarterAITemplates(): Prompt[] {
  return STARTER_AI_TEMPLATES.map(starterDefToPrompt)
}
