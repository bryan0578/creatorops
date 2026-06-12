"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { CheckCircle2, Circle } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function GuideSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export type GuideChecklistItem = {
  label: string
  href?: string
  detail?: string
}

export function GuideChecklist({ items, title }: { items: GuideChecklistItem[]; title?: string }) {
  return (
    <Card className="border-border/80">
      {title ? (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={cn("space-y-2", !title && "pt-4")}>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.label} className="flex gap-2 text-sm">
              <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                {item.href ? (
                  <Link href={item.href} className="font-medium text-primary hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-medium">{item.label}</span>
                )}
                {item.detail ? (
                  <span className="mt-0.5 block text-muted-foreground">{item.detail}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function GuideCallout({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-pretty">
      {children}
    </div>
  )
}

export type GuideAction = { label: string; href: string; variant?: "default" | "outline" }

export function GuideActions({ actions }: { actions: GuideAction[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Link
          key={action.href + action.label}
          href={action.href}
          className={buttonVariants({
            size: "sm",
            variant: action.variant === "outline" ? "outline" : "default",
          })}
        >
          {action.label}
        </Link>
      ))}
    </div>
  )
}

export function GuideBulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

export function GuideModuleCard({
  title,
  purpose,
  firstSteps,
  goodEnough,
  href,
}: {
  title: string
  purpose: string
  firstSteps: string
  goodEnough: string
  href: string
}) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{purpose}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <span className="font-medium text-foreground">Start with:</span>{" "}
          <span className="text-muted-foreground">{firstSteps}</span>
        </p>
        <p>
          <span className="font-medium text-foreground">Good enough:</span>{" "}
          <span className="text-muted-foreground">{goodEnough}</span>
        </p>
        <Link href={href} className={buttonVariants({ size: "sm", variant: "outline" })}>
          Open {title}
        </Link>
      </CardContent>
    </Card>
  )
}

export function GuideDoneHint() {
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <CheckCircle2 className="size-3.5" />
      Check items off manually as you complete them — this guide does not auto-track progress.
    </p>
  )
}
