"use client"

import Link from "next/link"
import { Link2 } from "lucide-react"

import { buildIntegrationsHref } from "@/lib/integrations/href"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type IntegrationLinkButtonProps = {
  label: string
  campaignId?: string
  campaignName?: string
  assetId?: string
  sourceRecordType?: string
  sourceRecordId?: string
  platform?: string
  linkType?: string
  tab?: string
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function IntegrationLinkButton({
  label,
  variant = "outline",
  size = "sm",
  className,
  ...hrefParams
}: IntegrationLinkButtonProps) {
  return (
    <Link
      href={buildIntegrationsHref(hrefParams)}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      <Link2 className="size-4" />
      {label}
    </Link>
  )
}
