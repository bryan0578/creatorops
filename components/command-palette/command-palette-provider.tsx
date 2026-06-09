"use client"

import * as React from "react"

import {
  CommandPalette,
  commandPaletteShortcutLabel,
  useCommandPaletteShortcut,
} from "@/components/command-palette/command-palette"
import { CommandPaletteOpenProvider } from "@/components/command-palette/command-palette-header-button"

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)

  const openPalette = React.useCallback(() => setOpen(true), [])
  useCommandPaletteShortcut(openPalette)

  return (
    <CommandPaletteOpenProvider openPalette={openPalette}>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </CommandPaletteOpenProvider>
  )
}

export function useCommandPalette() {
  const [shortcutLabel, setShortcutLabel] = React.useState("⌘K")

  React.useEffect(() => {
    setShortcutLabel(commandPaletteShortcutLabel())
  }, [])

  return { shortcutLabel }
}
