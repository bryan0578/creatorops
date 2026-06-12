"use client"

import Link from "next/link"
import { ArrowRight, BookOpen, Sparkles } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function ControlCenterOperatingGuide() {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="size-4 text-muted-foreground" />
              Operating Guide
            </CardTitle>
            <CardDescription>
              Step-by-step setup for artists, campaigns, Drive, products, and weekly rhythms
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pt-0">
        <Link href="/operating-guide" className={buttonVariants({ size: "sm" })}>
          Start Operating Guide
          <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/operating-guide?tab=prettywise"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Sparkles className="size-4" />
          Set Up PrettyWise
        </Link>
      </CardContent>
    </Card>
  )
}
