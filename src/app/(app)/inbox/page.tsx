import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { db } from "@/lib/db"
import { getUnifiedInbox, getInboxCount, type InboxEntry } from "@/lib/inbox"
import { InboxClient } from "@/components/shared/inbox-client"

export const dynamic = "force-dynamic"

export default async function InboxPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) redirect("/onboarding")

  const { t } = await getLocaleAndDict()
  const { entries } = await getUnifiedInbox(profile.id, { limit: 50 })
  const { total: unreadTotal, breakdown } = await getInboxCount(profile.id)

  // Serialize Date objects for client
  const serialized: InboxEntry[] = entries.map((e) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
  })) as unknown as InboxEntry[]

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            {t.inbox.title}
          </h1>
          <p className="mt-1.5 text-muted-foreground">
            {t.inbox.subtitle}
          </p>
        </div>
      </div>

      <InboxClient
        initialEntries={serialized as InboxEntry[]}
        unreadTotal={unreadTotal}
        dict={t}
      />
    </div>
  )
}
