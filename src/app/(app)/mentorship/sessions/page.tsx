import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { getMentorshipSessions } from "@/lib/mentorship"
import { SessionsPanel } from "@/components/mentorship/sessions-panel"

export default async function MentorshipSessionsPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) redirect("/onboarding")

  const { t } = await getLocaleAndDict()
  const sessions = await getMentorshipSessions(profile.id)

  return (
    <div className="animate-rise">
      <SessionsPanel
        sessions={sessions.map((s: any) => ({
          id: s.id,
          mentorId: s.mentorId,
          menteeId: s.menteeId,
          title: s.title,
          notes: s.notes,
          scheduledAt: s.scheduledAt?.toISOString() ?? null,
          completedAt: s.completedAt?.toISOString() ?? null,
          feedback: s.feedback,
          mentorName: s.mentorName,
          menteeName: s.menteeName,
        })) as any}
        profileId={profile.id}
        labels={t.mentorship as any}
      />
    </div>
  )
}
