"use client"

import type { Workflow } from "@/lib/types"
import { Clock, ListChecks } from "lucide-react"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/workflows/status-badge"

export function WorkflowCard({
  workflow,
  onOpen,
}: {
  workflow: Workflow
  onOpen: (workflow: Workflow) => void
}) {
  return (
    <Card
      className="flex cursor-pointer flex-col transition-colors hover:border-foreground/20"
      onClick={() => onOpen(workflow)}
    >
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={workflow.status} />
          <Badge variant="secondary">{workflow.category}</Badge>
        </div>
        <h3 className="font-medium leading-tight text-pretty">{workflow.name}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground text-pretty">
          {workflow.description || "No description"}
        </p>
      </CardHeader>
      <CardContent className="flex-1" />
      <CardFooter className="justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <ListChecks className="size-4" />
          {workflow.steps.length} step{workflow.steps.length === 1 ? "" : "s"}
        </span>
        {workflow.estimatedTimeSaved ? (
          <span className="flex items-center gap-1.5">
            <Clock className="size-4" />
            {workflow.estimatedTimeSaved}
          </span>
        ) : null}
      </CardFooter>
    </Card>
  )
}
