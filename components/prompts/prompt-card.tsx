"use client"

import type { Prompt } from "@/lib/types"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RatingStars } from "@/components/rating-stars"
import { CopyButton } from "@/components/copy-button"

export function PromptCard({
  prompt,
  onOpen,
}: {
  prompt: Prompt
  onOpen: (prompt: Prompt) => void
}) {
  return (
    <Card className="flex flex-col transition-colors hover:border-foreground/20">
      <CardHeader
        className="cursor-pointer gap-2"
        onClick={() => onOpen(prompt)}
      >
        <div className="flex items-start justify-between gap-2">
          <Badge variant="secondary">{prompt.category}</Badge>
          <RatingStars rating={prompt.rating} size={14} />
        </div>
        <h3 className="font-medium leading-tight text-pretty">{prompt.name}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground text-pretty">
          {prompt.description || "No description"}
        </p>
      </CardHeader>
      <CardContent
        className="flex-1 cursor-pointer"
        onClick={() => onOpen(prompt)}
      >
        <div className="flex flex-wrap gap-1.5">
          {prompt.tags.slice(0, 4).map((t) => (
            <Badge key={t} variant="outline" className="text-xs">
              {t}
            </Badge>
          ))}
          {prompt.tags.length > 4 ? (
            <Badge variant="outline" className="text-xs">
              +{prompt.tags.length - 4}
            </Badge>
          ) : null}
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <span className="text-xs text-muted-foreground">
          {prompt.variables.length} variable
          {prompt.variables.length === 1 ? "" : "s"}
        </span>
        <CopyButton value={prompt.promptText} variant="ghost" />
      </CardFooter>
    </Card>
  )
}
