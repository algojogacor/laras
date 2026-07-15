import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { db } from "@/lib/db"
import { getUserNotifications, getUnreadCount } from "@/lib/notifications"
import { Bell, CheckCheck } from "lucide-react"
import { NotificationList } from "@/components/shared/notification-list"

export default async function NotificationsPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) redirect("/onboarding")

  const { t } = await getLocaleAndDict()
  const { items } = await getUserNotifications(profile.id, { limit: 50 })
  const unreadCount = await getUnreadCount()

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            {t.notifications.title}
          </h1>
          <p className="mt-1.5 text-muted-foreground">
            {t.notifications.subtitle}
          </p>
        </div>
      </div>

      <NotificationList items={items} />
    </div>
  )
}
