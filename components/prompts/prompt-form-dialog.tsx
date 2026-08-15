"use client"

import * as React from "react"
import type { Prompt, PromptCategory } from "@/lib/types"
import { PROMPT_CATEGORIES } from "@/lib/types"
import { createId } from "@/lib/store"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RatingStars } from "@/components/rating-stars"
import { ScrollArea } from "@/components/ui/scroll-area"

function emptyPrompt(): Prompt {
  const now = Date.now()
  return {
    id: createId("p"),
    name: "",
    category: "General",
    description: "",
    promptText: "",
    variables: [],
    outputFormat: "",
    tags: [],
    rating: 0,
    notes: "",
    createdAt: now,
    updatedAt: now,
  }
}

export function PromptFormDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Prompt | null
  onSave: (prompt: Prompt) => void
}) {
  const [draft, setDraft] = React.useState<Prompt>(emptyPrompt())
  const [variablesText, setVariablesText] = React.useState("")
  const [tagsText, setTagsText] = React.useState("")
  const [wasOpen, setWasOpen] = React.useState(false)

  // Reset the draft each time the dialog transitions from closed to open.
  // `initial` is set by the caller right before `open` flips true and stays
  // stable for the rest of the session, so comparing `open` alone is enough
  // — done during render (guarded, not unconditional) rather than in an
  // effect, since this is a plain state derivation with no side effect.
  if (open && !wasOpen) {
    setWasOpen(true)
    const base = initial ? { ...initial } : emptyPrompt()
    setDraft(base)
    setVariablesText(base.variables.join(", "))
    setTagsText(base.tags.join(", "))
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  function set<K extends keyof Prompt>(key: K, value: Prompt[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function parseList(text: string) {
    return text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      ...draft,
      name: draft.name.trim() || "Untitled prompt",
      variables: parseList(variablesText),
      tags: parseList(tagsText),
      updatedAt: Date.now(),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit prompt" : "New prompt"}</DialogTitle>
          <DialogDescription>
            Save a reusable prompt with variables, output format, and tags.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={draft.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="YouTube Title Generator"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={draft.category}
                    onValueChange={(v) => set("category", v as PromptCategory)}
                  >
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROMPT_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={draft.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="What this prompt is for"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="promptText">Prompt text</Label>
                <Textarea
                  id="promptText"
                  value={draft.promptText}
                  onChange={(e) => set("promptText", e.target.value)}
                  placeholder="Use {{variableName}} for placeholders"
                  className="min-h-36 font-mono text-xs"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="variables">Variables (comma separated)</Label>
                  <Input
                    id="variables"
                    value={variablesText}
                    onChange={(e) => setVariablesText(e.target.value)}
                    placeholder="genre, mood, trackName"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outputFormat">Output format</Label>
                  <Input
                    id="outputFormat"
                    value={draft.outputFormat}
                    onChange={(e) => set("outputFormat", e.target.value)}
                    placeholder="Numbered list"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="titles, growth, seo"
                />
              </div>

              <div className="space-y-2">
                <Label>Rating</Label>
                <RatingStars
                  rating={draft.rating}
                  onChange={(v) => set("rating", v)}
                  size={22}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={draft.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Anything to remember when using this prompt"
                  className="min-h-20"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">{initial ? "Save changes" : "Create prompt"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
