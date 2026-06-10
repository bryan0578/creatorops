/**
 * Quality review rubrics — local checklist criteria for scoring.
 */

export interface RubricCriterion {
  key: string
  label: string
  description: string
  maxScore: number
  guidance: string
}

export interface QualityRubric {
  id: string
  reviewType: string
  version: string
  criteria: RubricCriterion[]
}

const CRITERIA_SCALE = 10

function c(
  key: string,
  label: string,
  description: string,
  guidance: string,
): RubricCriterion {
  return { key, label, description, maxScore: CRITERIA_SCALE, guidance }
}

export const RUBRIC_VERSION = "1"

export const YOUTUBE_TITLE_RUBRIC: QualityRubric = {
  id: "youtube-title",
  reviewType: "YouTube Title",
  version: RUBRIC_VERSION,
  criteria: [
    c("clarity", "Clarity", "Title communicates what the video is about.", "Avoid vague or confusing phrasing."),
    c("curiosity", "Curiosity gap", "Creates interest without misleading.", "Use mystery or contrast where appropriate."),
    c("keywords", "Keyword strength", "Search/discovery terms are present.", "Include artist, genre, or topic keywords."),
    c("emotion", "Emotional pull", "Evokes mood or feeling aligned with content.", "Match dark, upbeat, or cinematic tone."),
    c("readability", "Length/readability", "Readable on mobile; not overly long.", "Aim for ~45–70 characters when possible."),
    c("brand", "Brand fit", "Matches artist/channel voice.", "Consistent naming and positioning."),
    c("click", "Click potential", "Competitive for feed/browse surfaces.", "Compare to genre norms."),
  ],
}

export const YOUTUBE_PACKAGE_RUBRIC: QualityRubric = {
  id: "youtube-package",
  reviewType: "YouTube Package",
  version: RUBRIC_VERSION,
  criteria: [
    c("title", "Title strength", "Primary title is compelling and clear.", "Review finalTitle field."),
    c("description", "Description completeness", "Description covers story, links, and context.", "Include CTA and streaming links."),
    c("tags", "Tag relevance", "Tags match content and search intent.", "Mix broad and niche tags."),
    c("cta", "CTA strength", "Clear call to action present.", "Subscribe, comment, or link prompts."),
    c("discovery", "Search/discovery fit", "Metadata supports YouTube search.", "Keywords in title, description, tags."),
    c("audience", "Audience targeting", "Speaks to target listener/viewer.", "Align with campaign target audience."),
    c("branding", "Release branding", "Consistent artist/release branding.", "Hashtags, pinned comment, community post."),
  ],
}

export const THUMBNAIL_RUBRIC: QualityRubric = {
  id: "thumbnail",
  reviewType: "Thumbnail",
  version: RUBRIC_VERSION,
  criteria: [
    c("mobile", "Mobile readability", "Readable at small sizes.", "Text ≤4–6 words; high contrast."),
    c("focal", "Strong focal point", "Clear subject or visual anchor.", "One primary focus."),
    c("contrast", "Contrast", "Foreground/background separation.", "Avoid muddy blends."),
    c("emotion", "Emotional hook", "Evokes curiosity or mood.", "Face, symbol, or dramatic element."),
    c("text", "Text overlay clarity", "Overlay text is legible and purposeful.", "Avoid clutter."),
    c("curiosity", "Curiosity/click trigger", "Invites click without spoiling.", "Test alternate phrases."),
    c("brand", "Brand consistency", "Matches artist visual identity.", "Colors, style, typography."),
  ],
}

export const THUMBNAIL_PROMPT_RUBRIC: QualityRubric = {
  id: "thumbnail-prompt",
  reviewType: "Thumbnail Prompt",
  version: RUBRIC_VERSION,
  criteria: [
    c("subject", "Subject clarity", "Main subject is clearly described.", "Who/what is in frame."),
    c("composition", "Composition direction", "Layout and framing guidance.", "Rule of thirds, close-up, etc."),
    c("lighting", "Lighting/color direction", "Mood via lighting and palette.", "Neon, cinematic, flat, etc."),
    c("textPlacement", "Text placement clarity", "Where text should appear.", "Top, center, lower third."),
    c("style", "Style consistency", "Matches brand/visual theme.", "Creepy-cute, dark pop, etc."),
    c("negative", "Negative prompt quality", "Avoidance instructions present.", "No extra logos, distortion."),
    c("platform", "Platform fit", "Sized/framed for YouTube thumbnail.", "16:9, high contrast."),
  ],
}

