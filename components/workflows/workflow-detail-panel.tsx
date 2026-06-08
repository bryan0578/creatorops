"use client"

import type { Workflow } from "@/lib/types"
import { useStore } from "@/lib/store"
import { Clock, Link2, Pencil, Trash2 } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/workflows/status-badge"
import { CopyButton } from "@/components/copy-button"

export function WorkflowDetailPanel({
  workflow,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  workflow: Workflow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (workflow: Workflow) => void
  onDelete: (workflow: Workflow) => void
}) {
  const { getPrompt } = useStore()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-screen max-h-screen w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        {workflow ? (
          <>
            <SheetHeader className="shrink-0 border-b px-6 py-4">
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <StatusBadge status={workflow.status} />
                <Badge variant="secondary">{workflow.category}</Badge>
                {workflow.estimatedTimeSaved ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3.5" />
                    {workflow.estimatedTimeSaved}
                  </span>
                ) : null}
              </div>
              <SheetTitle className="text-pretty">{workflow.name}</SheetTitle>
              <SheetDescription className="text-pretty">
                {workflow.description || "No description"}
              </SheetDescription>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col gap-5">
                <section className="space-y-3">
                  <h3 className="text-sm font-medium">
                    Steps ({workflow.steps.length})
                  </h3>
                  {workflow.steps.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No steps yet.</p>
                  ) : (
                    <ol className="flex flex-col gap-3">
                      {workflow.steps.map((step, index) => {
                        const linked = getPrompt(step.promptId)
                        return (
                          <li
                            key={step.id}
                            className="rounded-md border p-3"
                          >
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                                {index + 1}
                              </span>
                              <div className="min-w-0 flex-1 space-y-1.5">
                                <p className="font-medium leading-tight text-pretty">
                                  {step.title || "Untitled step"}
                                </p>
                                {step.description ? (
                                  <p className="text-sm text-muted-foreground text-pretty">
                                    {step.description}
                                  </p>
                                ) : null}
                                {linked ? (
                                  <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5">
                                    <span className="flex min-w-0 items-center gap-1.5 text-xs">
                                      <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
                                      <span className="truncate">{linked.name}</span>
                                    </span>
                                    <CopyButton
                                      value={linked.promptText}
                                      size="icon"
                                      variant="ghost"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    No linked prompt
                                  </span>
                                )}
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </section>

                {workflow.notes ? (
                  <section className="space-y-2">
                    <h3 className="text-sm font-medium">Notes</h3>
                    <p className="text-sm text-muted-foreground text-pretty">
                      {workflow.notes}
                    </p>
                  </section>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 border-t p-4">
              <Button className="flex-1" onClick={() => onEdit(workflow)}>
                <Pencil className="size-4" />
                Edit workflow
              </Button>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(workflow)}
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
