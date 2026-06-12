"use server"

import { revalidatePath } from "next/cache"

import { buildAgentContext, previewAgentContext } from "@/lib/agents/context"
import {
  buildAgentFallbackResult,
  buildAgentResultFromAiText,
} from "@/lib/agents/fallbacks"
import {
  AGENT_RUN_TYPE,
  agentPromptRunName,
  agentRunTags,
  buildAgentPrompt,
} from "@/lib/agents/prompts"
import { getAgentById, listCreatorAgents } from "@/lib/agents/registry"
import type { AgentRunInput, AgentRunResult } from "@/lib/agents/types"
import { generateAITextWithProvider, resolveProviderStatus } from "@/lib/ai/ai-client"
import { createExperiment } from "@/lib/actions/experiments"
import { saveLinkedPromptRun } from "@/lib/actions/linked-prompt-runs"
import { createLearning } from "@/lib/actions/learnings"
import { getCampaigns } from "@/lib/actions/campaigns"
import { deletePromptRunById, getPromptRuns } from "@/lib/actions/prompt-runs"
import { getWorkspaceSettings } from "@/lib/actions/workspace-settings"
import { buildLearningUrl } from "@/lib/learning-prefill"
import { createId } from "@/lib/storage"
import type { ExperimentRecord, LearningRecord, PromptRun } from "@/lib/types"

const REVALIDATE_PATHS = [
  "/",
  "/agents",
  "/runner",
  "/learnings",
  "/experiments",
  "/playbooks",
  "/campaigns",
  "/copilot",
  "/data-health",
  "/automation",
  "/search",
  "/activity",
]

function revalidateAgentRoutes() {
  for (const path of REVALIDATE_PATHS) revalidatePath(path)
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message
    if (/rate limit|429|quota|billing/i.test(msg)) {
      return "Rate limit or quota reached. Try again later or use fallback mode."
    }
    if (/not configured|api key|invalid api key/i.test(msg)) {
      return msg
    }
  }
  return "Agent run failed. Showing fallback if available."
}

export async function getCreatorAgentsList() {
  return listCreatorAgents()
}

export async function getAgentRunHistory(limit = 50): Promise<PromptRun[]> {
  try {
    const runs = await getPromptRuns()
    return runs
      .filter(
        (run) =>
          run.runType === AGENT_RUN_TYPE ||
          run.tags.includes("creator-ai-agent"),
      )
      .slice(0, limit)
  } catch {
    return []
  }
}

export async function getAgentRunById(recordId: string): Promise<PromptRun | null> {
  try {
    const runs = await getPromptRuns()
    return runs.find((run) => run.id === recordId) ?? null
  } catch {
    return null
  }
}

export async function previewCreatorAgentContext(input: AgentRunInput): Promise<string> {
  try {
    return await previewAgentContext(input)
  } catch (error) {
    return `# Context preview unavailable\n${safeErrorMessage(error)}`
  }
}

async function saveAgentPromptRun(
  input: AgentRunInput,
  prompt: string,
  response: string,
  usedFallback: boolean,
): Promise<string | undefined> {
  if (input.saveRun === false) return undefined

  const agent = getAgentById(input.agentId)
  if (!agent) return undefined

  let campaignName = ""
  if (input.campaignId) {
    try {
      const campaigns = await getCampaigns()
      campaignName = campaigns.find((c) => c.id === input.campaignId)?.campaignName ?? ""
    } catch {
      // ignore
    }
  }

  try {
    const saved = await saveLinkedPromptRun({
      promptName: agentPromptRunName(agent),
      category: "General",
      campaignId: input.campaignId,
      campaignName,
      runType: AGENT_RUN_TYPE,
      completedPrompt: prompt,
      aiResponse: response,
      notes: usedFallback ? "Creator AI Agent fallback run" : "Creator AI Agent run",
      tags: agentRunTags(input.agentId),
      inputValues: {
        agentId: input.agentId,
        artistName: input.artistName ?? "",
        platform: input.platform ?? "",
        sourceRecordType: input.sourceRecordType ?? "",
        sourceRecordId: input.sourceRecordId ?? "",
        userGoal: input.userGoal ?? "",
        usedFallback: usedFallback ? "true" : "false",
      },
    })
    return saved.id
  } catch {
    return undefined
  }
}

