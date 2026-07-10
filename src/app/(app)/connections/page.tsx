import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { listConnections } from "@/lib/connections"
import { ConnectionsPanel } from "@/components/connections/connections-panel"

export default async function ConnectionsPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) redirect("/onboarding")

  const { t } = await getLocaleAndDict()
  const groups = await listConnections(profile.id)

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.connections.title}
        </h1>
        <p className="mt-1.5 text-muted-foreground">{t.connections.subtitle}</p>
      </div>

      <ConnectionsPanel
        initialData={{
          accepted: groups.accepted.map((c) => ({
            ...c,
            other: {
              id: c.other.id,
              fullName: c.other.fullName,
              headline: c.other.headline,
              email: c.other.email,
              photoUrl: c.other.photoUrl,
            },
          })),
          pendingIncoming: groups.pendingIncoming.map((c) => ({
            ...c,
            other: {
              id: c.other.id,
              fullName: c.other.fullName,
              headline: c.other.headline,
              email: c.other.email,
              photoUrl: c.other.photoUrl,
            },
          })),
          pendingOutgoing: groups.pendingOutgoing.map((c) => ({
            ...c,
            other: {
              id: c.other.id,
              fullName: c.other.fullName,
              headline: c.other.headline,
              email: c.other.email,
              photoUrl: c.other.photoUrl,
            },
          })),
        }}
        labels={{
          title: t.connections.title,
          subtitle: t.connections.subtitle,
          accepted: t.connections.accepted,
          pendingIncoming: t.connections.pendingIncoming,
          pendingOutgoing: t.connections.pendingOutgoing,
          noConnections: t.connections.noConnections,
          noIncoming: t.connections.noIncoming,
          noOutgoing: t.connections.noOutgoing,
          connect: t.connections.connect,
          accept: t.connections.accept,
          decline: t.connections.decline,
          pending: t.connections.pending,
          search: t.connections.search,
          searchResults: t.connections.searchResults,
          noResults: t.connections.noResults,
          alreadyConnected: t.connections.alreadyConnected,
          alreadyPending: t.connections.alreadyPending,
          connectSent: t.connections.connectSent,
          connectError: t.connections.connectError,
          acceptSuccess: t.connections.acceptSuccess,
          declineSuccess: t.connections.declineSuccess,
          actionError: t.connections.actionError,
          messageLabel: t.connections.messageLabel,
          messagePlaceholder: t.connections.messagePlaceholder,
          send: t.connections.send,
          statsTotal: t.connections.statsTotal,
          statsPending: t.connections.statsPending,
          statsOutgoing: t.connections.statsOutgoing,
        }}
      />
    </div>
  )
}
