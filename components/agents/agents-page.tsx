"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Bot,
  Copy,
  FlaskConical,
  Lightbulb,
  Loader2,
  RefreshCw,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Video,
  Wand2,
} from "lucide-react"
import { toast } from "sonner"

import {
  createExperimentFromAgentResult,
  createLearningFromAgentResult,
  deleteAgentRun,
  getAgentRunById,
  getAgentRunHistory,
  getCreatorAgentsList,
  previewCreatorAgentContext,
  runCreatorAgent,
} from "@/lib/actions/agents"
import { getAIProviderStatus } from "@/lib/actions/ai-generation"
import { getCampaigns } from "@/lib/actions/campaigns"
import type {
  AgentContextInclude,
  AgentRunInput,
  AgentRunResult,
  CreatorAgent,
} from "@/lib/agents/types"
import { DEFAULT_AGENT_INCLUDE } from "@/lib/agents/types"
import { parseStoredAgentResult } from "@/lib/agents/output-parser"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import { agentHref } from "@/lib/agents/routes"
import type { CampaignRecord, PromptRun } from "@/lib/types"
import { ModulePageHeader } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { ModuleShell, ModuleTabPanel, ModuleWorkflowTabs } from "@/components/module/form-layout"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const AGENT_TABS = [
  { value: "agents", label: "Agents" },
  { value: "run", label: "Run Agent" },
  { value: "results", label: "Results" },
  { value: "recommendations", label: "Recommendations" },
  { value: "history", label: "History" },
  { value: "settings", label: "Settings" },
] as const

const AGENT_ICONS = {
  Rocket,
  Video,
  ShoppingBag,
  Wand2,
  ShieldCheck,
  Lightbulb,
} as const

const CONTEXT_TOGGLES: { key: keyof AgentContextInclude; label: string }[] = [
  { key: "analytics", label: "Analytics" },
  { key: "videos", label: "Videos" },
  { key: "assets", label: "Assets" },
  { key: "driveFiles", label: "Drive Files" },
  { key: "qualityReviews", label: "Quality Reviews" },
  { key: "learnings", label: "Learnings" },
  { key: "experiments", label: "Experiments" },
  { key: "patterns", label: "Patterns" },
  { key: "qualityPerformance", label: "Quality/Performance" },
  { key: "feedbackLoop", label: "Feedback Loop" },
  { key: "playbooks", label: "Playbooks" },
  { key: "prompts", label: "Prompts" },
]

function AgentIcon({ name }: { name: string }) {
  const Icon = AGENT_ICONS[name as keyof typeof AGENT_ICONS] ?? Bot
  return <Icon className="size-5 text-primary" />
}

