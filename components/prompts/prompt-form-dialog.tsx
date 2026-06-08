"use client"

import * as React from "react"
import type { Prompt, PromptCategory } from "@/lib/types"
import { PROMPT_CATEGORIES } from "@/lib/types"
import { createId } from "@/lib/store"

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FormGrid, FormSection } from "@/components/module/form-layout"
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

  React.useEffect(() => {
    if (!open) return
    const base = initial ? { ...initial } : emptyPrompt()
    setDraft(base)
    setVariablesText(base.variables.join(", "))
    setTagsText(base.tags.join(", "))
  }, [open, initial])

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
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{initial ? "Edit prompt" : "New prompt"}</DialogTitle>
            <DialogDescription>
              Save a reusable prompt with variables, output format, and tags.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-6">
            <FormSection title="Basics">
              <FormGrid>
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
                    <SelectTrigger id="category" className="w-full">
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
              </FormGrid>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={draft.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="What this prompt is for"
                />
              </div>
            </FormSection>

            <FormSection title="Prompt content">
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
            </FormSection>

            <FormSection title="Metadata">
              <FormGrid>
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
              </FormGrid>
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
            </FormSection>
          </DialogBody>
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
