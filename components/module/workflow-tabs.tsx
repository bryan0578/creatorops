"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const GENERATOR_WORKFLOW_TABS = [
  { value: "details", label: "Details" },
  { value: "prompt", label: "Prompt" },
  { value: "ai-response", label: "AI Response" },
  { value: "final", label: "Final Output" },
  { value: "saved", label: "Saved Records" },
] as const

export const ANALYTICS_WORKFLOW_TABS = [
  { value: "details", label: "Details" },
  { value: "metrics", label: "Metrics" },
  { value: "review", label: "Review" },
  { value: "insights", label: "Insights" },
  { value: "saved", label: "Saved Records" },
] as const

export const ARTIST_CRM_WORKFLOW_TABS = [
  { value: "profile", label: "Profile" },
  { value: "releases", label: "Releases" },
  { value: "products", label: "Products" },
  { value: "campaigns", label: "Campaigns" },
  { value: "related", label: "Related" },
  { value: "saved", label: "Saved Artists" },
] as const

export const CAMPAIGN_BUILDER_TABS = [
  { value: "overview", label: "Overview" },
  { value: "linked", label: "Linked Records" },
  { value: "tasks", label: "Tasks" },
  { value: "timeline", label: "Timeline" },
  { value: "notes", label: "Notes" },
  { value: "saved", label: "Saved Campaigns" },
] as const

export function ModuleWorkflowTabs({
  defaultTab,
  tabs,
  children,
  className,
}: {
  defaultTab: string
  tabs: readonly { value: string; label: string }[]
  children: React.ReactNode
  className?: string
}) {
  return (
    <Tabs defaultValue={defaultTab} className={cn("w-full gap-6", className)}>
      <TabsList className="h-auto w-full max-w-full flex-nowrap justify-start overflow-x-auto">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="shrink-0 px-3 py-1.5"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  )
}

export function ModuleTabPanel({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <TabsContent value={value} className={cn("mt-0 space-y-4", className)}>
      {children}
    </TabsContent>
  )
}
