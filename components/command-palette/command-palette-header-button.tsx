"use client"

import * as React from "react"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const CommandPaletteContext = React.createContext<(() => void) | null>(null)

export function CommandPaletteOpenProvider({
  openPalette,
  children,
}: {
  openPalette: () => void
  children: React.ReactNode
}) {
  return (
    <CommandPaletteContext.Provider value={openPalette}>
      {children}
    </CommandPaletteContext.Provider>
  )
}

export function useOpenCommandPalette() {
  const open = React.useContext(CommandPaletteContext)
  return open ?? (() => {})
}

export function CommandPaletteHeaderButton({
  shortcutLabel,
  className,
}: {
  shortcutLabel: string
  className?: string
}) {
  const openPalette = useOpenCommandPalette()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={openPalette}
      className={cn(
        "h-8 shrink-0 gap-2 border-border/80 bg-background/80 text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <Search className="size-3.5" />
      <span className="hidden lg:inline">Search…</span>
      <kbd className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
        {shortcutLabel}
      </kbd>
    </Button>
  )
}
