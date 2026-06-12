import type {
  AgentContextBundle,
  AgentOutputSection,
  AgentRecommendedAction,
  AgentRunInput,
  AgentRunResult,
} from "@/lib/agents/types"
import { getAgentById } from "@/lib/agents/registry"
import { parseAgentOutput } from "@/lib/agents/output-parser"
import { loadFeedbackLoopDataset } from "@/lib/actions/feedback-loop"
import { buildDetectedPatterns } from "@/lib/patterns/detectors"
import { buildFeedbackSuggestions } from "@/lib/feedback-loop/suggestions"

function baseActions(input: AgentRunInput): AgentRecommendedAction[] {
  const actions: AgentRecommendedAction[] = []
  if (input.campaignId) {
    actions.push({
      label: "Open Campaign",
      actionType: "navigate",
      href: `/campaigns?campaignId=${encodeURIComponent(input.campaignId)}`,
    })
  }
  actions.push({ label: "Open Creator AI Agents", actionType: "navigate", href: "/agents" })
  return actions
}

function section(title: string, content: string, items?: string[]): AgentOutputSection {
  return { title, content, items }
}

async function loadDataset() {
  try {
    return await loadFeedbackLoopDataset()
  } catch {
    return null
  }
}

export async function buildAgentFallbackResult(
  input: AgentRunInput,
  context: AgentContextBundle,
): Promise<AgentRunResult> {
  const agent = getAgentById(input.agentId)
  const agentName = agent?.name ?? input.agentId
  const dataset = await loadDataset()
  const warnings = [...(context.warnings ?? [])]
  warnings.push("AI provider unavailable — showing deterministic fallback summary.")

  const sections: AgentOutputSection[] = []
  const recommendedActions = baseActions(input)
  const relatedRecords = context.relatedRecords

  switch (input.agentId) {
    case "release-strategist": {
      const campaign = dataset?.campaigns.find((c) => c.id === input.campaignId)
      const assets =
        dataset?.assets.filter((a) => !input.campaignId || a.campaignId === input.campaignId) ?? []
      const videos =
        dataset?.youtubeVideos.filter((v) => !input.campaignId || v.campaignId === input.campaignId) ??
        []
      const reviews =
        dataset?.qualityReviews.filter((r) => !input.campaignId || r.campaignId === input.campaignId) ??
        []
      const learnings =
        dataset?.learnings.filter((l) => !input.campaignId || l.campaignId === input.campaignId) ?? []

      const missingAssets = assets.length === 0 ? ["No linked assets found for this campaign."] : []
      const missingAnalytics =
        (dataset?.analyticsRecords.filter((a) =>
          campaign ? a.relatedCampaign?.toLowerCase() === campaign.campaignName.toLowerCase() : true,
        ).length ?? 0) === 0
          ? ["No analytics records linked to this release."]
          : []
      const staleVideos = videos.filter((v) => !v.lastSyncedAt).map((v) => v.title || v.id)
      const missingReviews = reviews.length === 0 ? ["No quality reviews for this campaign."] : []
      const missingLearnings =
        learnings.length === 0 ? ["No retrospective learning captured yet."] : []

      sections.push(
        section(
          "Summary",
          campaign
            ? `Fallback release review for ${campaign.campaignName} (${campaign.status}).`
            : "Fallback release review using available local records.",
        ),
        section("Key Findings", "Local data scan complete.", [
          `${assets.length} assets`,
          `${videos.length} videos`,
          `${reviews.length} quality reviews`,
          `${learnings.length} learnings`,
        ]),
        section("Risks / Gaps", "Review these gaps before launch.", [
          ...missingAssets,
          ...missingAnalytics,
          ...missingReviews,
          ...missingLearnings,
          ...(staleVideos.length > 0 ? [`Stale video stats: ${staleVideos.join(", ")}`] : []),
        ]),
        section("Recommendations", "Address missing records and run QA before publishing.", [
          "Link final assets and Drive files to the campaign.",
          "Sync YouTube stats and add analytics snapshots.",
          "Complete a quality review and capture a retrospective learning.",
        ]),
        section("Suggested Actions", "Use CreatorOps modules to fill gaps.", [
          "Open Assets and upload/link release artwork.",
          "Run Campaign QA Agent once AI provider is configured.",
          "Add a learning after publish.",
        ]),
      )

      if (input.campaignId) {
        recommendedActions.unshift({
          label: "Open Assets",
          actionType: "navigate",
          href: `/assets?campaignId=${encodeURIComponent(input.campaignId)}`,
        })
        recommendedActions.unshift({
          label: "Open Quality Reviews",
          actionType: "navigate",
          href: `/quality?campaignId=${encodeURIComponent(input.campaignId)}`,
        })
      }
      break
    }

    case "youtube-growth": {
      const videos = dataset?.youtubeVideos ?? []
      const unlinked = videos.filter((v) => !v.campaignId).map((v) => v.title || v.id)
      const stale = videos.filter((v) => !v.lastSyncedAt).map((v) => v.title || v.id)
      const noReview = videos.filter(
        (v) =>
          !(dataset?.qualityReviews ?? []).some(
            (r) => r.sourceRecordId === v.id || r.sourceRecordType.toLowerCase().includes("youtube"),
          ),
      )

      sections.push(
        section("Summary", "Fallback YouTube growth scan from local Video Intelligence data."),
        section("Key Findings", "Channel/video linkage and review coverage.", [
          `${videos.length} imported videos`,
          `${unlinked.length} unlinked videos`,
          `${stale.length} videos with stale/missing stats`,
        ]),
        section("Risks / Gaps", "Packaging and performance signals may be incomplete.", [
          ...(unlinked.length > 0 ? [`Unlinked videos: ${unlinked.slice(0, 5).join(", ")}`] : []),
          ...(stale.length > 0 ? [`Stale stats: ${stale.slice(0, 5).join(", ")}`] : []),
          ...(noReview.length > 0
            ? [`Videos without quality review: ${noReview.slice(0, 5).map((v) => v.title || v.id).join(", ")}`]
            : []),
        ]),
        section("Recommendations", "Prioritize packaging tests on high-potential uploads.", [
          "Link videos to campaigns for better context.",
          "Sync stats before comparing performance.",
          "Run title/thumbnail experiments on top candidates.",
        ]),
      )
      recommendedActions.unshift({
        label: "Open Video Intelligence",
        actionType: "navigate",
        href: input.sourceRecordId
          ? `/videos?recordId=${encodeURIComponent(input.sourceRecordId)}`
          : "/videos",
      })
      recommendedActions.unshift({
        label: "Open Pattern Detection",
        actionType: "navigate",
        href: "/patterns",
      })
      break
    }

    case "campaign-qa": {
      const campaign = dataset?.campaigns.find((c) => c.id === input.campaignId)
      const blockers: string[] = []
      if (!campaign) blockers.push("Campaign not selected or not found.")
      if (campaign && !campaign.launchDate) blockers.push("Launch date missing.")
      const assetCount =
        dataset?.assets.filter((a) => a.campaignId === input.campaignId).length ?? 0
      if (input.campaignId && assetCount === 0) blockers.push("No assets linked to campaign.")
      const checklistDone =
        campaign?.publishingChecklist?.items?.filter((i) => i.status === "done").length ?? 0
      const checklistTotal = campaign?.publishingChecklist?.items?.length ?? 0

      sections.push(
        section(
          "Summary",
          campaign
            ? `Fallback QA for ${campaign.campaignName}. Readiness based on local checklist and linked records.`
            : "Fallback campaign QA — select a campaign for deeper audit.",
        ),
        section("Key Findings", "Checklist and linked record scan.", [
          checklistTotal > 0
            ? `Publishing checklist: ${checklistDone}/${checklistTotal} complete`
            : "No publishing checklist items found",
          `${assetCount} linked assets`,
        ]),
        section("Risks / Gaps", "Resolve blockers before launch.", blockers),
        section("Recommendations", "Complete checklist items and run full QA with AI when available.", [
          "Verify external links and Drive files.",
          "Confirm analytics tracking is ready.",
          "Capture a quality review pre-launch.",
        ]),
      )
      recommendedActions.unshift({
        label: "Open Data Health",
        actionType: "navigate",
        href: "/data-health",
      })
      break
    }

    case "learning-synthesizer": {
      const learnings = dataset?.learnings ?? []
      const patterns = dataset ? buildDetectedPatterns(dataset, { limit: 8 }) : []
      const suggestions = dataset ? buildFeedbackSuggestions(dataset, { limit: 8 }) : []

      sections.push(
        section("Summary", "Fallback synthesis from learnings, patterns, and feedback-loop suggestions."),
        section("Key Findings", "Recent strategic signals in local data.", [
          `${learnings.length} learnings available`,
          `${patterns.length} patterns detected`,
          `${suggestions.length} feedback-loop suggestions`,
        ]),
        section(
          "Recommendations",
          "Convert high-confidence signals into playbooks and AI context.",
          suggestions.slice(0, 5).map((s) => s.title),
        ),
        section(
          "Suggested Actions",
          "Review and capture durable strategy.",
          patterns.slice(0, 4).map((p) => `${p.title} (${p.patternType})`),
        ),
      )
      recommendedActions.unshift(
        { label: "Open Learnings", actionType: "navigate", href: "/learnings" },
        { label: "Open Feedback Loop", actionType: "navigate", href: "/feedback-loop" },
        { label: "Open Playbooks", actionType: "navigate", href: "/playbooks" },
      )
      break
    }

    case "product-strategist": {
      const listings = dataset?.productListings ?? []
      const merch = dataset?.merchIdeas ?? []
      const mockups = dataset?.mockupPrompts ?? []
      sections.push(
        section("Summary", "Fallback product strategy scan."),
        section("Key Findings", "Product factory record counts.", [
          `${listings.length} product listings`,
          `${merch.length} merch ideas`,
          `${mockups.length} mockup prompts`,
        ]),
        section("Risks / Gaps", "Listing and visual gaps.", [
          listings.length === 0 ? "No product listings found." : "",
          mockups.length === 0 ? "No mockup prompts found." : "",
        ].filter(Boolean)),
        section("Recommendations", "Improve listings and mockups before launch.", [
          "Complete final titles/descriptions for listings.",
          "Generate mockups for hero products.",
          "Link products to a launch campaign.",
        ]),
      )
      recommendedActions.unshift({
        label: "Open Product Listings",
        actionType: "navigate",
        href: input.sourceRecordId
          ? `/product-listings?recordId=${encodeURIComponent(input.sourceRecordId)}`
          : "/product-listings",
      })
      break
    }

    case "prompt-optimizer":
    default: {
      sections.push(
        section("Summary", "Fallback prompt optimization scan."),
        section("Key Findings", "Review prompt library and recent runs for gaps.", [
          context.missingData.includes("Prompts")
            ? "No prompt templates or runs in context."
            : "Prompt history included in context preview.",
        ]),
        section("Recommendations", "Improve prompt clarity and output structure.", [
          "Add explicit output format instructions.",
          "Include campaign/artist context placeholders.",
          "Reference learnings and playbooks in prompts.",
        ]),
      )
      recommendedActions.unshift(
        { label: "Open Prompt Library", actionType: "navigate", href: "/prompts" },
        { label: "Open Prompt Runner", actionType: "navigate", href: "/runner" },
      )
      break
    }
  }

  if (context.missingData.length > 0) {
    sections.push(
      section("Records to Review", "Missing or limited data reduced analysis depth.", context.missingData),
    )
  }

  const summary = sections.find((s) => s.title === "Summary")?.content ?? `${agentName} fallback result.`
  const rawText = sections.map((s) => `# ${s.title}\n${s.content}${s.items?.length ? `\n${s.items.map((i) => `- ${i}`).join("\n")}` : ""}`).join("\n\n")

  return {
    agentId: input.agentId,
    agentName,
    title: `${agent?.shortName ?? "Agent"} · Fallback`,
    summary,
    sections,
    recommendedActions,
    relatedRecords,
    rawText,
    usedFallback: true,
    warnings,
    contextPreview: context.markdown,
  }
}

export function buildAgentResultFromAiText(
  input: AgentRunInput,
  aiText: string,
  context: AgentContextBundle,
  options?: { promptRunId?: string; warnings?: string[] },
): AgentRunResult {
  const agent = getAgentById(input.agentId)
  const parsed = parseAgentOutput(aiText)

  return {
    agentId: input.agentId,
    agentName: agent?.name ?? input.agentId,
    title: `${agent?.shortName ?? "Agent"} · ${parsed.summary.slice(0, 80) || "Analysis"}`,
    summary: parsed.summary,
    sections: parsed.sections,
    recommendedActions: [...parsed.recommendedActions, ...baseActions(input)],
    relatedRecords: context.relatedRecords,
    rawText: aiText,
    usedFallback: false,
    warnings: [...(context.warnings ?? []), ...(options?.warnings ?? [])],
    promptRunId: options?.promptRunId,
    contextPreview: context.markdown,
  }
}
