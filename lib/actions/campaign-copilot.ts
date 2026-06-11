"use server"

import { revalidatePath } from "next/cache"

import { getAutomationReport } from "@/lib/actions/automation-rules"
import { getCampaigns, upsertCampaign } from "@/lib/actions/campaigns"
import { getDataHealthReport } from "@/lib/actions/data-health"
import { getExternalLinks } from "@/lib/actions/external-links"
import { getYouTubeVideosForCampaign } from "@/lib/actions/youtube-integration"
import { getExperiments } from "@/lib/actions/experiments"
import { getLearnings } from "@/lib/actions/learnings"
import { saveLinkedPromptRun } from "@/lib/actions/linked-prompt-runs"
import { getPlaybooks } from "@/lib/actions/playbooks"
import { getPromptRuns } from "@/lib/actions/prompt-runs"
import { getPrompts } from "@/lib/actions/prompts"
import { getQualityReviews } from "@/lib/actions/quality-reviews"
import { getWorkspaceSettings } from "@/lib/actions/workspace-settings"
import {
  buildCampaignCopilotContextFromRecords,
  type CampaignCopilotStructuredContext,
} from "@/lib/ai/campaign-copilot-context"
import {
  buildCampaignCopilotUserPrompt,
  CAMPAIGN_COPILOT_MODES,
  CAMPAIGN_COPILOT_SYSTEM_PROMPT,
  campaignCopilotModeTag,
  campaignCopilotPromptName,
  type CampaignCopilotMode,
} from "@/lib/ai/campaign-copilot-modes"
import { generateAITextWithProvider, resolveProviderStatus } from "@/lib/ai/ai-client"
import { prismaCampaignToCampaignRecord } from "@/lib/data/campaigns"
import { loadCampaignLinkableStoreSlice } from "@/lib/data/campaign-linkable-store"
import { prisma } from "@/lib/prisma"
import type { CampaignRecord } from "@/lib/types"

const REVALIDATE_PATHS = ["/campaigns", "/runner", "/copilot", "/activity", "/"]

function revalidateCopilotRoutes() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path)
  }
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message
    if (/rate limit|429|quota|billing/i.test(msg)) {
      return "Rate limit or quota reached. Wait a moment or check your OpenAI billing."
    }
    if (/timed out|abort/i.test(msg)) {
      return "Campaign Copilot timed out. Try a shorter question or simpler mode."
    }
    if (/not configured|api key|invalid api key/i.test(msg)) {
      return msg
    }
    return "Campaign Copilot failed. Check AI provider settings and try again."
  }
  return "Campaign Copilot failed."
}

export interface GenerateCampaignCopilotInput {
  campaignId: string
  mode: string
  userQuestion?: string
  includeLearnings?: boolean
  includeQualityReviews?: boolean
  includePromptHistory?: boolean
  savePromptRun?: boolean
}

export interface GenerateCampaignCopilotResult {
  success: boolean
  text?: string
  promptRunId?: string
  structured?: CampaignCopilotStructuredContext
  assembledPrompt?: string
  error?: string
}

function isValidMode(mode: string): mode is CampaignCopilotMode {
  return CAMPAIGN_COPILOT_MODES.includes(mode as CampaignCopilotMode)
}

async function loadCampaignRecord(campaignId: string): Promise<CampaignRecord> {
  const row = await prisma.campaign.findUnique({ where: { id: campaignId.trim() } })
  if (!row) throw new Error("Campaign not found.")
  return prismaCampaignToCampaignRecord(row)
}

export async function getCampaignCopilotContext(campaignId: string): Promise<{
  structured: CampaignCopilotStructuredContext
  markdown: string
}> {
  const [
    campaign,
    store,
    workspaceSettings,
    learnings,
    qualityReviews,
    experiments,
    promptRuns,
    dataHealth,
    automationReport,
    prompts,
    playbooks,
    externalLinks,
    youtubeVideos,
  ] = await Promise.all([
    loadCampaignRecord(campaignId),
    loadCampaignLinkableStoreSlice(),
    getWorkspaceSettings(),
    getLearnings(),
    getQualityReviews(),
    getExperiments(),
    getPromptRuns(),
    getDataHealthReport().catch(() => null),
    getAutomationReport({ campaignId }).catch(() => null),
    getPrompts(),
    getPlaybooks(),
    getExternalLinks(),
    getYouTubeVideosForCampaign(campaignId),
  ])

  return buildCampaignCopilotContextFromRecords(
    campaign,
    store,
    workspaceSettings,
    learnings,
    {
      qualityReviews,
      experiments,
      promptRuns,
      learnings,
      dataHealth,
      automationReport,
      prompts,
      playbooks,
      externalLinks,
      youtubeVideos,
    },
  )
}

