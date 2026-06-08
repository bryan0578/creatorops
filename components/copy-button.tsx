"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import { cn } from "@/lib/utils"

export function CopyButton({
  value,
  label = "Copy",
  size = "sm",
  variant = "outline",
  className,
}: {
  value: string
  label?: string
  size?: "sm" | "default" | "icon"
  variant?: "outline" | "ghost" | "secondary" | "default"
  className?: string
}) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await copyToClipboard(value)
      setCopied(true)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Clipboard copy failed"
      toast.error(message)
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={handleCopy}
      className={cn(className)}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {size !== "icon" ? <span>{copied ? "Copied" : label}</span> : null}
    </Button>
  )
}
