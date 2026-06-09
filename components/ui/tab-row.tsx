"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { TabsList } from "@/components/ui/tabs"

/** Full-width polished tab bar — matches /settings styling app-wide. */
const tabRowScrollerClassName =
  "w-full overflow-x-auto overflow-y-hidden scrollbar-hide rounded-xl border border-border/60 bg-muted/30 p-1"

const tabRowListClassName =
  "flex h-auto w-full min-w-max items-center justify-between gap-1 bg-transparent p-0"

export function TabRow({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsList>) {
  return (
    <div className={tabRowScrollerClassName}>
      <TabsList className={cn(tabRowListClassName, className)} {...props}>
        {children}
      </TabsList>
    </div>
  )
}

/** Distributed tab triggers inside TabRow — equal width on desktop, scroll when narrow. */
export const tabTriggerClassName = "min-w-fit flex-1 shrink-0"

/** @deprecated Use tabTriggerClassName */
export const tabTriggerDistributeClassName = tabTriggerClassName

/** @deprecated Use tabTriggerClassName */
export const tabTriggerScrollClassName = tabTriggerClassName
