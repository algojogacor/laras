"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, ShieldCheck, MessageCircle, UserRound, GraduationCap, Building2, InboxIcon, BriefcaseBusiness } from "lucide-react"
import { Logo } from "@/components/site/logo"
import { LocaleToggle } from "@/components/site/locale-toggle"
import { ThemeToggle } from "@/components/site/theme-toggle"
import { UserMenu } from "@/components/site/user-menu"
import type { Locale } from "@/lib/i18n/dictionary"

export function AppHeader({
  user,
  locale,
  isAdmin = false,
  pendingConnections = 0,
  unreadNotifications = 0,
  privateBeta = false,
}: {
  user: { id: string; email: string; name: string | null; fullName: string | null }
  locale: Locale
  isAdmin?: boolean
  pendingConnections?: number
  unreadNotifications?: number
  privateBeta?: boolean
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const menuLabels =
    locale === "id"
      ? { profile: "Profil", settings: "Pengaturan", logout: "Keluar" }
      : { profile: "Profile", settings: "Settings", logout: "Log out" }
  const navLabels =
    locale === "id"
      ? { dashboard: "Dasbor", documents: "Dokumen", applications: "Lamaran", opportunities: "Kesempatan", interview: "Wawancara", english: "Bahasa Inggris", profile: "Profil", connections: "Koneksi", messages: "Pesan", circles: "Lingkar", mentorship: "Mentor", orgs: "Organisasi", inbox: "Kotak Masuk", notifications: "Notifikasi", admin: "Admin" }
      : { dashboard: "Dashboard", documents: "Documents", applications: "Applications", opportunities: "Opportunities", interview: "Interview", english: "English", profile: "Profile", connections: "Connections", messages: "Messages", circles: "Circles", mentorship: "Mentorship", orgs: "Organizations", inbox: "Inbox", notifications: "Notifications", admin: "Admin" }

  const navItems: Array<{ href: string; label: string; icon?: React.ReactNode; isAdmin?: boolean; badge?: number }> = [
    { href: "/dashboard", label: navLabels.dashboard },
    { href: "/documents", label: navLabels.documents },
    { href: "/applications", label: navLabels.applications },
    { href: "/opportunities", label: navLabels.opportunities, icon: <BriefcaseBusiness className="h-3.5 w-3.5" /> },
    { href: "/interview", label: navLabels.interview },
    { href: "/english", label: navLabels.english },
    { href: "/profile", label: navLabels.profile },
    { href: "/connections", label: navLabels.connections, badge: pendingConnections },
    { href: "/messages", label: navLabels.messages, icon: <MessageCircle className="h-3.5 w-3.5" /> },
    { href: "/circles", label: navLabels.circles, icon: <UserRound className="h-3.5 w-3.5" /> },
    { href: "/mentorship", label: navLabels.mentorship, icon: <GraduationCap className="h-3.5 w-3.5" /> },
    { href: "/organizations", label: navLabels.orgs, icon: <Building2 className="h-3.5 w-3.5" /> },
    { href: "/inbox", label: navLabels.inbox, icon: <InboxIcon className="h-3.5 w-3.5" /> },
    { href: "/notifications", label: navLabels.notifications, badge: unreadNotifications },
    ...(isAdmin ? [{ href: "/admin", label: navLabels.admin, isAdmin: true }] : []),
  ]

  return (
    <header className="sticky top-0 z-40 w-full overflow-x-clip border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 w-full max-w-[1800px] items-center gap-3 px-4 sm:px-6 2xl:px-8">
        <Link href="/dashboard" className="shrink-0 transition-opacity hover:opacity-80">
          <Logo />
        </Link>
        {privateBeta && <span className="hidden rounded-full border border-accent/40 bg-accent/10 px-2 py-1 text-[10px] font-medium text-accent sm:inline-flex">Private beta</span>}
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 2xl:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={`inline-flex min-w-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 py-2 text-[13px] font-medium transition-colors hover:bg-secondary hover:text-foreground ${
                  pathname === item.href
                    ? "bg-secondary text-foreground"
                    : item.isAdmin
                      ? "text-primary"
                      : "text-muted-foreground"
                }`}
              >
                {item.icon ? item.icon : item.isAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : null}
                {item.label}
                {item.badge && item.badge > 0 ? (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground 2xl:hidden"
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
            className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border/60 bg-background 2xl:hidden"
          aria-label="Mobile navigation"
        >
          <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-1 px-4 py-3 sm:px-6 2xl:px-8">
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
                {item.icon ? item.icon : item.isAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : null}
                {item.label}
                {item.badge && item.badge > 0 ? (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
