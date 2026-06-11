"use client"

import * as React from "react"
import Link from "next/link"
import { Copy, Eye, EyeOff, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { generateAIText, getAIProviderStatus } from "@/lib/actions/ai-generation"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import type { AIProviderStatus } from "@/lib/ai/types"
import type { CampaignLinkedRecordType, Prompt, PromptRunModuleType } from "@/lib/types"
import { AITemplateSelector } from "@/components/ai/ai-template-selector"
import { Button, buttonVariants } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PromptPreviewBlock } from "@/components/module/form-layout"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type AIGenerationPanelProps = {
  moduleType: PromptRunModuleType
  promptText: string
  campaignId?: string
  campaignName?: string
  promptId?: string
  promptName?: string
  outputRecordId?: string
  outputRecordType?: CampaignLinkedRecordType
  inputValues?: Record<string, string>
  experimentId?: string
  onGenerated?: (text: string, promptRunId?: string) => void
  onInsertResponse?: (text: string) => void
  className?: string
  compact?: boolean
  /** When set, shows AI template selector filtered by module slug. */
  templateModuleSlug?: string
  selectedTemplate?: Prompt | null
  onTemplateChange?: (template: Prompt | null) => void
  /** When set (e.g. Prompt Runner), uses this template without showing the selector. */
  generationTemplate?: Prompt | null
  /**
   * augment — template instructions prepended to module task (default).
   * primary — prompt text already contains the template (Prompt Runner).
   */
  generationTemplateMode?: "augment" | "primary"
}

