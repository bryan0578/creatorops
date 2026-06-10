"use client"

import * as React from "react"
import { Download, Database, Plus, Search, Upload } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import type { Prompt, PromptCategory } from "@/lib/types"
import { PROMPT_CATEGORIES } from "@/lib/types"
import { downloadJson, loadPrompts } from "@/lib/storage"
import { migrateLocalPromptsToDatabase } from "@/lib/actions/prompts"

import { PageHeader } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { parseImportJsonText } from "@/lib/safe-json"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PromptCard } from "@/components/prompts/prompt-card"
import { PromptFormDialog } from "@/components/prompts/prompt-form-dialog"
import { PromptDetailPanel } from "@/components/prompts/prompt-detail-panel"

export function PromptLibrary() {
  const {
    prompts,
    hydrated,
    promptsUseDatabase,
    addPrompt,
    updatePrompt,
    deletePrompt,
    importPrompts,
    reloadPrompts,
  } = useStore()

  const [search, setSearch] = React.useState("")
  const [category, setCategory] = React.useState<"all" | PromptCategory>("all")
  const [minRating, setMinRating] = React.useState<string>("all")
  const [migrating, setMigrating] = React.useState(false)

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Prompt | null>(null)

  const [detailId, setDetailId] = React.useState<string | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)

  const [pendingDelete, setPendingDelete] = React.useState<Prompt | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const detailPrompt = prompts.find((p) => p.id === detailId) ?? null

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return prompts.filter((p) => {
      if (category !== "all" && p.category !== category) return false
      if (minRating !== "all" && p.rating < Number(minRating)) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.promptText.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [prompts, search, category, minRating])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(prompt: Prompt) {
    setEditing(prompt)
    setDetailOpen(false)
    setFormOpen(true)
  }

  function openDetail(prompt: Prompt) {
    setDetailId(prompt.id)
    setDetailOpen(true)
  }

  async function handleSave(prompt: Prompt) {
    try {
      if (prompts.some((p) => p.id === prompt.id)) {
        await updatePrompt(prompt)
        toast.success("Prompt updated")
      } else {
        await addPrompt(prompt)
        toast.success("Prompt created")
      }
    } catch {
      toast.error("Could not save prompt to database")
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    try {
      await deletePrompt(pendingDelete.id)
      setDetailOpen(false)
      setPendingDelete(null)
      toast.success("Prompt deleted")
    } catch {
      toast.error("Could not delete prompt from database")
    }
  }

  function handleExport() {
    downloadJson("creatorops-prompts.json", prompts)
    toast.success("Exported prompt library")
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const importResult = parseImportJsonText(String(reader.result))
        if (!importResult.ok) {
          toast.error(importResult.message)
          return
        }
        const parsed = importResult.value
        const items = Array.isArray(parsed) ? parsed : [parsed]
        await importPrompts(items as Prompt[])
        toast.success(`Imported ${items.length} prompt(s) to database`)
      } catch {
        toast.error("Invalid JSON file or import failed")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  async function handleMigrateLocal() {
    const local = loadPrompts()
    if (local.length === 0) {
      toast.error("No prompts found in localStorage to migrate")
      return
    }
    setMigrating(true)
    try {
      const { migrated, total } =
        await migrateLocalPromptsToDatabase(local)
      await reloadPrompts()
      toast.success(
        `Migrated ${migrated} local prompt(s). Database now has ${total} total.`,
      )
    } catch {
      toast.error("Migration to database failed")
    } finally {
      setMigrating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Prompt Library"
        description="Store, organize, and reuse your best prompts across channels, releases, merch, and label operations."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportFile}
            />
            <Button
              variant="outline"
              onClick={handleMigrateLocal}
              disabled={migrating}
            >
              <Database className="size-4" />
              {migrating ? "Migrating…" : "Migrate local prompts"}
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" />
              Import JSON
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="size-4" />
              Export JSON
            </Button>
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              New Prompt
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts, tags, content..."
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {PROMPT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={minRating} onValueChange={setMinRating}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any rating</SelectItem>
            <SelectItem value="5">5 stars</SelectItem>
            <SelectItem value="4">4+ stars</SelectItem>
            <SelectItem value="3">3+ stars</SelectItem>
            <SelectItem value="1">1+ stars</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} of {prompts.length} prompts
        {promptsUseDatabase ? " · stored in SQLite" : " · using localStorage fallback"}
      </p>

      {hydrated && filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {prompts.length === 0
              ? "No prompts yet. Add your first reusable prompt."
              : "No prompts match your filters."}
          </p>
          <Button variant="outline" onClick={openCreate}>
            <Plus className="size-4" />
            New Prompt
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} onOpen={openDetail} />
          ))}
        </div>
      )}

      <PromptFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSave={handleSave}
      />

      <PromptDetailPanel
        prompt={detailPrompt}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={openEdit}
        onDelete={(p) => setPendingDelete(p)}
      />

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete prompt?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `"${pendingDelete.name}" will be permanently removed from your library.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
