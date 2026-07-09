import Link from "next/link"
import { Logo } from "@/components/site/logo"
import { LocaleToggle } from "@/components/site/locale-toggle"
import { ThemeToggle } from "@/components/site/theme-toggle"
import { UserMenu } from "@/components/site/user-menu"
import type { Locale } from "@/lib/i18n/dictionary"

export function AppHeader({
  user,
  locale,
}: {
  user: { id: string; email: string; name: string | null; fullName: string | null }
  locale: Locale
}) {
  const menuLabels =
    locale === "id"
      ? { profile: "Profil", logout: "Keluar" }
      : { profile: "Profile", logout: "Log out" }
  const navLabels =
    locale === "id"
      ? { dashboard: "Dasbor", documents: "Dokumen", applications: "Lamaran", interview: "Wawancara", profile: "Profil" }
      : { dashboard: "Dashboard", documents: "Documents", applications: "Applications", interview: "Interview", profile: "Profile" }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="transition-opacity hover:opacity-80">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            <Link
              href="/dashboard"
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {navLabels.dashboard}
            </Link>
            <Link
              href="/documents"
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {navLabels.documents}
            </Link>
            <Link
              href="/applications"
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {navLabels.applications}
            </Link>
            <Link
              href="/interview"
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {navLabels.interview}
            </Link>
            <Link
              href="/profile"
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {navLabels.profile}
            </Link>
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
        </div>
      </div>
    </header>
  )
}