export async function runCreatorAgent(input: AgentRunInput): Promise<AgentRunResult> {
  const agent = getAgentById(input.agentId)
  if (!agent) {
    return {
      agentId: input.agentId,
      agentName: input.agentId,
      title: "Unknown agent",
      summary: "Agent not found in registry.",
      sections: [{ title: "Summary", content: "Agent not found in registry." }],
      recommendedActions: [],
      relatedRecords: [],
      warnings: ["Unknown agent id."],
      usedFallback: true,
    }
  }

  let context
  try {
    context = await buildAgentContext(input)
  } catch (error) {
    context = {
      markdown: "# Context unavailable",
      relatedRecords: [],
      warnings: [safeErrorMessage(error)],
      missingData: ["Context builder failed"],
    }
  }

  const { systemPrompt, userPrompt } = buildAgentPrompt(agent, context.markdown, input)
  const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`

  let useFallback = false
  let aiText = ""
  const warnings = [...context.warnings]

  try {
    const settings = await getWorkspaceSettings()
    const status = resolveProviderStatus({
      enabled: settings.aiGenerationEnabled,
      preferredProvider: settings.aiDefaultProvider,
      preferredModel: settings.aiDefaultModel,
    })

    if (!settings.aiGenerationEnabled || !status.configured || status.provider === "manual") {
      useFallback = true
      warnings.push(
        status.setupMessage ??
          "AI provider not configured. Showing deterministic fallback summary.",
      )
    } else {
      aiText = (
        await generateAITextWithProvider(status.provider, {
          provider: status.provider,
          model: status.model,
          systemPrompt,
          userPrompt,
          temperature: settings.aiTemperature ?? 0.4,
          maxTokens: settings.aiMaxOutputTokens ?? 2500,
        })
      ).text
    }
  } catch (error) {
    useFallback = true
    warnings.push(safeErrorMessage(error))
  }

  let result: AgentRunResult
  if (useFallback || !aiText.trim()) {
    result = await buildAgentFallbackResult(input, context)
    result.warnings = [...new Set([...(result.warnings ?? []), ...warnings])]
  } else {
    result = buildAgentResultFromAiText(input, aiText, context, { warnings })
  }

  const promptRunId = await saveAgentPromptRun(
    input,
    fullPrompt,
    result.rawText ?? aiText,
    Boolean(result.usedFallback),
  )
  result.promptRunId = promptRunId
  revalidateAgentRoutes()

  return result
}

export async function deleteAgentRun(recordId: string): Promise<{ success: boolean; message: string }> {
  try {
    await deletePromptRunById(recordId)
    revalidateAgentRoutes()
    return { success: true, message: "Agent run deleted." }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not delete agent run.",
    }
  }
}

export async function createLearningFromAgentResult(
  result: AgentRunResult,
  input?: Partial<AgentRunInput>,
): Promise<{ success: boolean; message: string; record?: LearningRecord; href?: string }> {
  const findings =
    result.sections.find((s) => s.title === "Key Findings")?.items?.join("\n") ||
    result.sections.find((s) => s.title === "Key Findings")?.content ||
    result.summary
  const recommendation =
    result.sections.find((s) => s.title === "Recommendations")?.items?.[0] ||
    result.sections.find((s) => s.title === "Suggested Actions")?.items?.[0] ||
    result.recommendedActions[0]?.label ||
    "Review agent output and apply relevant recommendations."

  const tags = [
    "agent",
    "creator-ai-agent",
    result.agentId,
    ...(input?.campaignId ? [`campaign:${input.campaignId}`] : []),
    ...(input?.artistName ? [input.artistName] : []),
    ...(input?.platform ? [input.platform] : []),
  ]

  try {
    const record = await createLearning({
      title: `Learning from ${result.agentName}: ${result.title.replace(/ · Fallback$/, "")}`,
      learningType: "Campaign Strategy",
      category: "Opportunity",
      confidence: result.usedFallback ? "Low" : "Medium",
      impact: "Medium",
      status: "Active",
      campaignId: input?.campaignId ?? "",
      campaignName: "",
      artistName: input?.artistName ?? "",
      songTitle: "",
      productName: "",
      platform: input?.platform ?? "",
      sourceType: "creator-ai-agent",
      sourceId: result.promptRunId ?? result.agentId,
      analyticsRecordId: "",
      experimentId: "",
      qualityReviewId: "",
      assetId: "",
      promptRunId: result.promptRunId ?? "",
      playbookId: "",
      insight: result.summary || findings,
      evidence: findings,
      recommendation,
      repeatWhen: "",
      avoidWhen: "",
      tags,
      notes: result.usedFallback
        ? "Created from Creator AI Agent fallback result."
        : "Created from Creator AI Agent result.",
    })
    revalidateAgentRoutes()
    return {
      success: true,
      message: "Learning created from agent result.",
      record,
      href: `/learnings?recordId=${encodeURIComponent(record.id)}`,
    }
  } catch (error) {
    const href = buildLearningUrl({
      title: `Learning from ${result.agentName}`,
      learningType: "Campaign Strategy",
      category: "Opportunity",
      insight: result.summary,
      evidence: findings,
      recommendation,
      campaignId: input?.campaignId,
      platform: input?.platform,
      sourceType: "creator-ai-agent",
      sourceId: result.agentId,
    })
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not create learning.",
      href,
    }
  }
}

export async function createExperimentFromAgentResult(
  result: AgentRunResult,
  input?: Partial<AgentRunInput>,
  recommendationIndex = 0,
): Promise<{ success: boolean; message: string; record?: ExperimentRecord; href?: string }> {
  const recommendations =
    result.sections.find((s) => s.title === "Recommendations")?.items ??
    result.sections.find((s) => s.title === "Suggested Actions")?.items ??
    []
  const recommendation =
    recommendations[recommendationIndex] ||
    result.recommendedActions[0]?.label ||
    "Test agent recommendation"

  try {
    const record = await createExperiment({
      id: createId("experiment"),
      campaignId: input?.campaignId ?? "",
      campaignName: "",
      experimentName: `Agent Test: ${recommendation.slice(0, 80)}`,
      experimentType: input?.agentId === "youtube-growth" ? "YouTube Title" : "Other",
      status: "Idea",
      platform: input?.platform ?? "YouTube",
      hypothesis: `If we ${recommendation.toLowerCase()}, we expect improved performance.`,
      variantA: "",
      variantB: "",
      variantC: "",
      winner: "",
      startDate: "",
      endDate: "",
      resultSummary: "",
      metricFocus: "",
      whatWorked: "",
      whatDidNotWork: "",
      nextTestIdea: result.summary,
      relatedAnalyticsNotes: "",
      variantAMetric: "",
      variantBMetric: "",
      variantCMetric: "",
      analyticsRecordId: "",
      analyticsRecordName: "",
      confidenceNotes: "",
      learningSummary: "",
      notes: `Created from ${result.agentName}. Evidence: ${result.summary}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    revalidateAgentRoutes()
    return {
      success: true,
      message: "Experiment created from agent result.",
      record,
      href: `/experiments?recordId=${encodeURIComponent(record.id)}`,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not create experiment.",
      href: "/experiments",
    }
  }
}

export { previewAgentContext as buildAgentContextPreview }
