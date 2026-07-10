"use client"

import Link from "next/link"
import { Logo } from "@/components/site/logo"
import { useT } from "@/components/providers/locale-provider"

export function SiteFooter() {
  const t = useT()
  return (
    <footer className="mt-auto border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground">
              {t.footer.tagline}
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Link href="/login" className="text-muted-foreground transition-colors hover:text-foreground">
              {t.nav.login}
            </Link>
            <Link href="/signup" className="text-muted-foreground transition-colors hover:text-foreground">
              {t.nav.signup}
            </Link>
            <span className="text-muted-foreground">{t.footer.privacy}</span>
            <span className="text-muted-foreground">{t.footer.terms}</span>
          </nav>
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Laras. {t.footer.rights}</p>
          <p className="italic">{t.footer.builtWith}</p>
        </div>
      </div>
    </footer>
  )
}
