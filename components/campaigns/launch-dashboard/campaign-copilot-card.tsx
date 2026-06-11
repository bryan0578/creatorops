"use client"

import * as React from "react"
import Link from "next/link"
import {
  Bot,
  Copy,
  ExternalLink,
  Loader2,
  Sparkles,
  StickyNote,
} from "lucide-react"
import { toast } from "sonner"

import {
  appendCampaignCopilotNote,
  generateCampaignCopilotResponse,
} from "@/lib/actions/campaign-copilot"
import { getAIProviderStatus } from "@/lib/actions/ai-generation"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import type { LaunchDashboardData } from "@/lib/campaign-launch-dashboard"
import {
  CAMPAIGN_COPILOT_MODE_LABELS,
  CAMPAIGN_COPILOT_MODES,
  type CampaignCopilotMode,
} from "@/lib/ai/campaign-copilot-modes"
import { promptRunRunnerHref } from "@/lib/prompt-run-linking"
import type { CampaignRecord } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { PromptPreviewBlock } from "@/components/module/form-layout"
import { RECENT_RECORDS_CARD_CLASS } from "@/components/module/form-layout"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

function buildCampaignQuickLinks(campaignId: string) {
  const q = encodeURIComponent(campaignId)
  return [
    { label: "YouTube Packaging", href: `/youtube-packaging?campaignId=${q}` },
    { label: "YouTube Thumbnails", href: `/youtube-thumbnails?campaignId=${q}` },
    { label: "Social Repurposing", href: `/social-repurposing?campaignId=${q}` },
    { label: "Email Campaigns", href: `/email-campaigns?campaignId=${q}` },
    { label: "Release Planner", href: `/release-planner?campaignId=${q}` },
    { label: "Assets", href: `/assets?campaignId=${q}` },
    { label: "Quality Review", href: `/quality?campaignId=${q}` },
    { label: "Learnings", href: `/learnings?campaignId=${q}` },
    { label: "Data Health", href: "/data-health" },
    { label: "Automation", href: "/automation" },
    { label: "Prompt Runner", href: `/runner?campaignId=${q}` },
  ]
}

