/**
 * Local rubric scoring heuristics — deterministic, transparent draft scores.
 */

import type { QualityScoreBreakdown } from "@/lib/types"
import { getRubricForReviewType } from "@/lib/quality/rubrics"
import type { QualitySourceContext } from "@/lib/quality/source-loader"

export interface ScoringDraftResult {
  scoreBreakdown: QualityScoreBreakdown
  strengths: string
  weaknesses: string
  improvementIdeas: string
  recommendedActions: string
  warnings: string[]
}

function clampScore(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value)))
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function hasCta(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    lower.includes("subscribe") ||
    lower.includes("comment") ||
    lower.includes("watch") ||
    lower.includes("click") ||
    lower.includes("link") ||
    lower.includes("shop") ||
    lower.includes("listen") ||
    lower.includes("stream")
  )
}

function scoreFieldPresence(text: string, max: number, emptyPenalty = 2): number {
  if (!text.trim()) return max - emptyPenalty
  return max
}

function setCriterion(
  breakdown: QualityScoreBreakdown,
  key: string,
  score: number,
  whyNotes: string,
): void {
  const item = breakdown.criteria.find((c) => c.key === key)
  if (!item) return
  item.score = clampScore(score, item.maxScore)
  item.whyNotes = whyNotes
}

export function scoreReviewDraft(
  reviewType: string,
  source: QualitySourceContext,
): ScoringDraftResult {
  const rubric = getRubricForReviewType(reviewType)
  const breakdown: QualityScoreBreakdown = {
    rubricVersion: rubric.version,
    criteria: rubric.criteria.map((c) => ({
      key: c.key,
      label: c.label,
      description: c.description,
      maxScore: c.maxScore,
      guidance: c.guidance,
      score: 0,
      notes: "",
      whyNotes: "",
    })),
  }

  const warnings = source.warning ? [source.warning] : []
  const strengths: string[] = []
  const weaknesses: string[] = []
  const improvements: string[] = []
  const actions: string[] = []

  const f = source.textFields

  switch (reviewType) {
    case "YouTube Title":
      scoreYouTubeTitle(breakdown, f, strengths, weaknesses, improvements, actions)
      break
    case "YouTube Package":
      scoreYouTubePackage(breakdown, f, strengths, weaknesses, improvements, actions)
      break
    case "Thumbnail":
    case "Thumbnail Text":
      scoreThumbnail(breakdown, f, strengths, weaknesses, improvements, actions)
      break
    case "Thumbnail Prompt":
    case "Mockup Prompt":
      scoreThumbnailPrompt(breakdown, f, strengths, weaknesses, improvements, actions)
      break
    case "Shorts Hook":
    case "Social Caption":
      scoreSocialCaption(breakdown, f, strengths, weaknesses, improvements, actions)
      break
    case "Email Subject":
    case "Email Campaign":
      scoreEmailCampaign(breakdown, f, strengths, weaknesses, improvements, actions)
      break
    case "Merch Concept":
    case "Product Listing":
      scoreMerchProduct(breakdown, f, strengths, weaknesses, improvements, actions)
      break
    case "Campaign Readiness":
      scoreCampaignReadiness(breakdown, source, strengths, weaknesses, improvements, actions)
      break
    case "Prompt Quality":
      scorePromptQuality(breakdown, f, strengths, weaknesses, improvements, actions)
      break
    case "Brand Consistency":
    case "Experiment Variant":
    default:
      scoreGeneric(breakdown, f, strengths, weaknesses, improvements, actions)
      break
  }

  if (!source.found && reviewType !== "Campaign Readiness") {
    warnings.push("Source record was not loaded — scores are based on empty fields.")
  }

  return {
    scoreBreakdown: breakdown,
    strengths: strengths.join("\n"),
    weaknesses: weaknesses.join("\n"),
    improvementIdeas: improvements.join("\n"),
    recommendedActions: actions.join("\n"),
    warnings,
  }
}

