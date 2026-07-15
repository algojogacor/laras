import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { getConversations, getMessageRequests } from "@/lib/messaging"
import { MessageList } from "@/components/messaging/message-list"

export default async function MessagesPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) redirect("/onboarding")

  const { t } = await getLocaleAndDict()
  const conversations = await getConversations(profile.id)
  const requests = await getMessageRequests(profile.id)

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          Pesan
        </h1>
        <p className="mt-1.5 text-muted-foreground">
          Percakapan profesional dengan koneksi Anda.
        </p>
      </div>

      <MessageList
        conversations={conversations.map((c) => ({
          ...c,
          updatedAt: c.updatedAt.toISOString(),
          lastMessage: c.lastMessage
            ? {
                body: c.lastMessage.body,
                createdAt: c.lastMessage.createdAt.toISOString(),
                senderId: c.lastMessage.senderId,
              }
            : null,
        }))}
        messageRequests={requests.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        }))}
        currentProfileId={profile.id}
      />
    </div>
  )
}
