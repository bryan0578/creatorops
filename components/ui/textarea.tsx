import * as React from "react"

import { cn } from "@/lib/utils"
import { focusRing } from "@/lib/ui-classes"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base transition-colors placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30 md:text-sm dark:bg-card/50 dark:disabled:bg-input/80",
        focusRing,
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