function scoreYouTubeTitle(
  breakdown: QualityScoreBreakdown,
  f: Record<string, string>,
  strengths: string[],
  weaknesses: string[],
  improvements: string[],
  actions: string[],
) {
  const title = f.title ?? ""
  const len = title.length
  const words = wordCount(title)

  setCriterion(
    breakdown,
    "clarity",
    title.trim() ? 8 : 3,
    title.trim() ? "Title is present." : "Title is missing.",
  )
  setCriterion(
    breakdown,
    "curiosity",
    title.includes("?") || /secret|dark|why|how|hidden/i.test(title) ? 8 : 6,
    "Curiosity cues checked (question mark, mystery words).",
  )
  setCriterion(
    breakdown,
    "keywords",
    (f.keywords ?? "").trim() || /\b(k-pop|pop|music|official|lyric|mv)\b/i.test(title) ? 8 : 5,
    "Keyword presence in title or keywords field.",
  )
  setCriterion(
    breakdown,
    "emotion",
    /dark|sweet|creepy|love|horror|dream|secret/i.test(title) ? 8 : 6,
    "Emotional/mood words detected.",
  )

  let readability = 8
  if (len > 70) {
    readability = 5
    weaknesses.push("Title may be too long for mobile readability.")
    improvements.push("Shorten title to ~45–70 characters.")
  } else if (len < 20 && title.trim()) {
    readability = 6
    improvements.push("Consider adding more context or keywords to the title.")
  } else if (!title.trim()) {
    readability = 2
  }
  setCriterion(breakdown, "readability", readability, `Title length: ${len} characters.`)

  setCriterion(
    breakdown,
    "brand",
    title.trim() ? 7 : 3,
    "Brand fit requires manual review; baseline from title presence.",
  )
  setCriterion(
    breakdown,
    "click",
    words >= 4 && words <= 12 ? 8 : 6,
    `Word count: ${words}.`,
  )

  if (title.trim()) strengths.push("Title draft is present.")
  if (!title.trim()) {
    weaknesses.push("Missing final title.")
    actions.push("Add target keyword to the title.")
  }
}

function scoreYouTubePackage(
  breakdown: QualityScoreBreakdown,
  f: Record<string, string>,
  strengths: string[],
  weaknesses: string[],
  improvements: string[],
  actions: string[],
) {
  const title = f.title ?? ""
  const description = f.description ?? ""
  const tags = f.tags ?? ""
  const hashtags = f.hashtags ?? ""

  setCriterion(breakdown, "title", scoreFieldPresence(title, 10), title ? "Title present." : "Title missing.")
  setCriterion(
    breakdown,
    "description",
    description.length >= 120 ? 9 : description.trim() ? 6 : 3,
    `Description length: ${description.length} chars.`,
  )
  setCriterion(
    breakdown,
    "tags",
    tags.trim() ? 8 : 4,
    tags.trim() ? "Tags present." : "Tags missing — reduces discovery score.",
  )
  setCriterion(
    breakdown,
    "cta",
    hasCta(description) || hasCta(f.pinnedComment ?? "") ? 8 : 4,
    hasCta(description) ? "CTA found in description." : "No clear CTA detected.",
  )
  setCriterion(
    breakdown,
    "discovery",
    tags.trim() && title.trim() ? 8 : 5,
    "Tags + title support discovery.",
  )
  setCriterion(
    breakdown,
    "audience",
    (f.targetListener ?? "").trim() ? 8 : 4,
    (f.targetListener ?? "").trim()
      ? "Target listener defined."
      : "Missing target audience reduces audience score.",
  )
  setCriterion(
    breakdown,
    "branding",
    hashtags.trim() || (f.communityPost ?? "").trim() ? 8 : 5,
    "Hashtags/community post checked.",
  )

  if (title.trim()) strengths.push("Clear title present.")
  if (tags.trim()) strengths.push("Tags support search/discovery.")
  if (!hasCta(description)) {
    weaknesses.push("Description lacks a strong CTA.")
    improvements.push("Add stronger CTA to the description.")
    actions.push("Add subscribe, comment, or streaming link CTA.")
  }
  if (description.length < 120 && description.trim()) {
    improvements.push("Expand description with story context and links.")
  }
  if (!tags.trim()) actions.push("Add relevant tags for discovery.")
}