export function AIGenerationPanel({
  moduleType,
  promptText,
  campaignId,
  campaignName,
  promptId,
  promptName,
  outputRecordId,
  outputRecordType,
  inputValues,
  experimentId,
  onGenerated,
  onInsertResponse,
  className,
  compact = false,
  templateModuleSlug,
  selectedTemplate: selectedTemplateProp,
  onTemplateChange,
  generationTemplate,
  generationTemplateMode = "augment",
}: AIGenerationPanelProps) {
  const [internalTemplate, setInternalTemplate] = React.useState<Prompt | null>(null)
  const selectedTemplate =
    selectedTemplateProp !== undefined ? selectedTemplateProp : internalTemplate
  const setSelectedTemplate = onTemplateChange ?? setInternalTemplate
  const activeTemplate = generationTemplate ?? selectedTemplate
  const [status, setStatus] = React.useState<AIProviderStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = React.useState(true)
  const [generating, setGenerating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [output, setOutput] = React.useState("")
  const [assembledPrompt, setAssembledPrompt] = React.useState("")
  const [showPreview, setShowPreview] = React.useState(false)
  const [includeCampaignContext, setIncludeCampaignContext] = React.useState(true)
  const [includeLearnings, setIncludeLearnings] = React.useState(true)
  const [includeQualityNotes, setIncludeQualityNotes] = React.useState(true)
  const [savePromptRun, setSavePromptRun] = React.useState(true)
  const [lastPromptRunId, setLastPromptRunId] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingStatus(true)
      try {
        const next = await getAIProviderStatus()
        if (!cancelled) setStatus(next)
      } catch {
        if (!cancelled) {
          setStatus({
            enabled: false,
            configured: false,
            provider: "openai",
            model: "",
            availableProviders: [],
            setupMessage: "Could not load AI provider status.",
          })
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

  const canGenerate =
    Boolean(status?.enabled && status?.configured) &&
    Boolean(promptText.trim()) &&
    !generating

  async function handleGenerate() {
    if (!promptText.trim()) {
      toast.error("Add prompt text before generating.")
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const result = await generateAIText({
        moduleType,
        promptText,
        campaignId,
        campaignName,
        promptId,
        promptName: promptName ?? `${moduleType} generation`,
        templateInstructions:
          generationTemplateMode === "primary"
            ? undefined
            : activeTemplate?.promptText,
        templateOutputFormat: activeTemplate?.outputFormat,
        templatePromptId: activeTemplate?.id,
        templatePromptName: activeTemplate?.name,
        includeCampaignContext: includeCampaignContext && Boolean(campaignId),
        includeLearnings,
        includeQualityNotes,
        savePromptRun,
        outputRecordId,
        outputRecordType,
        inputValues,
        experimentId,
      })

      if (!result.success || !result.text) {
        setError(result.error ?? "AI generation failed.")
        toast.error(result.error ?? "AI generation failed.")
        return
      }

      setOutput(result.text)
      if (result.assembledPrompt) setAssembledPrompt(result.assembledPrompt)
      if (result.promptRunId) setLastPromptRunId(result.promptRunId)
      onGenerated?.(result.text, result.promptRunId)
      onInsertResponse?.(result.text)
      toast.success("AI generation complete")
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI generation failed."
      setError(message)
      toast.error(message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleCopyOutput() {
    if (!output.trim()) return
    try {
      await copyToClipboard(output)
      toast.success("Copied AI output")
    } catch {
      toast.error("Could not copy")
    }
  }

  const setupHint =
    status?.setupMessage ??
    "AI provider not configured. Add OPENAI_API_KEY to .env.local and restart the dev server."

  return (
    <div className={className ? `space-y-4 ${className}` : "space-y-4"}>
      {templateModuleSlug ? (
        <AITemplateSelector
          moduleSlug={templateModuleSlug}
          selectedTemplate={selectedTemplate}
          onSelect={setSelectedTemplate}
          compact={compact}
        />
      ) : null}
    <Card className="border-border/80">
      <CardHeader className={compact ? "pb-2" : undefined}>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          Generate with AI
        </CardTitle>
        <CardDescription>
          {loadingStatus
            ? "Checking AI provider…"
            : status?.configured
              ? `Provider: ${status.provider} · Model: ${status.model || "default"}`
              : setupHint}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!loadingStatus && !status?.enabled ? (
          <p className="text-sm text-muted-foreground">
            Enable AI generation in{" "}
            <Link href="/settings" className="text-primary underline-offset-4 hover:underline">
              Settings → AI Providers
            </Link>
            .
          </p>
        ) : null}

        {!loadingStatus && status?.enabled && !status.configured ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">{setupHint}</p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border border-input"
              checked={includeCampaignContext}
              disabled={!campaignId}
              onChange={(e) => setIncludeCampaignContext(e.target.checked)}
            />
            Include campaign context
          </label>
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
              checked={includeQualityNotes}
              onChange={(e) => setIncludeQualityNotes(e.target.checked)}
            />
            Include quality notes
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

        {campaignId ? (
          <p className="text-xs text-muted-foreground">
            Campaign: {campaignName || campaignId}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={!canGenerate} onClick={() => void handleGenerate()}>
            {generating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Generate with AI
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview((v) => !v)}
            disabled={!promptText.trim() && !assembledPrompt}
          >
            {showPreview ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {showPreview ? "Hide preview" : "Prompt preview"}
          </Button>
          {output.trim() ? (
            <Button type="button" variant="outline" size="sm" onClick={() => void handleCopyOutput()}>
              <Copy className="size-4" />
              Copy output
            </Button>
          ) : null}
          {lastPromptRunId ? (
            <Link
              href={`/runner?recordId=${encodeURIComponent(lastPromptRunId)}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Open Prompt Run
            </Link>
          ) : null}
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {showPreview ? (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Assembled prompt (after generation)</Label>
            <PromptPreviewBlock
              value={assembledPrompt || promptText}
              emptyMessage="Generate to see the full assembled prompt, or use the module prompt above."
            />
          </div>
        ) : null}

        {output.trim() ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Generated output</Label>
            <PromptPreviewBlock value={output} emptyMessage="—" />
            {onInsertResponse ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onInsertResponse(output)}
              >
                Insert into AI Response field
              </Button>
            ) : null}
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          API keys are read from <code className="text-xs">.env.local</code> and never exposed to the
          browser. Manual copy/paste still works if AI is off.
        </p>
      </CardContent>
    </Card>
    </div>
  )
}
