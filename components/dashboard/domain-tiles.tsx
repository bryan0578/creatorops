"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

import {
  countDomainModules,
  getAllDomains,
  type CreatorOpsDomain,
} from "@/lib/navigation/domains"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

function DomainTile({ domain }: { domain: CreatorOpsDomain }) {
  const Icon = domain.icon
  const moduleCount = countDomainModules(domain)

  return (
    <Card className="border-border/80 bg-card/80 shadow-sm transition-colors hover:border-primary/30 hover:bg-card">
      <CardHeader className="gap-3 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {moduleCount} modules
          </Badge>
        </div>
        <div className="space-y-1">
          <CardTitle className="text-base">{domain.label}</CardTitle>
          <CardDescription className="line-clamp-3 text-pretty">
            {domain.description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Link
          href={domain.homeHref}
          title={domain.openButtonLabel}
          className={cn(buttonVariants({ size: "sm" }), "w-full justify-between gap-2")}
        >
          <span className="truncate md:hidden">Open</span>
          <span className="hidden truncate md:inline">{domain.openButtonLabel}</span>
          <ArrowRight className="size-4 shrink-0" />
        </Link>
      </CardContent>
    </Card>
  )
}

export function DomainTilesGrid() {
  const domains = getAllDomains()

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Domain workspaces</h2>
        <p className="max-w-3xl text-sm text-muted-foreground text-pretty">
          Jump into focused workspaces for campaigns, YouTube, AI workflows, products,
          analytics, assets, and system administration.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {domains.map((domain) => (
          <DomainTile key={domain.id} domain={domain} />
        ))}
      </div>
    </section>
  )
}