function scoreThumbnail(
  breakdown: QualityScoreBreakdown,
  f: Record<string, string>,
  strengths: string[],
  weaknesses: string[],
  improvements: string[],
  actions: string[],
) {
  const text = f.thumbnailText ?? ""
  const words = wordCount(text)

  let mobile = 8
  if (words > 6) {
    mobile = 4
    weaknesses.push("Thumbnail text may be too long for mobile readability.")
    improvements.push("Shorten thumbnail text for mobile readability.")
    actions.push("Aim for 4–6 words on thumbnail overlay.")
  } else if (!text.trim()) {
    mobile = 5
  }
  setCriterion(breakdown, "mobile", mobile, `Overlay word count: ${words}.`)

  setCriterion(breakdown, "focal", text.trim() || (f.conceptNotes ?? "").trim() ? 7 : 4, "Concept/thumbnail text checked.")
  setCriterion(breakdown, "contrast", (f.styleNotes ?? "").trim() ? 7 : 6, "Style notes suggest contrast planning.")
  setCriterion(breakdown, "emotion", /dark|secret|sweet|creepy|\?!/i.test(text) ? 8 : 6, "Emotional hook words in overlay.")
  setCriterion(breakdown, "text", text.trim() ? 8 : 4, text.trim() ? "Text overlay present." : "No thumbnail text.")
  setCriterion(breakdown, "curiosity", text.trim() ? 7 : 5, "Curiosity from overlay phrasing.")
  setCriterion(breakdown, "brand", (f.styleNotes ?? "").trim() ? 7 : 6, "Brand/style notes present.")

  if (text.trim()) strengths.push("Thumbnail text overlay defined.")
  if (words > 6) actions.push("Create Variant B with shorter text overlay.")
}

function scoreThumbnailPrompt(
  breakdown: QualityScoreBreakdown,
  f: Record<string, string>,
  strengths: string[],
  weaknesses: string[],
  improvements: string[],
  actions: string[],
) {
  const prompt = f.imagePrompt ?? ""
  const negative = f.negativePrompt ?? ""

  setCriterion(breakdown, "subject", prompt.length >= 40 ? 8 : prompt.trim() ? 5 : 3, `Prompt length: ${prompt.length}.`)
  setCriterion(breakdown, "composition", /close-up|center|rule of thirds|portrait|wide/i.test(prompt) ? 8 : 6, "Composition cues checked.")
  setCriterion(breakdown, "lighting", /light|neon|dark|cinematic|color|palette/i.test(prompt) ? 8 : 5, "Lighting/color direction checked.")
  setCriterion(breakdown, "textPlacement", /text|overlay|top|bottom|center/i.test(prompt) ? 8 : 5, "Text placement guidance checked.")
  setCriterion(breakdown, "style", (f.styleNotes ?? "").trim() ? 8 : 6, "Style notes present.")
  setCriterion(
    breakdown,
    "negative",
    negative.trim() ? 8 : 4,
    negative.trim() ? "Negative prompt present." : "Missing negative prompt guidance.",
  )
  setCriterion(breakdown, "platform", prompt.trim() ? 7 : 4, "Platform fit baseline.")

  if (prompt.trim()) strengths.push("Image prompt draft present.")
  if (!prompt.trim()) {
    weaknesses.push("Missing final image prompt.")
    actions.push("Add detailed image prompt with subject, lighting, and composition.")
  }
  if (!negative.trim()) improvements.push("Add negative prompt to avoid unwanted elements.")
}

function scoreSocialCaption(
  breakdown: QualityScoreBreakdown,
  f: Record<string, string>,
  strengths: string[],
  weaknesses: string[],
  improvements: string[],
  actions: string[],
) {
  const hook = f.hook ?? f.caption?.split("\n")[0] ?? ""
  const caption = f.caption ?? ""
  const hashtags = f.hashtags ?? ""

  setCriterion(breakdown, "hook", hook.trim().length >= 8 ? 8 : hook.trim() ? 5 : 3, "Hook strength from opening line.")
  setCriterion(breakdown, "platform", (f.platform ?? "").trim() ? 8 : 6, "Platform field set.")
  setCriterion(breakdown, "clarity", caption.trim() ? 7 : 4, "Caption body present.")
  setCriterion(breakdown, "cta", hasCta(caption) || (f.cta ?? "").trim() ? 8 : 4, "CTA check.")
  setCriterion(breakdown, "hashtags", hashtags.trim() ? 8 : 4, hashtags.trim() ? "Hashtags present." : "Hashtags missing.")
  setCriterion(breakdown, "engagement", /\?|comment|share|tag/i.test(caption) ? 8 : 6, "Engagement prompt check.")
  setCriterion(breakdown, "voice", caption.trim() ? 7 : 5, "Brand voice needs manual review.")

  if (hook.trim()) strengths.push("Hook/opening line present.")
  if (!hasCta(caption)) improvements.push("Add a clear CTA to the caption.")
  if (!hashtags.trim()) actions.push("Add platform-relevant hashtags.")
}

