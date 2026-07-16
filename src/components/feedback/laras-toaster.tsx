"use client"

/**
 * LarasToaster — the single <GooeyToaster /> mount point for the app.
 *
 * Renders goey-toast's GooeyToaster wired to next-themes so light/dark
 * tracks the application theme.  Uses restrained professional animation
 * defaults that still feel alive without being distracting.
 */

import { useTheme } from "next-themes"
import { GooeyToaster } from "goey-toast"
import type { GooeyToasterProps } from "goey-toast"

export function LarasToaster(props: Partial<GooeyToasterProps>) {
  const { resolvedTheme } = useTheme()

  const theme = resolvedTheme === "dark" ? "dark" : "light"

  return (
    <GooeyToaster
      position="bottom-right"
      theme={theme}
      preset="subtle"
      closeOnEscape
      swipeToDismiss
      showTimestamp={false}
      gap={12}
      offset="24px"
      {...props}
    />
  )
}
