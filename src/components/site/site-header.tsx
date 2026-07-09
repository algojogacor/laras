"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Logo } from "@/components/site/logo"
import { LocaleToggle } from "@/components/site/locale-toggle"
import { ThemeToggle } from "@/components/site/theme-toggle"
import { useT } from "@/components/providers/locale-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  const t = useT()
  const [open, setOpen] = useState(false)

  const navLinks = [
    { href: "#verticals", label: t.nav.features },
    { href: "#principles", label: t.nav.howItWorks },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LocaleToggle />
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{t.nav.login}</Link>
          </Button>
          <Button asChild size="sm" className="shadow-soft">
            <Link href="/signup">{t.nav.signup}</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LocaleToggle />
          <ThemeToggle />
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* mobile menu */}
      <div
        className={cn(
          "overflow-hidden border-t border-border/60 bg-background md:hidden transition-[max-height] duration-300 ease-out",
          open ? "max-h-80" : "max-h-0"
        )}
      >
        <div className="space-y-1 px-4 py-4">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
            >
              {l.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-2">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link href="/login" onClick={() => setOpen(false)}>
                {t.nav.login}
              </Link>
            </Button>
            <Button asChild size="sm" className="flex-1">
              <Link href="/signup" onClick={() => setOpen(false)}>
                {t.nav.signup}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