function scoreEmailCampaign(
  breakdown: QualityScoreBreakdown,
  f: Record<string, string>,
  strengths: string[],
  weaknesses: string[],
  improvements: string[],
  actions: string[],
) {
  const subject = f.subject ?? ""
  const preview = f.preview ?? ""
  const body = f.body ?? ""

  setCriterion(breakdown, "subject", subject.length >= 20 && subject.length <= 60 ? 9 : subject.trim() ? 6 : 3, `Subject length: ${subject.length}.`)
  setCriterion(breakdown, "preview", preview.trim() ? 8 : 4, preview.trim() ? "Preview text present." : "Preview text missing.")
  setCriterion(breakdown, "hook", body.trim().length >= 40 ? 8 : body.trim() ? 5 : 3, "Opening hook from body length.")
  setCriterion(breakdown, "body", body.trim() ? 7 : 4, "Email body present.")
  setCriterion(breakdown, "cta", hasCta(body) || (f.cta ?? "").trim() ? 8 : 4, "CTA check.")
  setCriterion(breakdown, "urgency", /launch|today|now|limited|release|new/i.test(body + subject) ? 8 : 6, "Urgency/relevance keywords.")
  setCriterion(breakdown, "brand", body.trim() ? 7 : 5, "Brand fit baseline.")

  if (subject.trim()) strengths.push("Subject line draft present.")
  if (!preview.trim()) improvements.push("Add preview text that complements the subject.")
  if (!hasCta(body)) actions.push("Add a clear CTA button or link instruction.")
}

function scoreMerchProduct(
  breakdown: QualityScoreBreakdown,
  f: Record<string, string>,
  strengths: string[],
  weaknesses: string[],
  improvements: string[],
  actions: string[],
) {
  const title = f.title ?? f.slogan ?? ""
  const description = f.description ?? f.concept ?? ""
  const bullets = f.bullets ?? ""
  const keywords = f.keywords ?? ""

  setCriterion(breakdown, "title", scoreFieldPresence(title, 10), title ? "Product title/slogan present." : "Title missing.")
  setCriterion(breakdown, "seo", keywords.trim() || title.trim() ? 7 : 4, "SEO keywords checked.")
  setCriterion(breakdown, "appeal", /dark|sweet|creepy|fan|limited|exclusive/i.test(description + title) ? 8 : 6, "Emotional appeal keywords.")
  setCriterion(breakdown, "description", description.length >= 80 ? 8 : description.trim() ? 5 : 3, `Description length: ${description.length}.`)
  setCriterion(breakdown, "bullets", bullets.trim() ? 8 : 4, bullets.trim() ? "Bullet points present." : "Bullet points missing.")
  setCriterion(breakdown, "buyer", (f.targetBuyer ?? "").trim() ? 8 : 5, "Target buyer field.")
  setCriterion(breakdown, "alignment", title.trim() && description.trim() ? 7 : 5, "Title + description alignment.")

  if (title.trim()) strengths.push("Product title or slogan defined.")
  if (!bullets.trim()) improvements.push("Add 3–5 scannable bullet points.")
}

