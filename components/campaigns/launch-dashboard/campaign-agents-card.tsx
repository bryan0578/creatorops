"use client"

import Link from "next/link"
import { Bot, Lightbulb, Rocket, ShieldCheck } from "lucide-react"

import { agentHref } from "@/lib/agents/routes"
import { RECENT_RECORDS_CARD_CLASS } from "@/components/module/form-layout"
import type { CampaignRecord } from "@/lib/types"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function CampaignAgentsCard({ campaign }: { campaign: CampaignRecord }) {
  const q = campaign.id

  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="size-4 text-primary" />
          Creator AI Agents
        </CardTitle>
        <CardDescription>
          Run specialized one-off analyses using this campaign&apos;s local context. No data is modified automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Link
          href={agentHref("campaign-qa", { campaignId: q })}
          className={buttonVariants({ size: "sm" })}
        >
          <ShieldCheck className="size-4" />
          Run Campaign QA
        </Link>
        <Link
          href={agentHref("release-strategist", { campaignId: q })}
          className={buttonVariants({ size: "sm", variant: "outline" })}
        >
          <Rocket className="size-4" />
          Run Release Strategist
        </Link>
        <Link
          href={agentHref("learning-synthesizer", { campaignId: q })}
          className={buttonVariants({ size: "sm", variant: "outline" })}
        >
          <Lightbulb className="size-4" />
          Run Learning Synthesizer
        </Link>
        <Link href="/agents" className={buttonVariants({ size: "sm", variant: "ghost" })}>
          Open Agents
        </Link>
      </CardContent>
    </Card>
  )
}
