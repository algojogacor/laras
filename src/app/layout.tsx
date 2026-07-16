import type { Metadata } from "next"
import "./globals.css"
import "goey-toast/styles.css"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { LocaleProvider } from "@/components/providers/locale-provider"
import { LarasToaster } from "@/components/feedback/laras-toaster"
import { getLocale } from "@/lib/i18n"

export const metadata: Metadata = {
  title: "Laras — Career & Opportunity Readiness Ecosystem",
  description:
    "Satu data diri, semua kesempatan. CV, cover letter, latihan wawancara, pelacakan lamaran, latihan bahasa Inggris, dan esai beasiswa — di atas satu profil yang hidup.",
  keywords: [
    "Laras",
    "career readiness",
    "CV builder",
    "cover letter",
    "interview prep",
    "TOEFL",
    "IELTS",
    "scholarship essay",
    "lamar kerja",
    "beasiswa",
  ],
  authors: [{ name: "Laras" }],
  openGraph: {
    title: "Laras — Career & Opportunity Readiness Ecosystem",
    description:
      "One profile. Every opportunity. Documents, applications, interviews, English, essays — on one living profile.",
    siteName: "Laras",
    type: "website",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className="antialiased bg-background text-foreground relative"
      >
        <a href="#main-content" className="skip-to-content">
          {locale === "id" ? "Lewati ke konten utama" : "Skip to main content"}
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <LocaleProvider initialLocale={locale}>
            <div className="relative z-10 min-h-screen flex flex-col">
              {children}
            </div>
            <LarasToaster />
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
