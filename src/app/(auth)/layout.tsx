import Link from "next/link"
import { Logo } from "@/components/site/logo"
import { LocaleToggle } from "@/components/site/locale-toggle"
import { ThemeToggle } from "@/components/site/theme-toggle"
import { getLocaleAndDict } from "@/lib/i18n"
import { ShieldCheck, Layers, Sparkles } from "lucide-react"

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { t } = await getLocaleAndDict()

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-primary lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            background:
              "radial-gradient(circle at 15% 20%, var(--accent) 0%, transparent 45%), radial-gradient(circle at 85% 85%, var(--accent) 0%, transparent 45%)",
          }}
        />
        <div className="relative">
          <Link href="/" className="inline-flex">
            <span className="inline-flex items-center gap-2.5 text-primary-foreground">
              <svg viewBox="0 0 40 40" fill="none" className="h-8 w-8" aria-hidden>
                <path d="M6 30 C 12 30, 18 24, 22 16 S 30 6, 34 8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                <circle cx="34" cy="8" r="3.4" className="fill-accent" />
                <circle cx="6" cy="30" r="2.6" fill="currentColor" />
              </svg>
              <span className="font-serif text-xl font-semibold">Laras</span>
            </span>
          </Link>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-serif text-3xl font-semibold leading-tight text-primary-foreground">
            {t.brand.tagline}
          </h2>
          <p className="mt-4 text-primary-foreground/75 text-pretty">
            {t.landing.heroSubtitle}
          </p>
          <ul className="mt-8 space-y-4">
            {[
              { Icon: ShieldCheck, text: t.landing.principle1Title },
              { Icon: Layers, text: t.landing.principle2Title },
              { Icon: Sparkles, text: t.landing.principle3Title },
            ].map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-primary-foreground/90">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/15">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Laras
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <Link href="/" className="lg:hidden">
            <Logo />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  )
}
