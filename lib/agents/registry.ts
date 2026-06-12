import type { CreatorAgent } from "@/lib/agents/types"

const BASE_RULES = `You are a CreatorOps specialized agent.
Use only the provided CreatorOps context as source of truth.
Be practical and action-oriented.
Label assumptions clearly when data is limited.
Do not claim proven results without enough records.
Do not suggest automatically modifying external platforms or user data.
Never reveal API keys or secrets.
If data is missing, say what is missing and what to sync or create next.`

export const CREATOR_AGENTS: CreatorAgent[] = [
  {
    id: "release-strategist",
    name: "Release Strategist Agent",
    shortName: "Release Strategist",
    description: "Plan and improve AI music releases using campaign, asset, analytics, and learning context.",
    domain: "campaign-command",
    iconName: "Rocket",
    systemPrompt: `${BASE_RULES}
You are the Release Strategist Agent for music and content releases.
Focus on launch readiness, missing assets, packaging, timing, and post-publish review plans.`,
    suggestedUseCases: [
      "Pre-launch readiness review",
      "Missing asset checklist",
      "Release packaging recommendations",
      "Post-publish review plan",
    ],
    requiredContext: ["Campaign summary"],
    optionalContext: [
      "Analytics",
      "Videos",
      "Assets",
      "Quality reviews",
      "Learnings",
      "Patterns",
      "Playbooks",
    ],
    outputSections: [
      "Summary",
      "Key Findings",
      "Risks / Gaps",
      "Recommendations",
      "Suggested Actions",
      "Records to Review",
    ],
    recommendedActions: [
      "Open Campaign",
      "Open Assets",
      "Open Quality Reviews",
      "Open Feedback Loop",
    ],
    defaultInclude: {
      campaigns: true,
      analytics: true,
      videos: true,
      assets: true,
      driveFiles: true,
      qualityReviews: true,
      learnings: true,
      experiments: true,
      patterns: true,
      qualityPerformance: true,
      feedbackLoop: true,
      playbooks: true,
    },
  },
  {
    id: "youtube-growth",
    name: "YouTube Growth Strategist Agent",
    shortName: "YouTube Growth",
    description: "Optimize YouTube packaging, titles, thumbnails, video performance, and growth experiments.",
    domain: "youtube-studio",
    iconName: "Video",
    systemPrompt: `${BASE_RULES}
You are the YouTube Growth Strategist Agent.
Focus on title/thumbnail opportunities, performance diagnosis, experiments, and learning capture.`,
    suggestedUseCases: [
      "Title optimization ideas",
      "Thumbnail improvement plan",
      "Video performance diagnosis",
      "Experiment suggestions for CTR/views",
    ],
    requiredContext: ["YouTube/video summary"],
    optionalContext: ["Analytics", "Patterns", "Quality vs Performance", "Experiments"],
    outputSections: [
      "Summary",
      "Key Findings",
      "Risks / Gaps",
      "Recommendations",
      "Suggested Actions",
      "Records to Review",
    ],
    recommendedActions: [
      "Open Video Intelligence",
      "Open Pattern Detection",
      "Open Quality vs Performance",
      "Create Experiment",
    ],
    defaultInclude: {
      campaigns: true,
      analytics: true,
      videos: true,
      qualityReviews: true,
      learnings: true,
      experiments: true,
      patterns: true,
      qualityPerformance: true,
      feedbackLoop: true,
    },
  },
  {
    id: "product-strategist",
    name: "Product Strategist Agent",
    shortName: "Product Strategist",
    description: "Improve merch, digital products, listings, mockups, and product launch campaigns.",
    domain: "product-factory",
    iconName: "ShoppingBag",
    systemPrompt: `${BASE_RULES}
You are the Product Strategist Agent.
Focus on product readiness, listing quality, mockup gaps, collection ideas, and launch recommendations.`,
    suggestedUseCases: [
      "Product listing improvements",
      "Mockup/image gap analysis",
      "Merch collection ideas",
      "Product launch campaign plan",
    ],
    requiredContext: ["Product/merch summary"],
    optionalContext: ["Assets", "Drive files", "Analytics", "Quality reviews"],
    outputSections: [
      "Summary",
      "Key Findings",
      "Risks / Gaps",
      "Recommendations",
      "Suggested Actions",
      "Records to Review",
    ],
    recommendedActions: ["Open Product Listings", "Open Assets", "Open Merch Ideas"],
    defaultInclude: {
      campaigns: true,
      analytics: true,
      assets: true,
      driveFiles: true,
      qualityReviews: true,
      learnings: true,
      patterns: true,
      feedbackLoop: true,
    },
  },
  {
    id: "prompt-optimizer",
    name: "Prompt Optimizer Agent",
    shortName: "Prompt Optimizer",
    description: "Improve prompts, templates, AI workflows, and output quality using prompt history and learnings.",
    domain: "ai-studio",
    iconName: "Wand2",
    systemPrompt: `${BASE_RULES}
You are the Prompt Optimizer Agent.
Focus on prompt clarity, missing context, reusable templates, parser-friendly output, and quality improvements.`,
    suggestedUseCases: [
      "Improve a prompt template",
      "Add missing context to prompts",
      "Parser-friendly output formatting",
      "Reuse learnings in prompts",
    ],
    requiredContext: ["Prompt summary"],
    optionalContext: ["Prompt runs", "Quality reviews", "Learnings", "Playbooks"],
    outputSections: [
      "Summary",
      "Key Findings",
      "Risks / Gaps",
      "Recommendations",
      "Suggested Actions",
      "Records to Review",
    ],
    recommendedActions: ["Open Prompt Library", "Open Prompt Runner", "Open Playbooks"],
    defaultInclude: {
      prompts: true,
      learnings: true,
      playbooks: true,
      qualityReviews: true,
      patterns: true,
      qualityPerformance: true,
    },
  },
  {
    id: "campaign-qa",
    name: "Campaign QA Agent",
    shortName: "Campaign QA",
    description: "Audit campaigns before launch or after publish for readiness, blockers, and missing records.",
    domain: "campaign-command",
    iconName: "ShieldCheck",
    systemPrompt: `${BASE_RULES}
You are the Campaign QA Agent.
Focus on readiness score, blockers, warnings, missing records, and a final publish checklist.`,
    suggestedUseCases: [
      "Pre-launch QA audit",
      "Post-publish campaign review",
      "Missing asset/link detection",
      "Final publish checklist",
    ],
    requiredContext: ["Campaign summary"],
    optionalContext: ["Data health", "Automation", "Assets", "Videos", "Analytics"],
    outputSections: [
      "Summary",
      "Key Findings",
      "Risks / Gaps",
      "Recommendations",
      "Suggested Actions",
      "Records to Review",
    ],
    recommendedActions: [
      "Open Data Health",
      "Open Automation",
      "Open Campaign Launch Dashboard",
    ],
    defaultInclude: {
      campaigns: true,
      analytics: true,
      videos: true,
      assets: true,
      driveFiles: true,
      qualityReviews: true,
      experiments: true,
      learnings: true,
      dataHealth: true,
      automation: true,
      feedbackLoop: true,
    },
  },
  {
    id: "learning-synthesizer",
    name: "Learning Synthesizer Agent",
    shortName: "Learning Synthesizer",
    description: "Turn learnings, patterns, experiments, and feedback into reusable strategy and playbook guidance.",
    domain: "analytics-learnings",
    iconName: "Lightbulb",
    systemPrompt: `${BASE_RULES}
You are the Learning Synthesizer Agent.
Focus on repeated wins/mistakes, playbook updates, future campaign guidance, and AI context recommendations.`,
    suggestedUseCases: [
      "Synthesize campaign learnings",
      "Playbook update recommendations",
      "Pattern-to-strategy summary",
      "AI context guidance",
    ],
    requiredContext: ["Learning summary"],
    optionalContext: ["Patterns", "Feedback loop", "Experiments", "Quality vs Performance"],
    outputSections: [
      "Summary",
      "Key Findings",
      "Risks / Gaps",
      "Recommendations",
      "Suggested Actions",
      "Records to Review",
    ],
    recommendedActions: [
      "Open Learnings",
      "Open Feedback Loop",
      "Open Pattern Detection",
      "Open Playbooks",
    ],
    defaultInclude: {
      learnings: true,
      patterns: true,
      qualityPerformance: true,
      feedbackLoop: true,
      experiments: true,
      playbooks: true,
      campaigns: true,
    },
  },
]

export function getAgentById(agentId: string): CreatorAgent | undefined {
  return CREATOR_AGENTS.find((agent) => agent.id === agentId)
}

export function listCreatorAgents(): CreatorAgent[] {
  return CREATOR_AGENTS
}