function scoreCampaignReadiness(
  breakdown: QualityScoreBreakdown,
  source: QualitySourceContext,
  strengths: string[],
  weaknesses: string[],
  improvements: string[],
  actions: string[],
) {
  const meta = source.meta ?? {}
  const assetCount = Number(meta.assetCount ?? 0)
  const analyticsCount = Number(meta.analyticsCount ?? 0)
  const linkedCount = Number(meta.linkedRecordCount ?? 0)
  const status = String(source.textFields.status ?? "")

  setCriterion(
    breakdown,
    "assets",
    assetCount >= 2 ? 9 : assetCount >= 1 ? 6 : 3,
    `Linked assets: ${assetCount}.`,
  )
  setCriterion(
    breakdown,
    "checklist",
    linkedCount >= 3 ? 8 : linkedCount >= 1 ? 6 : 4,
    `Linked records: ${linkedCount}.`,
  )
  setCriterion(breakdown, "health", 7, "Data Health requires manual verification — baseline score.")
  setCriterion(
    breakdown,
    "export",
    linkedCount >= 2 ? 8 : 5,
    "Export pack readiness inferred from linked records.",
  )
  setCriterion(
    breakdown,
    "analytics",
    analyticsCount >= 1 ? 9 : 4,
    analyticsCount >= 1 ? "Analytics record found." : "No analytics record linked.",
  )
  setCriterion(breakdown, "experiments", 6, "Experiment setup — suggest A/B tests.")
  setCriterion(
    breakdown,
    "timeline",
    status === "Ready to Publish" || status === "Published" ? 8 : 6,
    `Campaign status: ${status || "unknown"}.`,
  )

  if (assetCount >= 1) strengths.push("Campaign has linked assets.")
  if (analyticsCount === 0) {
    weaknesses.push("No analytics record set up.")
    actions.push("Create analytics record before publishing.")
  }
  if (linkedCount < 3) {
    improvements.push("Link more launch assets (YouTube, email, social).")
  }
  actions.push("Add experiment for title or thumbnail.")
}

function scorePromptQuality(
  breakdown: QualityScoreBreakdown,
  f: Record<string, string>,
  strengths: string[],
  weaknesses: string[],
  improvements: string[],
  actions: string[],
) {
  const prompt = f.promptText ?? ""
  const output = f.output ?? ""

  setCriterion(breakdown, "role", /you are|act as|role/i.test(prompt) ? 8 : prompt.trim() ? 6 : 3, "Role/context check.")
  setCriterion(breakdown, "inputs", /\{\{|\[|\:/.test(prompt) ? 8 : 6, "Input placeholders/variables check.")
  setCriterion(breakdown, "format", /format|output|section|bullet|json/i.test(prompt) ? 8 : 5, "Output format guidance.")
  setCriterion(breakdown, "constraints", /avoid|must|do not|limit|max|min/i.test(prompt) ? 8 : 5, "Constraints check.")
  setCriterion(breakdown, "audience", /audience|platform|youtube|email|tiktok/i.test(prompt) ? 8 : 5, "Audience/platform context.")
  setCriterion(breakdown, "variables", /\{\{[^}]+\}\}/.test(prompt) ? 9 : 5, "Reusable {{variables}} check.")
  setCriterion(breakdown, "action", output.trim() || prompt.length >= 100 ? 8 : 5, "Actionability from prompt/output length.")

  if (prompt.trim()) strengths.push("Prompt text available for review.")
  if (!/\{\{/.test(prompt)) improvements.push("Add reusable template variables for campaign prefill.")
}

function scoreGeneric(
  breakdown: QualityScoreBreakdown,
  f: Record<string, string>,
  strengths: string[],
  weaknesses: string[],
  improvements: string[],
  actions: string[],
) {
  const combined = Object.values(f).join(" ")
  const filled = Object.values(f).filter((v) => v.trim()).length

  setCriterion(breakdown, "clarity", combined.trim() ? 7 : 4, "Content presence check.")
  setCriterion(breakdown, "completeness", filled >= 3 ? 8 : filled >= 1 ? 6 : 3, `Fields filled: ${filled}.`)
  setCriterion(breakdown, "audience", 6, "Audience fit needs manual review.")
  setCriterion(breakdown, "brand", 6, "Brand consistency needs manual review.")
  setCriterion(breakdown, "action", combined.trim() ? 7 : 4, "Actionability baseline.")

  if (combined.trim()) strengths.push("Source content available for review.")
  else weaknesses.push("Limited source content — fill in review setup fields.")
  if (filled < 2) actions.push("Complete source record fields before publishing.")
}

export { calculateOverallScore, readinessLabelFromScore } from "@/lib/quality-reviews"