export const SOCIAL_CAPTION_RUBRIC: QualityRubric = {
  id: "social-caption",
  reviewType: "Social Caption",
  version: RUBRIC_VERSION,
  criteria: [
    c("hook", "Hook strength", "Opening line stops the scroll.", "First line matters most."),
    c("platform", "Platform fit", "Length and tone match platform.", "TikTok vs IG vs X."),
    c("clarity", "Clarity", "Message is easy to understand.", "One clear idea."),
    c("cta", "CTA", "Call to action included.", "Watch, comment, link in bio."),
    c("hashtags", "Hashtag relevance", "Hashtags support discovery.", "Mix branded and niche."),
    c("engagement", "Share/comment potential", "Encourages interaction.", "Question or prompt."),
    c("voice", "Brand voice", "Sounds like the artist/brand.", "Tone consistency."),
  ],
}

export const EMAIL_CAMPAIGN_RUBRIC: QualityRubric = {
  id: "email-campaign",
  reviewType: "Email Campaign",
  version: RUBRIC_VERSION,
  criteria: [
    c("subject", "Subject line strength", "Subject drives opens.", "Curiosity + clarity."),
    c("preview", "Preview text", "Preview complements subject.", "Not redundant."),
    c("hook", "Opening hook", "First lines engage reader.", "Story or benefit lead."),
    c("body", "Body clarity", "Main message is scannable.", "Short paragraphs, bullets."),
    c("cta", "CTA", "Clear next step.", "Watch, shop, reply."),
    c("urgency", "Urgency/relevance", "Timely reason to act.", "Launch window, limited offer."),
    c("brand", "Brand fit", "Voice matches artist/label.", "Tone and visuals."),
  ],
}

export const MERCH_PRODUCT_RUBRIC: QualityRubric = {
  id: "merch-product",
  reviewType: "Product Listing",
  version: RUBRIC_VERSION,
  criteria: [
    c("title", "Product title clarity", "Title describes product clearly.", "SEO-friendly."),
    c("seo", "SEO keyword fit", "Primary keywords included.", "Genre, artist, product type."),
    c("appeal", "Emotional appeal", "Connects to fan identity.", "Story or aesthetic hook."),
    c("description", "Description strength", "Benefits and details covered.", "Materials, fit, use case."),
    c("bullets", "Bullet point usefulness", "Scannable selling points.", "3–5 strong bullets."),
    c("buyer", "Buyer fit", "Speaks to target buyer.", "Fan, collector, gift buyer."),
    c("alignment", "Brand/product alignment", "Matches release/campaign.", "Merch tie-in to song."),
  ],
}

export const CAMPAIGN_READINESS_RUBRIC: QualityRubric = {
  id: "campaign-readiness",
  reviewType: "Campaign Readiness",
  version: RUBRIC_VERSION,
  criteria: [
    c("assets", "Required assets complete", "Linked assets meet launch needs.", "YouTube, thumbnail, email, etc."),
    c("checklist", "Publishing checklist progress", "Pre-publish items addressed.", "Checklist completion %."),
    c("health", "Data Health status", "No critical data issues.", "Broken links, missing fields."),
    c("export", "Export pack readiness", "Export pack can be generated.", "Linked records present."),
    c("analytics", "Analytics setup", "Analytics record or plan exists.", "Post-publish tracking."),
    c("experiments", "Experiment setup", "Tests planned for key variants.", "Title/thumbnail tests."),
    c("timeline", "Timeline/task readiness", "Tasks and dates on track.", "Overdue tasks addressed."),
  ],
}

