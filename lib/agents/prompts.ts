import type { CreatorAgent, AgentRunInput } from "@/lib/agents/types"

const OUTPUT_FORMAT = `
Respond in markdown with these exact headings:

# Summary
# Key Findings
# Risks / Gaps
# Recommendations
# Suggested Actions
# Records to Review

Use bullet lists where helpful. Label assumptions. Do not suggest automatic external changes.
`.trim()

export function buildAgentPrompt(
  agent: CreatorAgent,
  contextMarkdown: string,
  input: AgentRunInput,
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = [
    agent.systemPrompt,
    "",
    "Expected sections:",
    agent.outputSections.map((section) => `- ${section}`).join("\n"),
    "",
    OUTPUT_FORMAT,
  ].join("\n")

  const userPrompt = [
    `Run the ${agent.name} analysis.`,
    input.userGoal?.trim() ? `User goal: ${input.userGoal.trim()}` : "",
    input.extraInstructions?.trim() ? `Extra instructions: ${input.extraInstructions.trim()}` : "",
    "",
    "CreatorOps context (source of truth):",
    contextMarkdown,
  ]
    .filter(Boolean)
    .join("\n")

  return { systemPrompt, userPrompt }
}

export function agentPromptRunName(agent: CreatorAgent): string {
  return `${agent.shortName} Agent Run`
}

export function agentRunTags(agentId: string): string[] {
  return ["creator-ai-agent", agentId]
}

export const AGENT_RUN_TYPE = "Creator AI Agent"
