import type { AgentOutputSection, AgentRecommendedAction, AgentRunResult } from "@/lib/agents/types"
import { getAgentById } from "@/lib/agents/registry"
import type { PromptRun } from "@/lib/types"

const HEADINGS = [
  "Summary",
  "Key Findings",
  "Risks / Gaps",
  "Recommendations",
  "Suggested Actions",
  "Records to Review",
] as const

function extractSection(text: string, heading: string): { content: string; items: string[] } {
  const pattern = new RegExp(`#\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n([\\s\\S]*?)(?=\\n#\\s|$)`, "i")
  const match = text.match(pattern)
  if (!match) return { content: "", items: [] }

  const body = match[1].trim()
  const lines = body.split("\n").map((line) => line.trim()).filter(Boolean)
  const items = lines
    .filter((line) => line.startsWith("- ") || line.startsWith("* "))
    .map((line) => line.replace(/^[-*]\s+/, ""))
  const content = lines.filter((line) => !line.startsWith("- ") && !line.startsWith("* ")).join("\n")

  return { content: content || (items.length === 0 ? body : ""), items }
}

function actionsFromItems(items: string[]): AgentRecommendedAction[] {
  return items.slice(0, 8).map((label, index) => ({
    label,
    actionType: "suggestion",
    requiresConfirmation: true,
    payload: { index },
  }))
}

export function parseAgentOutput(text: string): {
  summary: string
  sections: AgentOutputSection[]
  recommendedActions: AgentRecommendedAction[]
} {
  const trimmed = text.trim()
  if (!trimmed) {
    return {
      summary: "No AI output returned.",
      sections: [{ title: "Summary", content: "No AI output returned." }],
      recommendedActions: [],
    }
  }

  const sections: AgentOutputSection[] = []
  for (const heading of HEADINGS) {
    const { content, items } = extractSection(trimmed, heading)
    if (!content && items.length === 0) continue
    sections.push({ title: heading, content, items: items.length > 0 ? items : undefined })
  }

  if (sections.length === 0) {
    sections.push({ title: "Summary", content: trimmed })
  }

  const summarySection = sections.find((s) => s.title === "Summary")
  const summary = summarySection?.content || summarySection?.items?.[0] || trimmed.slice(0, 280)

  const actionSection = sections.find((s) => s.title === "Suggested Actions")
  const recommendedActions = actionsFromItems(actionSection?.items ?? [])

  return { summary, sections, recommendedActions }
}

export function parseStoredAgentResult(run: PromptRun): AgentRunResult {
  const agentId = run.inputValues?.agentId ?? run.tags.find((t) => t !== "creator-ai-agent") ?? ""
  const agent = getAgentById(agentId)
  const parsed = parseAgentOutput(run.aiResponse || run.completedPrompt)

  return {
    agentId,
    agentName: agent?.name ?? run.promptName,
    title: run.promptName,
    summary: parsed.summary,
    sections: parsed.sections,
    recommendedActions: parsed.recommendedActions,
    relatedRecords: [],
    rawText: run.aiResponse,
    usedFallback: run.inputValues?.usedFallback === "true" || run.notes.includes("fallback"),
    promptRunId: run.id,
  }
}
