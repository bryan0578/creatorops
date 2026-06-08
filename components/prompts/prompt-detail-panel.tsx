"use client"

import type { Prompt } from "@/lib/types"
import { Pencil, Trash2 } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RatingStars } from "@/components/rating-stars"
import { CopyButton } from "@/components/copy-button"

export function PromptDetailPanel({
  prompt,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  prompt: Prompt | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (prompt: Prompt) => void
  onDelete: (prompt: Prompt) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-screen max-h-screen w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        {prompt ? (
          <>
            <SheetHeader className="shrink-0 border-b px-6 py-4">
              <div className="flex items-center gap-2 pr-8">
                <Badge variant="secondary">{prompt.category}</Badge>
                <RatingStars rating={prompt.rating} />
              </div>
              <SheetTitle className="text-pretty">{prompt.name}</SheetTitle>
              <SheetDescription className="text-pretty">
                {prompt.description || "No description"}
              </SheetDescription>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col gap-5">
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Prompt</h3>
                    <CopyButton value={prompt.promptText} label="Copy prompt" />
                  </div>
                  <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
                    {prompt.promptText || "—"}
                  </pre>
                </section>

                <div className="grid grid-cols-2 gap-4">
                  <section className="space-y-2">
                    <h3 className="text-sm font-medium">Variables</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {prompt.variables.length ? (
                        prompt.variables.map((v) => (
                          <Badge key={v} variant="outline" className="font-mono">
                            {`{{${v}}}`}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </div>
                  </section>
                  <section className="space-y-2">
                    <h3 className="text-sm font-medium">Output format</h3>
                    <p className="text-sm text-muted-foreground">
                      {prompt.outputFormat || "—"}
                    </p>
                  </section>
                </div>

                <section className="space-y-2">
                  <h3 className="text-sm font-medium">Tags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {prompt.tags.length ? (
                      prompt.tags.map((t) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">None</span>
                    )}
                  </div>
                </section>

                {prompt.notes ? (
                  <section className="space-y-2">
                    <h3 className="text-sm font-medium">Notes</h3>
                    <p className="text-sm text-muted-foreground text-pretty">
                      {prompt.notes}
                    </p>
                  </section>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 border-t p-4">
              <CopyButton
                value={prompt.promptText}
                label="Copy"
                variant="default"
                className="flex-1"
              />
              <Button variant="outline" onClick={() => onEdit(prompt)}>
                <Pencil className="size-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(prompt)}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