export function CampaignCopilotCard({
  campaign,
  launchData,
}: {
  campaign: CampaignRecord
  launchData: LaunchDashboardData
}) {
  const [mode, setMode] = React.useState<CampaignCopilotMode>("next-steps")
  const [userQuestion, setUserQuestion] = React.useState("")
  const [includeLearnings, setIncludeLearnings] = React.useState(true)
  const [includeQualityReviews, setIncludeQualityReviews] = React.useState(true)
  const [includePromptHistory, setIncludePromptHistory] = React.useState(true)
  const [savePromptRun, setSavePromptRun] = React.useState(true)
  const [loading, setLoading] = React.useState(false)
  const [loadingStatus, setLoadingStatus] = React.useState(true)
  const [aiReady, setAiReady] = React.useState(false)
  const [setupHint, setSetupHint] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [output, setOutput] = React.useState("")
  const [lastPromptRunId, setLastPromptRunId] = React.useState<string | null>(null)
  const [savingNote, setSavingNote] = React.useState(false)

  const quickLinks = React.useMemo(
    () => buildCampaignQuickLinks(campaign.id),
    [campaign.id],
  )

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingStatus(true)
      try {
        const status = await getAIProviderStatus()
        if (cancelled) return
        setAiReady(Boolean(status.enabled && status.configured))
        setSetupHint(
          status.configured
            ? null
            : status.setupMessage ??
                "AI provider not configured. Add OPENAI_API_KEY to .env.local and restart the dev server.",
        )
      } catch {
        if (!cancelled) {
          setAiReady(false)
          setSetupHint("Could not load AI provider status.")
        }
      } finally {
        if (!cancelled) setLoadingStatus(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleRun() {
    if (mode === "custom-question" && !userQuestion.trim()) {
      toast.error("Enter a question for custom mode.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await generateCampaignCopilotResponse({
        campaignId: campaign.id,
        mode,
        userQuestion: mode === "custom-question" ? userQuestion : undefined,
        includeLearnings,
        includeQualityReviews,
        includePromptHistory,
        savePromptRun,
      })

      if (!result.success || !result.text) {
        setError(result.error ?? "Campaign Copilot failed.")
        toast.error(result.error ?? "Campaign Copilot failed.")
        return
      }

      setOutput(result.text)
      setLastPromptRunId(result.promptRunId ?? null)
      toast.success("Campaign Copilot complete")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Campaign Copilot failed."
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!output.trim()) return
    try {
      await copyToClipboard(output)
      toast.success("Copied copilot response")
    } catch {
      toast.error("Could not copy")
    }
  }

  async function handleSaveNote() {
    if (!output.trim()) return
    setSavingNote(true)
    try {
      const result = await appendCampaignCopilotNote(
        campaign.id,
        output,
        CAMPAIGN_COPILOT_MODE_LABELS[mode],
      )
      if (result.success) toast.success("Saved to campaign notes")
      else toast.error(result.error ?? "Could not save note")
    } catch {
      toast.error("Could not save note")
    } finally {
      setSavingNote(false)
    }
  }

  const readiness = launchData.readiness

  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4 text-primary" />
              Campaign Copilot
            </CardTitle>
            <CardDescription>
              AI launch strategist — what to do next, what&apos;s missing, and what to
              generate
            </CardDescription>
          </div>
          {readiness.total > 0 ? (
            <Badge variant="secondary">
              {readiness.score}% · {readiness.label}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Missing assets</p>
            <p className="text-lg font-semibold tabular-nums">
              {readiness.assets.filter((a) => !a.completed).length}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Open tasks</p>
            <p className="text-lg font-semibold tabular-nums">
              {launchData.taskProgress.total - launchData.taskProgress.completed}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Health warnings</p>
            <p className="text-lg font-semibold tabular-nums">
              {launchData.healthWarnings.length}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Next actions</p>
            <p className="text-lg font-semibold tabular-nums">
              {launchData.nextActions.length}
            </p>
          </div>
        </div>

        {!loadingStatus && !aiReady && setupHint ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {setupHint}{" "}
            <Link href="/settings" className="underline underline-offset-4">
              Settings → AI Providers
            </Link>
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="copilot-mode">Copilot mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as CampaignCopilotMode)}>
              <SelectTrigger id="copilot-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_COPILOT_MODES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {CAMPAIGN_COPILOT_MODE_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "custom-question" ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="copilot-question">Your question</Label>
              <Textarea
                id="copilot-question"
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                placeholder="What should I do before publishing this song?"
                className="min-h-20"
              />
            </div>
          ) : null}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border border-input"
              checked={includeLearnings}
              onChange={(e) => setIncludeLearnings(e.target.checked)}
            />
            Include learnings
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border border-input"
              checked={includeQualityReviews}
              onChange={(e) => setIncludeQualityReviews(e.target.checked)}
            />
            Include quality reviews
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border border-input"
              checked={includePromptHistory}
              onChange={(e) => setIncludePromptHistory(e.target.checked)}
            />
            Include prompt history
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border border-input"
              checked={savePromptRun}
              onChange={(e) => setSavePromptRun(e.target.checked)}
            />
            Save as Prompt Run
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={loading || loadingStatus || !aiReady}
            onClick={() => void handleRun()}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Running…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Run Copilot
              </>
            )}
          </Button>
          {output.trim() ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy()}>
                <Copy className="size-4" />
                Copy response
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={savingNote}
                onClick={() => void handleSaveNote()}
              >
                {savingNote ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <StickyNote className="size-4" />
                )}
                Save to campaign notes
              </Button>
            </>
          ) : null}
          {lastPromptRunId ? (
            <Link
              href={promptRunRunnerHref(lastPromptRunId, campaign.id)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Open Prompt Run
              <ExternalLink className="size-4" />
            </Link>
          ) : null}
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {output.trim() ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Copilot response</Label>
            <PromptPreviewBlock value={output} emptyMessage="—" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Run Copilot to get campaign-specific next steps, missing assets, quality risks,
            or a prompt plan. Nothing runs automatically — you choose when to generate.
          </p>
        )}

        <div className="space-y-2 border-t border-border/80 pt-4">
          <p className="text-xs font-medium text-muted-foreground">Quick links</p>
          <div className="flex flex-wrap gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