export const PROMPT_QUALITY_RUBRIC: QualityRubric = {
  id: "prompt-quality",
  reviewType: "Prompt Quality",
  version: RUBRIC_VERSION,
  criteria: [
    c("role", "Clear role/context", "Prompt states role and goal.", "Who is the AI acting as."),
    c("inputs", "Specific inputs", "Variables and fields defined.", "{{artistName}} etc."),
    c("format", "Output format", "Expected structure described.", "Sections, bullets, JSON."),
    c("constraints", "Constraints", "Limits and rules specified.", "Length, tone, avoid list."),
    c("audience", "Audience/platform context", "Target audience or platform noted.", "YouTube, email, etc."),
    c("variables", "Reusable variables", "Template variables for reuse.", "Campaign prefill friendly."),
    c("action", "Actionability", "Produces usable output.", "Copy-paste ready result."),
  ],
}

export const GENERIC_RUBRIC: QualityRubric = {
  id: "generic",
  reviewType: "Other",
  version: RUBRIC_VERSION,
  criteria: [
    c("clarity", "Clarity", "Content is clear and understandable.", "Avoid ambiguity."),
    c("completeness", "Completeness", "Required fields and sections present.", "No major gaps."),
    c("audience", "Audience fit", "Speaks to intended audience.", "Match campaign context."),
    c("brand", "Brand consistency", "Aligned with brand voice.", "Visual and verbal tone."),
    c("action", "Actionability", "Ready for next step.", "Publish, test, or revise."),
  ],
}

export const QUALITY_RUBRICS: QualityRubric[] = [
  YOUTUBE_TITLE_RUBRIC,
  YOUTUBE_PACKAGE_RUBRIC,
  THUMBNAIL_RUBRIC,
  THUMBNAIL_PROMPT_RUBRIC,
  SOCIAL_CAPTION_RUBRIC,
  EMAIL_CAMPAIGN_RUBRIC,
  MERCH_PRODUCT_RUBRIC,
  CAMPAIGN_READINESS_RUBRIC,
  PROMPT_QUALITY_RUBRIC,
  GENERIC_RUBRIC,
]

export function getRubricForReviewType(reviewType: string): QualityRubric {
  const exact = QUALITY_RUBRICS.find((r) => r.reviewType === reviewType)
  if (exact) return exact
  if (reviewType === "Merch Concept") {
    return { ...MERCH_PRODUCT_RUBRIC, id: "merch-concept", reviewType: "Merch Concept" }
  }
  if (reviewType === "Mockup Prompt") {
    return { ...THUMBNAIL_PROMPT_RUBRIC, id: "mockup-prompt", reviewType: "Mockup Prompt" }
  }
  if (reviewType === "Thumbnail Text") {
    return { ...THUMBNAIL_RUBRIC, id: "thumbnail-text", reviewType: "Thumbnail Text" }
  }
  if (reviewType === "Shorts Hook") {
    return { ...SOCIAL_CAPTION_RUBRIC, id: "shorts-hook", reviewType: "Shorts Hook" }
  }
  if (reviewType === "Email Subject") {
    return { ...EMAIL_CAMPAIGN_RUBRIC, id: "email-subject", reviewType: "Email Subject" }
  }
  if (reviewType === "Brand Consistency") {
    return { ...GENERIC_RUBRIC, id: "brand-consistency", reviewType: "Brand Consistency" }
  }
  if (reviewType === "Experiment Variant") {
    return { ...GENERIC_RUBRIC, id: "experiment-variant", reviewType: "Experiment Variant" }
  }
  return GENERIC_RUBRIC
}

export function emptyScoreBreakdown(reviewType: string): {
  rubricVersion: string
  criteria: Array<RubricCriterion & { score: number; notes: string; whyNotes: string }>
} {
  const rubric = getRubricForReviewType(reviewType)
  return {
    rubricVersion: rubric.version,
    criteria: rubric.criteria.map((item) => ({
      ...item,
      score: 0,
      notes: "",
      whyNotes: "",
    })),
  }
}
