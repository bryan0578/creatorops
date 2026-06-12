"use client"

import { AlertCircle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function PageErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  retryLabel = "Try again",
}: {
  title?: string
  description: string
  onRetry?: () => void
  retryLabel?: string
}) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="size-4 text-destructive" />
          {title}
        </CardTitle>
        <CardDescription className="text-pretty">{description}</CardDescription>
      </CardHeader>
      {onRetry ? (
        <CardContent>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="mr-2 size-4" />
            {retryLabel}
          </Button>
        </CardContent>
      ) : null}
    </Card>
  )
}
