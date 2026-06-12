import type { DataHealthIssue, DataHealthScanInput } from "@/lib/data/data-health"
import { AGENT_RUN_TYPE } from "@/lib/agents/prompts"
import { isOpenAIConfigured } from "@/lib/ai/providers/openai"
import { isAnthropicConfigured } from "@/lib/ai/providers/anthropic"

function issueId(parts: string[]): string {
  return parts.filter(Boolean).join(":")
}

function pushIssue(issues: DataHealthIssue[], issue: DataHealthIssue) {
  if (issues.some((item) => item.id === issue.id)) return
  issues.push(issue)
}

/** Agent-related data health hints (read-only). */
export function scanCreatorAgentsWarnings(
  input: DataHealthScanInput,
  issues: DataHealthIssue[],
): void {
  try {
    const aiConfigured = isOpenAIConfigured() || isAnthropicConfigured()
    if (!aiConfigured) {
      pushIssue(issues, {
        id: issueId(["agents", "ai-provider"]),
        severity: "warning",
        category: "configuration",
        title: "AI provider not configured for Creator AI Agents",
        description:
          "Agents will use deterministic fallback summaries until an AI provider is configured in Settings.",
        sourceType: "creator-ai-agent",
        sourceId: "ai-provider",
        href: "/settings",
        suggestedAction: "Configure AI provider",
      })
    }

    const agentRuns =
      input.promptRuns?.filter(
        (run) => run.runType === AGENT_RUN_TYPE || run.tags.includes("creator-ai-agent"),
      ) ?? []

    const publishedCampaigns = input.campaigns.filter((campaign) =>
      /published|live|complete|released/i.test(campaign.status ?? ""),
    )

    for (const campaign of publishedCampaigns.slice(0, 5)) {
      const hasQa = agentRuns.some(
        (run) =>
          run.campaignId === campaign.id &&
          (run.inputValues?.agentId === "campaign-qa" || run.tags.includes("campaign-qa")),
      )
      if (hasQa) continue
      pushIssue(issues, {
        id: issueId(["agents", "campaign-qa", campaign.id]),
        severity: "info",
        category: "incomplete-records",
        title: `No Campaign QA agent run: ${campaign.campaignName}`,
        description: "Published or live campaigns benefit from a Campaign QA agent review.",
        sourceType: "campaign",
        sourceId: campaign.id,
        campaignId: campaign.id,
        campaignName: campaign.campaignName,
        href: `/agents?agentId=campaign-qa&campaignId=${encodeURIComponent(campaign.id)}&tab=run`,
        suggestedAction: "Run Campaign QA Agent",
      })
    }

    const activeCampaigns = input.campaigns.filter((campaign) =>
      /active|planning|pre-launch|in progress/i.test(campaign.status ?? ""),
    )
    for (const campaign of activeCampaigns.slice(0, 4)) {
      const recentAgent = agentRuns.find((run) => run.campaignId === campaign.id)
      if (recentAgent) continue
      pushIssue(issues, {
        id: issueId(["agents", "release-strategist", campaign.id]),
        severity: "info",
        category: "incomplete-records",
        title: `No agent review for active campaign: ${campaign.campaignName}`,
        description: "Consider running Release Strategist or Campaign QA before launch.",
        sourceType: "campaign",
        sourceId: campaign.id,
        campaignId: campaign.id,
        campaignName: campaign.campaignName,
        href: `/agents?agentId=release-strategist&campaignId=${encodeURIComponent(campaign.id)}&tab=run`,
        suggestedAction: "Run Release Strategist Agent",
      })
    }
  } catch {
    // must never break scan
  }
}
