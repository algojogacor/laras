import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getMessages, getConversations } from "@/lib/messaging"
import { MessageThread } from "@/components/messaging/message-thread"
import { ArrowLeft } from "lucide-react"

export default async function MessageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true, fullName: true },
  })
  if (!profile) redirect("/onboarding")

  const { id } = await params

  // Verify the user is a participant in this conversation
  const participant = await db.conversationParticipant.findUnique({
    where: {
      conversationId_userProfileId: {
        conversationId: id,
        userProfileId: profile.id,
      },
    },
    select: { conversationId: true },
  })

  if (!participant) {
    redirect("/messages")
  }

  // Load the conversation details
  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      participants: {
        include: {
          userProfile: {
            select: { id: true, fullName: true, photoUrl: true },
          },
        },
      },
    },
  })

  if (!conversation) {
    redirect("/messages")
  }

  // Load messages
  const { items } = await getMessages(id, profile.id)

  // Check if blocked
  const otherParticipantIds = conversation.participants
    .filter((p) => p.userProfileId !== profile.id)
    .map((p) => p.userProfileId)

  const block = await db.block.findFirst({
    where: {
      OR: [
        { blockerId: profile.id, blockedId: { in: otherParticipantIds } },
        { blockerId: { in: otherParticipantIds }, blockedId: profile.id },
      ],
    },
  })

  const otherParticipants = conversation.participants
    .filter((p) => p.userProfileId !== profile.id)
    .map((p) => ({
      id: p.userProfile.id,
      fullName: p.userProfile.fullName,
      photoUrl: p.userProfile.photoUrl,
    }))

  const title =
    conversation.title ||
    otherParticipants.map((p) => p.fullName || "Unknown").join(", ")

  return (
    <div className="space-y-4 animate-rise">
      <div className="flex items-center gap-3">
        <Link
          href="/messages"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
        <h1 className="font-serif text-2xl font-semibold tracking-tight truncate">
          {title}
        </h1>
      </div>

      <MessageThread
        conversationId={id}
        currentProfileId={profile.id}
        currentProfileName={profile.fullName}
        initialMessages={items.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          editedAt: m.editedAt?.toISOString() ?? null,
        }))}
        otherParticipants={otherParticipants}
        isBlocked={block !== null}
        blockedByMe={block?.blockerId === profile.id}
      />
    </div>
  )
}
