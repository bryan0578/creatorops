"use client"

import * as React from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryActionLabel,
  primaryActionHref,
  primaryActionOnClick,
  secondaryActionLabel,
  secondaryActionHref,
  secondaryActionOnClick,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  primaryActionLabel?: string
  primaryActionHref?: string
  primaryActionOnClick?: () => void
  secondaryActionLabel?: string
  secondaryActionHref?: string
  secondaryActionOnClick?: () => void
  className?: string
}) {
  const hasPrimary =
    Boolean(primaryActionLabel) &&
    Boolean(primaryActionHref || primaryActionOnClick)
  const hasSecondary =
    Boolean(secondaryActionLabel) &&
    Boolean(secondaryActionHref || secondaryActionOnClick)

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center sm:px-6",
        className,
      )}
    >
      {Icon ? (
        <Icon className="mx-auto mb-3 size-8 text-muted-foreground/70" />
      ) : null}
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>
      ) : null}
      {hasPrimary || hasSecondary ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {hasPrimary ? (
            primaryActionHref ? (
              <Link
                href={primaryActionHref}
                className={buttonVariants({ size: "sm" })}
              >
                {primaryActionLabel}
              </Link>
            ) : (
              <Button type="button" size="sm" onClick={primaryActionOnClick}>
                {primaryActionLabel}
              </Button>
            )
          ) : null}
          {hasSecondary ? (
            secondaryActionHref ? (
              <Link
                href={secondaryActionHref}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {secondaryActionLabel}
              </Link>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={secondaryActionOnClick}>
                {secondaryActionLabel}
              </Button>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
