import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocale } from "@/lib/i18n"
import { AppHeader } from "@/components/site/app-header"
import { SiteFooter } from "@/components/site/site-footer"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  const account = await db.account.findUnique({
    where: { id: session.userId },
    include: {
      profile: {
        select: {
          fullName: true,
          onboardingComplete: true,
          profileCompletion: true,
          uiLocale: true,
        },
      },
    },
  })
  if (!account) redirect("/login")

  const locale = await getLocale()

  const user = {
    id: account.id,
    email: account.email,
    name: account.name,
    fullName: account.profile?.fullName ?? null,
  }

  return (
    <>
      <AppHeader user={user} locale={locale} />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
      </main>
      <SiteFooter />
    </>
  )
}
