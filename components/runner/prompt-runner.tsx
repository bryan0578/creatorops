"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  AlertCircle,
  Copy,
  Download,
  Play,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { useStore, createId } from "@/lib/store"
import type { Prompt, PromptRun } from "@/lib/types"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import { downloadJson } from "@/lib/storage"
import {
  buildCompletedPrompt,
  getMissingVariables,
  isLongVariable,
  mergePromptVariables,
  variablePlaceholder,
  variableToLabel,
} from "@/lib/prompt-variables"

import { PageHeader } from "@/components/app-shell"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RatingStars } from "@/components/rating-stars"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function PromptRunner() {
  const searchParams = useSearchParams()
  const promptIdParam = searchParams.get("promptId")

  const {
    prompts,
    runs,
    hydrated,
    addRun,
    updateRun,
    deleteRun,
    importRuns,
  } = useStore()

  const [promptSearch, setPromptSearch] = React.useState("")
  const [selectedPromptId, setSelectedPromptId] = React.useState<string | null>(
    null,
  )
  const [inputValues, setInputValues] = React.useState<Record<string, string>>(
    {},
  )
  const [aiResponse, setAiResponse] = React.useState("")
  const [runNotes, setRunNotes] = React.useState("")
  const [editingRunId, setEditingRunId] = React.useState<string | null>(null)

  const [runSearch, setRunSearch] = React.useState("")
  const [pendingDelete, setPendingDelete] = React.useState<PromptRun | null>(
    null,
  )
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [appliedPromptIdParam, setAppliedPromptIdParam] = React.useState<
    string | null
  >(null)

  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId) ?? null

  const variables = React.useMemo(() => {
    if (!selectedPrompt) return []
    return mergePromptVariables(
      selectedPrompt.variables,
      selectedPrompt.promptText,
    )
  }, [selectedPrompt])

  const completedPrompt = React.useMemo(() => {
    if (!selectedPrompt) return ""
    return buildCompletedPrompt(
      selectedPrompt.promptText,
      inputValues,
      variables,
    )
  }, [selectedPrompt, inputValues, variables])

  const missingVariables = React.useMemo(
    () => getMissingVariables(variables, inputValues),
    [variables, inputValues],
  )

  const filteredPrompts = React.useMemo(() => {
    const q = promptSearch.trim().toLowerCase()
    if (!q) return prompts
    return prompts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }, [prompts, promptSearch])

  const filteredRuns = React.useMemo(() => {
    const q = runSearch.trim().toLowerCase()
    const sorted = [...runs].sort((a, b) => b.updatedAt - a.updatedAt)
    if (!q) return sorted
    return sorted.filter(
      (r) =>
        r.promptName.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q),
    )
  }, [runs, runSearch])

  function selectPrompt(prompt: Prompt) {
    setSelectedPromptId(prompt.id)
    setInputValues({})
    setAiResponse("")
    setRunNotes("")
    setEditingRunId(null)
  }

  // Select the prompt named by ?promptId once the store has hydrated and
  // that id is found. Applied during render (guarded by a ref so it only
  // fires once per distinct id) rather than in an effect, since there's no
  // side effect here beyond plain state resets.
  if (hydrated && promptIdParam && appliedPromptIdParam !== promptIdParam) {
    const prompt = prompts.find((p) => p.id === promptIdParam)
    if (prompt) {
      setAppliedPromptIdParam(promptIdParam)
      setSelectedPromptId(prompt.id)
      setInputValues({})
      setAiResponse("")
      setRunNotes("")
      setEditingRunId(null)
    }
  }

  function clearFields() {
    setInputValues({})
    toast.success("Fields cleared")
  }

  function setVariable(name: string, value: string) {
    setInputValues((prev) => ({ ...prev, [name]: value }))
  }

  async function handleCopyCompleted() {
    try {
      await copyToClipboard(completedPrompt)
      toast.success("Copied completed prompt")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not copy")
    }
  }

  async function handleCopyText(text: string, label: string) {
    try {
      await copyToClipboard(text)
      toast.success(`Copied ${label}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not copy")
    }
  }

  function handleSaveRun() {
    if (!selectedPrompt) return

    const now = Date.now()
    const run: PromptRun = {
      id: editingRunId ?? createId("run"),
      promptId: selectedPrompt.id,
      promptName: selectedPrompt.name,
      category: selectedPrompt.category,
      inputValues: { ...inputValues },
      completedPrompt,
      aiResponse,
      notes: runNotes,
      createdAt: editingRunId
        ? (runs.find((r) => r.id === editingRunId)?.createdAt ?? now)
        : now,
      updatedAt: now,
    }

    if (editingRunId) {
      updateRun(run)
      toast.success("Run updated")
    } else {
      addRun(run)
      setEditingRunId(run.id)
      toast.success("Run saved")
    }
  }

  function openRun(run: PromptRun) {
    setSelectedPromptId(run.promptId)
    setInputValues({ ...run.inputValues })
    setAiResponse(run.aiResponse)
    setRunNotes(run.notes)
    setEditingRunId(run.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
    toast.success("Run loaded")
  }

  function confirmDeleteRun() {
    if (!pendingDelete) return
    deleteRun(pendingDelete.id)
    if (editingRunId === pendingDelete.id) {
      setEditingRunId(null)
    }
    setPendingDelete(null)
    toast.success("Run deleted")
  }

  function handleExportRuns() {
    downloadJson("creatorops-runs.json", runs)
    toast.success("Exported runs")
  }

  function handleImportRuns(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        const items = Array.isArray(parsed) ? parsed : [parsed]
        importRuns(items as PromptRun[])
        toast.success(`Imported ${items.length} run(s)`)
      } catch {
        toast.error("Invalid JSON file")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  if (hydrated && prompts.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Prompt Runner"
          description="Fill in prompt variables, generate a completed prompt, paste your AI response, and save runs locally."
        />
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <Play className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Create your first prompt before using the runner.
          </p>
          <Link href="/prompts" className={buttonVariants({ variant: "default" })}>
            Go to Prompt Library
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Prompt Runner"
        description="Select a prompt, fill variables, copy the completed prompt, paste your AI response, and save the run."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select prompt</CardTitle>
              <CardDescription>
                Choose a saved prompt from your library
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={promptSearch}
                  onChange={(e) => setPromptSearch(e.target.value)}
                  placeholder="Search prompts..."
                  className="pl-9"
                />
              </div>

              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-1">
                {filteredPrompts.length === 0 ? (
                  <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No prompts match your search.
                  </p>
                ) : (
                  filteredPrompts.map((prompt) => (
                    <button
                      key={prompt.id}
                      type="button"
                      onClick={() => selectPrompt(prompt)}
                      className={cn(
                        "flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60",
                        selectedPromptId === prompt.id && "bg-muted",
                      )}
                    >
                      <span className="font-medium">{prompt.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {prompt.category}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {selectedPrompt ? (
                <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{selectedPrompt.category}</Badge>
                    <RatingStars rating={selectedPrompt.rating} size={14} />
                  </div>
                  <p className="text-sm text-muted-foreground text-pretty">
                    {selectedPrompt.description || "No description"}
                  </p>
                  {selectedPrompt.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPrompt.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a prompt to begin.
                </p>
              )}
            </CardContent>
          </Card>

          {selectedPrompt && variables.length > 0 ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="text-base">Variables</CardTitle>
                  <CardDescription>
                    Fill in values to build your completed prompt
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={clearFields}>
                  <X className="size-4" />
                  Clear fields
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {variables.map((variable) => {
                  const fieldId = `var-${variable}`
                  const label = variableToLabel(variable)
                  const commonProps = {
                    id: fieldId,
                    value: inputValues[variable] ?? "",
                    onChange: (
                      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                    ) => setVariable(variable, e.target.value),
                    placeholder: variablePlaceholder(variable),
                    className: "w-full",
                  }

                  return (
                    <div key={variable} className="space-y-2">
                      <Label htmlFor={fieldId} className="text-sm font-medium">
                        {label}
                      </Label>
                      {isLongVariable(variable) ? (
                        <Textarea {...commonProps} className="min-h-20 w-full" />
                      ) : (
                        <Input {...commonProps} />
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ) : selectedPrompt ? (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                This prompt has no variables. The preview will use the raw prompt
                text.
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col">
            <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">Completed prompt</CardTitle>
                <CardDescription>Live preview with your values</CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={!selectedPrompt || !completedPrompt.trim()}
                onClick={handleCopyCompleted}
              >
                <Copy className="size-4" />
                Copy completed prompt
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {missingVariables.length > 0 ? (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Missing variables ({missingVariables.length})
                    </p>
                    <p className="text-muted-foreground">
                      {missingVariables.map(variableToLabel).join(", ")}
                    </p>
                  </div>
                </div>
              ) : selectedPrompt && variables.length > 0 ? (
                <Badge variant="secondary" className="text-xs">
                  All variables filled
                </Badge>
              ) : null}

              <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
                {selectedPrompt
                  ? completedPrompt || "—"
                  : "Select a prompt to see the preview."}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI response & notes</CardTitle>
              <CardDescription>
                Paste the response from ChatGPT or your AI tool, then save the run
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ai-response" className="text-sm font-medium">
                  AI response
                </Label>
                <Textarea
                  id="ai-response"
                  value={aiResponse}
                  onChange={(e) => setAiResponse(e.target.value)}
                  placeholder="Paste the AI response here..."
                  className="min-h-36 w-full font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="run-notes" className="text-sm font-medium">
                  Notes
                </Label>
                <Textarea
                  id="run-notes"
                  value={runNotes}
                  onChange={(e) => setRunNotes(e.target.value)}
                  placeholder="Anything to remember about this run..."
                  className="min-h-20 w-full"
                />
              </div>
              <Button
                type="button"
                className="w-full"
                disabled={!selectedPrompt}
                onClick={handleSaveRun}
              >
                {editingRunId ? "Update run" : "Save run"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent runs */}
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Recent runs</CardTitle>
            <CardDescription>
              Reopen, copy, or delete saved prompt runs
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportRuns}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              Import
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportRuns}
              disabled={runs.length === 0}
            >
              <Download className="size-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={runSearch}
              onChange={(e) => setRunSearch(e.target.value)}
              placeholder="Search runs by prompt or category..."
              className="pl-9"
            />
          </div>

          {filteredRuns.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {runs.length === 0
                ? "No saved runs yet. Complete a prompt and save your first run."
                : "No runs match your search."}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <button
                    type="button"
                    onClick={() => openRun(run)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{run.promptName}</p>
                      <Badge variant="secondary">{run.category}</Badge>
                      {editingRunId === run.id ? (
                        <Badge variant="outline" className="text-xs">
                          Editing
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(run.updatedAt)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {run.completedPrompt}
                    </p>
                  </button>
                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleCopyText(run.completedPrompt, "completed prompt")
                      }
                    >
                      <Copy className="size-4" />
                      Prompt
                    </Button>
                    {run.aiResponse.trim() ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopyText(run.aiResponse, "AI response")
                        }
                      >
                        <Copy className="size-4" />
                        Response
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openRun(run)}
                    >
                      Open
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => setPendingDelete(run)}
                      aria-label="Delete run"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete run?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `"${pendingDelete.promptName}" run from ${formatDate(pendingDelete.createdAt)} will be permanently removed.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={confirmDeleteRun}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
