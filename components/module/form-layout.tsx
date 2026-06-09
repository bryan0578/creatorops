import type * as React from "react"

import { cn } from "@/lib/utils"

export function ModuleShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-7xl flex-col gap-6",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="text-xs text-muted-foreground text-pretty">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("space-y-4", className)}>
      {title ? (
        <SectionHeader title={title} description={description} />
      ) : null}
      {children}
    </section>
  )
}

export function FormGrid({
  children,
  columns = 2,
  className,
}: {
  children: React.ReactNode
  columns?: 1 | 2 | 3
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function OutputSection({
  title,
  description,
  children,
  action,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4",
        className,
      )}
    >
      <SectionHeader title={title} description={description} action={action} />
      {children}
    </section>
  )
}

export function StickyActionBar({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-2 border-t border-border/80 bg-background/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function PromptPreviewBlock({
  value,
  emptyMessage = "Fill in the form to preview your prompt.",
}: {
  value: string
  emptyMessage?: string
}) {
  return (
    <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border/80 bg-muted/30 p-3 font-mono text-xs leading-relaxed">
      {value || emptyMessage}
    </pre>
  )
}

export const RECENT_RECORDS_CARD_CLASS = "border-border/80"

export { ModulePageHeader } from "@/components/app-shell"

export {
  ANALYTICS_WORKFLOW_TABS,
  ARTIST_CRM_WORKFLOW_TABS,
  GENERATOR_WORKFLOW_TABS,
  ModuleTabPanel,
  ModuleWorkflowTabs,
} from "@/components/module/workflow-tabs"
