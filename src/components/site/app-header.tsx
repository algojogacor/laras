"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, ShieldCheck } from "lucide-react"
import { Logo } from "@/components/site/logo"
import { LocaleToggle } from "@/components/site/locale-toggle"
import { ThemeToggle } from "@/components/site/theme-toggle"
import { UserMenu } from "@/components/site/user-menu"
import type { Locale } from "@/lib/i18n/dictionary"

export function AppHeader({
  user,
  locale,
  isAdmin = false,
}: {
  user: { id: string; email: string; name: string | null; fullName: string | null }
  locale: Locale
  isAdmin?: boolean
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const menuLabels =
    locale === "id"
      ? { profile: "Profil", settings: "Pengaturan", logout: "Keluar" }
      : { profile: "Profile", settings: "Settings", logout: "Log out" }
  const navLabels =
    locale === "id"
      ? { dashboard: "Dasbor", documents: "Dokumen", applications: "Lamaran", interview: "Wawancara", english: "Bahasa Inggris", profile: "Profil", admin: "Admin" }
      : { dashboard: "Dashboard", documents: "Documents", applications: "Applications", interview: "Interview", english: "English", profile: "Profile", admin: "Admin" }

  const navItems: Array<{ href: string; label: string; isAdmin?: boolean }> = [
    { href: "/dashboard", label: navLabels.dashboard },
    { href: "/documents", label: navLabels.documents },
    { href: "/applications", label: navLabels.applications },
    { href: "/interview", label: navLabels.interview },
    { href: "/english", label: navLabels.english },
    { href: "/profile", label: navLabels.profile },
    ...(isAdmin ? [{ href: "/admin", label: navLabels.admin, isAdmin: true }] : []),
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="transition-opacity hover:opacity-80">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground ${
                  pathname === item.href
                    ? "bg-secondary text-foreground"
                    : item.isAdmin
                      ? "text-primary"
                      : "text-muted-foreground"
                }`}
              >
                {item.isAdmin && <ShieldCheck className="h-3.5 w-3.5" />}
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <LocaleToggle />
          <ThemeToggle />
          <UserMenu
            name={user.fullName ?? user.name}
            email={user.email}
            locale={menuLabels}
          />
          {/* Mobile hamburger menu button */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileOpen && (
        <nav
          id="mobile-nav"
          className="border-t border-border/60 bg-background lg:hidden"
          aria-label="Mobile navigation"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground ${
                  pathname === item.href
                    ? "bg-secondary text-foreground"
                    : item.isAdmin
                      ? "text-primary"
                      : "text-muted-foreground"
                }`}
              >
                {item.isAdmin && <ShieldCheck className="h-3.5 w-3.5" />}
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
