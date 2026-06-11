export const CAMPAIGN_COPILOT_MODES = [
  "campaign-analysis",
  "next-steps",
  "missing-assets",
  "quality-risks",
  "launch-readiness",
  "post-publish-plan",
  "prompt-plan",
  "custom-question",
] as const

export type CampaignCopilotMode = (typeof CAMPAIGN_COPILOT_MODES)[number]

export const CAMPAIGN_COPILOT_MODE_LABELS: Record<CampaignCopilotMode, string> = {
  "campaign-analysis": "Full Campaign Analysis",
  "next-steps": "Next Best Actions",
  "missing-assets": "Missing Assets",
  "quality-risks": "Quality Risks",
  "launch-readiness": "Launch Readiness",
  "post-publish-plan": "Post-Publish Plan",
  "prompt-plan": "Prompt Plan",
  "custom-question": "Ask a Custom Question",
}

export const CAMPAIGN_COPILOT_SYSTEM_PROMPT = `You are CreatorOps Campaign Copilot, a practical launch strategist for AI music, YouTube, merch, content, and creator campaigns.

Rules:
- Be specific and actionable.
- Prioritize actions in order of impact.
- Do not suggest creating tools or records that already exist unless improvement is clearly needed.
- Point out missing assets, missing reviews, missing analytics, and incomplete tasks when present in context.
- Use learnings when provided.
- Use quality reviews when provided.
- Recommend next actions in order.
- Avoid generic advice.
- Use markdown headings and numbered lists.
- Do not wrap the entire response in a code block.`

const MODE_OUTPUT_FORMATS: Partial<Record<CampaignCopilotMode, string>> = {
  "next-steps": [
    "Structure your answer as:",
    "",
    "## Top 5 Next Actions",
    "1.",
    "2.",
    "3.",
    "4.",
    "5.",
    "",
    "## Why These Matter",
    "",
    "## Suggested AI Generations",
    "",
    "## Risks to Fix",
  ].join("\n"),
  "missing-assets": [
    "Structure your answer as:",
    "",
    "## Required Missing Assets",
    "",
    "## Optional Assets",
    "",
    "## Recommended Next Asset to Create",
    "",
    "## Suggested Module Links",
  ].join("\n"),
  "quality-risks": [
    "Structure your answer as:",
    "",
    "## Lowest Scoring Items",
    "",
    "## Risks Before Publish",
    "",
    "## Recommended Fixes",
    "",
    "## Suggested Quality Reviews",
  ].join("\n"),
  "launch-readiness": [
    "Structure your answer as:",
    "",
    "## Readiness Verdict",
    "",
    "## Ready",
    "",
    "## Not Ready",
    "",
    "## Blockers",
    "",
    "## Recommended Publish Path",
  ].join("\n"),
  "prompt-plan": [
    "Structure your answer as:",
    "",
    "## Recommended AI Prompts to Run",
    "",
    "## Suggested Templates",
    "",
    "## Expected Outputs",
    "",
    "## Suggested Order",
  ].join("\n"),
  "post-publish-plan": [
    "Structure your answer as:",
    "",
    "## First 48 Hours",
    "",
    "## Week 1 Follow-Through",
    "",
    "## Analytics to Watch",
    "",
    "## Recommended AI Generations",
  ].join("\n"),
  "campaign-analysis": [
    "Structure your answer as:",
    "",
    "## Campaign Snapshot",
    "",
    "## What's Working",
    "",
    "## Gaps & Missing Pieces",
    "",
    "## Top Priorities",
    "",
    "## Suggested AI Generations",
  ].join("\n"),
}

const MODE_TASKS: Partial<Record<CampaignCopilotMode, string>> = {
  "campaign-analysis":
    "Analyze this campaign holistically. Summarize status, gaps, risks, and the highest-impact next moves.",
  "next-steps":
    "Recommend the top next actions for this campaign right now. Be ruthless about priority.",
  "missing-assets":
    "Identify missing required and optional assets. Recommend the single best asset to create next.",
  "quality-risks":
    "Assess quality risks before launch using reviews, readiness, and incomplete work.",
  "launch-readiness":
    "Determine whether this campaign is ready to publish. List blockers and a recommended publish path.",
  "post-publish-plan":
    "Assume the campaign is published or about to publish. Plan post-launch follow-through.",
  "prompt-plan":
    "Recommend which AI prompts/templates to run next, in what order, and what outputs to expect.",
}

export function buildCampaignCopilotUserPrompt(
  mode: CampaignCopilotMode,
  contextMarkdown: string,
  userQuestion?: string,
): string {
  const parts: string[] = ["CAMPAIGN CONTEXT", contextMarkdown.trim(), ""]

  if (mode === "custom-question") {
    parts.push(
      "TASK",
      userQuestion?.trim() ||
        "Answer the user's campaign question using the context above.",
    )
  } else {
    parts.push("TASK", MODE_TASKS[mode] ?? "Help with this campaign.")
    const format = MODE_OUTPUT_FORMATS[mode]
    if (format) {
      parts.push("", "OUTPUT FORMAT", format)
    }
  }

  return parts.join("\n").trim()
}

export function campaignCopilotPromptName(mode: CampaignCopilotMode): string {
  return `Campaign Copilot - ${CAMPAIGN_COPILOT_MODE_LABELS[mode]}`
}

export function campaignCopilotModeTag(mode: CampaignCopilotMode): string {
  return `copilot:${mode}`
}