export function AgentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const tabParam = searchParams.get("tab") ?? "agents"
  const agentIdParam = searchParams.get("agentId") ?? ""
  const campaignIdParam = searchParams.get("campaignId") ?? ""
  const recordIdParam = searchParams.get("recordId") ?? ""
  const sourceRecordTypeParam = searchParams.get("sourceRecordType") ?? ""
  const sourceRecordIdParam = searchParams.get("sourceRecordId") ?? ""

  const [activeTab, setActiveTab] = React.useState(
    AGENT_TABS.some((t) => t.value === tabParam) ? tabParam : "agents",
  )
  const [agents, setAgents] = React.useState<CreatorAgent[]>([])
  const [campaigns, setCampaigns] = React.useState<CampaignRecord[]>([])
  const [history, setHistory] = React.useState<PromptRun[]>([])
  const [loadingAgents, setLoadingAgents] = React.useState(true)
  const [loadingHistory, setLoadingHistory] = React.useState(true)
  const [running, setRunning] = React.useState(false)
  const [previewing, setPreviewing] = React.useState(false)
  const [aiReady, setAiReady] = React.useState(false)
  const [setupHint, setSetupHint] = React.useState<string | null>(null)
  const [contextPreview, setContextPreview] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<AgentRunResult | null>(null)
  const [lastInput, setLastInput] = React.useState<AgentRunInput | null>(null)

  const [form, setForm] = React.useState<AgentRunInput>({
    agentId: agentIdParam || "campaign-qa",
    campaignId: campaignIdParam,
    artistName: "",
    platform: "",
    sourceRecordType: sourceRecordTypeParam,
    sourceRecordId: sourceRecordIdParam,
    userGoal: "",
    extraInstructions: "",
    includeData: { ...DEFAULT_AGENT_INCLUDE },
    saveRun: true,
  })

  React.useEffect(() => {
    setForm((prev) => ({
      ...prev,
      agentId: agentIdParam || prev.agentId,
      campaignId: campaignIdParam || prev.campaignId,
      sourceRecordType: sourceRecordTypeParam || prev.sourceRecordType,
      sourceRecordId: sourceRecordIdParam || prev.sourceRecordId,
    }))
  }, [agentIdParam, campaignIdParam, sourceRecordTypeParam, sourceRecordIdParam])

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingAgents(true)
      try {
        const [agentList, campaignList, status] = await Promise.all([
          getCreatorAgentsList(),
          getCampaigns(),
          getAIProviderStatus(),
        ])
        if (cancelled) return
        setAgents(agentList)
        setCampaigns(campaignList)
        setAiReady(Boolean(status.enabled && status.configured))
        setSetupHint(
          status.configured
            ? null
            : status.setupMessage ??
                "AI provider not configured. Agents will use deterministic fallback summaries.",
        )
      } catch {
        if (!cancelled) toast.error("Could not load agents.")
      } finally {
        if (!cancelled) setLoadingAgents(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const refreshHistory = React.useCallback(async () => {
    setLoadingHistory(true)
    try {
      const runs = await getAgentRunHistory()
      setHistory(runs)
      if (recordIdParam) {
        const run = runs.find((r) => r.id === recordIdParam) ?? (await getAgentRunById(recordIdParam))
        if (run) {
          setResult(parseStoredAgentResult(run))
          setActiveTab("results")
        }
      }
    } catch {
      setHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }, [recordIdParam])

  React.useEffect(() => {
    void refreshHistory()
  }, [refreshHistory])

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    router.replace(`/agents?${params.toString()}`)
  }

  async function handleRun() {
    setRunning(true)
    setContextPreview(null)
    try {
      const runResult = await runCreatorAgent(form)
      setResult(runResult)
      setLastInput(form)
      setActiveTab("results")
      handleTabChange("results")
      if (runResult.usedFallback) {
        toast.message("Fallback result generated", {
          description: "AI provider unavailable or call failed.",
        })
      } else {
        toast.success("Agent run completed")
      }
      void refreshHistory()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Agent run failed")
    } finally {
      setRunning(false)
    }
  }

  async function handlePreviewContext() {
    setPreviewing(true)
    try {
      const preview = await previewCreatorAgentContext(form)
      setContextPreview(preview)
      toast.success("Context preview ready")
    } catch {
      toast.error("Could not preview context")
    } finally {
      setPreviewing(false)
    }
  }

  function clearForm() {
    setForm({
      agentId: "campaign-qa",
      campaignId: "",
      artistName: "",
      platform: "",
      sourceRecordType: "",
      sourceRecordId: "",
      userGoal: "",
      extraInstructions: "",
      includeData: { ...DEFAULT_AGENT_INCLUDE },
      saveRun: true,
    })
    setContextPreview(null)
  }

  const selectedAgent = agents.find((a) => a.id === form.agentId)

  return (
    <ModuleShell>
      <ModulePageHeader
        title="Creator AI Agents"
        description="Run specialized agents that use your campaigns, analytics, assets, videos, learnings, quality scores, patterns, and playbooks."
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => handleTabChange("run")}>
              <Sparkles className="size-4" />
              Run Agent
            </Button>
            <Link href="/copilot" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Open Campaign Copilot
            </Link>
            <Link href="/runner" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Open Prompt Runner
            </Link>
            <Link href="/learnings" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Open Learnings
            </Link>
            <Link href="/playbooks" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Open Playbooks
            </Link>
          </div>
        }
      />

      <ModuleWorkflowTabs tabs={AGENT_TABS} value={activeTab} onValueChange={handleTabChange}>
      <ModuleTabPanel value="agents">
        {loadingAgents ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading agents…
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <Card key={agent.id} className="border-border/80">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <AgentIcon name={agent.iconName} />
                    <div>
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <CardDescription>{agent.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Best for</p>
                    <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                      {agent.suggestedUseCases.slice(0, 3).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, agentId: agent.id }))
                        handleTabChange("run")
                      }}
                    >
                      Run Agent
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, agentId: agent.id }))
                        handleTabChange("run")
                        void handlePreviewContext()
                      }}
                    >
                      Configure Context
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ModuleTabPanel>

      <ModuleTabPanel value="run">
        <Card>
          <CardHeader>
            <CardTitle>Run Agent</CardTitle>
            <CardDescription>
              Select context and run a specialized analysis. No data is modified unless you confirm an action.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!aiReady && setupHint ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-900 dark:text-amber-100">
                {setupHint}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Agent</Label>
                <Select
                  value={form.agentId}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, agentId: value }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>{agent.shortName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Campaign (optional)</Label>
                <Select
                  value={form.campaignId || "__none__"}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      campaignId: value === "__none__" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Optional campaign" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.campaignName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Artist / project (optional)</Label>
                <Textarea
                  rows={1}
                  value={form.artistName ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, artistName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Platform (optional)</Label>
                <Textarea
                  rows={1}
                  value={form.platform ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, platform: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Source record type (optional)</Label>
                <Textarea
                  rows={1}
                  value={form.sourceRecordType ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, sourceRecordType: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Source record id (optional)</Label>
                <Textarea
                  rows={1}
                  value={form.sourceRecordId ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, sourceRecordId: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>User goal</Label>
              <Textarea
                rows={3}
                value={form.userGoal ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, userGoal: e.target.value }))}
                placeholder="What should this agent focus on?"
              />
            </div>
            <div className="space-y-2">
              <Label>Extra instructions</Label>
              <Textarea
                rows={2}
                value={form.extraInstructions ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, extraInstructions: e.target.value }))}
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Context toggles</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {CONTEXT_TOGGLES.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 rounded border border-input"
                      checked={form.includeData?.[key] !== false}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          includeData: { ...prev.includeData, [key]: e.target.checked },
                        }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={running} onClick={() => void handleRun()}>
                {running ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Run Agent
              </Button>
              <Button type="button" variant="outline" disabled={previewing} onClick={() => void handlePreviewContext()}>
                {previewing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Preview Context
              </Button>
              <Button type="button" variant="ghost" onClick={clearForm}>Clear</Button>
            </div>

            {contextPreview ? (
              <pre className="max-h-80 overflow-auto rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                {contextPreview}
              </pre>
            ) : null}

            {selectedAgent ? (
              <p className="text-xs text-muted-foreground">
                {selectedAgent.name} uses: {selectedAgent.optionalContext.join(", ")}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </ModuleTabPanel>

      <ModuleTabPanel value="results">
        {!result ? (
          <EmptyState
            title="No agent results yet"
            description="Run an agent to see structured recommendations here."
            primaryActionLabel="Run Agent"
            primaryActionOnClick={() => handleTabChange("run")}
          />
        ) : (
          <AgentResultPanel result={result} input={lastInput ?? form} onRefreshHistory={refreshHistory} />
        )}
      </ModuleTabPanel>

      <ModuleTabPanel value="recommendations">
        {!result ? (
          <EmptyState title="No recommendations" description="Run an agent first." />
        ) : (
          <div className="space-y-3">
            {result.recommendedActions.map((action) => (
              <Card key={`${action.actionType}-${action.label}`}>
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium">{action.label}</p>
                    {action.requiresConfirmation ? (
                      <p className="text-xs text-muted-foreground">Requires confirmation</p>
                    ) : null}
                  </div>
                  {action.href ? (
                    <Link href={action.href} className={buttonVariants({ size: "sm" })}>
                      Open
                    </Link>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ModuleTabPanel>

      <ModuleTabPanel value="history">
        {loadingHistory ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : history.length === 0 ? (
          <EmptyState title="No agent history" description="Saved agent runs appear here as Prompt Runs." />
        ) : (
          <div className="space-y-3">
            {history.map((run) => (
              <Card key={run.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium">{run.promptName}</p>
                    <p className="text-sm text-muted-foreground">
                      {[run.campaignName, new Date(run.createdAt).toLocaleString()].filter(Boolean).join(" · ")}
                    </p>
                    {run.inputValues?.usedFallback === "true" ? (
                      <Badge variant="secondary" className="mt-1">Fallback</Badge>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setResult(parseStoredAgentResult(run))
                        handleTabChange("results")
                      }}
                    >
                      Open
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const agentId = run.inputValues?.agentId ?? run.tags[1] ?? "campaign-qa"
                        router.push(agentHref(agentId, {
                          campaignId: run.campaignId,
                          sourceRecordType: run.inputValues?.sourceRecordType,
                          sourceRecordId: run.inputValues?.sourceRecordId,
                        }))
                      }}
                    >
                      Duplicate Run
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const parsed = parseStoredAgentResult(run)
                        const res = await createLearningFromAgentResult(parsed, {
                          agentId: parsed.agentId,
                          campaignId: run.campaignId,
                        })
                        if (res.success && res.href) router.push(res.href)
                        else toast.error(res.message)
                      }}
                    >
                      Create Learning
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const res = await deleteAgentRun(run.id)
                        if (res.success) {
                          toast.success(res.message)
                          void refreshHistory()
                        } else toast.error(res.message)
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ModuleTabPanel>

      <ModuleTabPanel value="settings">
        <Card>
          <CardHeader>
            <CardTitle>Agent settings</CardTitle>
            <CardDescription>
              Agents reuse PromptRun history with run type &quot;Creator AI Agent&quot;. Configure AI in Settings → AI Providers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>AI provider: {aiReady ? "Configured" : "Not configured (fallback mode active)"}</p>
            <Link href="/settings" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Open AI Provider Settings
            </Link>
          </CardContent>
        </Card>
      </ModuleTabPanel>
      </ModuleWorkflowTabs>
    </ModuleShell>
  )
}

function AgentResultPanel({
  result,
  input,
  onRefreshHistory,
}: {
  result: AgentRunResult
  input: AgentRunInput
  onRefreshHistory: () => Promise<void>
}) {
  const router = useRouter()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{result.agentName}</h2>
        {result.usedFallback ? <Badge variant="secondary">Fallback</Badge> : null}
        {result.promptRunId ? <Badge variant="outline">Saved</Badge> : null}
      </div>
      <p className="text-muted-foreground">{result.summary}</p>

      {result.warnings?.length ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          {result.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      ) : null}

      {result.sections.map((section) => (
        <Card key={section.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {section.content ? <p className="text-sm whitespace-pre-wrap">{section.content}</p> : null}
            {section.items?.length ? (
              <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={async () => {
            const res = await createLearningFromAgentResult(result, input)
            if (res.success && res.href) router.push(res.href)
            else if (res.href) router.push(res.href)
            else toast.error(res.message)
          }}
        >
          <Lightbulb className="size-4" />
          Create Learning
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            const res = await createExperimentFromAgentResult(result, input)
            if (res.success && res.href) router.push(res.href)
            else toast.error(res.message)
          }}
        >
          <FlaskConical className="size-4" />
          Create Experiment
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            const text = result.rawText ?? result.summary
            try {
              await copyToClipboard(text)
              toast.success("Copied result")
            } catch {
              toast.error("Could not copy result")
            }
          }}
        >
          <Copy className="size-4" />
          Copy Result
        </Button>
        <Link href="/playbooks" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Playbook Update Recommendation
        </Link>
      </div>

      {result.relatedRecords.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Related records</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {result.relatedRecords.map((record) => (
              <Link key={`${record.sourceType}-${record.sourceId}`} href={record.href} className={buttonVariants({ size: "sm", variant: "outline" })}>
                {record.title}
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
