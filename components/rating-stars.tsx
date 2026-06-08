"use client"

import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

export function RatingStars({
  rating,
  onChange,
  size = 16,
  className,
}: {
  rating: number
  onChange?: (value: number) => void
  size?: number
  className?: string
}) {
  const interactive = typeof onChange === "function"
  return (
    <div className={cn("flex items-center gap-0.5", className)} role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = value <= rating
        const StarEl = (
          <Star
            style={{ width: size, height: size }}
            className={cn(
              filled ? "fill-amber-400 text-amber-400" : "fill-none text-muted-foreground/40",
            )}
          />
        )
        if (!interactive) return <span key={value}>{StarEl}</span>
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange?.(value === rating ? 0 : value)}
            className="rounded-sm transition-transform hover:scale-110"
            aria-label={`Set rating to ${value}`}
          >
            {StarEl}
          </button>
        )
      })}
    </div>
  )
}