export async function generateCampaignCopilotResponse(
  input: GenerateCampaignCopilotInput,
): Promise<GenerateCampaignCopilotResult> {
  try {
    const campaignId = input.campaignId.trim()
    if (!campaignId) {
      return { success: false, error: "Campaign id is required." }
    }

    const mode = input.mode.trim()
    if (!isValidMode(mode)) {
      return { success: false, error: "Invalid copilot mode." }
    }

    if (mode === "custom-question" && !input.userQuestion?.trim()) {
      return { success: false, error: "Enter a question for custom mode." }
    }

    const settings = await getWorkspaceSettings()
    const status = resolveProviderStatus({
      enabled: settings.aiGenerationEnabled,
      preferredProvider: settings.aiDefaultProvider,
      preferredModel: settings.aiDefaultModel,
    })

    if (!settings.aiGenerationEnabled) {
      return {
        success: false,
        error: "AI generation is disabled. Enable it in Settings → AI Providers.",
      }
    }

    if (!status.configured || status.provider === "manual") {
      return {
        success: false,
        error:
          status.setupMessage ??
          "AI provider not configured. Add OPENAI_API_KEY to .env.local and restart the dev server.",
      }
    }

    const { structured, markdown } = await getCampaignCopilotContext(campaignId)

    let contextMarkdown = markdown
    if (input.includeLearnings === false) {
      contextMarkdown = contextMarkdown.replace(
        /\n## Reusable learnings[\s\S]*?(?=\n## |\n## Copilot runs|$)/,
        "\n## Reusable learnings\n- Excluded by user preference\n",
      )
    }
    if (input.includeQualityReviews === false) {
      contextMarkdown = contextMarkdown.replace(
        /\n## Quality reviews[\s\S]*?(?=\n## |\n## Copilot runs|$)/,
        "\n## Quality reviews\n- Excluded by user preference\n",
      )
    }
    if (input.includePromptHistory === false) {
      contextMarkdown = contextMarkdown.replace(
        /\n## Prompt history[\s\S]*?(?=\n## |\n## Copilot runs|$)/,
        "\n## Prompt history\n- Excluded by user preference\n",
      )
    }

    const style = settings.aiSystemStylePreference?.trim()
    const systemPrompt = [
      CAMPAIGN_COPILOT_SYSTEM_PROMPT,
      style ? `\nSTYLE PREFERENCE\n${style}` : "",
      settings.defaultBrandTone?.trim()
        ? `\nBrand tone: ${settings.defaultBrandTone.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join("\n")
      .trim()

    const userPrompt = buildCampaignCopilotUserPrompt(
      mode,
      contextMarkdown,
      input.userQuestion,
    )

    const result = await generateAITextWithProvider(status.provider, {
      provider: status.provider,
      model: status.model,
      systemPrompt,
      userPrompt,
      temperature: settings.aiTemperature,
      maxTokens: settings.aiMaxOutputTokens,
    })

    let promptRunId: string | undefined
    const shouldSave =
      input.savePromptRun ?? settings.aiSaveGenerationsAsPromptRuns

    if (shouldSave && result.text.trim()) {
      const saved = await saveLinkedPromptRun({
        completedPrompt: userPrompt,
        aiResponse: result.text,
        promptName: campaignCopilotPromptName(mode),
        moduleType: "Campaign Copilot",
        campaignId,
        campaignName: structured.campaignName,
        notes: `Campaign Copilot · ${campaignCopilotPromptName(mode)}`,
        tags: ["campaign-copilot", campaignCopilotModeTag(mode), "ai-generated"],
        runType: "Copilot",
      })
      promptRunId = saved.id
      revalidateCopilotRoutes()
    }

    return {
      success: true,
      text: result.text,
      promptRunId,
      structured,
      assembledPrompt: ["SYSTEM", systemPrompt, "", "USER", userPrompt].join("\n"),
    }
  } catch (error) {
    return { success: false, error: safeErrorMessage(error) }
  }
}

/** Append copilot output to campaign notes (user-initiated). */
export async function appendCampaignCopilotNote(
  campaignId: string,
  noteBody: string,
  modeLabel: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const campaigns = await getCampaigns()
    const campaign = campaigns.find((item) => item.id === campaignId.trim())
    if (!campaign) return { success: false, error: "Campaign not found." }

    const stamp = new Date().toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })
    const block = [
      "",
      "---",
      `Campaign Copilot (${modeLabel}) · ${stamp}`,
      noteBody.trim(),
    ].join("\n")

    await upsertCampaign({
      ...campaign,
      notes: `${campaign.notes.trim()}${block}`.trim(),
      updatedAt: Date.now(),
    })
    revalidateCopilotRoutes()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not save note.",
    }
  }
}

/** Lightweight snapshot for UI without AI call. */
export async function getCampaignCopilotSnapshot(campaignId: string) {
  const { structured } = await getCampaignCopilotContext(campaignId)
  return {
    readinessScore: structured.readinessScore,
    readinessLabel: structured.readinessLabel,
    missingAssetCount: structured.missingAssets.length,
    openTaskCount: structured.tasks.open,
    overdueTaskCount: structured.tasks.overdue,
    qualityReviewCount: structured.quality.count,
    copilotRunCount: structured.copilotRunCount,
  }
}

export async function campaignHasCopilotAnalysis(campaignId: string): Promise<boolean> {
  const runs = await getPromptRuns()
  return runs.some(
    (run) =>
      run.campaignId === campaignId &&
      (run.moduleType === "Campaign Copilot" ||
        run.tags.includes("campaign-copilot") ||
        run.runType === "Copilot"),
  )
}
