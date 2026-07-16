import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession, isAdminRole } from "@/lib/auth"
import { getLocale } from "@/lib/i18n"
import { getUnreadCount, getPendingConnectionCount } from "@/lib/notifications"
import { AppHeader } from "@/components/site/app-header"
import { SiteFooter } from "@/components/site/site-footer"
import { CommandPalette } from "@/components/site/command-palette"
import { isPrivateBetaEnabled } from "@/lib/private-beta"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  // Suspension gate: redirect suspended users to the suspension notice page.
  // The suspended page is outside the (app) group so this won't create a loop.
  if (session.suspended) {
    redirect("/suspended")
  }

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

  // Keep the first-account setup focused. The app chrome returns once the
  // onboarding completion flag is saved and the user lands on the dashboard.
  const showAppChrome = account.profile?.onboardingComplete === true

  const locale = await getLocale()
  const pendingCount = showAppChrome ? await getPendingConnectionCount() : 0
  const unreadCount = showAppChrome ? await getUnreadCount() : 0

  const user = {
    id: account.id,
    email: account.email,
    name: account.name,
    fullName: account.profile?.fullName ?? null,
  }

  return (
    <>
      {showAppChrome && (
        <>
          <AppHeader user={user} locale={locale} isAdmin={isAdminRole(account.role)} pendingConnections={pendingCount} unreadNotifications={unreadCount} privateBeta={isPrivateBetaEnabled()} />
          <CommandPalette locale={locale} />
        </>
      )}
      <main id="main-content" className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
      </main>
      {showAppChrome && <SiteFooter />}
    </>
  )
}
